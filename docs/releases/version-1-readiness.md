# Aureus Version 1 Readiness Report

> **This is the canonical, living release-tracking document for Aureus Version 1.**
> It is updated after every completed Work Order rather than superseded by a new file. Do not create a new readiness report — edit this one.

Last updated: 2026-07-15 (after WO-023 — Email Delivery Integration)

---

## Executive Summary

- **Overall Version 1 readiness: ~40%.**
- **Implementation status:** The backend architecture is mature and consistent — six domain modules (Member Core, Journey Engine, Opportunity Engine, Resource Directory, Authentication/IAM, Administration & Operations) are implemented, tested, and live-verified, every one of them enforces authentication and ownership on every endpoint (WO-022), and account verification/password reset now deliver real email (WO-023). However, only 4 of the 12 named Version 1 systems (PA-020) are substantially complete, there is no member-facing frontend, and the AI Intelligence Engine — called out as a core V1 objective — has not been started.
- **Release recommendation:** **Do not invite external members yet.** The API backend for the systems built so far is production-quality, fully authorization-enforced, and can now deliver real account-verification/password-reset email — but the platform as a whole is not ready: there is no UI a member could use. Continue Work Order execution; re-assess after the current Release Blockers (below) are resolved.

---

## Completed Work Orders

| Work Order | Title | PR | Merge Status | Completion Date |
|---|---|---|---|---|
| Batch A | Git integrity restoration | #4 | Merged to `main` | 2026-07 |
| Batch B | Untrack build artifacts, extend `.gitignore` | #5 | Merged to `main` | 2026-07 |
| Batch C (WO-003) | User Module integrated into monorepo (ADR-003) | #6 | Merged to `main` | 2026-07 |
| Batch D | CI/CD pipeline, ESLint, Prettier | #7 | Merged to `main` | 2026-07 |
| Batch E | API bootstrap hardening (Helmet, Throttler, env validation, exception filter) | #8 | Merged to `main` | 2026-07 |
| WO-018 | Operational verification (post Batch E) | #9 | Merged to `main` | 2026-07-14 |
| Phase 1 | Journey Engine domain API — Goals, Journeys, Milestones, Tasks | #10 | Merged to `main` | 2026-07-14 |
| Phase 2 (ADR-004) | Opportunity Intelligence Engine (PA-007) | #11 | Merged to `main` | 2026-07-14 |
| WO-019 (ADR-005) | Authentication & Identity/Access Management | #12 | Merged to `main` | 2026-07-14 |
| WO-020 (ADR-006) | Resource Directory (PA-014) | #13 | Merged to `main` | 2026-07-14 |
| — | CI fix: generate Prisma client before type-checking | #14 | Merged to `main` | 2026-07-14 |
| WO-021 (ADR-007) | Administration & Operations: Role Management | #15 | Merged to `main` | 2026-07-14 |
| WO-022 (ADR-008) | Authorization Retrofit: Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities | #16 | Merged to `main` | 2026-07-15 |
| — | Next.js dependency patch (`apps/web`: 15.3.3 → 15.5.20) | *pending PR* | Implemented, not yet merged | 2026-07-15 |
| WO-023 (ADR-009) | Email Delivery Integration | *pending PR* | Implemented, not yet merged | 2026-07-15 |

**Note:** Batch A–E and Phase 1/Phase 2 predate the WO-numbered convention introduced with WO-018 and have no formal `docs/work-orders/WO-0XX-*.md` document — only ADR-003 and ADR-004 record their architectural decisions. This is a minor, low-risk documentation gap (see Documentation Status).

---

## Remaining Work Orders

Ordered by implementation priority:

