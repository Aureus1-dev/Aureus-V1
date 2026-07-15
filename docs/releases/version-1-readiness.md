# Aureus Version 1 Readiness Report

> **This is the canonical, living release-tracking document for Aureus Version 1.**
> It is updated after every completed Work Order rather than superseded by a new file. Do not create a new readiness report — edit this one.

Last updated: 2026-07-15 (after WO-024 — Business Portal)

---

## Founder Directive: Backend-Before-Frontend Sequencing

**2026-07-15 — the founder has made a Version 1 architectural decision: the entire canonical backend (all twelve PA-020-named Version 1 systems) will be completed before any frontend work begins.** This supersedes the WO-023-era recommendation to start a frontend foundation next. Until every canonical Version 1 backend business domain is implemented and verified, this report's Recommended Next Work Order section will name only backend Work Orders — frontend implementation remains a known, tracked gap (see Version 1 Release Blockers) but is explicitly out of sequence until that condition is met.

---

## Executive Summary

- **Overall Version 1 readiness: ~44%.**
- **Implementation status:** The backend architecture is mature and consistent — seven domain modules (Member Core, Journey Engine, Opportunity Engine, Resource Directory, Authentication/IAM, Administration & Operations, and, as of WO-024, Business Portal) are implemented, tested, and live-verified, every one of them enforces authentication and ownership on every endpoint (WO-022), and account verification/password reset deliver real email (WO-023). A full domain audit against PA-020 (performed before WO-024) confirmed 5 of 12 named Version 1 systems were substantially complete at that point; Business Portal is now the 6th. Six domains remain: AI Intelligence Engine, Stewardship System, Knowledge System, Communication System, Pods, and Academy — see Remaining Backend Domains below.
- **Release recommendation:** **Do not invite external members yet, and do not begin frontend work yet** (see Founder Directive above). The API backend for the systems built so far is production-quality, fully authorization-enforced, and can now deliver real account-verification/password-reset email — but the canonical backend itself is not yet complete, and per founder directive no frontend work begins until it is. Continue backend Work Order execution in canonical priority order; re-assess after every remaining backend domain (below) is implemented and verified.

---

## Remaining Backend Domains (PA-020 Audit)

A full audit against PA-020's twelve named Version 1 systems, cross-referenced with the actual repository state, was performed before WO-024 (see WO-024's founder-instruction record). Result at that time: **5 of 12 implemented, 7 remaining.** WO-024 (Business Portal) closes one of the seven. **6 remain, in priority order:**

