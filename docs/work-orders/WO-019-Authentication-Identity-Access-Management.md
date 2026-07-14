# WO-019 — Authentication & Identity/Access Management

| Field | Value |
|---|---|
| Work Order Number | WO-019 |
| Title | Authentication & Identity/Access Management |
| Status | Complete |
| Priority | Critical (blocking production readiness) |
| Date | 2026-07-14 |

---

## Objective

Deliver production-ready authentication and role-based authorization for the Aureus API, closing the technical debt explicitly flagged in ADR-003 (User Module) and ADR-004 (Opportunity Engine): *"No auth guards on workflow actions... auth WO must precede production deployment."*

---

## Scope

- Credential-based registration and login (email + password).
- JWT access tokens; rotating, revocable opaque refresh tokens.
- Logout (refresh token revocation).
- Password reset (request + confirm) with session invalidation on completion.
- Email verification (token issuance + confirmation).
- Role-based access control per PA-003 (User Types & Roles) and PA-018 (Permissions & Access Architecture): `MEMBER`, `STEWARD`, `ORGANIZATION_REPRESENTATIVE`, `BUSINESS_REPRESENTATIVE`, `PLATFORM_ADMINISTRATOR`, `SYSTEM_ADMINISTRATOR`, `AI_SERVICE_ACCOUNT`.
- `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()` reusable across all modules.
- Guard retrofit onto the two modules explicitly flagged as needing them: Opportunities (verification workflow) and Users (self/admin ownership).
- Swagger bearer-auth scheme.

## Out of Scope

- Email delivery (SMTP/SES/SendGrid integration) — tokens are logged via NestJS `Logger`, consistent with the ADR-004 precedent for V1 audit visibility. Tracked as follow-up.
- Multi-factor authentication.
- OAuth/social login.
- Guard retrofit onto Goals, Journeys, Milestones, Tasks, SavedOpportunities, UserInterests — recommended as WO-020 (see below); these currently have no ownership scoping at all, which is a separate, larger surface than this WO's explicitly-flagged scope.
- Deriving `reviewedById` / `submittedById` / `archivedById` on Opportunity workflow actions from the JWT instead of the request body — would require reworking existing service signatures and tests; flagged as a fast-follow.

## Dependencies

- WO-003 (User Module) — complete.
- Phase 2 (Opportunity Engine, ADR-004) — complete.

## Source Documents

- PA-003 — User Types & Roles
- PA-018 — Permissions & Access Architecture
- OAS-SEC-003 — Identity and Access Management Framework
- ADR-003 — User Module Architecture
- ADR-004 — Opportunity Intelligence Engine
- IC-016 — Dependency Management Standard

## Deliverables

- ADR-005 — Authentication & Identity/Access Management (architectural decisions)
- Prisma migration `20260714193736_add_auth_identity_access`
- `apps/api/src/auth/**` (module, service, controller, guards, strategy, DTOs, repository, tests)
- Guard wiring in `UsersController` and `OpportunitiesController`
- `docs/verification/WO-019-OPERATIONAL-VERIFICATION.md`

## Files Created

- `apps/api/src/auth/auth.module.ts`, `auth-guards.module.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.service.spec.ts`, `token.util.ts`, `token.util.spec.ts`
- `apps/api/src/auth/dto/{register,login,refresh-token,forgot-password,reset-password,verify-email,token-pair,auth-response}.dto.ts`
- `apps/api/src/auth/repositories/{auth.repository.interface,prisma-auth.repository}.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/auth/guards/{jwt-auth.guard,roles.guard,roles.guard.spec}.ts`
- `apps/api/src/auth/decorators/{roles.decorator,current-user.decorator}.ts`
- `prisma/migrations/20260714193736_add_auth_identity_access/migration.sql`
- `docs/architecture/ADR-005-Authentication-Identity-Access-Management.md`
- `docs/verification/WO-019-OPERATIONAL-VERIFICATION.md`
- `docs/work-orders/WO-019-Authentication-Identity-Access-Management.md` (this file)

## Files Modified