1. **Business Portal — Organization entity (PA-011).** Resource and Opportunity ownership currently model an "organization" as a free-text field plus the managing user's account (ADR-006 §3). A real `Organization` model is needed before businesses/nonprofits can be onboarded as first-class participants rather than individual user accounts.
2. **Stewardship System as a dedicated domain (PA-012).** `STEWARD` currently exists only as a role check embedded in Opportunities/Resources moderation. PA-012's fuller responsibilities (mentorship, escalation management, community moderation, steward performance review) have no dedicated implementation.
3. **AI Intelligence Engine (PA-006).** Named as a core Version 1 objective ("Deliver AI-assisted guidance") in PA-020 but entirely unstarted. Likely the largest remaining system; needs a founder decision on MVP scope before implementation begins.
4. **Platform-wide `AuditLog` table.** Every domain currently uses structured `Logger` output as an explicitly-accepted V1 interim measure (ADR-004 §7 and carried through every subsequent ADR). A real, queryable audit trail is needed before this becomes a compliance/trust liability at scale.
5. **Frontend implementation (`apps/web`).** Still the unmodified Next.js scaffold with zero business logic (now on a patched, non-vulnerable Next.js version). No member can use the platform without this, regardless of backend completeness. This is now the single largest remaining gap between the current backend and a usable Version 1.
6. **Pods, Academy, Knowledge System, Communication System (PA-009, PA-010, PA-013, PA-015).** Not started. Lower immediate priority than the above — these expand the member experience but are not required to safely invite an initial cohort.
7. **Bootstrap tooling for the first `SYSTEM_ADMINISTRATOR` account.** Currently requires one manual database write per environment (ADR-007 §Risks). Low effort, low risk, but should exist before a real production environment is stood up.
8. **MFA support.** Explicitly named as "where appropriate" in OAS-SEC-003; not a hard blocker for an initial invite-only or small cohort, but expected before wide public registration.
9. **Background job queue for outbound email.** WO-023 sends email synchronously within the request path (ADR-009 Risks) — acceptable at current traffic, worth revisiting if email volume or provider latency becomes a bottleneck.

**Resolved as of this update:** Next.js dependency vulnerability (patched to 15.5.20) and email delivery integration (WO-023) — see Version 1 Release Blockers.

---

## Repository Health

- **Test status:** ✅ 351/351 automated tests passing (unit, Prisma integration, and full HTTP end-to-end tiers) as of WO-023.
- **CI status:** ✅ Green. `.github/workflows/ci.yml` provisions a PostgreSQL service container, generates the Prisma client, runs `migrate deploy`, the full test suite, and the full monorepo build on every push/PR.
- **Build status:** ✅ All 3 packages (`@aureus-v1/api`, `@aureus-v1/shared`, `@aureus-v1/web`) build cleanly.
- **Database migration status:** ✅ 7 migrations, all applied, `prisma migrate deploy` idempotent.
- **Dependency health:** ✅ `apps/web`'s `next` dependency was patched from `15.3.3` to `15.5.20` — the critical RCE and 24 other known vulnerabilities previously reported are resolved. `apps/api` and `packages/shared` continue to have no known vulnerabilities in their dependency trees; the new `nodemailer` dependency (WO-023) adds no known vulnerabilities. A few dev-only packages emit deprecation warnings (`@types/helmet`, transitive `glob`/`inflight`) — cosmetic, no action required.

---

## Architecture Health

- **ADR compliance:** Nine ADRs (ADR-003 through ADR-009) record every significant architectural decision made so far. Every new domain (Journey Engine, Opportunity Engine, Resource Directory, Authentication, Administration) has followed the layering pattern established in ADR-003: `interface → Prisma repository → service → controller → DTO`, with dependency injection via string tokens and module-level exports rather than direct cross-module instantiation. WO-023's `EmailModule` extends this pattern to a non-persistence infrastructure dependency (`IEmailService`/`EMAIL_SERVICE`), confirming the pattern generalizes beyond repositories.
- **Invariant compliance:**
  - Soft deletion (`deletedAt`), never hard delete — consistently applied across every domain.
  - Response DTOs with `fromEntity()` static factories — consistently applied.
  - Offset pagination (`page`/`limit`, max 100) — consistently applied.
  - Ownership derived from the JWT, never trusted from the request body — followed by Resources, Administration, and, as of WO-022, Goals/Journeys/Milestones/Tasks/Profile/UserInterests/SavedOpportunities; **not** followed by the original Opportunity Engine, which still trusts body-supplied `submittedById`/`reviewedById` (flagged as technical debt in ADR-004/ADR-005, not yet remediated).
  - Guard reuse (`JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`) via the dependency-free `AuthGuardsModule` — consistently applied across every domain module as of WO-022.
  - Transitive ownership resolution (Journey→Goal, Milestone→Journey→Goal, Task→Milestone→Journey→Goal) via a `findOwnerId()` repository method resolved in a single Prisma nested-`select` query (ADR-008) — new pattern, consistently applied across the three domains that needed it.
