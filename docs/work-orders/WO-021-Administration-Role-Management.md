# WO-021 — Administration & Operations: Role Management

| Field | Value |
|---|---|
| Work Order Number | WO-021 |
| Title | Administration & Operations: Role Management |
| Status | Complete |
| Priority | High (unblocks all prior role-gated features from requiring direct database access) |
| Date | 2026-07-14 |

---

## Objective

Give `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` accounts the ability to grant and revoke user roles through the API, closing the gap explicitly flagged as a known limitation in WO-020 and ADR-006: no role-elevation endpoint existed anywhere in the platform, so every prior Work Order's operational verification required elevating test accounts by writing directly to the database.

## Scope

- `POST /users/:id/roles/grant` and `POST /users/:id/roles/revoke`, restricted to `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`.
- Role hierarchy: `SYSTEM_ADMINISTRATOR`-only authority over `PLATFORM_ADMINISTRATOR`, `SYSTEM_ADMINISTRATOR`, `AI_SERVICE_ACCOUNT`; `PLATFORM_ADMINISTRATOR` may act on `STEWARD`, `ORGANIZATION_REPRESENTATIVE`, `BUSINESS_REPRESENTATIVE`.
- `MEMBER` protected as a non-assignable baseline role.
- Self-modification blocked for all callers regardless of privilege level.
- Guard against revoking a user's last remaining role.
- `GET /users?role=` filter, for administrators to find who currently holds a role.
- Structured audit logging for every grant/revoke.
- Full Swagger documentation (`administration` tag).
- Unit and end-to-end automated tests.

## Out of Scope

- A platform-wide `AuditLog` table (consistent, explicitly-accepted precedent from ADR-004/005/006 — structured `Logger` output only).
- Bootstrap tooling for the first `SYSTEM_ADMINISTRATOR` account (still a one-time manual database step per environment, same as prior WOs' verification).
- Any Administration & Operations capability beyond role management (system configuration, moderation oversight) — left for future Work Orders under the same `AdministrationModule`.

## Dependencies

- WO-019 (Authentication & Identity/Access Management) — complete, merged.
- WO-020 (Resource Directory) — complete, merged; its Known Limitations section is what this WO resolves.

## Source Documents

- PA-003 — User Types & Roles
- PA-018 — Permissions & Access Architecture
- PA-020 — Version 1 Scope & Product Roadmap (names "Administration & Operations" as a Version 1 system)
- OAS-SEC-003 — Identity and Access Management Framework
- ADR-005 — Authentication & Identity/Access Management
- ADR-006 — Resource Directory (recommended this WO as its follow-up)

## Deliverables

- ADR-007 — Administration & Operations: Role Management
- `apps/api/src/administration/**` (module, controller, service, DTO, unit + e2e tests)
- `GET /users?role=` filter (`ListUsersQueryDto`, `PrismaUserRepository`, `UsersService`)
- `docs/verification/WO-021-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (new living release-tracking document)

## Files Created

- `apps/api/src/administration/administration.module.ts`
- `apps/api/src/administration/user-roles.controller.ts`
- `apps/api/src/administration/user-roles.service.ts`
- `apps/api/src/administration/user-roles.service.spec.ts`
- `apps/api/src/administration/user-roles.e2e.spec.ts`
- `apps/api/src/administration/dto/role-action.dto.ts`
- `docs/architecture/ADR-007-Administration-Role-Management.md`
- `docs/verification/WO-021-OPERATIONAL-VERIFICATION.md`
- `docs/work-orders/WO-021-Administration-Role-Management.md` (this file)
- `docs/releases/version-1-readiness.md`

## Files Modified

- `apps/api/src/app.module.ts` — registers `AdministrationModule`.
- `apps/api/src/main.ts` — Swagger `administration` tag.
- `apps/api/src/users/dto/list-users-query.dto.ts` — `role` filter.
- `apps/api/src/users/repositories/user.repository.interface.ts` — `role` on `PaginationParams`.
- `apps/api/src/users/repositories/prisma-user.repository.ts` — `roles: { has: role }` filter.
- `apps/api/src/users/users.service.ts` — forwards `role` filter.
- `apps/api/src/users/users.service.spec.ts`, `apps/api/src/users/repositories/prisma-user.repository.spec.ts` — new test coverage for the role filter.

## Database Changes

None. `User.roles` already existed (WO-019); this WO is API-layer only.

## API Changes

New: `POST /users/:id/roles/grant`, `POST /users/:id/roles/revoke`. Extended: `GET /users` accepts an optional `role` query parameter.

## Security Requirements

- Both endpoints require a valid JWT and `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` role (`JwtAuthGuard` + `RolesGuard`).
- Two-tier privilege enforcement: only `SYSTEM_ADMINISTRATOR` may act on admin-tier roles (see ADR-007 Decision 4).
- `MEMBER` is never grantable or revocable through this endpoint.
- Callers cannot modify their own roles (self-lockout/self-escalation prevention).
- Revocation cannot leave a user with zero roles.
- Every grant/revoke is logged with actor, target, and role.

## Testing Requirements

- Unit: `UserRolesService` — every authorization branch (self-modification, admin-tier hierarchy, protected role, not-found, already-held, not-held, last-role guard) for both `grant` and `revoke`.
- End-to-end: full HTTP lifecycle via Supertest against a booted application — 401/403/409 enforcement, successful grant/revoke round-trips, the role list filter, and the "last remaining role" guard (seeded via direct database write, since no other endpoint can produce that state).

## Acceptance Criteria

- [x] An unauthenticated caller cannot grant or revoke a role (401).
- [x] A plain `MEMBER` cannot grant or revoke a role (403).
- [x] A `PLATFORM_ADMINISTRATOR` can grant/revoke `STEWARD`/`ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`.
- [x] A `PLATFORM_ADMINISTRATOR` cannot grant/revoke `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`/`AI_SERVICE_ACCOUNT` (403).
- [x] A `SYSTEM_ADMINISTRATOR` can grant/revoke any non-`MEMBER` role.
- [x] `MEMBER` cannot be granted or revoked by anyone (409).
- [x] No caller can modify their own roles (403).
- [x] Granting an already-held role, or revoking a role not held, returns 409.
- [x] Revoking a user's only remaining role returns 409.
- [x] `GET /users?role=X` returns users holding that role.
- [x] All existing tests continue to pass; new tests cover every branch (100% statement coverage on the new module).
- [x] `tsc --noEmit`, `eslint`, `jest`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl confirms the full workflow end-to-end against a running instance.

## Definition of Done

Met — see `docs/verification/WO-021-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- No bootstrap endpoint for the first `SYSTEM_ADMINISTRATOR` in a fresh environment; still requires one direct database write per environment before role management can be used at all.
- No `AuditLog` table; role-change history lives only in application logs.

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation — that document, not this one, is updated going forward as the source of truth for release sequencing.
