# Voice Safety Integration Plan (Task 1.3A)

| Field | Value |
|---|---|
| Status | Proposed — design only, no implementation |
| Date | 2026-07-25 |
| Domain | AI Safety (PD-007 remainder) × Voice (ADR-017) |
| Authority | `docs/work-orders/PD-007-AI-Safety-Moderation.md`, `docs/architecture/ADR-017-Voice-Domain-Backend.md`, `docs/architecture/ADR-015-AI-Intelligence-Engine.md`, `docs/frontend/canon/AFX-003-Voice-and-Presence-Canon.md`, `docs/engineering/ENGINEERING-MASTER-EXECUTION-PLAN.md` Task 1.2 |

This document is a plan, not a change. No production code, schema, or test file is modified by this pass. It exists to answer one question precisely: **how does Voice become another consumer of the moderation system PD-007 already built, instead of growing a second one?**

---

## 1. Executive Summary

PD-007 closed the largest AI-safety gap in the repository for every *text* capability by placing `ModerationService` and prompt-injection wrapping inside `AiRequestsService.runCompletion()` — the one place all text-based AI calls already pass through. Voice does not pass through that method. `VoiceSessionService` brokers an ephemeral OpenAI Realtime credential and the member's browser then speaks **directly** to OpenAI over WebRTC (`ADR-017` Decision 1: "no backend audio proxy"). The backend is architecturally blind to the live turn — it has no man-in-the-middle position to inspect or block content before the model responds, the way `runCompletion()` does for text.

This is not a gap this plan proposes to close by adding a parallel Voice moderation system, and it is not a gap that can be closed to full parity with text without reversing a named, deliberate Founder decision (no audio proxy) that this plan does not recommend reopening.

What **is** available, using entirely existing services and zero new moderation logic: `VoiceSessionService.syncEvents()` is Voice's own choke point — every finalized member utterance passes through it exactly once, the same way every text message passes through `runCompletion()` once. Running the existing `ModerationService.checkMessages()` and the existing `isCrisisLanguage()` check against each finalized `USER`-role message at sync time, and ending the session server-side on a flag, gives Voice the same detection logic text already has. The difference is timing and consequence: text detection is **preventive** (the provider is never called); Voice detection is necessarily **reactive** (the member has already heard a response, because Decision 1 means the backend only ever sees a turn after it happened). That timing difference is a direct, honest consequence of the existing architecture, not a shortcoming of this plan.

**Recommended path:** a small, additive, backend-only Phase 1 — reuse `ModerationService` + `isCrisisLanguage()` inside `syncEvents()`, add one new `VoiceSessionEndReason` value, and end the session on a flag — deployable independent of any frontend change, with a Phase 2 frontend follow-up so the member sees a safety-specific message rather than a generic "session ended." Full detail in §6–§12.

---

## 2. Current Voice Request Flow

Source: `apps/api/src/ai/voice/voice-session.service.ts`, `voice.controller.ts`, `openai-voice.provider.ts`, `ADR-017`.

