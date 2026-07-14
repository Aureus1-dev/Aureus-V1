# Aureus Version 1 Readiness Report

> **This is the canonical, living release-tracking document for Aureus Version 1.**
> It is updated after every completed Work Order rather than superseded by a new file. Do not create a new readiness report — edit this one.

Last updated: 2026-07-14 (after WO-021 — Administration & Operations: Role Management)

---

## Executive Summary

- **Overall Version 1 readiness: ~30%.**
- **Implementation status:** The backend architecture is mature and consistent — six domain modules (Member Core, Journey Engine, Opportunity Engine, Resource Directory, Authentication/IAM, Administration & Operations) are implemented, tested, and live-verified. However, only 4 of the 12 named Version 1 systems (PA-020) are substantially complete, there is no member-facing frontend, several already-implemented domains have no authorization on their endpoints, and the AI Intelligence Engine — called out as a core V1 objective — has not been started.
- **Release recommendation:** **Do not invite external members yet.** The API backend for the systems built so far is production-quality, but the platform as a whole is not: there is no UI a member could use, several domains are wide open to any caller, and there is no email delivery path to complete account verification or password reset. Continue Work Order execution; re-assess after the current Release Blockers (below) are resolved.

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
| WO-021 (ADR-007) | Administration & Operations: Role Management | *pending PR* | Implemented, not yet merged | 2026-07-14 |

**Note:** Batch A–E and Phase 1/Phase 2 predate the WO-numbered convention introduced with WO-018 and have no formal `docs/work-orders/WO-0XX-*.md` document — only ADR-003 and ADR-004 record their architectural decisions. This is a minor, low-risk documentation gap (see Documentation Status).

---

## Remaining Work Orders

Ordered by implementation priority:

1. **WO-022 — Authorization retrofit for the remaining unguarded endpoints.** Goals, Journeys, Milestones, Tasks, UserInterests, Profile, and SavedOpportunities currently have zero authentication or ownership checks — any caller, authenticated or not, can read, modify, or delete any member's private data through these endpoints. This is the single highest-priority remaining item; it has been flagged as the recommended next step in ADR-005, ADR-006, and WO-020's report and remains unresolved. Mechanical, well-scoped, no new product decisions required — apply the exact pattern already proven in `UsersController`/`ResourcesController`.
2. **Next.js dependency upgrade (`apps/web`).** `next@15.3.3` carries 25 known vulnerabilities including one critical RCE (GHSA advisory, patched in `>=15.5.16`). Not a Work Order in the domain sense, but must be resolved before `apps/web` is ever deployed. See Security Review.
3. **Email delivery integration.** Password reset and email verification tokens are currently only written to structured logs (ADR-005 §7, explicitly deferred). Without this, no real member can complete account verification or password recovery — a hard requirement before external members are invited.
4. **Business Portal — Organization entity (PA-011).** Resource and Opportunity ownership currently model an "organization" as a free-text field plus the managing user's account (ADR-006 §3). A real `Organization` model is needed before businesses/nonprofits can be onboarded as first-class participants rather than individual user accounts.
5. **Stewardship System as a dedicated domain (PA-012).** `STEWARD` currently exists only as a role check embedded in Opportunities/Resources moderation. PA-012's fuller responsibilities (mentorship, escalation management, community moderation, steward performance review) have no dedicated implementation.
6. **AI Intelligence Engine (PA-006).** Named as a core Version 1 objective ("Deliver AI-assisted guidance") in PA-020 but entirely unstarted. Likely the largest remaining system; needs a founder decision on MVP scope before implementation begins.
7. **Platform-wide `AuditLog` table.** Every domain currently uses structured `Logger` output as an explicitly-accepted V1 interim measure (ADR-004 §7 and carried through every subsequent ADR). A real, queryable audit trail is needed before this becomes a compliance/trust liability at scale.
8. **Frontend implementation (`apps/web`).** Still the unmodified Next.js scaffold with zero business logic. No member can use the platform without this, regardless of backend completeness.
9. **Pods, Academy, Knowledge System, Communication System (PA-009, PA-010, PA-013, PA-015).** Not started. Lower immediate priority than the above — these expand the member experience but are not required to safely invite an initial cohort.
10. **Bootstrap tooling for the first `SYSTEM_ADMINISTRATOR` account.** Currently requires one manual database write per environment (ADR-007 §Risks). Low effort, low risk, but should exist before a real production environment is stood up.
11. **MFA support.** Explicitly named as "where appropriate" in OAS-SEC-003; not a hard blocker for an initial invite-only or small cohort, but expected before wide public registration.

