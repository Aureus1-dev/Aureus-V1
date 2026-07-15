# WO-025 — Stewardship System

| Field | Value |
|---|---|
| Work Order Number | WO-025 |
| Title | Stewardship System (PA-012) |
| Status | Complete |
| Priority | High (next canonical backend domain in founder-directed backend-before-frontend sequencing) |
| Date | 2026-07-15 |

---

## Objective

Give the `STEWARD` platform role (introduced in WO-021/ADR-007, checked inline at moderation gates since) a real, dedicated domain: a steward-member relationship lifecycle, capacity management, stewardship notes, follow-up tasks, opportunity/resource recommendations, escalation handling, and a steward-metrics foundation — implemented exactly to a binding set of founder-supplied canonical product decisions (steward assignment authority, capacity, authority boundaries, relationship lifecycle, member experience, and metrics), anchored by the foundational principle: **a steward is a guide, not an owner.**

## Scope

- A new `Organization`-independent `StewardshipRelationship` core entity with a `PENDING`/`ACTIVE`/`ENDED` lifecycle and four origins (`MEMBER_REQUEST`, `AI_RECOMMENDATION`, `ORGANIZATION_ASSIGNMENT`, `ADMIN_ASSIGNMENT`), full CRUD, `activate`/`end`/`reassign` action endpoints, and a steward-only member-overview aggregation endpoint.
- `StewardCapacity` — per-steward configurable maximum active member count, default `25` sourced from a single Prisma column default, never hardcoded in application code.
- `StewardshipNote` — `PRIVATE`/`SHARED` visibility split; members see only `SHARED` notes.
- `StewardshipTask` (follow-up tasks) — steward/admin manage, member views read-only.
- `StewardshipRecommendation` — steward recommends an existing `Opportunity` or `Resource` to a member, validated against the live domain via direct service reuse.
- `StewardshipEscalation` — steward/admin-only issue tracking with severity/status and a `resolve` action; never member-visible.
- `GET /stewardship/metrics/:stewardId` — active member count, tasks completed, escalations resolved (live counts), member goal-completion rate and average journey progress (computed on demand), plus two intentionally-reserved-`null` fields (`averageResponseTimeHours`, `memberSatisfactionScore`) for future instrumentation.
- Full Swagger documentation (`stewardship` tag).
- Unit and end-to-end automated tests.

## Out of Scope

- A member-enrollment/client relationship between `User` and `Organization` — organization-scoped steward assignment is checked at the `OrganizationMember` (representative) level, not a member-enrollment level, because no such enrollment model exists yet (ADR-011 Decision 8, explicitly deferred).
- Real instrumentation for `averageResponseTimeHours`/`memberSatisfactionScore` — no response-time tracking or member-feedback mechanism exists yet (ADR-011 Decision 7).
- Community-moderation authority for stewards (canonical decision §3) — no community-content domain exists yet to moderate (depends on Pods/Communication System).
- Automated steward-inactivity detection — `STEWARD_INACTIVITY` is a valid, manually-selected end reason; no automated detection job.
- Any change to `ResourcesModule`/`OpportunitiesModule`/`OrganizationsModule` business logic (only additive repository-token exports on `TasksModule`/`OrganizationsModule`).

## Dependencies

- WO-024 (Business Portal) — complete, merged; supplies the `OrganizationMember`/`ADMIN`-authority pattern this WO reuses for organization-scoped steward assignment, and the immediately preceding Work Order in sequence.
- WO-021 (Administration & Operations) — supplies the `STEWARD` role itself and the Platform Administrator authority pattern reused for `activate`/`assignByAdmin`/`reassign`.
- WO-022 (Authorization Retrofit) — supplies `GOAL_REPOSITORY`/`JOURNEY_REPOSITORY`/`MILESTONE_REPOSITORY`/`TASK_REPOSITORY` and the transitive-ownership-resolution pattern reused for member-overview and metrics.
- ADR-006/ADR-004 (Resource Directory / Opportunity Engine) — supply `ResourcesService.findById()`/`OpportunitiesService.findById()`, reused directly by `StewardshipRecommendationsService`.