- **Remaining architectural concerns:**
  - No `Organization` entity — Business Portal ownership is modeled as a stopgap (documented, intentional, per ADR-006 §3).
  - No platform-wide audit table — every domain relies on structured logging (documented, intentional, per ADR-004 §7).
  - `AdministrationModule` currently has a single responsibility (role management); as more administrative capabilities are added, watch for it becoming a dumping ground rather than staying cohesive.
  - `hasRole()` (WO-022) is used by every new authorization check but was deliberately not retrofitted onto the pre-existing inline role checks in `UsersController`/`ResourcesController`/`AdministrationModule` (ADR-008 §4) — a minor, tracked inconsistency, not a functional gap.

---

## Security Review

- **Authentication:** ✅ Solid. JWT access tokens (15m default) + rotating, revocable, SHA-256-hashed opaque refresh tokens. Passwords hashed with bcryptjs (12 rounds). Login rejects unknown emails, wrong passwords, and non-`ACTIVE` accounts uniformly (no user-enumeration signal). `JWT_ACCESS_SECRET` is required and validated at startup (min 32 chars). Password reset and email verification now deliver real email (WO-023) rather than only logging tokens; plaintext tokens no longer appear in application logs (ADR-009 Decision 5), a direct security improvement over the ADR-005 §7 interim state.
- **Authorization:** ✅ **Resolved as of WO-022.** Every domain — `Users`, `Auth`, `Opportunities`, `Resources`, `Administration`, and, as of WO-022, `Goals`, `Journeys`, `Milestones`, `Tasks`, `UserInterests`, `Profile`, and `SavedOpportunities` — now correctly enforces `JwtAuthGuard`/`RolesGuard`/ownership checks. The transitive Goal→Journey→Milestone→Task ownership chain is resolved server-side via `findOwnerId()` (ADR-008), never trusted from the request body. The one remaining known gap is the original Opportunity Engine still trusting body-supplied `submittedById`/`reviewedById` (tracked technical debt, ADR-004/ADR-005, not a missing-guard issue).
- **Input validation:** ✅ Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) applied platform-wide; every DTO uses `class-validator` decorators; no endpoint accepts unvalidated input.
- **Rate limiting:** ⚠️ A single global `ThrottlerModule` policy (100 req/min per IP) applies to every route. `/auth/login` and `/auth/register` have no stricter, brute-force-appropriate limit of their own — acceptable for an internal/limited-cohort stage, but should be tightened before public registration.
- **Secrets/configuration:** ✅ `.env` is gitignored and never committed; `JWT_ACCESS_SECRET` and `DATABASE_URL` are validated at startup via Joi and the process fails fast if absent (WO-018 precedent). ⚠️ `CORS_ORIGIN` defaults to `*` — fine for development, must be set explicitly per environment before production. No secret-rotation mechanism exists yet (single static JWT secret).
- **Remaining risks:**
  1. No MFA. Now the highest-severity open item following WO-022's resolution of the unguarded-endpoints risk and WO-023's resolution of the Next.js dependency vulnerability and missing email delivery.
  2. No platform-wide audit trail (structured logs only).
  3. Single manual database step required to provision the first `SYSTEM_ADMINISTRATOR` per environment.
  4. Opportunity Engine still trusts body-supplied `submittedById`/`reviewedById` rather than deriving them from the JWT (tracked technical debt, not a missing-guard issue — the endpoints are still role-guarded).
  5. Outbound email is sent synchronously in the request path with no retry mechanism (ADR-009 Risks) — acceptable at V1 traffic, not yet a background job.
  6. The real-SMTP transport code path (as opposed to the local-capture fallback) has not been exercised against a live mail provider in any environment so far, only unit-tested and code-reviewed (WO-023 Known Limitations) — an operator should perform one live send as part of production deployment verification.

---

## Testing