---

## Repository Health

- **Test status:** ✅ 252/252 automated tests passing (unit, Prisma integration, and full HTTP end-to-end tiers) as of WO-021.
- **CI status:** ✅ Green. `.github/workflows/ci.yml` provisions a PostgreSQL service container, generates the Prisma client, runs `migrate deploy`, the full test suite, and the full monorepo build on every push/PR.
- **Build status:** ✅ All 3 packages (`@aureus-v1/api`, `@aureus-v1/shared`, `@aureus-v1/web`) build cleanly.
- **Database migration status:** ✅ 7 migrations, all applied, `prisma migrate deploy` idempotent.
- **Dependency health:** ⚠️ `apps/api` and `packages/shared` have no known vulnerabilities in their dependency trees. `apps/web` depends on `next@15.3.3`, which `pnpm audit` reports as carrying **25 known vulnerabilities (1 critical, 9 high, 13 moderate, 2 low)**, all patched by upgrading to `next >=15.5.16`. Since `apps/web` has no business logic yet, this has not caused any incident, but it must not ship as-is. A few dev-only packages emit deprecation warnings (`@types/helmet`, transitive `glob`/`inflight`) — cosmetic, no action required.

---

## Architecture Health

- **ADR compliance:** Six ADRs (ADR-003 through ADR-007) record every significant architectural decision made so far. Every new domain (Journey Engine, Opportunity Engine, Resource Directory, Authentication, Administration) has followed the layering pattern established in ADR-003: `interface → Prisma repository → service → controller → DTO`, with dependency injection via string tokens and module-level exports rather than direct cross-module instantiation.
- **Invariant compliance:**
  - Soft deletion (`deletedAt`), never hard delete — consistently applied across every domain.
  - Response DTOs with `fromEntity()` static factories — consistently applied.
  - Offset pagination (`page`/`limit`, max 100) — consistently applied.
  - Ownership derived from the JWT, never trusted from the request body — followed by Resources and Administration (WO-020, WO-021); **not** followed by the original Opportunity Engine, which still trusts body-supplied `submittedById`/`reviewedById` (flagged as technical debt in ADR-004/ADR-005, not yet remediated).
  - Guard reuse (`JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`) via the dependency-free `AuthGuardsModule` — consistently applied everywhere guards exist at all (see the gap in Security Review).
- **Remaining architectural concerns:**
  - No `Organization` entity — Business Portal ownership is modeled as a stopgap (documented, intentional, per ADR-006 §3).
  - No platform-wide audit table — every domain relies on structured logging (documented, intentional, per ADR-004 §7).
  - `AdministrationModule` currently has a single responsibility (role management); as more administrative capabilities are added, watch for it becoming a dumping ground rather than staying cohesive.

---

## Security Review

