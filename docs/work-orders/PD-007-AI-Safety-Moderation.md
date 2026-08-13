# PD-007 — AI Safety: Content Moderation & Prompt-Injection Defense

**Status:** Complete (for text-based capabilities routed through `AiRequestsService.runCompletion()`). Voice traffic is explicitly not yet covered — see "Known limitation" below.

**Source:** `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` §PD-007; `docs/engineering/ENGINEERING-MASTER-EXECUTION-PLAN.md` Task 1.2 (Milestone 1 — Pilot Safety).

---

## Objective

Member-supplied text never reaches an AI provider (and provider output never reaches a member) without a safety check, per PD-000's own framing: *"this is the highest-severity Intelligence Layer finding in this audit: a consumer-facing AI surface with no safety layer at all."*

## What was built

- **`ModerationService`** (`apps/api/src/ai/moderation/moderation.service.ts`) — checks every `user`-role message in a completion request. Prefers the real OpenAI moderation endpoint when `AI_PROVIDER=openai` (matching `AiProviderModule`'s own selection logic exactly, so it never attempts a real network call when a different provider — or the stub — is active); falls back to a deterministic phrase-list check (`moderation-fallback.util.ts`) for Anthropic, the local/CI stub provider, and whenever the real endpoint call itself fails (a moderation-provider outage must never silently mean "unchecked").
- **Prompt-injection mitigation** (`prompt-injection.util.ts`) — every `user`-role message is wrapped in clearly-delimited untrusted-content markers and has known instruction-override phrases ("ignore previous instructions," etc.) neutralized to a visible marker before the provider call. Applied only to the payload sent to the provider — never to what is persisted in the database.
- **Wired into the single existing choke point** (`AiRequestsService.runCompletion()`), per PD-007's own instruction — every capability that calls it (Conversations, Insights, Recommendations, the Orchestrator, Pod Insights) gets both defenses automatically, with no per-capability changes required.
- **A new, distinct audit status** — `AiRequestStatus.MODERATION_BLOCKED` (migration `20260725114329_add_ai_moderation_blocked_status`) — so a moderation block is never conflated with a normal `SUCCESS` or `FAILED` request in the audit log or cost dashboard. A blocked request is logged with 0 tokens/cost and never reaches the provider.
- **Never throws** — `recordModerationBlock()` returns a normal `CompletionResult` (a safe refusal message + a real `requestId`), so every existing call site handles a moderation block exactly like a successful reply, with zero changes required upstream.
- **Self-harm-specific honesty** — when the flagged category includes `self-harm`, the refusal reuses `CRISIS_REDIRECT_MESSAGE` verbatim (the same real 911/988/Crisis Text Line copy Gate C's `C3`/`C7` and `UrgentHelpAffordance` already use), rather than a generic refusal, per this repository's own established convention of never restating crisis-safety copy differently in different places.
- **PII-handling policy, documented rather than engineered here** — member content is not scrubbed for PII before this call; retention/deletion of that data is `PD-010`'s scope (already named as a separate, not-yet-started item in the Master Execution Plan), not this method's.

## Known limitation (stated plainly, not silently expanded around)

`VoiceSessionService` does not call `AiRequestsService.runCompletion()` — it writes directly to the AI request repository via its own realtime provider broker. This moderation layer therefore does **not** yet cover Voice traffic. Closing that gap is a separate, larger integration effort against Voice's realtime broker (a different architecture, not a simple "call `runCompletion()` instead"), and is tracked as follow-up work rather than expanded into silently in this pass.

## Files changed

- `prisma/schema.prisma` (+migration `20260725114329_add_ai_moderation_blocked_status`)
- `apps/api/src/ai/moderation/moderation-fallback.util.ts` (new)
- `apps/api/src/ai/moderation/prompt-injection.util.ts` (new)
- `apps/api/src/ai/moderation/moderation.service.ts` (new)
- `apps/api/src/ai/requests/ai-requests.service.ts` (moderation check + wrapping + `recordModerationBlock`)
- `apps/api/src/ai/ai.module.ts` (registered `ModerationService`)
- `apps/web/lib/api/ai-requests.ts` (extended `AiRequestStatus` union)

## Tests

29 new tests total: `moderation-fallback.util.spec.ts` (8), `prompt-injection.util.spec.ts` (7), `moderation.service.spec.ts` (8) — all new files — plus 5 new tests in the existing `ai-requests.service.spec.ts` (prompt-injection wrapping, the moderation-block path, self-harm-specific vs. generic refusal copy, and spend-ceiling-before-moderation ordering), plus 1 new e2e test in `ai.e2e.spec.ts`. The e2e test calls `AiRequestsService` through the app's real DI container rather than the rate-limited `POST /ai/conversations/:id/messages` HTTP route — deliberately, since this file's 18 existing message-posting calls already run close to that route's shared `@Throttle` budget within one 60-second window; the full HTTP path is already proven by every other passing Conversations e2e test.

## Validation

- Full `apps/api` suite: 125 suites, 1297 tests — 1290 passing, only the same 7 pre-existing, unrelated Voice Domain failures remaining (unchanged from the baseline documented in every prior work order this session).
- `tsc --noEmit`, `eslint --max-warnings=0`, `nest build` all clean.
- No frontend behavior change beyond the `AiRequestStatus` type extension (no exhaustive switch over that type was found anywhere in `apps/web`).

## Production risk addressed

Was **Critical** (PD-000's own rating) — the single largest AI-safety gap in the repository. Now closed for every text-based capability; Voice remains open, tracked above.
