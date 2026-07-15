# ADR-008 — Authorization Retrofit: Journey Engine & User Sub-Resources

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-022 |
| Authority | PA-018, OAS-SEC-003, ADR-003, ADR-005, ADR-006, ADR-007 |

---

## Context

WO-020 (Resource Directory) and WO-021 (Administration & Operations) both correctly applied `JwtAuthGuard`/ownership enforcement to their endpoints. Seven earlier domains never received the same treatment: Goals, Journeys, Milestones, Tasks, UserInterests, Profile, and SavedOpportunities shipped with no authentication or ownership checks at all. Every endpoint in these domains was callable by anyone — authenticated or not — against any member's private planning data, interests, profile, or saved-opportunity list. This was flagged explicitly as the platform's most severe open risk in ADR-006, ADR-007, and `docs/releases/version-1-readiness.md`'s Release Blockers, and it is a live gap in every environment this code has been deployed to, not a theoretical one.

Unlike `Resource.ownerId` or `SavedOpportunity.userId`, three of the seven domains — Journey, Milestone, Task — have no direct `userId` column. Ownership is transitive: a Journey belongs to a Goal, a Milestone belongs to a Journey, a Task belongs to a Milestone, and only Goal carries a real `userId` foreign key to `User`. This ADR's central technical decision is how to resolve ownership across that chain without either duplicating the `userId` column onto every table (denormalization the schema does not otherwise use) or forcing every module to import every ancestor module directly.

---

## Decisions

### 1. `findOwnerId()` on each repository, resolved one hop at a time via Prisma nested `select`

**Decision:** Each of `IJourneyRepository`, `IMilestoneRepository`, and `ITaskRepository` gains a `findOwnerId(id: string): Promise<string | null>` method. Each implementation is a single Prisma `findFirst` with a nested `select` through its own parent chain — Journey selects `goal.userId`; Milestone selects `journey.goal.userId`; Task selects `milestone.journey.goal.userId`.

**Rationale:** A nested `select` is a single indexed query regardless of chain depth — Prisma resolves the join, not the application. This avoids N+1 lookups (walking the chain one repository call at a time) and avoids adding a denormalized `userId` column to tables where it isn't a natural attribute of the entity. Each repository only needs to know its own Prisma relations, not the shape of the whole chain, which keeps the repository layer's responsibility narrow and consistent with the `interface → Prisma repository` pattern established in ADR-003.

---

### 2. Services depend on their immediate parent's repository only, not the whole chain

