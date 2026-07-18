# PR-004 — Intelligence Layer / AI Orchestration

**Baseline:** PR-001 (Production Readiness Master Audit), PR-002 (Production Foundation Remediation), and PR-003 (Founder Operating System). Per the Founder's standing rule, this work order was checked against all three before starting. None of PR-001's findings, PR-002's six remediation categories, or PR-003's Founder Operating System surfaces are touched or reintroduced by this work order — PR-004 is additive: new capabilities are layered onto the existing AI Engine (WO-029) and Founder Operating System (PR-003) without modifying their existing contracts.

**Scope, as given by the Founder:** build the Aureus Intelligence Layer — an orchestration system that connects existing AI capabilities into a coordinated institutional intelligence, without replacing or rewriting any of them. Principles held throughout: reuse existing services, never duplicate business logic, don't break existing APIs, preserve constitutional invariants, human stewardship always overrides AI, every recommendation is explainable and auditable.

---

## 1. AI Orchestrator — NEW

`apps/api/src/ai/orchestrator/` — a thin, deterministic routing/coordination layer, explicitly **not** a free-form LLM-driven agent loop (the same boundary `InsightsService` already documents for its own "tool orchestration," carried forward here rather than reinvented). `AiOrchestratorService.orchestrate(goal, caller)` uses a plain switch/decision-tree to route one of six `AiOrchestrationGoal` values to the capability that already serves it:

| Goal | Delegates to | New business logic? |
|---|---|---|
| `OPPORTUNITY_SUGGESTION` | `RecommendationsService.generate({category: OPPORTUNITY})` | None |
| `RESOURCE_SUGGESTION` | `RecommendationsService.generate({category: RESOURCE})` | None |
| `EDUCATIONAL_RECOMMENDATION` | `RecommendationsService.generate({category: COURSE})` | None |
| `JOURNEY_GUIDANCE` | `InsightsService.journeyGuidance()`, journey resolved via Shared Institutional Memory | None |
| `STEWARD_ESCALATION` | `RecommendationsService.generate({category: STEWARD_ESCALATION})` (new category, §2) | None — advisory only |
| `NEXT_BEST_ACTION` | a documented decision tree (§3) over the other five | The one genuinely new decision |

Every call records an `AiOrchestrationRun` (goal, which capabilities were invoked, a human-readable `outcome` explanation, status, latency) — a correlating/tracing parent record, **never a duplicate of the `AiRequest` audit ledger**: each invoked capability still writes its own `AiRequest` row exactly as it always has (`AiRequestsService.runCompletion()` remains the single required choke point for every capability, old and new). On failure, the run is recorded as `FAILED` with the error message before the original exception is rethrown, mirroring `AiRequestsService.runCompletion()`'s own failure-logging pattern.

New endpoints, mirroring `AiRequestsController`'s exact `findMine`/`findAllAdmin` convention: `POST /ai/orchestrate` (self-scoped, rate-limited), `GET /ai/orchestration/runs/me` (self), `GET /ai/orchestration/runs` (Platform/System Administrator, platform-wide).

## 2. Shared Institutional Memory — NEW

`InstitutionalMemoryService` (`apps/api/src/ai/memory/`) assembles a read-only context bundle — Goals, active Journey + milestone progress, saved Opportunities/Resources, Pod memberships, the active Stewardship relationship, and recent conversation snippets — by injecting each target domain's own existing service (constructor DI, never its repository), the same cross-domain-read convention `InsightsService`/`RecommendationsService` already use. Nothing is cached or persisted; it's rebuilt fresh on every call, a deliberate scope decision for this first version rather than an oversight. This is what lets the AI Orchestrator "retrieve relevant context instead of relying only on the current request," per the deliverable.

## 3. Recommendation Engine — extended, not rebuilt

