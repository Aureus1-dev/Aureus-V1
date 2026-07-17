# DOMAIN-007 — AI Steward Workspace

| Field | Value |
|---|---|
| Domain Number | DOMAIN-007 (this session's Domain Delivery sequence) |
| Title | AI Steward Workspace |
| Status | Complete — Domain Completion Rule satisfied end-to-end |
| Priority | High (Founder-directed) |
| Date | 2026-07-17 |
| Process | Full Domain Delivery process: audit, Domain Implementation Plan surfacing one real architectural gap, four Founder Decisions plus member-facing-language guidance, implementation, testing, this report |

---

## Objective

DOMAIN-005 built the mechanics of Steward action (Dynamic Screen Orchestration, the Global Highlight Registry) but scoped them to voice only, and only while a voice session was live. DOMAIN-007 makes that presence persistent and universal: a standing workspace — collapsed panel, command palette, unified approvals — available on every authenticated screen, whether the member types or talks. The audit found one real, code-verified architectural gap: **text conversation had no tool-calling support at all** — only the voice realtime provider did (`IAiProvider.complete()` had no `tools` field; `ConversationsService.ask()` called it with plain messages only). Founder Decision 1 authorized closing that gap rather than deferring it.

**Per the standing Domain Completion Rule, this Domain is now complete**: from any authenticated screen, a member can open the Steward Workspace, see recent conversational context, see genuine pending decisions, type or speak a request that safely navigates or illuminates the interface, use the command palette by keyboard, touch, or visible controls, move across domains without losing conversation, panel, voice, or navigation context, and personally authorize a pending recommendation — all without two competing Steward interfaces or hidden state loss.

## Governing Documents

**Canons:** AFX-002 (Conversation Canon — the 8-step rhythm, "the steward guides, the member decides"). AFX-003 (Voice & Presence — §7-8 Visual Presence/Guided Navigation, the basis for DOMAIN-005, extended here). AFX-006 §6 (Participatory Stewardship — "the institution prepares, the member participates, the member authorizes").
**Blueprints:** FPB-004 (Conversation Engine — the 12-stage lifecycle: Receive→Listen→Understand→Reflect→Confirm→Decide→Orchestrate→Prepare→Explain→Request Approval→Guide Next Step→Learn; internal only, per Founder guidance, never exposed as stage names). FPB-008 §3, §7, §9 (Conversation-Led Navigation, Participatory Automation, Context Continuity — "the steward remembers where the member was... returning members resume naturally"). FPB-013 (AI Steward Operational Standard — §5 "meaningful actions require member authorization"). FPB-010 §3 (State Management — the "Interface State" category: current screen, open panels, navigation history — built in FWO-001, never consumed until this Domain). FPB-012 §6 (names "simultaneous conversation and workspace panels" as a layout pattern). FPB-005 §6 (Approval Components, already built as `ApprovalPanel`). FPB-002 §3 ("Steward" — one of the 20 named primary surfaces, previously a bare placeholder).
**Architecture:** PA-006 (AI Intelligence Engine — "does not govern the platform or make decisions on behalf of members"). PA-017 (Cross-System Interaction — "no system shall assume responsibility for another system's core functions," grounding the non-ownership boundaries). PA-018 (Permissions & Access — AI Access: "never grant itself additional permissions"). DOMAIN-005 (Voice Interface Presence — the toolset, Highlight Registry, and orchestration pattern this Domain unifies across modalities).

## Founder Decisions (resolution record)

1. **Text and voice share interface orchestration — approved, not deferred.** A fixed, fully shared toolset (`navigate_to_route`, `focus_interface_target`, `focus_form_field`, `open_panel`, `close_panel`) now backs both modalities from one canonical definition (`ai/common/interface-tools.ts`). No tool exists for submitting a form, approving/dismissing on the member's behalf, spending money, accepting agreements, deleting information, transmitting information externally, or altering permissions — the same allow-list-as-safety-boundary discipline DOMAIN-005 established.
2. **Persistent workspace presence — approved.** `StewardWorkspace` is collapsed by default, expands on request, and is the single floating Steward surface app-wide; `PersistentVoicePresence` (DOMAIN-005) is deliberately no longer mounted separately, since `StewardWorkspace` composes the orb/status/controls internally when voice is live — never two competing floating widgets. Panel state lives in `InterfaceContext.openPanelIds`.
3. **Approval scope — approved as-is.** "Needs your decision" aggregates only existing pending `AiRecommendation`s via the existing approve/dismiss endpoints; no new backend approval entity was introduced. `RecommendationCard`'s subject-resolution pattern (already extensible by category, per DOMAIN-006) is the seam a future Connected Experiences/action-execution architecture would extend, not rewrite.
4. **Global Action Palette — approved.** Cmd+K / Ctrl+K, a visible accessible trigger, full keyboard operation (arrow keys, Enter, Escape), ARIA combobox/listbox semantics, touch-sized targets. Deterministic navigation is derived directly from the existing canonical `navigation/surfaces.ts` registry — no third route allow-list — while the free-text "Ask your Steward" entry goes through the same `ConversationContext.sendMessage` (tools included) every other text interaction uses.
5. **Member-facing language — honored.** No FPB-004 stage names appear in the UI. `steward-status-copy.ts` provides the calm vocabulary (Listening / Understanding what you need / Preparing something for you / Ready for your review / Waiting for your decision) used by `NeedsYourDecision` and `RecentConversationPreview`.

## Backend Changes

- **`apps/api/src/ai/common/interface-tools.ts`** (new) — the single canonical, backend-owned tool definitions (`INTERFACE_TOOL_SPECS`) and allow-lists (`INTERFACE_ALLOWED_ROUTES`, `INTERFACE_ALLOWED_PANELS`) shared by both modalities.
- **`apps/api/src/ai/voice/voice-tools.ts`** — refactored to derive `VOICE_ALLOWED_ROUTES`/`VOICE_TOOLS` from the shared module (all existing call sites and tests unaffected); voice automatically gained `open_panel`/`close_panel` for parity.
- **`apps/api/src/ai/providers/ai-provider.interface.ts`** — `AiToolDefinition`, `AiToolCallRequest`, `tools` on `AiCompletionInput`, `toolCalls` on `AiCompletionOutput`.
- **`OpenAiProvider`, `AnthropicProvider`** — each maps the neutral `AiToolDefinition[]` to its own wire format (nested `function` object for Chat Completions; flat `input_schema` for the Messages API) and normalizes any returned tool call back to `{id, name, arguments}` — including JSON-stringifying Anthropic's native object-typed `input` so both providers return an identical shape.
- **`AiRequestsService.runCompletion()`** — passes `tools` through, returns `toolCalls` alongside the existing `content`/`requestId`.
- **`ConversationsService.ask()`** — now always offers the shared toolset; `AskQuestionDto` gained an optional `interfaceContext` field (mirroring voice's `syncInterfaceContext`), injected as an additive system message; the response DTO carries `toolCalls` ephemerally (this response only — never persisted to the `AiMessage` row, no schema migration needed).
- **`system-prompts.util.ts`** — the tool-usage and Human Agency guidance is now one shared paragraph (`INTERFACE_TOOL_GUIDANCE`) both `PLATFORM_ASSISTANT_SYSTEM_PROMPT` and `VOICE_ASSISTANT_SYSTEM_PROMPT` build on, instead of voice-only text.
- No database schema changes, no new endpoints — `POST /ai/conversations/:id/messages` is the only touched contract, extended additively.

## Frontend Changes

- **`design-system/components/steward/`** (new domain) — `execute-interface-tool.ts` (the shared, pure tool-execution logic both modalities call), `interface-tool-allowlists.ts` (the frontend's defense-in-depth panel-id mirror; routes reuse the existing `voice-routes.ts` rather than a third list), `SurfaceTracker` (the first real consumer of `InterfaceContext`, built in FWO-001 and unused until now), `TextInterfaceOrchestrator` (the text-side counterpart to `VoiceOrchestrator`, needing no report-back round trip), `StewardWorkspace` (the persistent panel), `GlobalActionPalette` (the command surface), `NeedsYourDecision`, `RecentConversationPreview`, `StewardHome` (the `/steward` full-page surface), `steward-status-copy.ts`.
- **`VoiceOrchestrator`** — refactored onto the shared `executeInterfaceTool`, extended with `open_panel`/`close_panel` handling; all pre-existing behavior and tests unchanged.
- **`ConversationContext`** — `pendingToolCalls` (reusing `VoiceContext`'s `PendingToolCall` type directly rather than duplicating it), `sendMessage()` extended with `interfaceContext` and an `explicitContent` override (the latter fixing a real same-tick state race found while wiring the palette — see Errors below).
- **`app/(member)/layout.tsx`** — mounts `SurfaceTracker`, `TextInterfaceOrchestrator`, `StewardWorkspace`, and `GlobalActionPalette`; `PersistentVoicePresence` is deliberately no longer mounted here (Founder Decision 2).
- **`app/(member)/steward/page.tsx`** — now renders `StewardHome`, replacing the placeholder.

## Testing

- **Backend**: 635/635 unit tests, 69 suites (9 new: 3 in `conversations.service.spec.ts` for tool-offering/interfaceContext-injection/toolCalls-surfacing, 3 in new `openai.provider.spec.ts`, 3 in new `anthropic.provider.spec.ts`). Integration/e2e specs requiring a live Postgres connection excluded, the standing sandbox limitation noted in every prior Domain's report.
- **Frontend**: 363/363 tests, 71 suites (50 new across 7 new suites): `execute-interface-tool.test.ts` (10, the shared executor in isolation), `SurfaceTracker.test.tsx` (4), `InterfaceContext.test.tsx` (7, first-ever coverage for this FWO-001 primitive), `TextInterfaceOrchestrator.test.tsx` (5), `StewardWorkspace.test.tsx` (6, including collapsed- and expanded-state `jest-axe`), `GlobalActionPalette.test.tsx` (10, including full keyboard-operation and `jest-axe`), `StewardHome.test.tsx` (4); plus additive tests in `ConversationContext.test.tsx` (+3) and `VoiceOrchestrator.test.tsx` (+2, `open_panel`/`close_panel`).
- **Full pipeline**: `next lint` clean, `tsc --noEmit` clean (both apps), `next build` succeeds (`/steward` now compiles as a real route, not a placeholder), `nest build` clean.

## Architecture Compliance

- **Governing Canons/Blueprints followed**: AFX-002, AFX-003, AFX-006 §6, FPB-002, FPB-004, FPB-005, FPB-008, FPB-010, FPB-012, FPB-013.
- **Architectural deviations**: none from governing documents. One real gap (text tool-calling) was surfaced explicitly, with a code-verified basis, and resolved by Founder Decision before implementation began.

## Risks and How They Were Addressed

1. **A same-tick state race between `setDraft` and `sendMessage`** — found while wiring the palette's free-text entry: calling both in one synchronous handler let `sendMessage` read `state.draft` from the render *before* `setDraft`'s update landed, silently no-op-ing (empty content). Fixed by adding an `explicitContent` override to `sendMessage` so a caller that already has the text in hand never depends on draft-state timing; proven by a dedicated palette test that would have caught the regression (it did, before the fix).
2. **Two floating widgets colliding** — resolved structurally, not by convention: `PersistentVoicePresence` is no longer mounted in the member layout at all; `StewardWorkspace` is the only floating Steward surface and composes the voice pieces (`VoiceOrb`, `VoiceStateLabel`, `VoiceControls`) internally.
3. **A third route allow-list** — avoided: the palette's deterministic navigation reads `navigation/surfaces.ts` directly (already canonical); the AI tool's own narrower allow-list continues to live only in `voice-routes.ts`, now reused by both orchestrators rather than duplicated.
4. **Invalid ARIA listbox structure** — found by `jest-axe` during development (`<li>` children under a `role="listbox"` `<ul>`, and options requiring a `listbox`/`group` parent): fixed by rendering `role="option"` buttons as direct children of a `role="listbox"` container with no native list semantics in between.
5. **A cross-provider tool-call shape mismatch** — OpenAI returns `arguments` as an already-JSON-encoded string; Anthropic returns `input` as a parsed object. Normalized at the provider boundary (`JSON.stringify` on the Anthropic side) so every consumer downstream — `AiRequestsService`, `ConversationsService`, both frontend orchestrators — handles one consistent `{id, name, arguments: string}` shape regardless of which provider is configured.

## What Remains

- **Broader approval categories** (Resource, Pod) — `useRecommendationSubjects` resolves Opportunity and Course today (DOMAIN-004/006); a Resource or Pod recommendation would render in "Needs your decision" without a resolved subject line until that resolution is extended, following the exact pattern already established rather than a new mechanism.
- **Live-provider tool-calling verification** — like every other real-provider integration in this codebase, the `tools`/`tool_choice` additions to `OpenAiProvider`/`AnthropicProvider` have not been exercised against live APIs in this environment (no outbound network access here); unit-tested against mocked `fetch` responses only. An operator should perform one live text conversation with an active tool call as part of production deployment verification, mirroring the WO-023/WO-029/DOMAIN-005 recommendation.
- **Connected Experiences** — explicitly out of scope per the Founder's own framing (a distinct future Domain); this Domain's approval-boundary design was deliberately shaped so that Domain can extend "Needs your decision" without rewriting the workspace.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] From any authenticated screen, a member can open the Steward Workspace.
- [x] The workspace shows recent conversational context without navigating to `/conversation`.
- [x] The workspace shows genuine pending decisions (real `AiRecommendation`s, not placeholder data).
- [x] A typed or spoken natural-language request can safely navigate or illuminate the interface — verified for both modalities via the same shared tool contract.
- [x] The command palette is usable by keyboard alone, by touch, and via a visible control — proven by dedicated keyboard-operation and `jest-axe` tests.
- [x] Moving across domains does not lose conversation, panel, voice, or navigation context — `InterfaceContext`, `ConversationContext`, and `VoiceContext` are all app-shell-level and unaffected by route changes.
- [x] A member can review and personally authorize a pending recommendation from the workspace.
- [x] No two competing Steward interfaces are ever visible at once.
- [x] Every new component passes `jest-axe` with zero violations.
- [x] `apps/api` and `apps/web` both build, lint, and type-check cleanly; 635/635 backend tests and 363/363 frontend tests pass, including 9 new backend tests and 50 new frontend tests for this Domain.
