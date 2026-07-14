# WO-020 — Resource Directory

| Field | Value |
|---|---|
| Work Order Number | WO-020 |
| Title | Resource Directory |
| Status | Complete |
| Priority | High (next approved Version 1 domain) |
| Date | 2026-07-14 |

---

## Objective

Implement the Resource Directory (PA-014) as a complete, production-ready domain: Aureus' trusted, searchable catalog of external organizations, programs, services, professionals, tools, and community resources.

---

## Scope

- Resource catalog: CRUD, verification workflow, categories, tags, geographic fields.
- Organization ownership: the account that manages a listing, with Steward/Admin moderation override.
- Steward moderation: `verify`/`reject` restricted to `STEWARD`/`PLATFORM_ADMINISTRATOR`.
- Search, filtering (category, resource type, location, tags, remote flag, owner), pagination, sorting.
- Resource status lifecycle (`DRAFT → ACTIVE ⇄ INACTIVE → ARCHIVED`) and verification lifecycle (reused `VerificationStatus`).
- Confidence/freshness scoring (formula-based, mirroring the Opportunity Engine).
- Saved Resources (member bookmarking), with ownership-guarded endpoints.
- Audit logging via structured `Logger` output (create/update/verify/reject/archive/submit), matching ADR-004's precedent.
- Full Swagger/OpenAPI documentation with bearer-auth annotations.
- Unit, integration, and end-to-end automated tests; CI updated to provision PostgreSQL so integration/e2e tests run automatically.

## Out of Scope