1. **AI Intelligence Engine (PA-006).** Named explicitly in PA-020's mission ("Deliver AI-assisted guidance") and flagged as a likely Release Blocker. Highest strategic priority, but **blocked on a founder MVP-scope decision** (which capabilities, which provider/cost model) — not currently engineering-ready to start without that input.
2. **Stewardship System as a dedicated domain (PA-012).** `STEWARD` currently exists only as an inline role check embedded in Opportunities/Resources/Organizations moderation. PA-012's fuller responsibilities (mentorship, escalation management, community moderation, steward performance review) have no dedicated implementation. **Engineering-ready now** — a baseline stewardship function already works, but formalizing it requires no founder scope decision, mirroring exactly the reasoning that made Business Portal WO-024's pick.
3. **Communication System (PA-015).** WO-023 built only the transactional email *delivery mechanism* for Auth, not the domain itself (notification service, messaging, announcements, preferences, delivery tracking — PA-015's actual scope). Pods, Academy, and the AI Engine will all need it for delivery once built, so building it before them avoids rework later. **Engineering-ready now.**
4. **Academy (PA-010).** Substantial new domain (courses, learning paths, content); needs curriculum/content-sourcing product decisions before backend schema design — **partially blocked on product decisions.**
5. **Pods (PA-009).** Community formation; benefits from Stewardship (moderation) and Communication (pod messaging) existing first; also needs product decisions on formation/matching logic — **blocked on both dependencies and product decisions.**
6. **Knowledge System (PA-013).** Lowest immediate priority; Resource Directory and Opportunity Engine already deliver substantial "trustworthy information" value. Per PA-020's "simplify before expanding" principle, defer furthest. **Engineering-ready but lowest priority.**

---

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
| — | Next.js dependency patch (`apps/web`: 15.3.3 → 15.5.20) | #17 | Merged to `main` | 2026-07-15 |
| WO-023 (ADR-009) | Email Delivery Integration | #17 | Merged to `main` | 2026-07-15 |
| WO-024 (ADR-010) | Business Portal (PA-011) | *pending PR* | Implemented, not yet merged | 2026-07-15 |

**Note:** Batch A–E and Phase 1/Phase 2 predate the WO-numbered convention introduced with WO-018 and have no formal `docs/work-orders/WO-0XX-*.md` document — only ADR-003 and ADR-004 record their architectural decisions. This is a minor, low-risk documentation gap (see Documentation Status).

---

## Remaining Infrastructure & Operations Items

Non-domain items — not part of the PA-020 backend-domain audit above, tracked separately:

1. **Platform-wide `AuditLog` table.** Every domain currently uses structured `Logger` output as an explicitly-accepted V1 interim measure (ADR-004 §7 and carried through every subsequent ADR). A real, queryable audit trail is needed before this becomes a compliance/trust liability at scale.
2. **Bootstrap tooling for the first `SYSTEM_ADMINISTRATOR` account.** Currently requires one manual database write per environment (ADR-007 §Risks). Low effort, low risk, but should exist before a real production environment is stood up.
3. **MFA support.** Explicitly named as "where appropriate" in OAS-SEC-003; not a hard blocker for an initial invite-only or small cohort, but expected before wide public registration.
4. **Background job queue for outbound email.** WO-023 sends email synchronously within the request path (ADR-009 Risks) — acceptable at current traffic, worth revisiting if email volume or provider latency becomes a bottleneck.
5. **Frontend implementation (`apps/web`).** Still the unmodified Next.js scaffold with zero business logic (now on a patched, non-vulnerable Next.js version). Explicitly deferred until every canonical backend domain is complete, per the Founder Directive above — tracked here as a known gap, not as an actionable next item.

---

## Repository Health

- **Test status:** ✅ 407/407 automated tests passing (unit, Prisma integration, and full HTTP end-to-end tiers) as of WO-024.
- **CI status:** ✅ Green. `.github/workflows/ci.yml` provisions a PostgreSQL service container, generates the Prisma client, runs `migrate deploy`, the full test suite, and the full monorepo build on every push/PR.
- **Build status:** ✅ All 3 packages (`@aureus-v1/api`, `@aureus-v1/shared`, `@aureus-v1/web`) build cleanly.
- **Database migration status:** ✅ 8 migrations, all applied, `prisma migrate deploy` idempotent.
- **Dependency health:** ✅ `apps/web`'s `next` dependency was patched from `15.3.3` to `15.5.20` — the critical RCE and 24 other known vulnerabilities previously reported are resolved. `apps/api` and `packages/shared` continue to have no known vulnerabilities in their dependency trees. A few dev-only packages emit deprecation warnings (`@types/helmet`, transitive `glob`/`inflight`) — cosmetic, no action required.

---

## Architecture Health

- **ADR compliance:** Ten ADRs (ADR-003 through ADR-010) record every significant architectural decision made so far. Every new domain (Journey Engine, Opportunity Engine, Resource Directory, Authentication, Administration, Business Portal) has followed the layering pattern established in ADR-003: `interface → Prisma repository → service → controller → DTO`, with dependency injection via string tokens and module-level exports rather than direct cross-module instantiation. WO-023's `EmailModule` extended this pattern to a non-persistence infrastructure dependency; WO-024's `Organization`/`OrganizationMember` reuse the Resources/Opportunities verification-workflow shape verbatim, confirming both extension directions hold.
- **Invariant compliance:**
  - Soft deletion (`deletedAt`), never hard delete — consistently applied across every domain.
  - Response DTOs with `fromEntity()` static factories — consistently applied.
  - Offset pagination (`page`/`limit`, max 100) — consistently applied.
  - Ownership derived from the JWT, never trusted from the request body — followed by Resources, Administration, and, as of WO-022, Goals/Journeys/Milestones/Tasks/Profile/UserInterests/SavedOpportunities; **not** followed by the original Opportunity Engine, which still trusts body-supplied `submittedById`/`reviewedById` (flagged as technical debt in ADR-004/ADR-005, not yet remediated).
  - Guard reuse (`JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`) via the dependency-free `AuthGuardsModule` — consistently applied across every domain module as of WO-022.
  - Transitive ownership resolution (Journey→Goal, Milestone→Journey→Goal, Task→Milestone→Journey→Goal) via a `findOwnerId()` repository method resolved in a single Prisma nested-`select` query (ADR-008) — new pattern, consistently applied across the three domains that needed it.
  - Real vs. loose foreign keys: `OrganizationMember.userId`/`.organizationId` (WO-024) carry real FKs, matching the majority precedent (`Profile`, `Goal`, auth token tables) rather than `Resource.ownerId`/`Opportunity.submittedById`'s documented loose-pointer exception (ADR-010 Decision 3 makes this distinction explicit).
- **Remaining architectural concerns:**
  - `Organization` now exists (WO-024/ADR-010), but `Resource`/`Opportunity` are not yet linked to it — `organizationName`/`provider` remain free text (deliberately deferred, ADR-010 Decision 6; ADR-006 §3 addendum records this explicitly).
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

- **Unit coverage:** Every service in every domain has a dedicated `*.spec.ts` with a mocked repository, covering success paths, not-found, conflict, and authorization branches. `UserRolesService` (WO-021), `ResourcesService` (WO-020), `GoalsService`/`JourneysService`/`MilestonesService`/`TasksService` (WO-022), `NodemailerEmailService` (WO-023), and, as of WO-024, `OrganizationsService`/`OrganizationMembersService` (including the last-remaining-`ADMIN` invariant) have full branch coverage of their respective logic.
- **Integration coverage:** Introduced in WO-020 (`resources.integration.spec.ts`) — real PostgreSQL, no mocks, verifying Prisma query correctness (array containment, case-insensitive search, unique constraints). Not yet extended to any other domain's repository beyond the `findOwnerId()` unit tests added in WO-022.
- **End-to-end coverage:** Introduced in WO-020, extended in WO-021 through WO-024 — full HTTP requests via Supertest against a booted application (real guards, pipes, filters, database), now covering Resources, Administration, Goals/Journeys/Milestones/Tasks, Profile, UserInterests, SavedOpportunities, Auth (WO-023), and, as of WO-024, Organizations + membership management (real registered users used for personas that become `OrganizationMember` rows, mirroring the WO-022 `Goal.userId` finding). **Not present** for Users or Opportunities.
- **Aggregate coverage (`apps/api`, current):** 407/407 tests passing across 37 suites (up from 351/351 across 34 suites at WO-023).
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

- **Completed:** Constitution (OAS series), Implementation Constitution (IC-001–020), Product Architecture (PA-001–020), 10 ADRs, 7 formal Work Order documents (WO-018–024) with matching Operational Verification reports, this Readiness Report.
- **Missing:** Formal WO documents for Batch A–E and Phase 1/Phase 2 (see Technical Debt); a CONTRIBUTING/onboarding guide for new engineers beyond the ADRs themselves.

---

## Version 1 Release Blockers

Only items that should reasonably be resolved before inviting the first external members:

1. **No member-facing frontend.** `apps/web` has zero business logic. There is nothing for an invited member to use. This remains the only unconditional Release Blocker — and, per the Founder Directive above, is now deliberately sequenced *after* every canonical backend domain rather than started next.
2. **AI Intelligence Engine.** PA-020 names AI-assisted guidance as a core Version 1 objective. Whether this specifically blocks an initial invite (versus a fast-follow) is a founder scope decision, not an engineering one — flagged here as a likely blocker pending that confirmation, not asserted outright.

**Resolved as of WO-022:** Unguarded domain endpoints (Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities) — every domain now enforces authentication and ownership.

**Resolved as of WO-023:** No email delivery — account verification and password reset now send real email. Critical Next.js vulnerability in `apps/web` — patched to `15.5.20`.

**Resolved as of WO-024:** Business Portal had zero implementation — verified organization profiles and representative membership now exist (ADR-010).

---

## Post-Launch Candidates

Safe to defer to Version 1.1 or later:

- MFA
- Platform-wide `AuditLog` table (structured logging is an accepted interim measure)
- Linking `Organization` into `Resource`/`Opportunity` ownership (ADR-010 Decision 6 — purely additive whenever built, per ADR-006 §3's forward declaration)
- Recruitment tooling, partnership management, organization dashboards/analytics (PA-011 components beyond WO-024's foundational scope)
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
| Architecture | 89 | Consistent, well-documented layering across every implemented domain, now including proven transitive-ownership-resolution (ADR-008), infrastructure-DI (ADR-009), and real-FK-join-table (ADR-010) patterns; deductions for a still-narrow Administration module and the deliberately-deferred `Organization` linkage into Resources/Opportunities. |
| Security | 86 | Full authorization enforcement across every implemented domain (WO-022), a patched frontend dependency tree, real email delivery with plaintext tokens removed from logs (WO-023), and organization-membership authorization mirroring the same server-derived-ownership invariant (WO-024); remaining deductions for no MFA and no platform-wide audit trail. |
| Testing | 86 | 407 passing tests across three tiers; end-to-end coverage now extends to 9 of 11 implemented domains, up from 2 at WO-021; Users/Opportunities remain unit-tested only. |
| Documentation | 86 | Exceptionally thorough governance and per-Work-Order documentation; a few early batches lack formal WO records. |
| Operations | 46 | CI is solid, but there is no deployment pipeline, no monitoring/observability, and no disaster-recovery implementation — only policy documents (IC series) describing what should exist. |
| Performance | 50 | Unverified rather than confirmed poor — no load testing has been performed anywhere in the platform. |
| Developer Experience | 81 | Clear, repeatable patterns a new contributor can follow domain-to-domain, including the ownership-chain, infrastructure-DI, and verification-workflow-reuse patterns; missing a dedicated onboarding guide. |
| User Readiness | 25 | No frontend, no AI guidance — a real member cannot yet use this platform end-to-end. Business Portal backend now exists, but with no frontend it changes nothing a member would directly experience yet; the frontend remains the dominant blocker. |

**Overall Version 1 readiness: ~44%.**

This number is higher than the pre-WO-024 assessment because a sixth PA-020-named Version 1 system (Business Portal) is now implemented, tested, and live-verified, following the founder's backend-before-frontend sequencing decision. It remains well below the Architecture/Testing/Documentation scores because it weighs what an actual invited member would experience today: a mature, well-tested, fully authorization-enforced backend spanning half the named Version 1 systems, still reachable through no usable interface — and, per the Founder Directive, deliberately not gaining one until the remaining six backend domains are also complete. Backend engineering velocity and quality are high; the score will climb domain-by-domain from here without a frontend counting against it, since the frontend is now explicitly out of sequence rather than a currently-expected next step.

---

## Recommended Next Work Order

**Per the Founder Directive (above), this section names only backend Work Orders until every canonical Version 1 backend business domain is implemented and verified.**

**WO-025 — Stewardship System as a dedicated domain (PA-012).**

With Business Portal (WO-024) closing the gap it was chosen to close, Stewardship System is the next domain in the Remaining Backend Domains priority order (see above) that is both (a) not blocked on a founder MVP-scope decision — unlike the AI Intelligence Engine, which remains the single highest-priority item but cannot start without founder input — and (b) not itself blocked on another undelivered domain — unlike Communication System, Pods, and Academy, which each benefit from or depend on capabilities Stewardship formalizes. `STEWARD` already exists as a platform role and is already checked inline across Opportunities, Resources, and Organizations moderation (`verify`/`reject` actions), so this WO's job is to give that role a real, dedicated domain — mentorship assignment, escalation management, community moderation records, and steward performance review, per PA-012's Core Responsibilities — rather than leaving it as a bare role check with no data model or workflow of its own. Expect the same shape of work as WO-021/WO-024: a new bounded module, reusing the established layering and (where applicable) verification-workflow patterns, with no schema changes to any existing domain required.