Five of the six recommendation types named in the deliverable (Opportunity, Resource, Educational/Course, Journey guidance, and the orchestrator's own Next-best-action) map onto `RecommendationsService`/`InsightsService` methods that already existed before this work order and are completely untouched. The one new type:

- **Steward escalation** — a new `RecommendationCategory.STEWARD_ESCALATION`. Its candidate is the caller's own active `StewardshipRelationship` (via `StewardshipRelationshipsService.findAll({memberId, status: ACTIVE})`), reusing `RecommendationsService.generate()`'s existing pipeline unchanged (candidate fetch → AI rationale → persist as a `PENDING` `AiRecommendation`, `userId: caller.id`). **Human stewardship always overrides AI**: reading `StewardshipEscalationsService.create()` confirmed escalation-filing is steward/admin-only, never member-callable — so this recommendation is purely advisory (a member-facing suggestion to reach out), never an AI-filed escalation, and never silently routed to the steward. `AiRecommendation` gained one new nullable, additive field (`relationshipId`) for this target, following the exact pattern of its existing `opportunityId`/`resourceId`/`courseId`/`podId` columns.

Every recommendation continues to carry its own AI-written `rationale` (the human-readable explanation the deliverable requires); nothing new was needed here since this was already true of every existing category.

## 4. Workflow Orchestration

Satisfied by the Orchestrator's routing design itself (§1): each capability remains independently callable and independently testable exactly as before (`ConversationsService`, `InsightsService`, `RecommendationsService`, `PodInsightsService`, `VoiceSessionService` are all unmodified in their own right), while the Orchestrator coordinates across them only where a goal genuinely spans more than one existing capability (`NEXT_BEST_ACTION`).

## 5. Observability — extended existing patterns, no new subsystem

- **Request tracing / routing logs:** `AiOrchestrationRun` (§1) — one row per orchestration call, correlating which capabilities were invoked and why.
- **Latency metrics:** `AiOrchestrationRun.latencyMs`, measured the same way `AiRequestsService.runCompletion()` already measures its own latency.
- **Success/failure metrics:** `AiOrchestrationStatus` (`SUCCESS`/`PARTIAL`/`FAILED`/`NO_ACTION`) per run, plus the pre-existing `AiRequestStatus` per underlying capability call — unchanged.
- **Cost reporting:** a new additive repository method, `IAiRequestRepository.groupedByCapabilitySince()`, groups the existing `AiRequest` ledger's cost/count/failure data by capability over the same rolling-24h window `AiRequestsService.getSpendSummary()` already uses — the existing `summarySince()`/`sumCostSince()` contracts are untouched, this is a sibling, not a replacement.

## 6. Founder Visibility — extends the PR-003 dashboard, no new panel

`AdministrationMetricsService`/`AdministrationMetricsResponseDto` gained three additive fields, computed the same "pure aggregator" way every other metric on this endpoint already is:

- `aiSpendByCapability` — from the new `groupedByCapabilitySince()` (§5).
- `orchestrationRunsToday` / `orchestrationRunsByGoal` — from a new `AiOrchestratorService.getRoutingSummary()` (Platform/System Administrator only, same rolling-24h window), backed by `AiOrchestrationRun.countSince()`/`countByGoalSince()`.

No existing field on this endpoint changed. `AiOperationalControlsPanel` (PR-003, `/founder/ai`) gained two new read-only sections — "Spend by capability" and "Orchestration activity" — reusing `FounderContext`'s existing `metrics` slice (`loadMetrics()`, already wired for the Founder Dashboard) rather than introducing new state. **Deliberate scope decision:** no new Founder panel, and no member-facing UI for `POST /ai/orchestrate` or the `NEXT_BEST_ACTION` goal, in this work order — the backend capability is complete and tested, but a member-facing "next best action" surface is a product-design decision for a future work order, not something to improvise here.

---

## Schema changes (all additive)

- `AiCapability` enum: `+NEXT_BEST_ACTION`, `+STEWARD_ESCALATION` (12 values total; no existing value removed or renamed).
- `AiRecommendation`: `+relationshipId` (nullable UUID, FK to `StewardshipRelationship`, cascades on delete like its sibling FK columns).
- New `AiOrchestrationGoal` (6 values), `AiOrchestrationStatus` (4 values) enums.
- New `AiOrchestrationRun` table (id, userId, goal, capabilitiesInvoked array, outcome, status, latencyMs, createdAt; 3 indexes; FK to `User`).
- Hand-authored migration (`20260718100000_add_ai_orchestration_layer`), following this repo's established pattern for this sandbox (no live/shadow DB available for `prisma migrate diff`): exact syntax matched against prior migrations for `ALTER TYPE ... ADD VALUE`, enum-array columns, and `@default(now())`/`@updatedAt` DB-default conventions.
- First-time cross-module import: `StewardshipModule` is now imported into `AiModule` (previously never needed) so `InstitutionalMemoryService` and `RecommendationsService`'s new Steward-escalation branch can inject `StewardshipRelationshipsService`. No circular dependency: `StewardshipModule` does not import `AiModule`.

No existing DTO field, method signature, controller route, or enum value was removed or renamed anywhere in this work order.

---

## Validation

- **Backend:** 715 unit tests passing (up from 686 at the PR-003 baseline — 29 new tests across `InstitutionalMemoryService`, the `RecommendationsService` `STEWARD_ESCALATION` branch, `AiOrchestratorService` (routing, the `NEXT_BEST_ACTION` decision tree, and failure handling), `AiRequestsService.getSpendByCapability`, and the extended `AdministrationMetricsService`). `npx prisma validate`, `tsc --noEmit`, `eslint`, and `tsc -p tsconfig.json` (build) all clean.
  - No dedicated Prisma-repository-layer test was added for `PrismaAiOrchestrationRunRepository`. This is a deliberate consistency decision, not a coverage gap: none of the AI domain's other six Prisma repositories (`AiRequest`, `AiRecommendation`, `AiConversation`, `AiMessage`, `AiVoiceSession`, `AiTurnEvent`) have ever had their own spec file in this codebase's history — the AI domain's established convention is to exercise repository behavior indirectly through service-level tests against the mocked repository interface, which `ai-orchestrator.service.spec.ts` does. The handful of domains that do have direct Prisma-repository specs (Goals, Journeys, Milestones, Users/Profile, Tasks) are all pre-AI, WO-022-era domains with a different testing convention; introducing a one-off exception for this single new AI repository would be inconsistent, not additive.
- **Frontend:** 511 unit/component/accessibility tests passing (up from 510 at the PR-003 baseline — the extended `AiOperationalControlsPanel` and its new sections are covered, including an accessibility check on the fully-loaded panel). `tsc --noEmit`, `next lint`, and `next build` (full production build, all 36 routes including all 7 `/founder` routes) all clean.
- e2e/integration suites: unchanged by this work order; require a live Postgres unavailable in this sandbox, consistent with every prior Domain Readiness Report in this repository's history.

## Recommendation for next work order

The Intelligence Layer now has a working, tested orchestration seam. A reasonable next step is a member-facing surface for `NEXT_BEST_ACTION` (deliberately deferred here, §6) — but per the Founder's own stated sequencing, this should wait for explicit direction rather than being assumed. Per the standing rule, whichever comes next must check this document, PR-003, PR-002, and PR-001 first.