- A normalized `Organization` entity (PA-011 Business Portal territory — not yet implemented anywhere in the repository).
- Role grant/revoke administration endpoints (no such endpoint exists for any domain yet; role assignment for verification testing was performed directly at the database layer).
- Retrofitting guards onto `SavedOpportunitiesController`, Goals, Journeys, Milestones, Tasks, or UserInterests (pre-existing gaps, carried over from ADR-005; recommended as a follow-up WO).
- Geographic radius search (PostGIS) and AI-powered recommendations (both explicitly deferred future extension points, matching the Opportunity Engine's own roadmap).

## Dependencies

- WO-019 (Authentication & Identity/Access Management) — complete, merged to `main`.
- Phase 2 (Opportunity Engine, ADR-004) — complete; used as the direct architectural template.

## Source Documents

- PA-014 — Resource Directory Architecture
- PA-011 — Business Portal Architecture (ownership boundary reference)
- PA-012 — Stewardship System Architecture (moderation authority reference)
- PA-018 — Permissions & Access Architecture
- ADR-004 — Opportunity Intelligence Engine
- ADR-005 — Authentication & Identity/Access Management
- IC-007 — Testing Standard
- IC-016 — Dependency Management Standard

## Deliverables

- ADR-006 — Resource Directory (architectural decisions)
- Prisma migration `20260714200053_add_resource_directory`
- `apps/api/src/resources/**` (module, service, controller, guards reuse, DTOs, repository, scoring, saved-resources sub-feature, unit/integration/e2e tests)
- CI workflow update: PostgreSQL service container + `prisma migrate deploy` step
- `apps/web/eslint.config.mjs` (non-interactive lint config fix, discovered blocking a green `pnpm run lint`)
- `docs/verification/WO-020-OPERATIONAL-VERIFICATION.md`

## Files Created

- `apps/api/src/resources/resources.{module,controller,service}.ts`, `resources.service.spec.ts`, `resources.integration.spec.ts`, `resources.e2e.spec.ts`
- `apps/api/src/resources/dto/{create-resource,update-resource,reject-resource,list-resources-query,resource-response,paginated-resources-response}.dto.ts`
- `apps/api/src/resources/repositories/{resource.repository.interface,prisma-resource.repository}.ts`
- `apps/api/src/resources/scoring/{resource-scoring.service,resource-scoring.service.spec}.ts`
- `apps/api/src/resources/saved/{saved-resources.controller,saved-resources.service,saved-resources.service.spec}.ts`
- `apps/api/src/resources/saved/dto/{save-resource,saved-resource-response}.dto.ts`
- `apps/api/src/resources/saved/repositories/{saved-resource.repository.interface,prisma-saved-resource.repository}.ts`
- `apps/api/test/jest.setup.js`
- `apps/web/eslint.config.mjs`
- `prisma/migrations/20260714200053_add_resource_directory/migration.sql`
- `docs/architecture/ADR-006-Resource-Directory.md`
- `docs/verification/WO-020-OPERATIONAL-VERIFICATION.md`
- `docs/work-orders/WO-020-Resource-Directory.md` (this file)

## Files Modified

- `prisma/schema.prisma` — `ResourceCategory`, `ResourceType`, `ResourceStatus` enums; `EXTERNAL_SOURCE` added to `SourceType`; `Resource`, `SavedResource` models.
- `apps/api/src/app.module.ts` — registers `ResourcesModule`.
- `apps/api/src/main.ts` — Swagger `resources` tag.
- `apps/api/package.json` — `supertest`, `@types/supertest` (test-only additions).
- `apps/api/jest.config.js` — `setupFiles` for env loading in integration/e2e tests.
- `apps/web/package.json` — `eslint`, `eslint-config-next`, `@eslint/eslintrc` (dev-only, enables non-interactive lint).
- `.github/workflows/ci.yml` — PostgreSQL service container, `DATABASE_URL`/`JWT_ACCESS_SECRET` env, `prisma migrate deploy` step.

## Database Changes

Migration `20260714200053_add_resource_directory`: adds `ResourceCategory`, `ResourceType`, `ResourceStatus` enums; extends `SourceType` with `EXTERNAL_SOURCE`; creates `Resource` (13 indexes/constraints incl. unique `sequenceNumber`/`resourceRef`) and `SavedResource` (unique `[userId, resourceId]`, cascading FK to `Resource`) tables.

## API Changes

New: `POST/GET/PATCH/DELETE /resources`, `GET /resources/by-ref/:ref`, `GET /resources/:id`, `POST /resources/:id/{submit-for-review,verify,reject,archive}`, `POST/GET/PATCH/DELETE /users/:userId/saved-resources[/:resourceId]`.

## Security Requirements

- All mutating endpoints require a valid JWT (`JwtAuthGuard`).
- `create` restricted to `STEWARD`/`ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`/`PLATFORM_ADMINISTRATOR`.
- `verify`/`reject` restricted to `STEWARD`/`PLATFORM_ADMINISTRATOR` only (no ownership override — moderation is role-exclusive).
- `update`/`remove`/`submitForReview`/`archive` require resource ownership (`ownerId === caller.id`) or `STEWARD`/`PLATFORM_ADMINISTRATOR`.
- `ownerId`/`submittedById`/`createdById`/`lastUpdatedById` are always derived from the verified JWT — never accepted as client input (closes the spoofing vector flagged as technical debt against the Opportunity Engine in ADR-004/ADR-005).
- Saved Resources are strictly self-scoped (`caller.id === userId`), guarded from the start (unlike the pre-existing, unguarded `SavedOpportunitiesController`).
- Public read endpoints default to `VERIFIED` listings only; unverified content is never surfaced as trusted (PA-014 architectural boundary).

## Testing Requirements

- Unit: `ResourcesService` (creation, authorization branching, all five workflow transitions, conflict/not-found/forbidden paths), `ResourceScoringService` (confidence/freshness formulas), `SavedResourcesService`.
- Integration: `PrismaResourceRepository` against a real PostgreSQL database — unique constraints, array (`tags`) containment filtering, case-insensitive search, pagination, status-transition persistence.
- End-to-end: full HTTP lifecycle via Supertest against a booted application — 401/403/400/404/409 status codes, the complete verification workflow, ownership enforcement, saved-resource ownership enforcement — mirroring the manual curl verification performed for WO-018/WO-019, now automated.

## Acceptance Criteria

- [x] A `STEWARD`/`ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`/`PLATFORM_ADMINISTRATOR` can create a resource; a plain `MEMBER` cannot (403); an unauthenticated caller cannot (401).
- [x] `ownerId` is always the authenticated creator, never client-supplied.
- [x] DRAFT resources are excluded from the default public listing; VERIFIED resources are included.
- [x] Only the owner or a Steward/Admin can update, delete, submit-for-review, or archive a resource; a non-owner member is forbidden (403).
- [x] Only a Steward/Admin can verify or reject, regardless of ownership.
- [x] The verification state machine rejects invalid transitions (409).
- [x] Confidence/freshness scores recompute on update and verification.
- [x] Search, category/type/tag/location/remote filters, and pagination all function against a real database.
- [x] Saved Resources are strictly self-scoped; a member cannot read or write another member's saved list.
- [x] `tsc --noEmit`, `eslint` (both packages), `jest` (unit + integration + e2e), and `pnpm run build` are all clean.
- [x] The compiled application boots, connects to PostgreSQL, and serves all routes.
- [x] Live verification via curl confirms the full workflow end-to-end against a running instance.

## Definition of Done

Met — see `docs/verification/WO-020-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- No `Organization` entity yet (see ADR-006 Decision 3); `organizationName` is free text.
- No role grant/revoke administration endpoint exists for any domain; elevated-role test accounts were provisioned at the database layer.
- `SavedOpportunitiesController` and Goals/Journeys/Milestones/Tasks/UserInterests remain unguarded (pre-existing, out of this WO's scope).

## Recommended Next Work Order

**WO-021 — Administration & Operations: Role Management.** Add endpoints for `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` to grant/revoke roles (`ORGANIZATION_REPRESENTATIVE`, `BUSINESS_REPRESENTATIVE`, `STEWARD`, etc.). This unblocks live, API-only verification of every role-gated feature built so far (Opportunities, Resources) without direct database access, and is itself a required piece of the Administration & Operations domain named in PA-020's Version 1 scope.

Also carried over from ADR-005: retrofit ownership guards onto `SavedOpportunitiesController`, Goals, Journeys, Milestones, Tasks, and UserInterests.