## Source Documents

- PA-012 — Stewardship System Architecture
- PA-018 — Permissions & Access Architecture
- Founder canonical product decisions (2026-07-15) — steward assignment, capacity, authority, lifecycle, member experience, metrics (reproduced in full in ADR-011's Context section)
- ADR-003 — User Module (layering pattern)
- ADR-007 — Administration & Role Management (`STEWARD` role origin)
- ADR-010 — Business Portal (nested sub-resource and minimal-additive-export precedent)

## Deliverables

- ADR-011 — Stewardship System
- `apps/api/src/stewardship/**` (module, 7 sub-domain controllers/services/repositories/DTOs, unit + e2e tests)
- Prisma migration `add_stewardship_system`
- `docs/verification/WO-025-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715025641_add_stewardship_system/`
- `apps/api/src/stewardship/stewardship.module.ts`
- `apps/api/src/stewardship/common/stewardship-roles.util.ts`
- `apps/api/src/stewardship/relationships/stewardship-relationships.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/relationships/dto/{request-steward,recommend-steward,organization-assign-steward,admin-assign-steward,activate-relationship,end-relationship,reassign-relationship,list-relationships-query,relationship-response,paginated-relationships-response,member-overview-response}.dto.ts`
- `apps/api/src/stewardship/relationships/repositories/{stewardship-relationship.repository.interface,prisma-stewardship-relationship.repository}.ts`
- `apps/api/src/stewardship/capacity/steward-capacity.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/capacity/dto/{update-capacity,capacity-response}.dto.ts`
- `apps/api/src/stewardship/capacity/repositories/{steward-capacity.repository.interface,prisma-steward-capacity.repository}.ts`
- `apps/api/src/stewardship/notes/stewardship-notes.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/notes/dto/{create-note,update-note,note-response}.dto.ts`
- `apps/api/src/stewardship/notes/repositories/{stewardship-note.repository.interface,prisma-stewardship-note.repository}.ts`
- `apps/api/src/stewardship/tasks/stewardship-tasks.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/tasks/dto/{create-stewardship-task,update-stewardship-task,stewardship-task-response}.dto.ts`
- `apps/api/src/stewardship/tasks/repositories/{stewardship-task.repository.interface,prisma-stewardship-task.repository}.ts`
- `apps/api/src/stewardship/recommendations/stewardship-recommendations.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/recommendations/dto/{create-recommendation,recommendation-response}.dto.ts`
- `apps/api/src/stewardship/recommendations/repositories/{stewardship-recommendation.repository.interface,prisma-stewardship-recommendation.repository}.ts`
- `apps/api/src/stewardship/escalations/stewardship-escalations.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/escalations/dto/{create-escalation,update-escalation-status,resolve-escalation,escalation-response}.dto.ts`
- `apps/api/src/stewardship/escalations/repositories/{stewardship-escalation.repository.interface,prisma-stewardship-escalation.repository}.ts`
- `apps/api/src/stewardship/metrics/steward-metrics.{controller,service,service.spec}.ts`
- `apps/api/src/stewardship/metrics/dto/steward-metrics-response.dto.ts`
- `apps/api/src/stewardship/stewardship.e2e.spec.ts`
- `docs/architecture/ADR-011-Stewardship-System.md`
- `docs/work-orders/WO-025-Stewardship-System.md` (this file)
- `docs/verification/WO-025-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `StewardCapacity`, `StewardshipRelationship`, `StewardshipNote`, `StewardshipTask`, `StewardshipRecommendation`, `StewardshipEscalation` models; eight new enums; `User.stewardCapacity`/`.stewardshipAsMember`/`.stewardshipAsSteward`, `Opportunity.stewardshipRecommendations`, `Resource.stewardshipRecommendations` back-relations.
- `apps/api/src/tasks/tasks.module.ts` — additive export of `TASK_REPOSITORY` (minimal-additive-export pattern, ADR-011 Decision 6).
- `apps/api/src/organizations/organizations.module.ts` — additive export of `ORGANIZATION_REPOSITORY`/`ORGANIZATION_MEMBER_REPOSITORY`.
- `apps/api/src/app.module.ts` — registers `StewardshipModule`.
- `apps/api/src/main.ts` — Swagger `stewardship` tag.
- `docs/releases/version-1-readiness.md` — WO-025 marked complete, Stewardship System moved off the Remaining Backend Domains list, scores recomputed, next WO recommendation updated.

## Database Changes

New migration `add_stewardship_system`: `StewardCapacity` (real FK to `User`, `maxActiveMembers Int @default(25)`), `StewardshipRelationship` (real FKs to `User` for `memberId`/`stewardId` via named relations, `stewardId` nullable), `StewardshipNote`, `StewardshipTask`, `StewardshipRecommendation` (real, nullable FKs to `Opportunity`/`Resource`), `StewardshipEscalation`, and eight new enums. No changes to any existing table's columns.

## API Changes

New: `POST /stewardship/relationships/{request,recommend,assign-by-organization,assign}`, `GET /stewardship/relationships`, `GET /stewardship/relationships/:id`, `GET /stewardship/relationships/:id/member-overview`, `POST /stewardship/relationships/:id/{activate,end,reassign}`, `GET/PATCH /stewardship/capacities/:stewardId`, `POST/GET /stewardship/relationships/:relationshipId/notes`, `PATCH /stewardship/relationships/:relationshipId/notes/:noteId`, `POST/GET /stewardship/relationships/:relationshipId/tasks`, `PATCH /stewardship/relationships/:relationshipId/tasks/:taskId`, `POST/GET /stewardship/relationships/:relationshipId/recommendations`, `POST/GET /stewardship/relationships/:relationshipId/escalations`, `PATCH /stewardship/relationships/:relationshipId/escalations/:escalationId/status`, `POST /stewardship/relationships/:relationshipId/escalations/:escalationId/resolve`, `GET /stewardship/metrics/:stewardId`.

## Security Requirements

- All endpoints require `JwtAuthGuard`; role-sensitive actions additionally require `RolesGuard`/`@Roles()` or an in-service caller check.
- `recommendSteward` is restricted to `AI_SERVICE_ACCOUNT`; `assignByOrganization` requires the caller to be an `ADMIN` `OrganizationMember` of a `VERIFIED` `Organization`; `assignByAdmin`/`activate`/`reassign` (with `ADMIN_REASSIGNMENT`) require `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`.
- Steward authority over a member is always resolved server-side from the loaded `StewardshipRelationship` row (`relationship.stewardId === caller.id`), never trusted from the request body — mirrors the server-derived-ownership invariant used across every domain since WO-022.
- Capacity is enforced at assignment/activation time via `StewardCapacityService`/`assertCapacityAvailable`; exceeding it returns 409.
- Least-privilege visibility: `StewardshipNote.visibility` filters `PRIVATE` notes out of member-facing reads; `StewardshipTask` is member-viewable but member-read-only (no member-accessible mutation path); `StewardshipEscalation` has zero member-facing read/write access.
- `StewardMetricsService.getForSteward` restricts access to the steward themselves or a Platform/System Administrator (403 for any other caller, including another steward).
- Least-privilege enforced per canonical decision §3: no endpoint in this domain allows a steward to change passwords, access authentication secrets, access payment information, or delete a member account — none of that surface area exists in this module.

## Testing Requirements

- Unit: one `.spec.ts` per service (7 files, 73 tests) covering every authorization branch (member/steward/admin/AI/org-representative/unrelated-caller), the full relationship state machine (request → recommend → activate → end → reassign, plus every rejection path), capacity enforcement, note visibility filtering, task read-only-for-member enforcement, escalation steward/admin-only enforcement, recommendation target validation, and metrics computation (including the goal-completion/journey-progress percentage calculation against a concrete fixture).
- End-to-end: one comprehensive `stewardship.e2e.spec.ts` (26 tests) exercising the full HTTP surface via Supertest against a booted application — relationship lifecycle (request → AI recommend → admin activate → capacity-limit rejection → read → member-overview steward-only enforcement → notes visibility → follow-up tasks → escalations → metrics → end), and a separate organization-assignment/reassignment block using real WO-024 Organization/verification endpoints. Personas that become real foreign-key targets (`StewardshipRelationship.memberId`/`.stewardId`, `OrganizationMember.userId`) are real registered users via `POST /auth/register`; personas whose role must be checked against the *persisted* database row (not just the JWT claim) are granted that role for real via the WO-021 `POST /users/:id/roles/grant` endpoint before their token is used anywhere that triggers a database-backed role check.

## Acceptance Criteria

- [x] A member can request a steward, landing `PENDING` with origin `MEMBER_REQUEST`.
- [x] Only an `AI_SERVICE_ACCOUNT` caller can recommend a steward; the resulting relationship always lands `PENDING`, never `ACTIVE` (403 for any other caller; no code path lets AI create an `ACTIVE` row).
- [x] Only a Platform/System Administrator can activate a `PENDING` relationship (403 otherwise).
- [x] Assigning or activating a steward who is at capacity returns 409.
- [x] A member cannot view another member's relationship or any steward-only endpoint (403).
- [x] Member-overview is steward-only — forbidden even to the member themselves.
- [x] `PRIVATE` notes are never returned to the member; `SHARED` notes are.
- [x] Follow-up tasks are visible to the member but only the steward/admin can update them (403 on member `PATCH`).
- [x] Escalations are never visible to or creatable by the member (403 on every escalation endpoint for a member caller).
- [x] Recommendations validate the target `Opportunity`/`Resource` exists (404 propagated) and the type matches the populated field (400 otherwise).
- [x] `StewardCapacity.maxActiveMembers` defaults to `25` from the Prisma schema with zero hardcoded occurrences of `25` in application code; a Platform Administrator can change an individual steward's limit via `PATCH`.
- [x] `reassign` ends the current relationship (preserving it, with `endReason`/`endedById`/`endedAt` set) and creates a new `ACTIVE` row rather than mutating `stewardId` in place.
- [x] An `ADMIN` organization representative of a `VERIFIED` organization can assign a steward, effective immediately (`ACTIVE`, origin `ORGANIZATION_ASSIGNMENT`).
- [x] A steward can view their own metrics; a different steward cannot (403); a Platform Administrator can view any steward's metrics.
- [x] Metrics correctly compute goal-completion rate and average journey progress as percentages across a steward's assigned members, and return `null` (not `0`) when there is no data yet.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest` (full monorepo suite), `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl confirms the request → list → member-overview-forbidden → capacity-default workflow end-to-end against a running compiled instance.

## Definition of Done

Met — see `docs/verification/WO-025-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- Organization-scoped steward assignment is checked at the `OrganizationMember` (representative) level, not a member-enrollment level — no member-to-organization client relationship exists in the schema yet (ADR-011 Decision 8, explicitly deferred).
- `averageResponseTimeHours` and `memberSatisfactionScore` are permanently `null` — no response-time tracking or member-feedback mechanism exists yet to populate them (ADR-011 Decision 7).
- Community-moderation authority for stewards (canonical decision §3) is unimplemented — no community-content domain exists yet to moderate.
- No automated steward-inactivity detection — `STEWARD_INACTIVITY` is a valid, manually-selected `end` reason only.
- Member-overview and metrics computation walk nested collections via multiple repository calls rather than a single aggregate query, consistent with the codebase-wide precedent of no cross-module `$transaction`/raw-aggregation usage (ADR-011 Risks).

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
