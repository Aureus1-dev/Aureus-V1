# WO-023 — Email Delivery Integration

| Field | Value |
|---|---|
| Work Order Number | WO-023 |
| Title | Email Delivery Integration |
| Status | Complete |
| Priority | High (Version 1 Release Blocker — required before external members can be invited) |
| Date | 2026-07-15 |

---

## Objective

Replace the structured-logging stub for password-reset and email-verification tokens (ADR-005 §7, explicitly deferred) with a real transactional email delivery integration, so a real member can complete account verification and password recovery without an operator manually reading application logs.

## Scope

- New `EmailModule` (`apps/api/src/email/`) providing `IEmailService`/`EMAIL_SERVICE` and a `nodemailer`-backed SMTP implementation.
- `AuthService.register()` (email verification) and `AuthService.forgotPassword()` (password reset) now call the real email service instead of only logging the token.
- SMTP configuration via `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM_EMAIL`, validated (optionally) via the existing Joi schema in `AppModule`.
- `FRONTEND_URL` configuration for building verification/reset links.
- Local-development/CI fallback (`nodemailer`'s `jsonTransport`) when `SMTP_HOST` is not configured, with an explicit startup warning.
- Plaintext tokens removed from `AuthService`'s log output now that a real delivery channel exists (ADR-009 Decision 5).
- Applied the Next.js dependency patch (`apps/web`: `15.3.3` → `15.5.20`) recommended as an immediate prerequisite in `version-1-readiness.md`, resolving the critical RCE and 24 other known vulnerabilities.
- Unit tests for `NodemailerEmailService` (transport selection, message content) and updated `AuthService` unit tests (email service invoked correctly).
- New end-to-end test suite for `AuthModule` (previously untested at the e2e tier) covering the full register→verify-email and forgot-password→reset-password flows with a mocked `EMAIL_SERVICE` DI binding.

## Out of Scope

- A background job queue for outbound email (ADR-009 Risks — acceptable at V1 traffic levels).
- A generic `send()` email primitive (ADR-009 Decision 2 — no second use case exists yet).
- Bounce/complaint/deliverability tracking (ADR-009 Future Extension Points — belongs to a future Communication System WO, PA-015).
- MFA, audit log table, and every other Release Blocker/Remaining Work Order not related to email delivery — tracked separately in `docs/releases/version-1-readiness.md`.

## Dependencies

- WO-019 (Authentication & Identity/Access Management) — complete, merged. Supplies the token generation/hashing/expiry/single-use logic this WO delivers, unchanged.
- WO-022 (Authorization Retrofit) — complete, merged. No functional dependency, but the immediately preceding Work Order in sequence.

## Source Documents

- OAS-SEC-003 — Identity and Access Management Framework
- ADR-005 — Authentication & Identity/Access Management (§7, the deferral this WO resolves)
- `docs/releases/version-1-readiness.md` — named this as the recommended next Work Order after WO-022

## Deliverables

- ADR-009 — Email Delivery Integration
- `apps/api/src/email/**` (module, interface, Nodemailer implementation, unit tests)
- `apps/api/src/auth/auth.e2e.spec.ts` (new — Auth had no e2e coverage before this WO)
- `apps/web/package.json` — `next`/`eslint-config-next` patched to `15.5.20`
- `docs/verification/WO-023-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `apps/api/src/email/email.service.interface.ts`
- `apps/api/src/email/nodemailer-email.service.ts`
- `apps/api/src/email/nodemailer-email.service.spec.ts`
- `apps/api/src/email/email.module.ts`
- `apps/api/src/auth/auth.e2e.spec.ts`
- `docs/architecture/ADR-009-Email-Delivery-Integration.md`
- `docs/work-orders/WO-023-Email-Delivery-Integration.md` (this file)
- `docs/verification/WO-023-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `apps/api/src/auth/auth.module.ts` — imports `EmailModule`.
- `apps/api/src/auth/auth.service.ts` — injects `EMAIL_SERVICE`, calls it from `issueEmailVerificationToken`/`forgotPassword`, removes plaintext tokens from log output.
- `apps/api/src/auth/auth.service.spec.ts` — mocked `EMAIL_SERVICE`, new assertions.
- `apps/api/src/app.module.ts` — Joi schema gains `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM_EMAIL`/`FRONTEND_URL`.
- `apps/api/package.json` — adds `nodemailer` + `@types/nodemailer`.
- `.env.example` — documents the new email configuration variables.
- `apps/web/package.json` — `next`/`eslint-config-next` `15.3.3` → `15.5.20`.
- `docs/releases/version-1-readiness.md` — WO-023 marked complete, Release Blocker resolved, scores recomputed, next WO recommendation updated.

## Database Changes

None. `PasswordResetToken`/`EmailVerificationToken` tables already existed (WO-019); this WO is delivery-channel only.

## API Changes

None. `POST /auth/register`, `POST /auth/forgot-password`, `POST /auth/verify-email`, `POST /auth/reset-password` are unchanged in request/response shape and status codes — only their side effect (a real email is now sent) changed.

## Security Requirements

- Plaintext password-reset/email-verification tokens are no longer written to application logs (ADR-009 Decision 5).
- SMTP credentials are read from environment configuration only, never hardcoded, consistent with `JWT_ACCESS_SECRET`/`DATABASE_URL` handling.
- `forgotPassword`'s non-enumeration behavior (always 204, whether or not the email exists) is unchanged and re-verified by the new e2e suite.
- Email content includes only the opaque token (already hashed at rest, single-use, expiry-enforced) — no other sensitive account data.

## Testing Requirements

- Unit: `NodemailerEmailService` — transport selection (SMTP vs. `jsonTransport` fallback), message content (subject, recipient, link construction, token URL-encoding) for both email types.
- Unit: `AuthService` — updated to assert `EMAIL_SERVICE` is called with the correct recipient and a token, for both registration and forgot-password flows.
- End-to-end: full HTTP lifecycle via Supertest against a booted application with `EMAIL_SERVICE` overridden to a mock (real DB, real guards, real token logic; only the outbound SMTP call is substituted) — register→verify-email round trip, single-use token enforcement, forgot-password→reset-password round trip including old-password invalidation, and the non-enumeration guarantee.

## Acceptance Criteria

- [x] Registering a new account sends a real email-verification email (or, in an environment without SMTP configured, exercises the real send path via `jsonTransport`).
- [x] The emailed verification token successfully verifies the account when submitted; a second submission of the same token is rejected (401).
- [x] Requesting a password reset sends a real password-reset email.
- [x] The emailed reset token successfully changes the password; the old password no longer authenticates, the new one does.
- [x] Requesting a password reset for an unregistered email returns 204 and does not send an email (non-enumeration preserved).
- [x] No plaintext token appears in application logs.
- [x] `apps/web`'s `next` dependency is patched to `>=15.5.16` (landed on `15.5.20`).
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest`, `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl against a compiled, booted instance confirms the full workflow, including the `jsonTransport` fallback logging path and the absence of plaintext tokens in logs.

## Definition of Done

Met — see `docs/verification/WO-023-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- No background job queue — email sends happen synchronously within the request path (ADR-009 Risks).
- No retry mechanism for transient SMTP failures (mitigated by the underlying flows being naturally re-triggerable by the user).
- No bounce/complaint/deliverability tracking.
- No real SMTP provider has been exercised end-to-end in this implementation environment (no outbound network access to a real mail relay here) — the `jsonTransport` fallback path was live-verified instead; the real-SMTP code path was verified by unit test (`createTransport` called with correct config) and manual code review, not a live send. An operator deploying to production should perform one live send against their configured provider as part of deployment verification.

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
