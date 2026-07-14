# ADR-007 — Administration & Operations: Role Management

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-14 |
| Work Order | WO-021 |
| Authority | PA-003, PA-018, PA-020, OAS-SEC-003, ADR-005, ADR-006 |

---

## Context

WO-019 (Authentication) and WO-020 (Resource Directory) both built real, working role-based access control — but no endpoint existed anywhere in the platform to actually grant or revoke a role. Every registered account defaults to `MEMBER` (`AuthService.register`, ADR-005). Operational verification for both prior Work Orders had to elevate test accounts by writing directly to the `User.roles` column via `psql`, which is explicitly documented as a known limitation in both WO-020 and ADR-006 and is not a viable path for a production platform, let alone one preparing to admit external members.

WO-021 closes this gap: `PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` callers can now grant and revoke roles through the API, with the invariants PA-018 and OAS-SEC-003 require (least privilege, separation of duties, auditability) enforced in code rather than by operator discipline.

There is no dedicated PA document for "Administration & Operations" (PA-001 through PA-020 do not include one) — it appears only as a named Version 1 system in PA-020's scope list. This is not a gap requiring a stop: PA-018 (Permissions & Access Architecture) and OAS-SEC-003 (Identity and Access Management Framework) already fully specify the canonical requirements role management must satisfy (role-based access, least privilege, logged permission changes, access review capability), exactly as they did for WO-019's authentication work before any Administration-specific document existed.

---

## Decisions

### 1. A new bounded module, not an extension of `UsersModule`

**Decision:** Role management lives in a new `apps/api/src/administration/` module (`AdministrationModule`, `UserRolesController`, `UserRolesService`), not as additional methods on `UsersController`/`UsersService`.

**Rationale:** `UsersModule` is the identity/profile CRUD reference implementation (ADR-003) — every future domain module follows its layering pattern, but its own responsibility should stay narrow. Role management is a distinct administrative capability (PA-020 names "Administration & Operations" as its own Version 1 system) that will grow to include further administrative capabilities. Starting it as its own module now avoids a future, more disruptive extraction. `AdministrationModule` depends on `UsersModule` (via its exported `USER_REPOSITORY` token, the same pattern `AuthModule` already uses) and `AuthGuardsModule` — it does not duplicate any persistence or guard logic.

---

### 2. Two explicit action endpoints, not a generic role-replace PATCH

**Decision:** `POST /users/:id/roles/grant` and `POST /users/:id/roles/revoke`, each taking a single `{ role }` body, rather than `PATCH /users/:id/roles { roles: UserRole[] }` accepting a full replacement array.

**Rationale:** Matches the explicit-action-endpoint convention already established for state-changing operations across the platform (`/opportunities/:id/verify`, `/resources/:id/archive`, etc.) rather than introducing a new interaction style. A single-role grant/revoke is also the safer primitive: a full-array replacement endpoint would let a caller silently drop roles they didn't intend to touch (e.g. overwriting `[MEMBER, STEWARD]` with `[MEMBER]` because the client's local state was stale), whereas grant/revoke are explicit, auditable, single-effect operations — and each independently enforces the invariants below.

---

### 3. `MEMBER` is a protected, non-assignable role

**Decision:** `MEMBER` can never be granted or revoked through this endpoint (`ConflictException` either way).

