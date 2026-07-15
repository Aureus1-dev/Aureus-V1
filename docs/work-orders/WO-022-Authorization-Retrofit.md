# WO-022 — Authorization Retrofit: Journey Engine & User Sub-Resources

| Field | Value |
|---|---|
| Work Order Number | WO-022 |
| Title | Authorization Retrofit: Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities |
| Status | Complete |
| Priority | Highest (closes a live, currently-deployed data-privacy gap) |
| Date | 2026-07-15 |

---

## Objective

Add `JwtAuthGuard` and ownership enforcement to the seven domains that shipped with none: Goals, Journeys, Milestones, Tasks, UserInterests, Profile, and SavedOpportunities. Prior to this Work Order, every endpoint in these domains was callable by any caller — authenticated or not — against any member's private planning data, interests, profile, or saved-opportunity list. This was the platform's highest-priority Release Blocker per `docs/releases/version-1-readiness.md`.

## Scope

- `JwtAuthGuard` applied to all seven domains' controllers.
- Owner-or-admin enforcement for Goals, Journeys, Milestones, Tasks (the record's owner, resolved directly for Goal or transitively via the Goal→Journey→Milestone→Task chain for the others, or a Platform/System Administrator).
- Self-or-admin enforcement for Profile and UserInterests.
- Self-only enforcement for SavedOpportunities (mirrors `SavedResourcesController`, no admin override).
- New `findOwnerId()` repository method on `IJourneyRepository`, `IMilestoneRepository`, `ITaskRepository` to resolve transitive ownership via Prisma nested `select`.
- New shared `hasRole()` utility for the new call sites this WO introduces.
- `GoalsController`'s `POST`/`GET` allow an administrator to act on behalf of another user (via an optional `userId`); a non-admin caller is always scoped to themselves.
- `GET /milestones`/`GET /tasks` now require a caller-owned `journeyId`/`milestoneId` filter for non-admin callers.
- Full Swagger documentation (401/403/404 responses added to every affected endpoint).
- Unit tests for every new authorization branch across all seven domains.
- End-to-end HTTP tests (Supertest) for the full Goal→Journey→Milestone→Task chain, Profile, UserInterests, and SavedOpportunities.

## Out of Scope

- Migrating the pre-existing inline role checks in `UsersController`/`ResourcesController`/`AdministrationModule` to the new `hasRole()` utility (ADR-008 Decision 4) — cosmetic only, no functional benefit, deferred.
- Any new product capability in these domains — this WO is authorization-only; no new fields, endpoints, or business logic beyond what enforcement requires.
- The other Release Blockers (frontend, email delivery, Next.js upgrade, AI Intelligence Engine) — tracked separately in `docs/releases/version-1-readiness.md`.

## Dependencies

- WO-019 (Authentication & Identity/Access Management) — complete, merged. Supplies `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `AuthGuardsModule`.
- WO-020 (Resource Directory) — complete, merged. Supplies the owner-or-admin and self-only patterns this WO reuses verbatim.
- WO-021 (Administration & Operations) — complete, merged. Supplies the self-or-admin pattern (`UsersController`) this WO reuses for Profile/UserInterests.

## Source Documents

- PA-018 — Permissions & Access Architecture
- OAS-SEC-003 — Identity and Access Management Framework
- ADR-003 — User Module (layering pattern)
- ADR-005 — Authentication & Identity/Access Management
- ADR-006 — Resource Directory (owner-or-admin, self-only precedents)
- ADR-007 — Administration & Operations (self-or-admin precedent)
- `docs/releases/version-1-readiness.md` — flagged this as the highest-priority Remaining Work Order

## Deliverables

- ADR-008 — Authorization Retrofit: Journey Engine & User Sub-Resources
- `apps/api/src/auth/utils/has-role.util.ts` (+ unit tests)
- Guarded controllers, ownership-aware services, and `findOwnerId()` repository methods for Goals, Journeys, Milestones, Tasks
- Guarded controllers for Profile, UserInterests, SavedOpportunities
- `docs/verification/WO-022-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `apps/api/src/auth/utils/has-role.util.ts`
- `apps/api/src/auth/utils/has-role.util.spec.ts`
- `apps/api/src/goals/goals.e2e.spec.ts`
- `apps/api/src/users/profile/profile.e2e.spec.ts`
- `apps/api/src/users/interests/user-interests.e2e.spec.ts`
- `apps/api/src/opportunities/saved/saved-opportunities.e2e.spec.ts`
- `docs/architecture/ADR-008-Authorization-Retrofit.md`
- `docs/work-orders/WO-022-Authorization-Retrofit.md` (this file)
- `docs/verification/WO-022-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `apps/api/src/goals/dto/create-goal.dto.ts` — `userId` now optional (defaults to caller; admin-settable).
- `apps/api/src/goals/goals.service.ts`, `goals.controller.ts`, `goals.module.ts`, `goals.service.spec.ts` — caller-aware, ownership-enforced.
- `apps/api/src/journeys/repositories/journey.repository.interface.ts`, `prisma-journey.repository.ts`, `prisma-journey.repository.spec.ts` — `findOwnerId()`.
- `apps/api/src/journeys/journeys.service.ts`, `journeys.controller.ts`, `journeys.module.ts`, `journeys.service.spec.ts` — ownership-enforced via Goal.
- `apps/api/src/milestones/repositories/milestone.repository.interface.ts`, `prisma-milestone.repository.ts`, `prisma-milestone.repository.spec.ts` — `findOwnerId()`.
- `apps/api/src/milestones/milestones.service.ts`, `milestones.controller.ts`, `milestones.module.ts`, `milestones.service.spec.ts` — ownership-enforced via Journey, required `journeyId` filter for non-admins.
- `apps/api/src/tasks/repositories/task.repository.interface.ts`, `prisma-task.repository.ts`, `prisma-task.repository.spec.ts` — `findOwnerId()`.
- `apps/api/src/tasks/tasks.service.ts`, `tasks.controller.ts`, `tasks.module.ts`, `tasks.service.spec.ts` — ownership-enforced via Milestone, required `milestoneId` filter for non-admins.
- `apps/api/src/users/profile/profile.controller.ts`, `profile.module.ts` — self-or-admin guard.
- `apps/api/src/users/interests/user-interests.controller.ts`, `user-interests.module.ts` — self-or-admin guard.
- `apps/api/src/opportunities/saved/saved-opportunities.controller.ts` — self-only guard (module unchanged — `OpportunitiesModule` already imports `AuthGuardsModule`).
- `docs/releases/version-1-readiness.md` — WO-022 marked complete, scores recomputed, next WO recommendation updated.

## Database Changes

None. Every table this WO touches already had the columns and relations needed (`Goal.userId`, `Journey.goalId`, `Milestone.journeyId`, `Task.milestoneId`); this WO is API-layer only.

## API Changes

No new routes. Every existing route in the seven affected domains now requires a valid JWT (`401` if absent/invalid) and enforces ownership or self/admin scoping (`403` if the caller lacks permission). `CreateGoalDto.userId` becomes optional (previously required, and previously trusted verbatim from the request body with no ownership check at all). `GET /milestones` and `GET /tasks` reject non-admin requests that omit their parent-scoping filter.

## Security Requirements

- Every endpoint in Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities requires `JwtAuthGuard`.
- Goal/Journey/Milestone/Task ownership is always resolved server-side (`findOwnerId()` / direct `userId` lookup) — never trusted from the request body.
- `CreateGoalDto.userId`, when supplied, is only honored for a Platform/System Administrator caller; a non-admin caller attempting to set it to anyone but themselves receives `403`.
- List endpoints cannot be used to enumerate another member's private data (Decision 5, ADR-008).

## Testing Requirements

- Unit: every service (`GoalsService`, `JourneysService`, `MilestonesService`, `TasksService`) covers every authorization branch (owner, non-owner, administrator, not-found) for create/read/update/delete, plus the list-scoping and required-filter branches.
- Repository unit: `findOwnerId()` covered for Journey, Milestone, Task (resolves via the parent chain; returns `null` when the record doesn't exist).
- End-to-end: full HTTP lifecycle via Supertest against a booted application — `goals.e2e.spec.ts` exercises the entire Goal→Journey→Milestone→Task chain including cross-member `403`s and an administrator override; `profile.e2e.spec.ts` and `user-interests.e2e.spec.ts` cover self-or-admin; `saved-opportunities.e2e.spec.ts` covers self-only.

## Acceptance Criteria

- [x] An unauthenticated caller receives `401` from every endpoint in all seven domains.
- [x] A member cannot read, update, or delete another member's Goal/Journey/Milestone/Task (`403`).
- [x] A member cannot create a Journey/Milestone/Task under a parent they do not own (`403`).
- [x] A member cannot spoof another user's `userId` when creating a Goal (`403`); an administrator can.
- [x] `GET /goals` scopes to the caller by default; an administrator may list any user's or all goals.
- [x] `GET /milestones`/`GET /tasks` reject a non-admin caller who omits the parent-scoping filter (`403`).
- [x] A member cannot read or modify another member's Profile or interests (`403`); an administrator can.
- [x] A member cannot save, list, or remove another member's saved opportunities (`403`); no admin override, consistent with SavedResources.
- [x] An administrator can act on any Goal/Journey/Milestone/Task regardless of ownership.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl confirms the full workflow end-to-end against a running compiled instance.

## Definition of Done

Met — see `docs/verification/WO-022-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- The pre-existing inline role checks in `UsersController`/`ResourcesController`/`AdministrationModule` were not migrated to the new `hasRole()` utility (deliberate scope boundary, ADR-008 Decision 4).
- No integration-tier (`*.integration.spec.ts`, real-DB-no-HTTP) tests were added for Journeys/Milestones/Tasks repositories beyond the new `findOwnerId()` unit tests — consistent with the pre-existing gap noted in `version-1-readiness.md` (only Resources has that tier today).

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