- `prisma/schema.prisma` — `UserRole` enum; `User.passwordHash`, `User.roles`; `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken` models.
- `apps/api/src/app.module.ts` — registers `AuthModule`; adds `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY_DAYS` to the Joi env schema.
- `apps/api/src/main.ts` — Swagger bearer-auth scheme, `auth` tag.
- `apps/api/src/users/dto/user-response.dto.ts` — exposes `roles`.
- `apps/api/src/users/repositories/user.repository.interface.ts` — `passwordHash`/`roles` on create/update inputs.
- `apps/api/src/users/users.module.ts` — exports `USER_REPOSITORY`; imports `AuthGuardsModule`.
- `apps/api/src/users/users.controller.ts` — guards + self-or-admin ownership checks.
- `apps/api/src/users/{users.service.spec.ts,repositories/prisma-user.repository.spec.ts}` — fixtures updated for new `User` fields.
- `apps/api/src/opportunities/opportunities.controller.ts` — guards on create/update/delete/workflow actions.
- `apps/api/src/opportunities/opportunities.module.ts` — imports `AuthGuardsModule`.
- `apps/api/package.json` — `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcryptjs` (+ type packages).
- `.env.example` — JWT env vars documented.

## Database Changes

Migration `20260714193736_add_auth_identity_access`: adds `UserRole` enum; `User.passwordHash` (nullable), `User.roles` (array, default `[MEMBER]`); creates `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken` tables (all token values stored as SHA-256 hashes, never plaintext).

## API Changes

New: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `GET /auth/me`.

Changed authorization on existing endpoints:
- `POST/PATCH/DELETE /opportunities`, `/opportunities/:id/{submit-for-review,verify,reject,archive}` — now require a bearer token and role membership (see ADR-005).
- `POST/GET /users`, `DELETE /users/:id` — require a bearer token and an administrative role (`GET /users` also permits `STEWARD`).
- `GET/PATCH /users/:id` — require a bearer token; permitted for the token's own subject or an administrative role.

## Security Requirements

- Passwords hashed with bcrypt (bcryptjs, 12 salt rounds); never logged or returned.
- Refresh/reset/verification tokens are high-entropy (32 random bytes), stored only as SHA-256 hashes, single-use where applicable, and time-limited (refresh: 30d default; reset: 30m; email verification: 48h).
- Refresh tokens rotate on every use; the previous token is immediately revoked.
- Password reset revokes all of the user's existing refresh tokens (forces re-authentication everywhere).
- `forgot-password` does not reveal whether an email is registered (enumeration resistance).
- `JWT_ACCESS_SECRET` is required (min 32 chars) and fails startup via the existing Joi validation if absent, consistent with WO-018's fail-fast pattern.

## Testing Requirements

Unit tests for `AuthService` (register/login/refresh/logout/forgot-password/reset-password/verify-email — success and failure paths), `RolesGuard`, and `token.util`. Full end-to-end manual verification against a running instance (see WO-019 Operational Verification Report).

## Acceptance Criteria

- [x] A visitor can register, receive tokens, and appear as `MEMBER`.
- [x] Login rejects unknown emails, wrong passwords, and non-`ACTIVE` accounts with `401`.
- [x] `GET /auth/me` requires a valid access token.
- [x] Refresh tokens rotate; a used/revoked/expired refresh token is rejected.
- [x] Logout revokes the refresh token.
- [x] Password reset updates the password hash and revokes existing sessions.
- [x] Email verification is single-use and time-limited.
- [x] `Opportunities` workflow actions and `Users` mutating endpoints reject unauthenticated and under-privileged callers.
- [x] A member can read/update their own user record but not another member's.
- [x] All existing tests continue to pass; new tests cover the auth domain.
- [x] `tsc --noEmit`, `eslint`, `jest`, and `pnpm run build` are clean for the API workspace.

## Definition of Done

Met — see `docs/verification/WO-019-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- No email delivery integration; verification/reset tokens are logged, not emailed.
- No MFA.
- Goals/Journeys/Milestones/Tasks/SavedOpportunities/UserInterests are not yet guarded (recommended: WO-020).
- Opportunity workflow actions still accept reviewer/submitter identity via request body rather than deriving it from the JWT (recommended: WO-021).

## Recommended Next Work Order

**WO-020 — Ownership Authorization for Journey & Opportunity-Adjacent Domains.** Apply `JwtAuthGuard` + ownership checks to Goals, Journeys, Milestones, Tasks, SavedOpportunities, and UserInterests, mirroring the pattern established in `UsersController`.