**Rationale:** `MEMBER` is the baseline every account receives at registration (ADR-005) — it is not a privilege being extended, it is the floor. Allowing it to be revoked would strip a real member of their fundamental platform access as a side effect of an administrative action intended for elevated roles; allowing it to be granted is meaningless (it's already present on every account). Treating it as protected keeps the invariant "every account always holds at least one role" trivially true without extra bookkeeping.

---

### 4. Two-tier admin hierarchy: `PLATFORM_ADMINISTRATOR` vs. `SYSTEM_ADMINISTRATOR`

**Decision:** Both roles may call the endpoint (`RolesGuard` at the controller), but only a `SYSTEM_ADMINISTRATOR` may grant or revoke `PLATFORM_ADMINISTRATOR`, `SYSTEM_ADMINISTRATOR`, or `AI_SERVICE_ACCOUNT` (enforced in `UserRolesService.assertMutable`). A `PLATFORM_ADMINISTRATOR` may grant/revoke any other non-`MEMBER` role (`STEWARD`, `ORGANIZATION_REPRESENTATIVE`, `BUSINESS_REPRESENTATIVE`) freely.

**Rationale:** PA-018 requires "Separation of duties where appropriate" and least privilege. PA-003 already establishes `Platform Administrator` and treats `System Administrator` as a distinct, higher access level (PA-018's Access Levels list them separately). Without this split, any platform administrator could mint new platform/system administrators without oversight — a privilege-escalation path directly contradicting least privilege. `AI_SERVICE_ACCOUNT` is grouped with the admin-only tier because assigning it is effectively granting a non-human account service-level trust (PA-018: "AI ... Never grant itself additional permissions"), which warrants the same elevated authorization as granting admin roles.

---

### 5. Callers cannot modify their own roles

**Decision:** `caller.id === targetUserId` is rejected with `ForbiddenException` for both grant and revoke, regardless of the caller's privilege level (even a `SYSTEM_ADMINISTRATOR` cannot touch their own roles through this endpoint).

**Rationale:** Prevents two failure modes: accidental self-lockout (an administrator revoking their own last admin role and losing the ability to fix it) and self-escalation (an administrator granting themselves a role beyond what a second party approved). This mirrors standard privileged-access-management practice and OAS-SEC-003's requirement that privileged access be reviewed and granted by someone other than the recipient.

---

### 6. Revocation cannot leave a user with zero roles

**Decision:** If revoking the requested role would leave `roles` empty, the service throws `ConflictException` instead of persisting the change.

**Rationale:** A roleless user would fail every `RolesGuard` check platform-wide and could not even be routed back into a valid state without direct database access — the exact operational failure mode this WO exists to eliminate. In practice this case only arises for accounts whose roles were seeded outside the normal registration flow (registration always includes `MEMBER`, which is itself protected from revocation), but the guard is defense-in-depth against any such state.

---

### 7. `GET /users?role=` filter added to `UsersModule`

**Decision:** `ListUsersQueryDto` gains an optional `role` filter (`Prisma`'s array-containment `has` operator), implemented in `UsersModule`/`PrismaUserRepository`, not in the new `AdministrationModule`.

**Rationale:** Filtering the user list by role is a read operation on `User` records — it belongs with the other `User` query filters (`status`) already in `UsersModule`, exactly where a future reader would look for it. It is essential to this WO in practice (an administrator granting/revoking roles needs to find who currently holds a role), so it is included here rather than deferred, but it is not itself privilege-management logic and does not belong in `AdministrationModule`.

---

### 8. Structured `Logger` audit output, no new `AuditLog` table

**Decision:** Every grant/revoke logs `Role ${role} granted/revoked to/from ${targetUserId} by ${caller.id}` via NestJS `Logger`, consistent with the precedent set in ADR-004 §7, carried through ADR-005 and ADR-006.

**Rationale:** PA-018 requires logging "significant permission changes." No platform-wide `AuditLog` table exists yet; introducing one as a side effect of this WO would be scope creep beyond role management itself. Structured logging is the established, explicitly-endorsed V1 interim approach (ADR-004: "a dedicated AuditLog table should be created in a future phase when the platform-wide audit infrastructure ... is established").

---

## Risks

| Risk | Mitigation |
|---|---|
| No `AuditLog` table — role changes are only in application logs, not queryable in the database | Consistent, explicitly-accepted V1 precedent (see Decision 8); a platform-wide audit table remains a known future WO for every domain, not unique to this one |
| No bootstrap path for the very first `SYSTEM_ADMINISTRATOR`/`PLATFORM_ADMINISTRATOR` account | Every account still starts as `MEMBER`; the first elevated account must be provisioned by an operator with direct database access (as was already necessary for WO-019/WO-020 verification) exactly once per environment. Documented in WO-021 as an explicit operational step, not silently assumed |
| Two-tier hierarchy adds a second privilege check beyond `RolesGuard` | Necessary for least privilege (Decision 4); fully unit- and e2e-tested |

---

## Future Extension Points

- Platform-wide `AuditLog` table querying role/permission changes across all domains (not scoped to this WO).
- Periodic access review tooling (OAS-SEC-003 explicitly requires "Periodic access reviews").
- Bootstrap/seed tooling for the first `SYSTEM_ADMINISTRATOR` account in a fresh environment, to remove the one remaining manual database step.
- Extending `AdministrationModule` with further Administration & Operations capabilities (system configuration, moderation oversight) as later Work Orders require them, per PA-020's Version 1 scope.
