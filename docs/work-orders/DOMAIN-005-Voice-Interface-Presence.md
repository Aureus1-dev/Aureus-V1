# DOMAIN-005 — Voice Experience: Interface Presence (Dynamic Screen Orchestration)

| Field | Value |
|---|---|
| Domain Number | DOMAIN-005 (this session's Domain Delivery sequence) |
| Title | Voice Experience — Interface Presence |
| Status | Complete — Domain Completion Rule satisfied end-to-end |
| Priority | High (Founder-directed) |
| Date | 2026-07-16 |
| Process | Full Domain Delivery process: audit, Domain Implementation Plan surfacing two real architectural conflicts, five Founder Decisions, implementation, testing, this report |

---

## Objective

The Founder's original request for "DOMAIN-004 — Voice Experience (Frontend)" named a set of capabilities, most of which DOMAIN-002 (Voice Backend + Frontend) already shipped: continuous WebRTC conversation, barge-in, mute, the Listening→Thinking→Speaking state machine, live transcript, and voice↔text continuity. This Domain's real, net-new scope is the two capabilities DOMAIN-002 explicitly deferred and this session's audit confirmed required real architectural work, not just UI: **Dynamic Screen Orchestration** (the steward navigating and highlighting the interface while talking) and a **persistent cross-app steward presence**. (Numbered DOMAIN-005 here, not DOMAIN-004, since that number was already used by the Opportunity Center Domain, merged earlier this session.)

**Per the standing Domain Completion Rule, this Domain is now complete**: while in a live voice session, the steward can navigate the member to an approved screen, highlight or focus a specific, currently-visible item by its registered semantic id, and remains present — visibly and functionally — as the member moves between screens, never silently abandoning the conversation just because they navigated away from `/conversation`. Every action is reported back to the steward, and no tool exists that could commit the member to anything without their own explicit action.

## Governing Documents

**Canons:** AFX-003 §2, §7, §8, §10 (Visual Presence, Guided Navigation, "never competes for attention"), AFX-006 (member sovereignty).
**Blueprints:** FPB-008 §3, §6, §7, §9 (Conversation-Led Navigation, Dynamic Visual Presentation, Participatory Automation, Context Continuity), FPB-011 (Accessibility).
**Backend:** ADR-017 (Voice Domain Backend), `voice-timing-policy.ts` (the precedent for "backend-owned, never client-supplied" session configuration this Domain's toolset follows).

## Audit Findings (the basis for the five Founder Decisions)

1. **Push-to-talk conflicts with a deliberate backend boundary.** `voice-timing-policy.ts` hardcodes `turn_detection` server-side and is documented as "never accepted from the client" — a Founder-mandated decision from DOMAIN-002. True push-to-talk needs the opposite (client-controlled turn boundaries). Resolved by Founder Decision 1: continuous voice remains canonical; push-to-talk is deferred to a future accessibility-option increment, not built here.
2. **Interface highlighting/navigation required backend changes.** Confirmed by reading the actual code: `OpenAiVoiceProvider.brokerSession()` passed no `tools` to OpenAI's session-creation call, and nothing in the frontend handled function-call events. Resolved by Founder Decision 2 (approved) — a narrow, one-time backend addition (the session-broker call only; no audio-path change).
3. **No persistent UI existed outside `/conversation`.** The WebRTC connection itself is provider-level and already survived route navigation, but there was no visible presence anywhere once a member left the Conversation screen. Resolved by Founder Decision 3.

## Founder Decisions (resolution record)

1. **Continuous voice remains canonical** — approved with modification. Push-to-talk is explicitly deferred to a future accessibility-only increment; continuous listening, natural pause detection, barge-in, mute, and End Conversation (all DOMAIN-002) are unchanged.
2. **Dynamic Screen Orchestration approved** — the backend session broker now exposes a fixed, controlled toolset (`navigate_to_route`, `focus_interface_target`, `focus_form_field`). The steward may navigate, highlight, scroll to, and focus registered interface elements, and explain what's visible — and shall never submit, approve, spend, accept agreements, delete, perform irreversible actions, or override explicit member intent. Enforced structurally: **no tool for any of those actions exists at all** — an allow-list, not a runtime permission check on a broader capability.
3. **Persistent Steward Presence approved** — implemented as `PersistentVoicePresence`, mounted once at the member application shell (`app/(member)/layout.tsx`), visible on every authenticated screen except `/conversation` itself (where the full `VoiceSurface` already shows everything it summarizes).
4. **Global Highlight Registry approved** — implemented as `HighlightRegistryContext`; components register under stable semantic ids (`Home.NextMission`, `Opportunity.Card.<id>`, `Journey.Goal.Primary`) rather than exposing DOM ids or CSS selectors to the steward.
5. **Human Agency preserved** — the tool schema itself is the safety boundary (see Finding 2); every tool call result, success or failure, is always reported back to the steward, and `VoiceOrchestrator` independently re-validates the model's `route` argument against a frontend allow-list before ever calling the router (defense in depth, never trusting the model's output blindly even though the schema already constrains it).

## Backend Changes

- **`apps/api/src/ai/voice/voice-tools.ts`** (new) — the fixed, backend-owned Dynamic Screen Orchestration toolset and the `VOICE_ALLOWED_ROUTES` allow-list, both injected into every brokered session and never accepted from the client (mirroring `voice-timing-policy.ts`'s own established pattern).
- **`voice-provider.interface.ts`** — `VoiceSessionBrokerInput` gained a `tools` field.
- **`openai-voice.provider.ts`** — passes `tools`/`tool_choice: 'auto'` to OpenAI's realtime session-creation call.
- **`voice-session.service.ts`** — injects `VOICE_TOOLS` into every `brokerSession()` call.
- **`system-prompts.util.ts`** — `VOICE_ASSISTANT_SYSTEM_PROMPT` extended with tool-usage guidance and an explicit restatement of the Human Agency boundary (defense in depth alongside the schema itself).
- No audio-path, database, or endpoint-contract changes — the three existing voice endpoints (`POST /ai/voice/sessions`, `.../events`, `.../end`) are untouched.

## Frontend Changes

- **`state/highlight/HighlightRegistryContext.tsx`** (new) — the Global Highlight Registry. `register`/`unregister`/`activate`/`focusField`/`describeTargets`, plus the `useRegisterHighlightTarget` hook every highlightable component calls. Deliberately tolerant of rendering outside a provider (`isActive` stays `false`, no throw) — highlighting is a progressive enhancement, not a hard dependency every consumer (and every test rendering one) must carry. `useHighlightRegistry` itself still throws outside a provider, since `VoiceOrchestrator` genuinely requires it.
- **`lib/voice/realtime-event-mapper.ts`** — `response.done` now scans every output item (not just the first), reporting a `function-call-requested` normalized event per tool call the provider requested, alongside the existing spoken-turn event (which still always fires, even for a pure-tool-call response, so the state machine reliably returns to `listening`).
- **`state/voice/VoiceContext.tsx`** — new `pendingToolCalls` state, `resolveToolCall()` (reports a tool call's result back over the data channel and triggers `response.create` so the steward continues), and `syncInterfaceContext()` (an additive system message, never overwriting the backend's base persona instructions).
- **`design-system/components/voice/VoiceOrchestrator.tsx`** (new) — the one place voice intent becomes an actual interface action; deliberately separate from `VoiceContext` (protocol-only) and the Highlight Registry (a pure DOM-ref primitive), mirroring the isolation discipline `RealtimeEventMapper` already established for wire-format translation.
- **`design-system/components/voice/PersistentVoicePresence.tsx`** (new) — the cross-app steward presence.
- **`design-system/components/voice/voice-routes.ts`** (new) — the frontend's own allow-list mirror, the defense-in-depth check described above.
- **`NextStepCard`, `OpportunityCard`, `ActiveGoalsList`** — wired into the registry as `Home.NextMission`, `Opportunity.Card.<id>`, and `Journey.Goal.Primary` respectively, demonstrating the pattern end-to-end on real, already-shipped screens.
- **`app/(member)/layout.tsx`** — mounts `VoiceOrchestrator` and `PersistentVoicePresence` once, as siblings of `AppShell`, so both keep working regardless of which member screen is rendered.

## Testing

- **Backend**: `voice-session.service.spec.ts` extended with a test proving the fixed toolset is injected into every session and never client-supplied (mirroring the existing timing-policy test). Full backend regression: **908/908 tests, 87 suites**.
- **`realtime-event-mapper.test.ts`**: 3 new tests — a tool call alongside a spoken response, several simultaneous tool calls in one response, and correct `itemId` resolution when a message and a tool call share one response. All 9 pre-existing tests still pass unchanged.
- **`VoiceContext.test.tsx`**: 4 new tests (queuing, resolution, interface-context sync, multiple simultaneous calls). All 12 pre-existing tests still pass unchanged.
- **`HighlightRegistryContext.test.tsx`** (new, 8 tests): registration/activation, not-found handling, keyboard focus, the `onActivate` callback, unregister-on-unmount, `describeTargets`, auto-clear after a duration, and the graceful no-provider fallback.
- **`VoiceOrchestrator.test.tsx`** (new, 7 tests): navigate success, an out-of-allow-list route rejected without navigating (even though the schema already constrains it — proving the defense-in-depth check actually works), highlight success/failure, unrecognized tool name, malformed arguments, and no-double-execution of the same call.
- **`PersistentVoicePresence.test.tsx`** (new, 7 tests): hidden when idle, hidden on `/conversation`, visible elsewhere once connected, mute/interrupt/end controls, `jest-axe` clean.
- **Wiring proof**: one additive test each in `NextStepCard.test.tsx`, `OpportunityCard.test.tsx`, and `ActiveGoalsList.test.tsx` confirms the real registration (not just the primitive in isolation) — including that only the primary/detail goal registers in `ActiveGoalsList`, not every active goal.
- **Totals**: 33 new frontend tests. Full `apps/web` regression: **61 suites, 297 tests, all passing** (264 carried forward unchanged from every prior Domain).
- **Full pipeline**: `next lint` clean, `tsc --noEmit` clean (both apps), `next build` succeeds.

## Architecture Compliance

- **Governing Canons followed**: AFX-003 (throughout), AFX-006.
- **Governing Blueprints followed**: FPB-008, FPB-011.
- **Architectural deviations**: none from governing documents. Five Founder Decisions were surfaced explicitly (with two real, code-verified architectural conflicts as their basis) and approved before implementation began.

## Risks and How They Were Addressed

1. **The model hallucinating or misusing a tool argument** — mitigated in two independent layers: the tool's own JSON schema constrains `route` to an enum server-side, and `VoiceOrchestrator` re-validates against a frontend allow-list before ever calling the router, so an unexpected value safely no-ops (proven by a dedicated test) rather than navigating anywhere unintended.
2. **A tool call executed twice** (e.g. from a re-render) — `VoiceOrchestrator` tracks already-handled `callId`s and skips duplicates (proven by test).
3. **An empty-transcript response silently stalling the state machine** — caught by two pre-existing tests before this Domain's mapper change shipped; fixed by always emitting the spoken-turn event regardless of transcript content, exactly as before, with tool-call events added alongside rather than in place of it.
4. **Highlighting becoming a mandatory dependency for every component that adopts it** — resolved by making `useRegisterHighlightTarget` degrade gracefully outside a provider, so wiring it into `NextStepCard`/`OpportunityCard`/`ActiveGoalsList` required zero changes to their existing, already-shipped tests.
5. **A cross-stack allow-list going out of sync** — `voice-routes.ts` is explicitly documented as a hand-maintained mirror of the backend's `VOICE_ALLOWED_ROUTES`, with no shared package between `apps/api` and `apps/web` to enforce it automatically; flagged here rather than silently assumed safe.

## What Remains

- **Push-to-talk** — deliberately deferred (Founder Decision 1) to a future accessibility-option increment; not built here.
- **Wiring the Highlight Registry more broadly** — only three representative components were wired in this Domain (`Home.NextMission`, `Opportunity.Card.<id>`, `Journey.Goal.Primary`), matching Decision 4's own named examples. Extending it to Academy, Resources, and other not-yet-built member domains is mechanical, low-risk follow-up work once those Domains themselves exist — not a design question.
- **Live-provider verification** — like every other real-provider integration in this codebase (`OpenAiProvider`, `AnthropicProvider`, the SMTP transport), the `tools`/`tool_choice` addition to `OpenAiVoiceProvider.brokerSession()` has not been exercised against a live OpenAI Realtime API connection in this environment (no outbound network access here). It is unit- and integration-tested against the deterministic `StubVoiceProvider` fallback and the mocked interface only. An operator should perform one live voice session with an active tool call as part of production deployment verification, mirroring the WO-023/WO-029 recommendation.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] Continuous voice conversation, natural pause detection, barge-in, mute, and End Conversation remain the canonical experience (DOMAIN-002, unchanged).
- [x] The steward can navigate to an approved screen while a voice session continues.
- [x] The steward can highlight or focus a specific, currently-visible, registered interface element while talking.
- [x] No tool exists for submitting, approving, spending, accepting agreements, deleting, or any other irreversible/member-authorizing action.
- [x] Every tool call result is reported back to the steward, success or failure.
- [x] The steward's presence persists visibly and functionally across Home, Journey, and Opportunity Center once a session is live.
- [x] A frontend allow-list independently re-validates every navigation target — the model's schema-constrained output is never trusted blindly.
- [x] Every new component passes `jest-axe` with zero violations.
- [x] `apps/api` and `apps/web` both build, lint, and type-check cleanly; 908/908 backend tests and 297/297 frontend tests pass, including 33 new frontend tests and 1 new backend test for this Domain.