- **Authentication:** ✅ Solid. JWT access tokens (15m default) + rotating, revocable, SHA-256-hashed opaque refresh tokens. Passwords hashed with bcryptjs (12 rounds). Login rejects unknown emails, wrong passwords, and non-`ACTIVE` accounts uniformly (no user-enumeration signal). `JWT_ACCESS_SECRET` is required and validated at startup (min 32 chars).
- **Authorization:** ⚠️ **Mixed — this is the platform's most significant open risk.** `Users`, `Auth`, `Opportunities`, `Resources`, and `Administration` all correctly enforce `JwtAuthGuard`/`RolesGuard`/ownership checks. **Goals, Journeys, Milestones, Tasks, UserInterests, Profile, and SavedOpportunities have no guards at all** — every one of these endpoints is callable by anyone, authenticated or not, against any user's data. This is a real, currently-live gap in every environment this code is deployed to, not a theoretical one. See Release Blockers.
- **Input validation:** ✅ Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) applied platform-wide; every DTO uses `class-validator` decorators; no endpoint accepts unvalidated input.
- **Rate limiting:** ⚠️ A single global `ThrottlerModule` policy (100 req/min per IP) applies to every route. `/auth/login` and `/auth/register` have no stricter, brute-force-appropriate limit of their own — acceptable for an internal/limited-cohort stage, but should be tightened before public registration.
- **Secrets/configuration:** ✅ `.env` is gitignored and never committed; `JWT_ACCESS_SECRET` and `DATABASE_URL` are validated at startup via Joi and the process fails fast if absent (WO-018 precedent). ⚠️ `CORS_ORIGIN` defaults to `*` — fine for development, must be set explicitly per environment before production. No secret-rotation mechanism exists yet (single static JWT secret).
- **Remaining risks:**
  1. Unguarded endpoints (see Authorization, above) — highest severity.
  2. Critical RCE + 8 further high-severity vulnerabilities in `apps/web`'s `next` dependency (see Dependency Health) — must not be deployed as-is.
  3. No email delivery — password reset/verification tokens only reach an operator via logs, not the actual account holder.
  4. No MFA.
  5. No platform-wide audit trail (structured logs only).
  6. Single manual database step required to provision the first `SYSTEM_ADMINISTRATOR` per environment.

---

## Testing

- **Unit coverage:** Every service in every domain has a dedicated `*.spec.ts` with a mocked repository, covering success paths, not-found, conflict, and (where applicable) authorization branches. `UserRolesService` (WO-021) and `ResourcesService` (WO-020) have full branch coverage of their authorization logic specifically.
- **Integration coverage:** Introduced in WO-020 (`resources.integration.spec.ts`) — real PostgreSQL, no mocks, verifying Prisma query correctness (array containment, case-insensitive search, unique constraints). Not yet extended to any other domain's repository.
- **End-to-end coverage:** Introduced in WO-020, extended in WO-021 — full HTTP requests via Supertest against a booted application (real guards, pipes, filters, database), covering Resources and Administration. **Not present** for Users, Auth, Goals, Journeys, Milestones, Tasks, Opportunities, or UserInterests — those domains are unit-tested only.
- **Aggregate coverage (`apps/api`, current):** 89.3% statements / 72.6% branches / 64.0% functions / 90.4% lines. 252/252 tests passing.
- **Missing tests:**
  - Integration/e2e tests for every domain besides Resources and Administration.
  - Any test coverage at all for `apps/web` (it has no business logic yet, so this is expected, not a gap — will become one the moment real UI code lands).
  - Load/performance testing — none has been done anywhere in the platform.
  - Security-specific testing (e.g. automated brute-force/rate-limit verification, dependency scanning in CI) beyond the manual `pnpm audit` run performed for this report.

---

## Technical Debt

- **TODOs / FIXMEs / HACKs:** None found in `apps/api`, `apps/web`, or `packages/shared` source (`grep -rn "TODO\|FIXME\|HACK\|XXX"` returns zero matches outside test files). The codebase does not accumulate silent debt markers — every known gap is instead recorded explicitly in an ADR's Risks section or a Work Order's Known Limitations section, which is the intended pattern going forward.
- **Stubs / placeholder implementations:** `apps/web` is entirely a placeholder (default Next.js scaffold, zero business logic). Email delivery is a logging stub standing in for a real provider integration (documented, intentional).
- **Dead code:** None identified. (A dead constant introduced during WO-021 drafting — `PLATFORM_ADMIN_GRANTABLE_ROLES`, superseded by the negative-check design in `UserRolesService.assertMutable` — was removed before commit rather than merged.)
- **Cleanup opportunities:**
  - Retroactively write `docs/work-orders/` entries for Batch A–E and Phase 1/Phase 2 for a fully consistent paper trail (low priority — ADR-003/ADR-004 already cover the architectural decisions).
  - Opportunity Engine's workflow actions (`verify`/`reject`/`archive`) still accept reviewer identity from the request body rather than the JWT (ADR-004/ADR-005 technical debt, not yet remediated — Resources and Administration do this correctly).

---

## Documentation Status

