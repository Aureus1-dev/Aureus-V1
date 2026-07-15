# ADR-009 — Email Delivery Integration

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-023 |
| Authority | OAS-SEC-003, ADR-005 §7 |

---

## Context

ADR-005 §7 explicitly deferred email delivery for account verification and password reset: tokens were generated, hashed, expiry-enforced, and single-use correctly, but the *delivery channel* was a structured `Logger` line rather than an actual email, because "no email delivery infrastructure exists yet." This was tracked as a named follow-up ("Email delivery integration (SES/SendGrid) for verification/reset tokens") and flagged in every subsequent readiness report as a hard Version 1 Release Blocker: no real member can complete account verification or password recovery without an operator manually reading application logs.

This ADR covers only the delivery channel. The token lifecycle itself (`AuthService.forgotPassword`/`resetPassword`/`verifyEmail`, `IAuthRepository`'s token tables, `generateOpaqueToken`/`hashOpaqueToken`) is unchanged — ADR-005 already established it as production-correct.

---

## Decisions

### 1. A new bounded `EmailModule`, not logic embedded in `AuthModule`

**Decision:** Email delivery lives in a new `apps/api/src/email/` module (`EmailModule`, `IEmailService`/`EMAIL_SERVICE`, `NodemailerEmailService`), imported by `AuthModule` rather than implemented inline.

**Rationale:** Mirrors the precedent set by ADR-007 Decision 1 (`AdministrationModule` as its own bounded module rather than folded into `UsersModule`): email delivery is infrastructure that other domains may need later (e.g. a future notification system, PA-015), so it should not be private to `AuthModule` from the outset. The `interface → implementation`, DI-by-string-token shape matches every repository in the codebase (`IGoalRepository`/`GOAL_REPOSITORY`, etc.) — email delivery is treated as a first-class swappable dependency the same way persistence is, not a one-off inline call.

---

### 2. `IEmailService` is narrow and use-case-shaped, not a generic `send()`

**Decision:** `IEmailService` exposes exactly two methods — `sendEmailVerification(to, token)` and `sendPasswordReset(to, token)` — rather than a generic `send(to, subject, body)` primitive.

**Rationale:** Every email this platform sends today is one of these two templated notifications. A generic `send()` would just push HTML templating and link-building responsibility onto `AuthService`, which is not its job. YAGNI: the platform can grow a generic transactional-email primitive when a second caller with materially different needs actually shows up (e.g. a future notification digest); building it speculatively now would be complexity without a second user to validate the abstraction.

---

### 3. Nodemailer with a pluggable transport, not a vendor SDK

**Decision:** `NodemailerEmailService` uses `nodemailer`, configured with a standard SMTP transport when `SMTP_HOST` is set. No SES/SendGrid/Postmark-specific SDK is used.

**Rationale:** ADR-005 §7 named "SES/SendGrid" as illustrative options, not a mandate for either specific vendor — and every major transactional email provider (SES, SendGrid, Postmark, Mailgun, etc.) exposes an SMTP relay endpoint. Building on SMTP via `nodemailer` means the operator chooses a provider by setting `SMTP_HOST`/credentials, with zero code changes required to switch providers later — avoiding a vendor lock-in decision this Work Order has no basis to make on the founder's behalf.

---

### 4. No `SMTP_HOST` configured falls back to `nodemailer`'s own `jsonTransport`, not a hand-rolled stub

**Decision:** When `SMTP_HOST` is unset (local development, CI, and this implementation environment — none of which have a real mail server reachable), `NodemailerEmailService` constructs its transport with `nodemailer.createTransport({ jsonTransport: true })` instead of a real SMTP connection. This still runs the real `sendMail()` code path — building the message, calling the transport, logging the result — it simply captures the message instead of handing it to a socket.

**Rationale:** This is `nodemailer`'s own documented mechanism for exactly this situation, not a project-specific placeholder standing in for real functionality — the "no unnecessary technical debt" requirement is satisfied because the *only* thing that changes between this mode and production is which transport `nodemailer` opens, not which code path is exercised. A `Logger.warn` fires once at startup so an operator who deploys without configuring SMTP gets an explicit, loud signal rather than a silent no-op, mirroring the fail-fast philosophy IC/WO-018 established for `DATABASE_URL`/`JWT_ACCESS_SECRET` — the difference here is a warning rather than a hard failure, because unlike a missing DB or JWT secret, a platform with no configured mail transport can still run correctly for every non-email-dependent feature.

---

### 5. Plaintext tokens are removed from application logs now that real delivery exists

**Decision:** `AuthService`'s log lines for password-reset and email-verification token issuance no longer include the plaintext token value (previously: `` `Password reset token issued for ${user.id}: ${token}` ``; now: `` `Password reset token issued and emailed for ${user.id}` ``).

**Rationale:** ADR-005 §7 logged the raw token because the log was, at the time, the *only* delivery channel — a deliberate, accepted tradeoff given no alternative existed. That tradeoff no longer holds: application logs are typically a broader-access surface (shipped to log aggregators, retained longer, visible to more operational roles) than a single recipient's inbox, and a live, unexpired password-reset/email-verification token is a real bearer credential. Removing it from logs is a direct, low-risk security improvement this Work Order is positioned to make since it is the one touching this code path.

---

## Risks

| Risk | Mitigation |
|---|---|
| Register/forgot-password requests now depend on a live call to `sendMail()` inside the request path — a slow or failing SMTP provider could slow down or fail these endpoints | Acceptable for V1 traffic levels (no background job queue exists yet, consistent with the platform's YAGNI stance elsewhere); a queued/async delivery mechanism is a reasonable future extension if email volume or provider latency becomes a problem, not a Day 1 requirement |
| No retry mechanism if a transient SMTP failure occurs | Same rationale as above — the underlying token/flow is idempotent (a user can re-request a reset), so a dropped send degrades to "ask again," not data loss |
| `jsonTransport` fallback means a misconfigured production deployment (forgot to set `SMTP_HOST`) fails silently from the caller's perspective (still returns 204/201) | Mitigated by the startup `Logger.warn`, which is loud and unambiguous for anyone watching deployment logs; matches this platform's existing precedent of structured-logging as the V1 operational-visibility mechanism (ADR-004 §7) |
| No unsubscribe/bounce/complaint handling | Out of scope — these are transactional, not marketing, emails, and CAN-SPAM/similar regimes treat transactional account-security emails differently; revisit only if a future marketing-email use case is added |

---

## Future Extension Points

- Background job queue for outbound email if request-path latency or provider throttling becomes a real problem at higher traffic.
- A generic `send()` primitive if a second, materially different email use case appears (Decision 2).
- HTML email template externalization (currently inline strings in `NodemailerEmailService`) if the number of templates grows beyond two.
- Bounce/complaint webhook handling if the platform later needs to track deliverability per PA-015 (Communication System).
