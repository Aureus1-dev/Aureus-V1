# PD-009 — AI Provider Resilience & Cost Governance Maturity

**Status:** Complete for the scope defined below (Task 2.4, Engineering Master Execution Plan).

**Source:** `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` §PD-009; `docs/engineering/ENGINEERING-MASTER-EXECUTION-PLAN.md` Task 2.4.

---

## Objective

A transient provider outage degrades gracefully instead of hard-failing every AI request, and cost governance is proactive rather than purely reactive — per PD-000's own framing.

## Repository evidence reviewed before implementing

Confirmed directly by reading the codebase (not assumed) before writing any code, per this session's standing instruction to identify what already exists:

- `OpenAiProvider`/`AnthropicProvider` (`apps/api/src/ai/providers/*.provider.ts`) were single bare `fetch()` calls — no `AbortController`/timeout, no retry, no backoff. Confirmed via direct read; no existing retry/circuit-breaker infrastructure existed anywhere in the repository (grep for "retry", "backoff", "circuit" returned zero hits outside this task's own new files).
- `AiProviderModule`'s factory (`ai-provider.module.ts`) selected exactly one concrete `IAiProvider` and handed it to `AI_PROVIDER` — no fallback path existed despite both OpenAI and Anthropic providers already being wired.
- `AiRequestsService.runCompletion()` (ADR-015 Decision 3) is the single choke point every text-based AI capability already routes through; `enforceSpendCeilings` (PR-002/PR-003) already enforced an emergency stop, a platform-wide daily budget, and a per-user daily budget — but never a per-capability sum, confirmed by reading the method in full. `AiRequestsService.getSpendByCapability()` (PR-004) is visibility-only, never read by the enforcement path.
- `VoiceSessionService.startSession()` (ADR-016/017) does **not** call `runCompletion()` at all — Voice brokers a realtime session directly and writes its own `AiRequest` audit row with `costUsd: 0` (ADR-017 Decision 6: "realtime usage happens directly between client and provider," a documented, deliberate architectural limitation, not an oversight). Reading this in full surfaced a real defect out of scope on paper but squarely inside "Cost Governance Maturity": `VoiceSessionService` had **zero** integration with `AiOperationalConfigService` — the emergency stop and the existing platform-wide/per-user ceilings silently did not apply to Voice at all. Fixed as part of this task (see below) rather than left for a later PD, since PD-009's own acceptance criterion explicitly asks for a per-capability ceiling "demonstrated on Voice."
- No `@nestjs/terminus` health indicator existed for AI provider state — only `PrismaHealthIndicator` (PD-002), confirmed by reading `health.module.ts`/`health.controller.ts`.
- `.env.example` / `env.validation.ts` had no resilience-tuning env vars — confirmed by reading both files in full.

## Why the change is needed

With real users, transient provider hiccups (which happen regularly with both OpenAI and Anthropic) currently surfaced as hard user-facing 503s with no resilience whatsoever, and one runaway AI capability (particularly Voice, given its cost-per-minute profile) could not be capped independently of the platform-wide ceiling. PD-000 rated this **High** production risk.

## What was built

**Structured error classification** (`apps/api/src/ai/providers/resilience/provider-error.util.ts`) — a small `ProviderErrorCategory` union (`timeout` / `network_error` / `rate_limited` / `server_error` / `client_error` / `circuit_open` / `unknown`) and an `isRetryableCategory()` gate: only `timeout`, `network_error`, `rate_limited`, and `server_error` are ever retried. A `client_error` (bad request, invalid API key, etc.) is never retried, since the identical request would fail identically every time.

**Configurable timeout + bounded retry-with-backoff** (`resilient-fetch.util.ts`) — wraps the platform `fetch` with an `AbortController`-based per-attempt timeout and exponential backoff with jitter, gated by the classification above. Both `OpenAiProvider` and `AnthropicProvider` now call this instead of `fetch` directly, so the policy is defined once and cannot drift between the two providers (reusing existing infrastructure, not duplicating it).

**Circuit breaker** (`circuit-breaker.ts`) — a standard closed/open/half-open state machine, one instance per provider (a Nest singleton, so shared across every request that hits that provider). A provider already known to be down fails fast (`circuit_open`, never retried) instead of repeating the full timeout+retry cost on every subsequent request. Configurable failure threshold and cooldown.

**Cross-provider fallback** (`fallback-ai.provider.ts`) — `FallbackAiProvider` implements the exact same `IAiProvider` interface as every other concrete provider. `AiProviderModule`'s factory now wraps the selected provider in `FallbackAiProvider` only when *both* `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are configured; otherwise behavior is unchanged from before this task. The two sub-providers are tried strictly in **sequence, never concurrently** — this is explicitly a fallback, not a race, and `AiRequestsService` still only ever holds and calls one `IAiProvider` — no parallel AI execution path was introduced, per this task's own constraint.

**Health monitoring** (`AiProviderHealthIndicator`, new `GET /health/ai`) — reports each *configured* provider's circuit-breaker state. Deliberately **not** part of `/health/ready`: most member-facing routes don't depend on AI, so a transient AI outage (exactly what this task exists to help survive) must never pull the whole app out of a load balancer's rotation. It's a diagnostic endpoint, not a readiness gate.

**Per-capability budget ceiling** (`AiCapabilityBudget` model, new `AiOperationalConfigService`/controller methods, `AiRequestsService.enforceCapabilityCeiling`) — an additive sibling to the existing platform-wide/per-user ceilings, each independently configurable per `AiCapability` with two optional, independent levers: a daily dollar ceiling and a daily request-count ceiling. The dollar lever is what most capabilities need; the **request-count lever exists specifically because Voice's `AiRequest` rows always log `costUsd: 0`** (ADR-017 Decision 6) — a dollar ceiling alone could never trigger for Voice, so the request-count lever is the one PD-009's own acceptance criterion ("demonstrated on Voice") actually depends on. Administrator-only, live-editable, no restart required — matching the existing `AiOperationalConfig` singleton pattern exactly (env-var-seeded on first read is not applicable here since there's no sensible single global default per capability; the row simply doesn't exist until an Administrator sets one, and `enforceCapabilityCeiling` no-ops when none exists).

**Voice cost-governance integration fix** — `VoiceSessionService.startSession()` now calls `AiRequestsService.enforceSpendCeilings()` (made `public` for this purpose, with a doc comment explaining why Voice calls it directly) before brokering a session. This is the same authority `runCompletion()` itself calls — reusing existing infrastructure, not duplicating it — so there is exactly one place spend enforcement lives, not two that could drift. This closes a real, previously-silent gap: the emergency stop and every existing budget ceiling now apply to Voice, not only to text-based capabilities.

## Files modified

- **New:** `apps/api/src/ai/providers/resilience/{provider-error.util,circuit-breaker,resilient-fetch.util}.ts` (+ `.spec.ts` for each), `apps/api/src/ai/providers/fallback-ai.provider.ts` (+ `.spec.ts`), `apps/api/src/health/ai-provider-health.indicator.ts` (+ `.spec.ts`), `apps/api/src/ai/requests/repositories/{ai-capability-budget.repository.interface,prisma-ai-capability-budget.repository}.ts`, `apps/api/src/ai/requests/dto/{set-ai-capability-budget,ai-capability-budget-response}.dto.ts`, `prisma/migrations/20260725212731_add_ai_capability_budget/migration.sql`.
- **Modified:** `prisma/schema.prisma` (new `AiCapabilityBudget` model), `apps/api/src/ai/providers/{openai,anthropic}.provider.ts` (circuit breaker + `resilientFetch` integration, `getCircuitState()`), `apps/api/src/ai/providers/ai-provider.module.ts` (fallback wiring), `apps/api/src/ai/requests/ai-requests.service.ts` (`enforceSpendCeilings` made public + `enforceCapabilityCeiling`), `apps/api/src/ai/requests/ai-operational-config.{service,controller}.ts` (capability-budget CRUD), `apps/api/src/ai/requests/repositories/{ai-request.repository.interface,prisma-ai-request.repository}.ts` (`sumCostSince` extended with an optional capability filter, new `countSince`), `apps/api/src/ai/ai.module.ts` (new repository provider), `apps/api/src/ai/voice/voice-session.service.ts` (spend-ceiling enforcement call), `apps/api/src/health/{health.module,health.controller}.ts` (new indicator + `/health/ai`), `.env.example`, `apps/api/src/config/env.validation.ts`, `docs/operations/production-runbook.md`.

## Security considerations

- The circuit breaker and retry logic never expose provider error bodies to end users — `AiRequestsService.runCompletion()`'s existing catch-all still translates every provider failure into the same generic `ServiceUnavailableException` message it always has; only server-side logs see the classified category and raw error text.
- `GET /health/ai` reports only circuit-breaker state (`closed`/`half_open`/`open`) and which provider is configured — never API keys, request/response bodies, or member data.
- The per-capability budget endpoints reuse the exact same `PLATFORM_ADMIN_ROLES` authorization check as the existing operational-config endpoints (`hasRole` guard, mirrored not duplicated).
- `VoiceSessionService` now calls the same `enforceSpendCeilings` authority `runCompletion()` calls — a single point of truth for spend enforcement, eliminating a risk of the two paths drifting out of sync (the actual defect discovered and fixed in this task).

## Performance considerations

- The circuit breaker read (`getCircuitState()`) is an in-memory field read — zero added latency on the hot path when a provider is healthy.
- Retry/backoff only activates on an actual transient failure; the happy path (successful first attempt) has identical latency to before this task, since `resilientFetch`'s first attempt is a direct passthrough to `fetch`.
- `enforceCapabilityCeiling` adds at most one additional DB read (`getCapabilityBudget`, a unique-indexed lookup) per request, and only queries `sumCostSince`/`countSince` again when a budget is actually configured for that capability — capabilities with no configured budget (the default, until an Administrator sets one) pay only the one cheap lookup.
- `/health/ai` is a free read of state the circuit breaker already tracks from real traffic — it never issues a synthetic outbound ping, which would cost real money and latency on a poll that may run every few seconds.

## Testing strategy

- **New unit tests:** `provider-error.util.spec.ts` (classification functions), `circuit-breaker.spec.ts` (closed→open on threshold, open→half-open after cooldown, half-open→closed on success, half-open→open on failure, immediate rejection while open), `resilient-fetch.util.spec.ts` (success on first attempt, retry-then-succeed on 5xx, never-retry on 4xx, exhausts attempts and throws, retries a thrown network error, times out a hanging request via `AbortController`), `fallback-ai.provider.spec.ts` (primary succeeds → secondary never called; primary fails → secondary called and its result returned; both fail → secondary's error propagates; strictly sequential, never concurrent), `ai-provider-health.indicator.spec.ts` (healthy when no configured provider's circuit is open; throws `HealthCheckError` when one is; `half_open` is not treated as unhealthy).
- **Extended existing unit tests:** `openai.provider.spec.ts`/`anthropic.provider.spec.ts` (+3 tests each: retries a transient 500 then succeeds, never retries a 4xx, circuit breaker opens after consecutive failures and fails fast without calling `fetch` again — directly exercising PD-009's own acceptance criterion, "a simulated provider timeout is retried per a documented backoff policy before failing"), `ai-requests.service.spec.ts` (+4 tests: capability dollar-ceiling trigger, capability request-count-ceiling trigger, one capability's ceiling hit does not affect another capability, no-budget-configured passes through untouched), `ai-operational-config.service.spec.ts` (+6 tests: `getCapabilityBudgets`/`getCapabilityBudget`/`setCapabilityBudget`/`removeCapabilityBudget`, including Administrator-only authorization), `health.controller.spec.ts` (+1 test: `GET /health/ai` checks the AI provider indicator, not the database indicator), `voice-session.service.spec.ts` (added the now-required `AiRequestsService` mock; the DI break this surfaced is documented under Errors/fixes in the working notes for this task and was the direct cause of an initial 73-test regression, fully resolved before this report was written).

## Validation

- `npx tsc --noEmit`, `npx eslint src --max-warnings=0`, `npx nest build`, `npx prisma validate` — all clean.
- Backend: full suite (`AI_PROVIDER=stub npx jest`, matching this session's established convention for this sandbox's blocked `api.openai.com` egress) — **131 suites, 1382 tests, 1375 passing**. The only failures are the same **7 pre-existing, unrelated Voice Domain e2e failures** documented throughout this session (root-caused during this task: `VoiceProviderModule` selects the real `OpenAiVoiceProvider` whenever `OPENAI_API_KEY` is present in `.env`, independent of the `AI_PROVIDER` text-pipeline selector — this sandbox's `.env` has a real key configured, and this sandbox's egress to `api.openai.com` is blocked. Confirmed identical on a clean `git stash` of every Task 2.4 change — zero new failures, zero regressions).

## Deployment considerations

- Purely additive: one new Prisma migration (`AiCapabilityBudget` table, new unique index on `capability`) and five new optional env vars, all defaulted — a deployment with none of the new env vars set behaves identically to the previous retry-less, fallback-less, single-provider behavior except the emergency stop/budget ceilings now also apply to Voice (the fixed defect) and a provider outage now retries a few times before failing instead of failing on the first attempt.
- No new external dependencies — `resilientFetch`/`CircuitBreaker` are hand-rolled against the platform `fetch`/`AbortController`, matching this codebase's existing "no vendor SDK dependency" convention for provider calls.
- `FallbackAiProvider` only activates when *both* API keys are configured — a single-provider deployment (the current default) is entirely unaffected by its existence.
- Per-capability budgets are opt-in: no default budget is pre-seeded for any capability including Voice. A Founder/Administrator can set one for Voice via `PATCH /ai/operational-config/capability-budgets` at any time, live, no restart.

## Rollback strategy

- The Prisma migration is purely additive (new table only) — rolling back the application code requires no corresponding down-migration; the unused table is simply inert.
- If a specific new env var default proves wrong in production, it can be overridden without a rebuild (all five are read via `ConfigService` at request time, matching the existing `AI_EMERGENCY_STOP` convention) or reverted by unsetting it, restoring the built-in default.
- If the fallback or circuit-breaker behavior itself needs to be disabled entirely, setting `AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD` very high effectively disables tripping, and configuring only one of the two provider API keys disables `FallbackAiProvider` entirely (the factory falls back to the pre-existing single-provider path).

---

## Remaining resilience gaps (not in this task's scope)

- **No streaming support** — PD-000's original PD-009 scope text mentions this; it was not part of the acceptance criteria actually written for this task (retry/timeout/fallback/per-capability ceiling) and was not built. A separate, explicitly-scoped follow-up if wanted.
- **No proactive spend-approaching-ceiling alert** — PD-000 attributes the alerting half of cost governance to PD-002 (Production Infrastructure), not this task; unchanged here.
- **No default per-capability budget is pre-seeded** — every capability (including Voice) has no ceiling until an Administrator explicitly sets one. This is a deliberate choice (see Founder decisions below), not an oversight.
- **PD-011's own stated dependency on this task** (Intelligence Layer Integration Testing) can now proceed — this task's resilience work was its named prerequisite so integration tests against a live provider aren't flaky on transient issues.

## Founder decisions required

1. **Should a default per-capability budget be pre-seeded for Voice at launch** (a request-count ceiling, since Voice's `costUsd` is always `0`), rather than left unset until an Administrator configures one? Recommendation: set a conservative default (e.g. 50 sessions/day/platform) before enabling Voice for a broader user base, since Voice is the capability PD-009 itself calls out as the highest-cost-per-minute risk.
2. **Are the default retry/circuit-breaker thresholds** (3 attempts, 500ms base backoff, 3 consecutive failures to open, 30s cooldown) **appropriate for expected production traffic volume?** These are reasonable, industry-typical starting defaults, but this task had no real production traffic pattern to tune against — a Founder or on-call engineer should revisit them after observing real provider behavior in production.

## Recommended next task

Per the Engineering Master Execution Plan's own dependency ordering, **PD-011 (Intelligence Layer Integration Testing & Prompt Evaluation Harness)** is next in the AI-maturity track — it explicitly lists this task as its prerequisite. Alternatively, per PD-000's critical-path note, **PD-003** or the **PD-005/PD-006 remainders** remain the items that block a full (non-private-beta) production launch; PD-009 through PD-015, including this one, improve safety/quality/completeness without being on that specific critical path.