1. **`POST /ai/voice/sessions` → `startSession()`** — resolves or creates the canonical `AiConversation` (one Steward, one conversation regardless of modality — ADR-017 Decision 2), ends any existing active session for the member (`RECONNECT_SUPERSEDED`), then calls `IVoiceProvider.brokerSession()`. `OpenAiVoiceProvider` exchanges the backend's permanent `OPENAI_API_KEY` for a short-lived `client_secret` via `POST https://api.openai.com/v1/realtime/sessions`, passing `instructions` (`VOICE_ASSISTANT_SYSTEM_PROMPT`), a mandated `turn_detection` policy (`voice-timing-policy.ts` — client cannot override), and the shared Dynamic Screen Orchestration toolset (`voice-tools.ts`). One `AiRequest` audit row is written (`capability: VOICE_CONVERSATION`, 0 tokens/cost — an authorization event, not a token meter, per ADR-017 Decision 6).
2. **Browser ↔ OpenAI, direct WebRTC** — using the ephemeral `client_secret`. The backend is not in this path at all. It never sees audio, and never sees the live text of either side of the turn as it happens.
3. **`POST /ai/voice/sessions/:id/events` → `syncEvents()`** — the client reports **finalized-only** turn events and messages after the fact (ADR-017 Decision 3: no partial/draft variant exists). A `USER` message can only be persisted if a `MEMBER_TURN_FINALIZED` `AiTurnEvent` with the same `providerItemId` already exists — the backend, not client claims or silence, is the arbiter of a completed turn (ADR-017 Decision 4). Persisted messages become ordinary `AiMessage` rows in the same conversation text uses.
4. **`POST /ai/voice/sessions/:id/end` → `endSession()`** — idempotent, member-initiated or system-initiated (duration limit, reconnect-supersede) close.

**The one fact everything else in this plan follows from:** by the time any backend code runs, the member has already heard whatever the model said. `syncEvents()` is a post-hoc ledger write, not a pre-flight gate.

---

## 3. Current AI Request Flow (Text)

Source: `apps/api/src/ai/conversations/conversations.service.ts`, `apps/api/src/ai/requests/ai-requests.service.ts`, `apps/api/src/needs/crisis-detection.util.ts`.

1. **`ConversationsService.ask()`** persists the member's message, then runs **Gate C's own crisis check** first and separately: `isCrisisLanguage(dto.content)` — a deterministic phrase list (`crisis-detection.util.ts`) — checked *before* anything reaches the AI provider at all. On a match, the AI is never called; `CRISIS_REDIRECT_MESSAGE` (real 911/988/Crisis Text Line copy) is persisted directly as the assistant turn.
2. If not crisis language, the flow proceeds (through ambiguity-clarification, etc.) to **`AiRequestsService.runCompletion()`** — the single choke point shared by Conversations, Insights, Recommendations, the Orchestrator, and Pod Insights.
3. Inside `runCompletion()`: spend-ceiling enforcement → **`ModerationService.checkMessages()`** (checks every `role: 'user'` message only — assistant output is not separately re-checked) → on a flag, `recordModerationBlock()` writes a distinct `AiRequestStatus.MODERATION_BLOCKED` row and returns a safe refusal (`CRISIS_REDIRECT_MESSAGE` again, verbatim, if the flagged category is `self-harm`; a generic refusal otherwise) **without ever calling the provider** → if not flagged, **`wrapUntrustedUserContent()`** delimits/neutralizes prompt-injection patterns in `user`-role messages only, immediately before `provider.complete()`.

**Two things worth naming plainly, because they matter for §14:**