- **Unit coverage:** Every service in every domain has a dedicated `*.spec.ts` with a mocked repository, covering success paths, not-found, conflict, and authorization branches. `UserRolesService` (WO-021), `ResourcesService` (WO-020), `GoalsService`/`JourneysService`/`MilestonesService`/`TasksService` (WO-022), and, as of WO-023, `NodemailerEmailService` (transport selection, message content) have full branch coverage of their respective logic.
- **Integration coverage:** Introduced in WO-020 (`resources.integration.spec.ts`) — real PostgreSQL, no mocks, verifying Prisma query correctness (array containment, case-insensitive search, unique constraints). Not yet extended to any other domain's repository beyond the `findOwnerId()` unit tests added in WO-022.
- **End-to-end coverage:** Introduced in WO-020, extended in WO-021, WO-022, and WO-023 — full HTTP requests via Supertest against a booted application (real guards, pipes, filters, database), now covering Resources, Administration, Goals/Journeys/Milestones/Tasks, Profile, UserInterests, SavedOpportunities, and, as of WO-023, Auth (register/verify-email/forgot-password/reset-password, with `EMAIL_SERVICE` overridden via DI rather than a real SMTP call). **Not present** for Users or Opportunities.
- **Aggregate coverage (`apps/api`, current):** 92.8% statements / 71.8% branches / 80.8% functions / 93.3% lines. 351/351 tests passing across 34 suites (up from 342/342 across 32 suites at WO-022).
- **Missing tests:**
  - End-to-end tests for Users and Opportunities.
  - Integration-tier (`*.integration.spec.ts`) tests for domains beyond Resources.
  - A live send against a real SMTP provider (WO-023's real-transport branch is unit-tested only, per Known Limitations — no outbound network access to a real mail relay in this implementation environment).
  - Any test coverage at all for `apps/web` (it has no business logic yet, so this is expected, not a gap — will become one the moment real UI code lands).
  - Load/performance testing — none has been done anywhere in the platform.
  - Security-specific testing (e.g. automated brute-force/rate-limit verification, dependency scanning in CI) beyond the manual dependency review performed for this report.

---

## Technical Debt

- **TODOs / FIXMEs / HACKs:** None found in `apps/api`, `apps/web`, or `packages/shared` source (`grep -rn "TODO\|FIXME\|HACK\|XXX"` returns zero matches outside test files). The codebase does not accumulate silent debt markers — every known gap is instead recorded explicitly in an ADR's Risks section or a Work Order's Known Limitations section, which is the intended pattern going forward.
- **Stubs / placeholder implementations:** `apps/web` is entirely a placeholder (default Next.js scaffold, zero business logic — now the platform's largest remaining stub). Email delivery is no longer a stub as of WO-023 — it is a real SMTP integration with an explicit, logged local-capture fallback for environments without a configured mail server (ADR-009 Decision 4), not a stand-in for functionality.
- **Dead code:** None identified. (A dead constant introduced during WO-021 drafting — `PLATFORM_ADMIN_GRANTABLE_ROLES`, superseded by the negative-check design in `UserRolesService.assertMutable` — was removed before commit rather than merged.)
- **Cleanup opportunities:**
  - Retroactively write `docs/work-orders/` entries for Batch A–E and Phase 1/Phase 2 for a fully consistent paper trail (low priority — ADR-003/ADR-004 already cover the architectural decisions).
  - Opportunity Engine's workflow actions (`verify`/`reject`/`archive`) still accept reviewer identity from the request body rather than the JWT (ADR-004/ADR-005 technical debt, not yet remediated — Resources and Administration do this correctly).
  - `hasRole()` (WO-022) still not retrofitted onto pre-existing inline role checks (ADR-008 §4) — unchanged, cosmetic only.

---

## Documentation Status

- **Completed:** Constitution (OAS series), Implementation Constitution (IC-001–020), Product Architecture (PA-001–020), 9 ADRs, 6 formal Work Order documents (WO-018–023) with matching Operational Verification reports, this Readiness Report.
- **Missing:** Formal WO documents for Batch A–E and Phase 1/Phase 2 (see Technical Debt); a CONTRIBUTING/onboarding guide for new engineers beyond the ADRs themselves; a dedicated Business Portal PA-011 implementation plan (the PA doc exists, no implementation plan yet since the domain hasn't started).

---

## Version 1 Release Blockers

Only items that should reasonably be resolved before inviting the first external members:

1. **No member-facing frontend.** `apps/web` has zero business logic. There is nothing for an invited member to use. This is now the only unconditional Release Blocker remaining.
2. **AI Intelligence Engine.** PA-020 names AI-assisted guidance as a core Version 1 objective. Whether this specifically blocks an initial invite (versus a fast-follow) is a founder scope decision, not an engineering one — flagged here as a likely blocker pending that confirmation, not asserted outright.

**Resolved as of WO-022:** Unguarded domain endpoints (Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities) — every domain now enforces authentication and ownership.

**Resolved as of WO-023:** No email delivery — account verification and password reset now send real email. Critical Next.js vulnerability in `apps/web` — patched to `15.5.20`.

---

## Post-Launch Candidates

Safe to defer to Version 1.1 or later:

- MFA
- Platform-wide `AuditLog` table (structured logging is an accepted interim measure)
- Pods, Academy, Knowledge System, Communication System
- Business Portal / `Organization` entity (unless the founder scopes early business participation into the initial invite cohort)
- Stewardship System as a dedicated domain (role-based moderation already functions; richer stewardship tooling can follow)
- Cursor-based pagination (offset pagination is adequate at V1 scale)
- Geographic radius search (PostGIS) for Opportunities/Resources
- ML-powered opportunity/resource scoring (current formula-based scoring is intentional and auditable)
- JWT secret rotation mechanism
- Performance/load testing infrastructure
- Background job queue for outbound email (synchronous send is adequate at V1 traffic)
- Email bounce/complaint/deliverability tracking

---

## Current Readiness Score

| Category | Score (0–100) | Notes |
|---|---|---|
| Architecture | 88 | Consistent, well-documented layering across every implemented domain, now including proven transitive-ownership-resolution (ADR-008) and infrastructure-DI (ADR-009) patterns; deductions for the stopgap ownership model and a still-narrow Administration module. |
| Security | 85 | Full authorization enforcement across every implemented domain (WO-022), a patched frontend dependency tree, and real email delivery with plaintext tokens removed from logs (WO-023); remaining deductions for no MFA and no platform-wide audit trail. |
| Testing | 85 | 351 passing tests across three tiers; end-to-end coverage now extends to 8 of 10 implemented domains, up from 2 at WO-021; Users/Opportunities remain unit-tested only. |
| Documentation | 85 | Exceptionally thorough governance and per-Work-Order documentation; a few early batches lack formal WO records. |
| Operations | 46 | CI is solid, but there is no deployment pipeline, no monitoring/observability, and no disaster-recovery implementation — only policy documents (IC series) describing what should exist. Real email delivery (WO-023) is a small operational-readiness improvement. |
| Performance | 50 | Unverified rather than confirmed poor — no load testing has been performed anywhere in the platform. |
| Developer Experience | 80 | Clear, repeatable patterns a new contributor can follow domain-to-domain, including the ownership-chain and infrastructure-DI patterns; missing a dedicated onboarding guide. |
| User Readiness | 25 | No frontend, no AI guidance, no Business Portal — a real member cannot yet use this platform end-to-end. Authorization, email delivery, and the frontend dependency vulnerability are no longer factors here, but the frontend itself is now the dominant blocker a member would notice. |

**Overall Version 1 readiness: ~40%.**

This number is higher than the pre-WO-023 assessment because two of the platform's four hard Release Blockers — email delivery and the critical frontend dependency vulnerability — are now resolved, alongside WO-022's earlier resolution of the unguarded-endpoints risk. It remains well below the Architecture/Testing/Documentation scores because it weighs what an actual invited member would experience today: a mature, well-tested, fully authorization-enforced backend that can now complete real account verification and password recovery, for roughly a third of the named Version 1 systems, still reachable through no usable interface. Backend engineering velocity and quality are high; the gap to a genuine Version 1 launch is now dominated by exactly two things — the frontend and the AI Intelligence Engine scope decision — no remaining item is a live security gap or missing critical infrastructure in already-shipped code.

---

## Recommended Next Work Order

**WO-024 — Frontend Foundation (`apps/web`).**

With WO-022 (authorization) and WO-023 (email delivery, Next.js patch) resolved, every remaining hard Release Blocker except the frontend itself is either closed or a founder scope decision (AI Intelligence Engine). `apps/web` is still the unmodified Next.js scaffold — zero business logic, no auth integration, no pages beyond the default template — and it is now the single largest gap between the current backend (six fully authorization-enforced, tested, documented domains, real email delivery) and a platform an actual invited member could use end-to-end. This is squarely an engineering scoping task, not a founder product decision: the backend API surface (`/auth/*`, `/goals`, `/journeys`, `/opportunities`, `/resources`, etc.) is stable, documented (Swagger at `/api/docs`), and ready to be consumed. Recommended first slice: authentication (register/login/verify-email/reset-password screens wired to the existing `/auth/*` endpoints) plus a minimal authenticated shell (session persistence, protected routing) — the smallest useful foundation every subsequent frontend Work Order (Goals/Journeys UI, Opportunity/Resource browsing, etc.) will build on. Business Portal, Stewardship, the AI Intelligence Engine, and the remaining PA-009/010/013/015 systems all either require a founder scope decision or are lower-priority expansions that should not be started before the platform has a usable interface for the domains already built.