**Decision:** `JourneysService` injects `IGoalRepository` (via `GoalsModule`'s export); `MilestonesService` injects `IJourneyRepository` (via `JourneysModule`'s export); `TasksService` injects `IMilestoneRepository` (via `MilestonesModule`'s export). No service imports a repository more than one level up. Each of `GoalsModule`, `JourneysModule`, `MilestonesModule` now exports its repository token (`GOAL_REPOSITORY`, `JOURNEY_REPOSITORY`, `MILESTONE_REPOSITORY`) alongside its service, mirroring the pre-existing `USER_REPOSITORY` export pattern from `UsersModule`.

**Rationale:** Matches the existing module-dependency direction (`AdministrationModule` depends on `UsersModule` via its exported repository token, per ADR-007 Decision 1) rather than introducing a new pattern. Each service only needs one level of ancestor context to enforce "does the caller own the immediate parent" on create, and `findOwnerId()` (Decision 1) handles the full-chain resolution for read/update/delete without the service needing to know about grandparent entities at all.

---

### 3. Owner-or-admin for Goals/Journeys/Milestones/Tasks; self-or-admin for Profile/UserInterests; self-only for SavedOpportunities

**Decision:** Three distinct authorization patterns are applied, chosen per domain rather than uniformly:

- **Goals, Journeys, Milestones, Tasks** — the record's resolved owner, or a `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`, may read/update/delete it. `POST` on a child requires the caller to own (or administer) the parent.
- **Profile, UserInterests** — the caller acting on their own `:userId`, or an administrator, may act. Administrators retain read/support access to any user's profile and interests.
- **SavedOpportunities** — self only, no administrator override, mirroring `SavedResourcesController`'s existing pattern exactly (WO-020) rather than inventing a new one.

**Rationale:** These are not arbitrary per-domain choices — each mirrors an already-shipped, already-tested precedent rather than introducing a fourth pattern. Goals/Journeys/Milestones/Tasks reuse the owner-or-admin shape from `ResourcesController` (WO-020); Profile/UserInterests reuse the self-or-admin shape from `UsersController` (WO-019); SavedOpportunities reuses the self-only shape from `SavedResourcesController` (WO-020) verbatim, since a saved-opportunity list has the same nature (a personal bookmark list) as a saved-resource list and no administrative override was established for that shape in the first place. Introducing a fourth authorization shape here, when three already exist and cover every case, would be inconsistency without benefit.

---

### 4. Shared `hasRole()` utility, introduced but not retrofitted onto existing call sites

**Decision:** A new `apps/api/src/auth/utils/has-role.util.ts` exports `hasRole(caller, roles[]): boolean`. It is used by every new authorization check added in this WO. Existing inline role checks in `UsersController`, `ResourcesController`, and `AdministrationModule` are left as they are — not refactored to call the new utility.

**Rationale:** This WO adds more than a dozen new "does the caller hold role X" call sites across seven domains — enough repetition to justify extracting the check once. Retrofitting three already-shipped, already-tested call sites elsewhere is a separate, purely cosmetic change with no functional benefit and a nonzero risk of an unintended regression in code this WO did not otherwise need to touch — out of scope per "don't redesign existing systems merely because another implementation is possible."

---

### 5. List endpoints require an owned parent-scoping ID for non-admin callers

**Decision:** `GET /milestones` and `GET /tasks` accept an optional `journeyId`/`milestoneId` filter. For a non-administrator caller, that filter is now **required**, and the referenced parent must be owned by the caller — omitting it, or supplying one the caller doesn't own, is rejected with `403`. Administrators may list without a filter. `GET /goals` instead scopes silently to the caller's own `userId` by default (no error) unless the caller is an administrator, matching the pattern `ResourcesService`/`UsersService` already use for caller-scoped listing.

**Rationale:** Milestone and Task have no owner column to scope by directly — without a required, ownership-checked parent filter, a non-admin caller could enumerate every member's milestones and tasks platform-wide by omitting the filter (`GET /milestones` with no query would otherwise return everyone's data). Goal, by contrast, does have a direct `userId`, so `GoalsService.findAll` can scope by it automatically, exactly as `ResourcesService`/`UsersService` already do — no error condition needed because there is always a well-defined, non-enumerating default.

---

## Risks

| Risk | Mitigation |
|---|---|
| `findOwnerId()` adds a repository method not used outside authorization checks, slightly widening each repository interface | Necessary to resolve transitive ownership without an N+1 query pattern (Decision 1); each method is a single indexed Prisma query and is unit-tested |
| Three authorization shapes (owner-or-admin / self-or-admin / self-only) rather than one uniform shape | Each shape is reused verbatim from an existing, tested precedent rather than invented (Decision 3) — consistency is preserved at the "reuse an established pattern" level even though the three domains' resource semantics differ |
| `hasRole()` exists alongside un-migrated inline role checks elsewhere in the codebase | Explicit, deliberate scope boundary (Decision 4); a future cosmetic-only WO could complete the migration if desired, but it is not a functional risk today |

---

## Future Extension Points

- Migrating the pre-existing inline role checks in `UsersController`/`ResourcesController`/`AdministrationModule` to `hasRole()` for full consistency, as a low-priority cosmetic follow-up.
- A generic "resolve ownership chain" repository helper if a fifth level of nesting is ever introduced elsewhere in the platform, to avoid repeating the nested-`select` pattern by hand a fourth time.
- Revisiting whether Journeys/Milestones/Tasks should carry a denormalized `userId` for query performance if the ownership chain is queried at high volume — not necessary at current scale.