- There are already **two** places that know about crisis language today: `ConversationsService.ask()`'s own `isCrisisLanguage()` check, and `AiRequestsService.recordModerationBlock()`'s self-harm-category branch (which reuses `CRISIS_REDIRECT_MESSAGE` but does not call `isCrisisLanguage()` itself — it relies on `ModerationService`'s `self-harm` category instead). Voice would be a **third** call site if it invokes `isCrisisLanguage()` directly. This is a pre-existing minor duplication, not something this plan introduces, but Voice integration is a natural point to ask whether it should finally be consolidated (see §14, Open Question 4).
- `ModerationService.checkMessages()` only inspects `role: 'user'` content. Provider (assistant) output is never separately re-checked in the text pipeline today. Any Voice design should match this existing scope exactly rather than silently expanding it — checking only synced `USER`-role messages is parity with the current system, not a gap relative to it.

---

## 4. Shared Components

These already exist, are already tested, and are the components this plan proposes Voice call directly — no forking, no re-implementation:

| Component | File | Reused as-is? |
|---|---|---|
| `ModerationService.checkMessages()` | `apps/api/src/ai/moderation/moderation.service.ts` | Yes — takes `AiCompletionMessage[]`, provider-agnostic |
| `checkContentFallback()` / `ModerationCategory` | `apps/api/src/ai/moderation/moderation-fallback.util.ts` | Yes — deterministic, no network dependency |
| `isCrisisLanguage()` / `CRISIS_REDIRECT_MESSAGE` | `apps/api/src/needs/crisis-detection.util.ts` | Yes — pure function, no side effects |
| `AiConversation` / `AiMessage` | Prisma schema | Already shared (ADR-017 Decision 2) — Voice already writes into the same tables text does |
| `AiRequest` audit ledger | `apps/api/src/ai/requests/repositories/ai-request.repository.interface.ts` | Already shared — Voice already writes `AiRequest` rows (session-start events) |

Not reused, and not proposed to be: `wrapUntrustedUserContent()` / `neutralizeInjectionAttempts()` (`prompt-injection.util.ts`). These wrap content **immediately before a `provider.complete()` call this repository's backend makes**. Voice's backend never makes that call — the browser talks to OpenAI directly — so there is no request payload for this backend to wrap. This utility remains fully applicable to any text turn a member takes in the *same* conversation (ADR-017 Decision 2's shared history means a member who switches from voice to text mid-conversation already gets full PD-007 coverage on that text turn, today, with zero extra work — a real existing strength worth noting).

---

## 5. Voice-Specific Components

These are Voice's own, and should stay Voice's own — none of them are safety logic, so none of them are candidates for consolidation:

- `IVoiceProvider` / `OpenAiVoiceProvider` / `StubVoiceProvider` — session-broker shape (`brokerSession`), deliberately parallel to but not merged with `IAiProvider` (ADR-017 Decision 8). Not a completion call; nothing to moderate at broker time beyond the fixed, backend-owned `instructions`/`tools` payload, which contains no member content.
- `AiVoiceSession` / `AiTurnEvent` models and their repositories — timing/session-lifecycle bookkeeping, not content safety.
- `voice-timing-policy.ts` — VAD/turn-detection configuration, unrelated to content moderation.
- `VoiceSessionEndReason` enum and the session-lifecycle rules in `VoiceSessionService` (duration limit, reconnect-supersede, member-ended) — this is the natural extension point for a new safety-driven end reason (see §7).

---

## 6. Proposed Unified Architecture

**Principle:** Voice becomes a second caller of `ModerationService` and `isCrisisLanguage()`, invoked from `VoiceSessionService.syncEvents()` instead of `AiRequestsService.runCompletion()`. No new moderation categories, no new phrase lists, no new refusal copy. What differs is only the *action taken on a flag*, because Voice cannot "not call the provider" — the provider has already been called and already answered, by construction (Decision 1).

**Flow, once implemented:**

1. `syncEvents()` receives finalized messages as it does today.
2. For each `USER`-role message in the batch, before (or immediately after) persisting it: map Voice's DTO shape (`role: 'USER' | 'ASSISTANT'`, Prisma-enum-cased) to `AiCompletionMessage`'s shape (`role: 'user' | 'assistant'`, lowercase — a one-line adapter, not a rewrite; see §7.2) and run `isCrisisLanguage()` first (matching `ConversationsService.ask()`'s own ordering and priority), then `ModerationService.checkMessages()` for everything else.
3. On a flag: the message is still persisted (Gate C precedent never suppresses the record of what was said — it responds to it, it doesn't hide it), a distinct audit event is written, and the session is ended server-side via the existing `voiceSessionRepo.end()` path with a new, distinct `VoiceSessionEndReason` (see §7.1) rather than `MEMBER_ENDED`/`DURATION_LIMIT`. The provider-side realtime session is not separately revoked by this backend (it already isn't, for any end reason today — Decision 1's boundary again), but the member cannot continue syncing further turns against this backend session once ended, exactly as duration-limit enforcement already works.
4. The response to that `syncEvents()` call carries enough information for the frontend to distinguish "your session ended because you were flagged" from "your session ended because time ran out" — an additive field on the existing response DTO, not a breaking change (see §7.2).

**Defense-in-depth options considered and scoped out of the core recommendation** (listed for completeness, not proposed as required work):

- **Hardening `VOICE_ASSISTANT_SYSTEM_PROMPT`'s realtime `instructions`** with an explicit refusal clause. Cheap, additive, zero schema impact — but it is model-obedience-based, not deterministic, so it supplements `ModerationService` rather than substituting for it. Reasonable Phase 3 addition (§12), not required for the core integration.
- **Provider-native moderation/safety behavior** (OpenAI's own Realtime model training and any server-side moderation surface it may expose) already exists independent of this repository's code and cannot be relied upon as sufficient, since it is not something this codebase controls, tests, or can guarantee — noted as an existing, uncontrolled layer, not counted as coverage.

---

## 7. Required Repository Changes

None of the following are implemented by this pass. Each is scoped to be the smallest unit that delivers the integration described in §6.

### 7.1 — Add `VoiceSessionEndReason.SAFETY_FLAGGED` (or equivalent name — see §14 Open Question 1)

- **Reason:** Distinguishes a moderation/crisis-triggered session end from `MEMBER_ENDED`, `TIMEOUT`, `DURATION_LIMIT`, `ERROR`, `RECONNECT_SUPERSEDED` in the audit trail — mirrors exactly how PD-007 added `AiRequestStatus.MODERATION_BLOCKED` rather than overloading `FAILED`.
- **Dependencies:** None. Independent of every other change listed here structurally, though it's only meaningful once §7.2 writes it.
- **Deployment risk:** Minimal. Purely additive Postgres enum value (`ALTER TYPE ... ADD VALUE`), same migration shape as `20260725114329_add_ai_moderation_blocked_status`. No backfill; existing rows are untouched.
- **Rollback strategy:** An additive enum value cannot be safely removed in Postgres without a full enum rebuild; the established rollback pattern in this repository (per PD-007's own migration) is "leave the unused value in place" rather than a down-migration — consistent, not a new risk.
- **Estimated effort:** Trivial (well under half a day; mechanical).

### 7.2 — `VoiceSessionService.syncEvents()`: invoke `ModerationService` + `isCrisisLanguage()` per finalized `USER` message

- **Reason:** This is the actual integration — closes the detection gap using existing logic, at Voice's one real choke point.
- **Dependencies:** §7.1 (needs the new end-reason value to act on a flag distinctly). Requires a small role-shape adapter (`'USER'` → `'user'`, uppercase Prisma-style DTO role → lowercase `AiCompletionMessage` role) since `VoiceMessageEventDto.role` and `AiCompletionMessage.role` are different, deliberately-not-unified types today (§3, second callout) — this adapter is new code but is a type mapping, not new safety logic.
- **Deployment risk:** Low-Medium. This changes response-time behavior of an already-authenticated, per-member, rate-limited endpoint (`@Throttle({limit: 60, ttl: 60_000})` per `voice.controller.ts`) by adding one or two additional synchronous checks (`isCrisisLanguage()` is pure/instant; `ModerationService.checkMessages()` may call OpenAI's moderation endpoint if `AI_PROVIDER=openai`, or fall back deterministically otherwise — same latency profile PD-007 already accepted for text). The main risk is behavioral, not availability: an abrupt session end is a more disruptive UX interruption for a live, synchronous voice conversation than a text refusal is for an async chat turn — flagged explicitly in §13, not something to silently accept.
- **Rollback strategy:** Feature is naturally reversible by removing the call site in `syncEvents()` (a code revert), since no schema removal is required to disable it — the new enum value simply goes unused again.
- **Estimated effort:** Small-Medium (1-2 engineer-days including the adapter, the end-reason wiring, and updating `SyncVoiceEventsResponseDto`/its DTO to carry the distinction — see §7.4).

### 7.3 — Decide and implement the audit-row semantics for a flagged voice turn

- **Reason:** A flagged voice turn is not "a completion that was never made" (the model already answered) the way `AiRequestStatus.MODERATION_BLOCKED` currently means for text — reusing that status verbatim would be a semantic stretch of an already-shipped, precisely-scoped meaning. This needs a decision, not a default: reuse `MODERATION_BLOCKED` with the understanding that "blocked" broadens slightly to mean "flagged and acted upon," or add a distinct value. Left open deliberately — see §14 Open Question 1.
- **Dependencies:** §7.1, §7.2.
- **Deployment risk:** Minimal either way — this is an audit-log semantics choice, not a behavioral one.
- **Rollback strategy:** Same as §7.1 if a new enum value is chosen; trivial code change if reusing the existing value.
- **Estimated effort:** Trivial once decided; the decision itself is the actual cost (Founder/engineering call, not implementation work).

### 7.4 — Extend `SyncVoiceEventsResponseDto` (or the `end` endpoint's status DTO) so the frontend can distinguish a safety-ended session

- **Reason:** Without this, the frontend's `VoiceContext` state machine sees an ended session with no way to differentiate "time ran out, reconnect" from "you were flagged" — a materially different, and more important, message to get right for the member.
- **Dependencies:** §7.1, §7.2.
- **Deployment risk:** Low — additive field on an existing response DTO, consistent with how `VoiceSessionStatusResponseDto.fromEntity()` already surfaces `endedAt`/end-reason-shaped data today.
- **Rollback strategy:** Additive field; a frontend that ignores it degrades gracefully to today's generic "session ended" handling.
- **Estimated effort:** Small (bundled with §7.2's estimate above, or a few additional hours if scoped separately).

### 7.5 — Frontend: `VoiceContext` / Voice UI handling for a safety-ended session

- **Reason:** A member whose voice session is abruptly ended for a safety reason needs a message at least as clear and humane as the existing text-path `CRISIS_REDIRECT_MESSAGE` / `UrgentHelpAffordance` treatment — not a bare "connection lost" state.
- **Dependencies:** §7.4.
- **Deployment risk:** Low, frontend-only, but this is a real UX design decision, not a mechanical wiring task — see §13 and §14 Open Question 2 before committing effort here.
- **Rollback strategy:** Frontend-only change; revertible independent of the backend work.
- **Estimated effort:** Not yet estimable — depends on the UX decision in §14 Open Question 2 (a silent hard end vs. a designed redirect experience are very different amounts of work).

### 7.6 — Documentation: ADR addendum + PD-000/PD-007/Master Execution Plan cross-references

- **Reason:** `ADR-017` is `Status: Accepted` — this repository's own convention (observed throughout `docs/architecture/`) is to record new decisions as an addendum or a new ADR that supersedes/extends an accepted one, not to silently edit accepted history. A short new ADR entry ("ADR-017 Addendum: Voice Safety Integration" or a standalone ADR referencing it) should record the `VoiceSessionEndReason` addition and the reasoning in §6 once implemented.
- **Dependencies:** Implementation of §7.1–7.5 (or at least a Founder-approved subset).
- **Deployment risk:** None — documentation only.
- **Rollback strategy:** N/A.
- **Estimated effort:** Trivial, folds into the implementation task's own documentation step (this repository's established per-PD readiness-report convention).

---

## 8. Security Considerations

- **Residual exposure window is real and architecture-bound.** Because detection is necessarily post-hoc (§2, §6), an unsafe model response may already have been spoken aloud — audibly, to the member and to anyone nearby — before any backend code runs. This plan reduces the exposure to "one turn, then the session ends," not to zero. Closing it to zero would require reversing ADR-017 Decision 1 (backend audio proxy), which this plan explicitly does not recommend (see §15) given the operational cost the Founder already weighed and rejected once.
- **Prompt-injection has no live-turn mitigation for Voice**, and cannot, for the same structural reason `wrapUntrustedUserContent()` doesn't apply here (§4): this backend never constructs the request the model responds to in real time. The one thing this plan can honestly claim is that any *subsequent text turn* in the same conversation is already fully covered, today, by the existing text pipeline.
- **PII-handling policy is unaffected and unchanged** — PD-007's own item 3 (no pre-hoc PII scrubbing; retention/deletion is PD-010's scope) applies identically to synced voice transcripts, since they become ordinary `AiMessage` rows.
- **No new privileged surface.** Nothing proposed here grants Voice any authority it doesn't already have — ADR-017 Decision 5 ("Voice grants no tool/action permission beyond what authenticated text conversation already has") is preserved; ending a session is already something the backend does today for other reasons.
- **Fallback-must-never-mean-pass** convention (established in `ModerationService.fallbackAfterProviderFailure()`) carries over unchanged — see §9.

---

## 9. Failure Scenarios

| Scenario | Behavior |
|---|---|
| `ModerationService`'s real OpenAI-moderation-endpoint call fails or times out during `syncEvents()` | Falls back to the deterministic phrase-list check, exactly as it already does for text (`fallbackAfterProviderFailure()`) — a moderation-provider outage must never silently mean "unchecked," and this is inherited for free since it's the same service. |
| Client never calls `syncEvents()` at all (network partition, crash, browser closed mid-session) | The unsafe (or safe) exchange that happened live is never seen by the backend at all — a hard, pre-existing limit of Decision 1's architecture, not something this plan can detect or mitigate. Worth naming explicitly rather than implying this design catches everything. |
| `syncEvents()` flags a message and the session-end write itself fails partway (e.g., DB hiccup between persisting the message and ending the session) | Should follow the same pattern `assertWithinDurationLimit()` already uses: end-then-throw, so a retried/duplicate sync call is safe — idempotency already exists on `(voiceSessionId, providerItemId)` for messages and turn events, so a retried flagged message does not get re-flagged-and-re-ended in a way that breaks anything; it should simply find the session already ended. |
| The realtime provider's own model ignores or overrides the hardened `instructions` safety clause (§6, defense-in-depth) | Expected and tolerated — that clause is explicitly scoped as soft, best-effort mitigation, not a control this design counts as coverage (§6, §8). |
| A false positive ends a live, benign voice session | Materially worse UX than a false-positive text refusal, because it terminates a synchronous, felt-as-personal conversation rather than declining one async message — flagged as a risk requiring product sign-off (§13), not treated as a solved problem by this plan. |

---

## 10. Testing Strategy

Mirrors the testing approach PD-007 already established and validated:

- **Unit tests** on the new `syncEvents()` branch, structured like `moderation.service.spec.ts` and the 5 new tests added to `ai-requests.service.spec.ts` for PD-007: benign content persists and the session continues; self-harm-category content ends the session with the correct end reason and persists the message unmodified; a moderation-provider failure falls back to the deterministic check rather than silently passing; non-`USER`-role messages in the same sync batch are not checked (parity with §3's existing scope).
- **e2e test** using the exact technique PD-007's own `ai.e2e.spec.ts` established for this reason: call the real, DI-wired `VoiceSessionService` directly via `app.get(VoiceSessionService)` against a real Postgres-backed test app, rather than through the HTTP route — `voice.controller.ts`'s `:id/events` route carries its own `@Throttle({limit: 60, ttl: 60_000})`, and this repository already has a documented precedent (PD-007) for preferring direct-service e2e invocation over consuming a shared throttle budget shared with other tests in the same file.
- **Regression coverage**: the existing `voice-session.service.spec.ts` and `voice.integration.spec.ts` suites must continue to pass unmodified in their non-safety-related assertions (turn-finalization enforcement, idempotency, duration-limit handling) — this integration must not change any behavior for a normal, unflagged session.
- **Fixture reuse**: the same phrase-list fixtures already used in `moderation-fallback.util.spec.ts` and `moderation.service.spec.ts` should be reused verbatim for Voice's tests rather than re-authored, keeping exactly one source of truth for "what counts as flagged content" in the test suite as well as the implementation.

---

## 11. Migration Plan

- The only schema change is the additive `VoiceSessionEndReason` enum value from §7.1 — same low-risk shape as the `MODERATION_BLOCKED` migration this session already shipped and validated in production-shaped CI.
- No backfill is needed or proposed: historical `AiVoiceSession` rows keep their existing end reasons; the new value only ever applies going forward.
- No breaking API contract change is required for the core detection logic (§7.1–7.3) to ship; §7.4's additive response field can ship in the same deploy or a subsequent one without coordination risk, since an old frontend build simply ignores an unrecognized field.
- The feature can be deployed dark: shipping §7.1–7.4 with the frontend not yet updated (§7.5 pending) is safe — a flagged session still ends correctly and is still audited correctly; the member just sees today's generic "session ended" UI until §7.5 lands, which is strictly better than the current state (no detection at all), not a regression.

---

## 12. Implementation Phases

- **Phase 0 (this document):** design only, no code, no schema, no tests. Complete.
- **Phase 1 — backend detection + enforcement (§7.1, §7.2, §7.3):** the core integration. Backend-only, deployable independently, low-medium risk, small-medium effort. Delivers the actual safety improvement.
- **Phase 2 — frontend awareness (§7.4, §7.5):** teaches the client to distinguish and humanely present a safety-ended session instead of a generic one. Should follow Phase 1 once the UX question (§14 Open Question 2) is resolved with product/Founder input.
- **Phase 3 — defense-in-depth (optional, not required for closure):** harden `VOICE_ASSISTANT_SYSTEM_PROMPT`'s realtime `instructions` with an explicit refusal clause; revisit whether OpenAI's Realtime API has grown a server-side moderation or usage-webhook surface since ADR-017 was written (ADR-017 §Consequences already flags this as worth revisiting). Independent of Phases 1-2; can run in parallel or be deferred indefinitely without blocking closure of the core gap.
- **Phase 4 — deferred, contingent on the realtime provider's own roadmap:** if/when a realtime provider exposes a way for the backend to intervene *during* a live turn (not just after), this plan's core constraint (§2, §6) changes and should be revisited. Not started, not estimable, explicitly out of scope now.

---

## 13. Risks

- **Residual audible-exposure window** (§8) — accepted, bounded, not eliminated; the honest ceiling of what's achievable without reversing Decision 1.
- **Abrupt session termination is a worse interruption than a text refusal.** A live voice conversation is synchronous and felt as more personal than an async chat turn; ending it outright on a flag is a real product/UX cost that engineering should not decide unilaterally (§14 Open Question 2).
- **False positives inherit the fallback phrase-list's known crudeness** — `moderation-fallback.util.ts`'s own code comments already document that the `hate` category, for instance, deliberately enumerates no real slurs and is conservative/incomplete. This weakness is inherited by Voice, not introduced by it, but ending a live session on a fallback-check false positive is a more visible failure mode than a text refusal is.
- **Scope-creep temptation.** The most complete fix — a backend audio/text proxy giving true pre-flight interception — is tempting precisely because it would give Voice full parity with text. It is explicitly not recommended here: ADR-017 already weighed and rejected this ("this V1 has no operational capacity to run" a media-relay component), and nothing about the safety gap changes that operational reality.
- **Enum/status naming, if rushed, creates the same kind of ambiguity PD-007 deliberately avoided** by not overloading `FAILED` with `MODERATION_BLOCKED`'s meaning — §7.3's decision should be made carefully, not defaulted into.

---

## 14. Open Questions

1. **Audit semantics (§7.3):** should a flagged voice turn reuse `AiRequestStatus.MODERATION_BLOCKED` (broadening its meaning slightly to "flagged and acted upon," not only "never sent to the provider"), or should a new, Voice-specific status be added? Recommend deciding this explicitly before Phase 1 implementation begins, not defaulting either way silently.
2. **Product/UX decision, not an engineering one:** is an abrupt, backend-forced session end the acceptable member experience for a flagged voice turn, given the backend has no way to inject a softer, mid-stream spoken redirect (the same Decision 1 boundary applies to any hypothetical "gentle interruption" — the backend cannot make the model say something specific mid-turn any more than it can block it)? This needs Founder/product sign-off before §7.5 is scoped, since the two possible answers (accept the hard end vs. invest in something more sophisticated that may not be technically possible under the current architecture) lead to very different amounts of frontend work.
3. **Consolidating crisis-detection's call sites (§3):** Voice would be a third place invoking `isCrisisLanguage()`/`CRISIS_REDIRECT_MESSAGE` logic (alongside `ConversationsService.ask()` and `AiRequestsService.recordModerationBlock()`'s self-harm branch). Is this the point at which `isCrisisLanggauge` should be folded into `ModerationService`/`checkContentFallback()` as a first-class, always-checked category — giving the whole platform exactly one authority for crisis detection, called from exactly one place, mirroring the "single choke point" philosophy PD-007 itself established for moderation broadly — rather than three independent call sites that all happen to agree today? Recommend raising this with whoever owns Task 1.2/PD-007 follow-up before Phase 1, since it changes where §7.2's code should actually live.
4. **OpenAI Realtime API's server-to-client control surface:** can this backend's `end()` call cause anything to be communicated to the client mid-session beyond the client's own next poll/event discovering the session is gone, or is a graceful, spoken close entirely out of reach regardless of backend design? This is a factual question about the provider's API, not a design choice, and needs a research spike against current OpenAI Realtime API documentation before §7.5 is scoped in detail.
5. **Rate/cost of running `ModerationService.checkMessages()` per synced batch** — Voice's `syncEvents()` may carry multiple messages per call; whether to batch them into one moderation check (cheaper, matches how the real OpenAI moderation endpoint already accepts an array of inputs — see `moderation.service.ts`'s `checkViaOpenAi()`) or check them individually as they're persisted (simpler control flow, matches the existing per-message loop already in `syncEvents()`) is an implementation detail worth deciding at Phase 1 build time, not here.

---

## 15. Final Recommendation

Proceed with **Phase 1 only** as the next concrete increment, once Open Questions 1 and 3 (both small, fast decisions) are resolved:

- Add `VoiceSessionEndReason`'s new value (§7.1).
- Call `ModerationService.checkMessages()` and `isCrisisLanguage()` against every finalized `USER`-role message inside `syncEvents()` (§7.2), reusing 100% of PD-007's existing logic with a small role-shape adapter.
- Write the audit row per the decision from Open Question 1 (§7.3).

This delivers the actual safety improvement — detection, using the platform's one existing safety authority, at Voice's one real choke point — without inventing a second moderation system, without touching the frontend, and without reopening ADR-017's audio-proxy decision. Phase 2 (frontend awareness, §7.4–7.5) should follow once Open Question 2 (the product/UX call on abrupt session termination) is answered, since that answer determines how much frontend work is actually warranted. Phase 3 (defense-in-depth) and Phase 4 (provider-roadmap-contingent) are explicitly optional and not required to consider PD-007's Voice remainder closed to the standard the text pipeline already meets.

Until Phase 1 ships, `docs/work-orders/PD-007-AI-Safety-Moderation.md`'s "Known limitation" section and the corresponding note in `docs/engineering/ENGINEERING-MASTER-EXECUTION-PLAN.md` Task 1.2 remain accurate as written and should not be marked resolved.