- **Completed:** Constitution (OAS series), Implementation Constitution (IC-001–020), Product Architecture (PA-001–020), 7 ADRs, 4 formal Work Order documents (WO-018–021) with matching Operational Verification reports, this Readiness Report.
- **Missing:** Formal WO documents for Batch A–E and Phase 1/Phase 2 (see Technical Debt); a CONTRIBUTING/onboarding guide for new engineers beyond the ADRs themselves; a dedicated Business Portal PA-011 implementation plan (the PA doc exists, no implementation plan yet since the domain hasn't started).
- **Needs updating:** `README.md` was stale (still described the repo as containing "no business logic yet" despite six implemented domains) — updated as part of this Work Order.

---

## Version 1 Release Blockers

Only items that should reasonably be resolved before inviting the first external members:

1. **No member-facing frontend.** `apps/web` has zero business logic. There is nothing for an invited member to use.
2. **Unguarded domain endpoints.** Goals, Journeys, Milestones, Tasks, UserInterests, Profile, and SavedOpportunities have no authentication or ownership enforcement — any caller can read or modify any member's private data. This is a live data-privacy violation, not a theoretical risk, and must be fixed regardless of frontend status.
3. **No email delivery.** Members cannot verify their email or recover a forgotten password without an operator manually reading application logs. Not viable for real users.
4. **Critical Next.js vulnerability in `apps/web`.** Must be patched (upgrade to `next >=15.5.16`) before that application is ever deployed, independent of when the frontend itself is built.
5. **AI Intelligence Engine.** PA-020 names AI-assisted guidance as a core Version 1 objective. Whether this specifically blocks an initial invite (versus a fast-follow) is a founder scope decision, not an engineering one — flagged here as a likely blocker pending that confirmation, not asserted outright.

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

---

## Current Readiness Score

| Category | Score (0–100) | Notes |
|---|---|---|
| Architecture | 85 | Consistent, well-documented layering across every implemented domain; deductions for the stopgap ownership model and a still-narrow Administration module. |
| Security | 58 | Strong authentication/RBAC foundation undermined by real, live unguarded endpoints across 7 routes and a critical dependency vulnerability awaiting a fix. |
| Testing | 80 | 252 passing tests across three tiers, strong coverage on newer domains; integration/e2e coverage not yet extended to older domains. |
| Documentation | 82 | Exceptionally thorough governance and per-Work-Order documentation; a few early batches lack formal WO records. |
| Operations | 45 | CI is solid, but there is no deployment pipeline, no monitoring/observability, and no disaster-recovery implementation — only policy documents (IC series) describing what should exist. |
| Performance | 50 | Unverified rather than confirmed poor — no load testing has been performed anywhere in the platform. |
| Developer Experience | 78 | Clear, repeatable patterns a new contributor can follow domain-to-domain; missing a dedicated onboarding guide. |
| User Readiness | 20 | No frontend, no email delivery, no AI guidance, no Business Portal — a real member cannot yet use this platform end-to-end. |

**Overall Version 1 readiness: ~30%.**

This number is lower than the Architecture/Testing/Documentation scores because it weighs what an actual invited member would experience today: a mature, well-tested backend for roughly a third of the named Version 1 systems, reachable through no usable interface, with real authorization gaps in several of the domains that *are* built, and no path for a member to complete email verification. Backend engineering velocity and quality are high; the gap to a genuine Version 1 launch is dominated by the frontend, the AI Intelligence Engine, and closing the authorization gap — not by architectural or process risk.

---

## Recommended Next Work Order

**WO-022 — Authorization Retrofit: Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities.**

This is the highest-priority remaining item because it is the only Release Blocker that is simultaneously (a) a genuine, currently-live security gap in already-shipped code, (b) fully mechanical to fix — the exact guard-plus-ownership pattern is already proven and tested in `UsersController` (WO-019) and `ResourcesController` (WO-020) — and (c) requires zero new product or architectural decisions. Every other remaining item either requires a founder scope decision (AI Intelligence Engine, Business Portal timing), is a larger, more speculative domain (Pods, Academy, Knowledge System), or is a dependency/ops task rather than a Work Order in the domain-implementation sense (the Next.js upgrade, email delivery integration). Closing WO-022 converts the platform's most severe open risk into a solved one using patterns that are already validated in production code, before any further domain work adds more surface area that would need the same retrofit later.
