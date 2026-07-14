# ADR-005 — Authentication & Identity/Access Management

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-14 |
| Work Order | WO-019 |
| Authority | PA-003, PA-018, OAS-SEC-003, ADR-003 (Future Extension Points), ADR-004 (Risks) |

---

## Context

ADR-003 (User Module) and ADR-004 (Opportunity Engine) both shipped without authentication, explicitly deferring it to "an auth WO." Every mutating endpoint in the API was callable anonymously, and the Opportunity verification workflow accepted a self-reported reviewer ID with no way to verify the caller held the authority to act. WO-019 closes this gap.

---

## Decisions

### 1. JWT access tokens + opaque, hashed, rotating refresh tokens

**Decision:** Access tokens are short-lived (`15m` default) signed JWTs (`@nestjs/jwt`, HS256, secret from `JWT_ACCESS_SECRET`). Refresh tokens are cryptographically random opaque strings (32 bytes, base64url), stored server-side only as a SHA-256 hash, and rotated (old token revoked, new one issued) on every use.

**Rationale:** JWTs avoid a database round-trip on every authenticated request. Refresh tokens are kept server-revocable (unlike a long-lived JWT, which cannot be invalidated before expiry without a blocklist) — critical for logout and forced session invalidation after a password reset. Hashing refresh/reset/verification tokens before storage means a database read alone cannot be used to impersonate a user (OAS-SEC-003 — credential protection).

**Alternatives considered:** Long-lived JWT refresh tokens — rejected because they cannot be revoked without maintaining a blocklist, which reintroduces the database dependency this approach was meant to avoid, without the benefit of easy rotation.

---

### 2. bcryptjs over native bcrypt

**Decision:** Password hashing uses `bcryptjs` (pure JavaScript, 12 salt rounds) rather than the native `bcrypt` binding.

**Rationale:** IC-016 (Dependency Management Standard) Article IV requires evaluating operational complexity. Native `bcrypt` requires a compiled binding per platform/Node version, which is a real source of CI and container-build failures. `bcryptjs` is a well-maintained, drop-in-compatible pure-JS implementation, trading a modest throughput cost (irrelevant at V1 auth volumes) for zero native build risk.

---

### 3. Two-tier module split: `AuthGuardsModule` vs `AuthModule`

**Decision:** `JwtStrategy` and `RolesGuard` live in a standalone `AuthGuardsModule` with no dependency on `UsersModule`. `AuthModule` (registration/login/etc., which needs `UsersModule` for credential lookup) imports `AuthGuardsModule`. Any other module that needs to protect routes (`UsersModule`, `OpportunitiesModule`) imports `AuthGuardsModule` directly, not `AuthModule`.

**Rationale:** `AuthModule` depends on `UsersModule` (to look up/create users). If `UsersModule` also needed to import `AuthModule` to get `RolesGuard`, that would be a circular module dependency. Splitting the guard infrastructure out breaks the cycle and gives every future module a lightweight way to protect its routes without pulling in the full auth/credential surface.

---

### 4. Roles stored as `UserRole[]` on `User`, not a join table

**Decision:** `User.roles UserRole[] @default([MEMBER])`, mirroring the precedent set by `Opportunity.tags String[]` in ADR-004.

**Rationale:** PA-003 explicitly allows a user to hold multiple roles simultaneously (e.g. Member + Steward). A Postgres array is sufficient for V1 role-check volumes and keeps `RolesGuard` a simple array-intersection check. Consistent with the existing "array over join table for V1, migrate later if needed" pattern already established for tags.

---

### 5. Guards applied explicitly per-route, not globally

**Decision:** `JwtAuthGuard`/`RolesGuard` are applied via `@UseGuards()` on individual controller methods, not registered as a global `APP_GUARD`.

**Rationale:** Most of the API (opportunity browsing, health checks) is intentionally public. A global guard would require a `@Public()` escape hatch on every open route; explicit per-route guards make the security boundary visible at the call site and match the existing codebase's preference for explicit, readable code over decorator-driven defaults-with-exceptions.

---

### 6. Guard retrofit scoped to Users and Opportunities only

**Decision:** This WO applies guards to `UsersController` and `OpportunitiesController` — the two modules explicitly named as blocked on auth in ADR-003 and ADR-004. Goals, Journeys, Milestones, Tasks, SavedOpportunities, and UserInterests are left unguarded, tracked as WO-020.

**Rationale:** IC-004 (Work Order Standard), Article III — scope discipline. Retrofitting ownership checks onto six additional modules is a distinct, mechanically similar but non-trivial body of work (each needs an ownership check against `userId`, plus test updates) that deserves its own Work Order rather than uncontrolled scope growth of WO-019.

---

### 7. Password reset / email verification tokens are logged, not emailed

**Decision:** Following the ADR-004 precedent ("no AuditLog table yet — structured logging via the built-in Logger is the correct V1 approach"), password reset and email verification tokens are emitted via NestJS `Logger` rather than sent through an email provider, since no email delivery infrastructure exists yet.

**Rationale:** Consistent precedent; avoids introducing an email-provider dependency inside an authentication WO. Tracked as explicit follow-up work — the token *generation, hashing, expiry, and single-use enforcement* are all production-correct; only the *delivery channel* is deferred.

---

## Risks

| Risk | Mitigation |
|---|---|
| No email delivery — reset/verification tokens only reach an operator via logs | Documented follow-up WO; acceptable for V1 (no production traffic yet) |
| Opportunity workflow actions still take reviewer identity from the request body, not the JWT | Guards now prevent an unauthenticated/unauthorized caller from invoking the action at all; a caller with a legitimate STEWARD/ADMIN token could still misattribute the action to a different `reviewedById`. Tracked as WO-021 |
| `bcryptjs` has lower throughput than native `bcrypt` | Acceptable at V1 auth volumes; revisit if login throughput becomes a bottleneck |
| Six domain modules (Goals, Journeys, etc.) remain unguarded | Explicitly tracked as WO-020, not silently deferred |

---

## Future Extension Points

- WO-020: ownership guards on Goals/Journeys/Milestones/Tasks/SavedOpportunities/UserInterests.
- WO-021: derive Opportunity workflow actor identity from the JWT instead of the request body.
- Email delivery integration (SES/SendGrid) for verification/reset tokens.
- MFA (OAS-SEC-003 notes "support multi-factor authentication where appropriate").
- Access review tooling per OAS-SEC-003's periodic access review requirement.
