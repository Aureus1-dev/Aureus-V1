# Aureus Version 1 Readiness Report

> **This is the canonical, living release-tracking document for Aureus Version 1.**
> It is updated after every completed Work Order rather than superseded by a new file. Do not create a new readiness report — edit this one.

Last updated: 2026-07-15 (after WO-026 — Communication System)

---

## Founder Directive: Backend-Before-Frontend Sequencing

**2026-07-15 — the founder has made a Version 1 architectural decision: the entire canonical backend (all twelve PA-020-named Version 1 systems) will be completed before any frontend work begins.** This supersedes the WO-023-era recommendation to start a frontend foundation next. Until every canonical Version 1 backend business domain is implemented and verified, this report's Recommended Next Work Order section will name only backend Work Orders — frontend implementation remains a known, tracked gap (see Version 1 Release Blockers) but is explicitly out of sequence until that condition is met.

---

## Executive Summary

- **Overall Version 1 readiness: ~50%.**
- **Implementation status:** The backend architecture is mature and consistent — nine domain modules (Member Core, Journey Engine, Opportunity Engine, Resource Directory, Authentication/IAM, Administration & Operations, Business Portal, Stewardship System, and, as of WO-026, Communication System) are implemented, tested, and live-verified, every one of them enforces authentication and ownership on every endpoint (WO-022), and account verification/password reset deliver real email (WO-023), now joined by a genuinely reusable notification/messaging/announcement infrastructure. A full domain audit against PA-020 (performed before WO-024) confirmed 5 of 12 named Version 1 systems were substantially complete at that point; Business Portal became the 6th, Stewardship System the 7th, Communication System is now the 8th. Four domains remain: AI Intelligence Engine, Academy, Pods, and Knowledge System — see Remaining Backend Domains below.
- **Release recommendation:** **Do not invite external members yet, and do not begin frontend work yet** (see Founder Directive above). The API backend for the systems built so far is production-quality, fully authorization-enforced, and can now deliver real account-verification/password-reset email plus in-app/email notifications, announcements, and stewardship/organization messaging — but the canonical backend itself is not yet complete, and per founder directive no frontend work begins until it is. Continue backend Work Order execution in canonical priority order; re-assess after every remaining backend domain (below) is implemented and verified.

---

## Remaining Backend Domains (PA-020 Audit)

A full audit against PA-020's twelve named Version 1 systems, cross-referenced with the actual repository state, was performed before WO-024 (see WO-024's founder-instruction record). Result at that time: **5 of 12 implemented, 7 remaining.** WO-024 (Business Portal), WO-025 (Stewardship System), and WO-026 (Communication System) close three of the seven. **4 remain, in priority order:**

1. **AI Intelligence Engine (PA-006).** Named explicitly in PA-020's mission ("Deliver AI-assisted guidance") and flagged as a likely Release Blocker. Highest strategic priority, but **blocked on a founder MVP-scope decision** (which capabilities, which provider/cost model) — not currently engineering-ready to start without that input.
2. **Academy (PA-010).** Substantial new domain (courses, learning paths, content, and — per the founder's WO-026 canonical decisions — a Steward Content Studio / Media Center for authorized Steward/Administrator-created media). Needs curriculum/content-sourcing product decisions before backend schema design — **partially blocked on product decisions**, though its eventual notification/announcement needs are now unblocked by Communication System (WO-026).
3. **Pods (PA-009).** Community formation; both named dependencies — Stewardship (moderation, WO-025) and Communication (pod messaging/notifications, WO-026) — are now implemented. Still needs product decisions on formation/matching logic — **fully unblocked on dependencies, still blocked on product decisions.**
4. **Knowledge System (PA-013).** Lowest immediate priority; Resource Directory and Opportunity Engine already deliver substantial "trustworthy information" value. Per PA-020's "simplify before expanding" principle, defer furthest. **The only remaining domain that is both engineering-ready and not blocked on a founder product decision** — see Recommended Next Work Order.

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
| WO-024 (ADR-010) | Business Portal (PA-011) | #18 | Merged to `main` | 2026-07-15 |
| WO-025 (ADR-011) | Stewardship System (PA-012) | #19 | Merged to `main` | 2026-07-15 |
| WO-026 (ADR-012) | Communication System (PA-015) | *pending PR* | Implemented, not yet merged — do not merge until explicitly instructed | 2026-07-15 |

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

- **Test status:** ✅ 599/599 automated tests passing (unit, Prisma integration, and full HTTP end-to-end tiers) as of WO-026.
- **CI status:** ✅ Green. `.github/workflows/ci.yml` provisions a PostgreSQL service container, generates the Prisma client, runs `migrate deploy`, the full test suite, and the full monorepo build on every push/PR.
- **Build status:** ✅ All 3 packages (`@aureus-v1/api`, `@aureus-v1/shared`, `@aureus-v1/web`) build cleanly.
- **Database migration status:** ✅ 10 migrations, all applied, `prisma migrate deploy` idempotent.
- **Dependency health:** ✅ `apps/web`'s `next` dependency was patched from `15.3.3` to `15.5.20` — the critical RCE and 24 other known vulnerabilities previously reported are resolved. `apps/api` and `packages/shared` continue to have no known vulnerabilities in their dependency trees. A few dev-only packages emit deprecation warnings (`@types/helmet`, transitive `glob`/`inflight`) — cosmetic, no action required.

---

## Architecture Health

- **ADR compliance:** Twelve ADRs (ADR-003 through ADR-012) record every significant architectural decision made so far. Every new domain (Journey Engine, Opportunity Engine, Resource Directory, Authentication, Administration, Business Portal, Stewardship System, Communication System) has followed the layering pattern established in ADR-003: `interface → Prisma repository → service → controller → DTO`, with dependency injection via string tokens and module-level exports rather than direct cross-module instantiation. WO-023's `EmailModule` extended this pattern to a non-persistence infrastructure dependency; WO-024's `Organization`/`OrganizationMember` reused the Resources/Opportunities verification-workflow shape verbatim; WO-025's Stewardship System extended the pattern furthest yet — seven internal sub-domains under one module, reading across six other already-shipped domains via the minimal-additive-export and direct-service-reuse patterns (ADR-011 Decision 6); WO-026's Communication System both reuses that same cross-domain pattern (importing `OrganizationsModule`/`StewardshipModule` for audience/participant resolution) and extends ADR-009's `EmailModule` with its own first genuine second-consumer use case (a generic `sendNotification()` method, ADR-012 Decision 2) — confirming the layering pattern scales to both breadth (many sub-domains) and reuse (infrastructure built for one domain serving a second) without architectural strain.
- **Invariant compliance:**
  - Soft deletion (`deletedAt`), never hard delete — consistently applied across every domain.
  - Response DTOs with `fromEntity()` static factories — consistently applied.
  - Offset pagination (`page`/`limit`, max 100) — consistently applied.
  - Ownership derived from the JWT, never trusted from the request body — followed by Resources, Administration, and, as of WO-022, Goals/Journeys/Milestones/Tasks/Profile/UserInterests/SavedOpportunities; **not** followed by the original Opportunity Engine, which still trusts body-supplied `submittedById`/`reviewedById` (flagged as technical debt in ADR-004/ADR-005, not yet remediated).
  - Guard reuse (`JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`) via the dependency-free `AuthGuardsModule` — consistently applied across every domain module as of WO-022.
  - Transitive ownership resolution (Journey→Goal, Milestone→Journey→Goal, Task→Milestone→Journey→Goal) via a `findOwnerId()` repository method resolved in a single Prisma nested-`select` query (ADR-008) — consistently applied across the three domains that needed it, and reused read-only by Stewardship's member-overview/metrics aggregation (WO-025).
  - Real vs. loose foreign keys: `OrganizationMember.userId`/`.organizationId` (WO-024), `StewardshipRelationship.memberId`/`.stewardId`, `StewardCapacity.stewardId` (WO-025), and `Notification.recipientId`, `NotificationDelivery.notificationId`, `NotificationPreference.userId`, `ConversationParticipant.userId`, `Message.senderId` (WO-026) carry real FKs, matching the majority precedent (`Profile`, `Goal`, auth token tables) rather than `Resource.ownerId`/`Opportunity.submittedById`'s documented loose-pointer exception; audit/actor-pointer fields (`requestedById`, `assignedById`, `recommendedById`, `endedById`, `Announcement.authorId`, `Notification.actorId`, etc.) stay loose, following the same distinction (ADR-010 Decision 3, reaffirmed by ADR-011 and ADR-012).
  - Configurable limits sourced from a single Prisma column default rather than an application-code constant — pattern introduced by `StewardCapacity.maxActiveMembers @default(25)` (ADR-011 Decision 4), directly satisfying a "do not hardcode" founder instruction.
  - Infrastructure built for one domain reused by a second without duplication — `EmailModule` (WO-023/ADR-009), extended rather than reimplemented for WO-026's notification delivery (ADR-012 Decision 2), the pattern's first genuine second-consumer proof point.
  - Bounded enum + free-text-key extensibility — `Notification.category` (fixed enum, drives preferences) paired with `Notification.type` (free-text, dot-namespaced) lets every current and future domain mint new notification kinds with zero schema migration (ADR-012 Decision 3), the concrete mechanism behind "future domains can use this without duplicating infrastructure."
- **Remaining architectural concerns:**
  - `Organization` now exists (WO-024/ADR-010), but `Resource`/`Opportunity` are not yet linked to it — `organizationName`/`provider` remain free text (deliberately deferred, ADR-010 Decision 6; ADR-006 §3 addendum records this explicitly).
  - No platform-wide audit table — every domain relies on structured logging (documented, intentional, per ADR-004 §7).
  - `AdministrationModule` currently has a single responsibility (role management); as more administrative capabilities are added, watch for it becoming a dumping ground rather than staying cohesive.
  - `hasRole()` (WO-022) is used by every new authorization check but was deliberately not retrofitted onto the pre-existing inline role checks in `UsersController`/`ResourcesController`/`AdministrationModule` (ADR-008 §4) — a minor, tracked inconsistency, not a functional gap.
  - Organization-scoped steward assignment (ADR-011 Decision 8) and organization-scoped messaging (ADR-012 Decision 9) are both checked at the `OrganizationMember` (representative) level, not a member-enrollment level — no member-to-organization client relationship exists in the schema yet; both explicitly deferred to the same future Future Extension Point rather than two separate gaps.
  - Communication System's `notify()` integration method is fully built and proven via the Announcements fan-out call site, but is not yet actually called from Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine's real lifecycle events — those domains do not yet send real notifications when their own events occur (ADR-012 Decision 4, explicitly deferred as small independent follow-ups).

---

## Security Review

- **Authentication:** ✅ Solid. JWT access tokens (15m default) + rotating, revocable, SHA-256-hashed opaque refresh tokens. Passwords hashed with bcryptjs (12 rounds). Login rejects unknown emails, wrong passwords, and non-`ACTIVE` accounts uniformly (no user-enumeration signal). `JWT_ACCESS_SECRET` is required and validated at startup (min 32 chars). Password reset and email verification now deliver real email (WO-023) rather than only logging tokens; plaintext tokens no longer appear in application logs (ADR-009 Decision 5), a direct security improvement over the ADR-005 §7 interim state.
- **Authorization:** ✅ **Resolved as of WO-022.** Every domain — `Users`, `Auth`, `Opportunities`, `Resources`, `Administration`, `Organizations`, and, as of WO-022, `Goals`, `Journeys`, `Milestones`, `Tasks`, `UserInterests`, `Profile`, and `SavedOpportunities` — now correctly enforces `JwtAuthGuard`/`RolesGuard`/ownership checks. The transitive Goal→Journey→Milestone→Task ownership chain is resolved server-side via `findOwnerId()` (ADR-008), never trusted from the request body. As of WO-025, Stewardship System applies the same server-derived-authority invariant one layer further: steward authority over a member is always resolved from the loaded `StewardshipRelationship` row (`relationship.stewardId === caller.id`), never trusted from the request body, and three distinct least-privilege visibility shapes (notes' `PRIVATE`/`SHARED` split, member-read-only follow-up tasks, steward/admin-only escalations) are each independently enforced per ADR-011 Decision 5. As of WO-026, Communication System extends the same invariant to messaging (participant authorization resolved from an explicit `ConversationParticipant` whitelist populated only from verified relationships/organization co-membership, never re-derived from possibly-stale state at send time) and to announcements (scope-specific authority re-checked against live database state on every create/publish call, never a cached "is author" flag). There is no HTTP path by which an arbitrary caller can create a notification for another user — the only creation path is the in-process `NotificationsService.notify()` method (ADR-012 Decision 4). The one remaining known gap is the original Opportunity Engine still trusting body-supplied `submittedById`/`reviewedById` (tracked technical debt, ADR-004/ADR-005, not a missing-guard issue).
- **Input validation:** ✅ Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) applied platform-wide; every DTO uses `class-validator` decorators; no endpoint accepts unvalidated input.
- **Rate limiting:** ⚠️ A single global `ThrottlerModule` policy (100 req/min per IP) applies to every route. `/auth/login` and `/auth/register` have no stricter, brute-force-appropriate limit of their own — acceptable for an internal/limited-cohort stage, but should be tightened before public registration.
- **Secrets/configuration:** ✅ `.env` is gitignored and never committed; `JWT_ACCESS_SECRET` and `DATABASE_URL` are validated at startup via Joi and the process fails fast if absent (WO-018 precedent). ⚠️ `CORS_ORIGIN` defaults to `*` — fine for development, must be set explicitly per environment before production. No secret-rotation mechanism exists yet (single static JWT secret).
- **Remaining risks:**
  1. No MFA. Now the highest-severity open item following WO-022's resolution of the unguarded-endpoints risk and WO-023's resolution of the Next.js dependency vulnerability and missing email delivery.
  2. No platform-wide audit trail (structured logs only).
  3. Single manual database step required to provision the first `SYSTEM_ADMINISTRATOR` per environment.
  4. Opportunity Engine still trusts body-supplied `submittedById`/`reviewedById` rather than deriving them from the JWT (tracked technical debt, not a missing-guard issue — the endpoints are still role-guarded).
  5. Outbound email is sent synchronously in the request path with no retry mechanism (ADR-009 Risks) — acceptable at V1 traffic, not yet a background job; WO-026's notification emails inherit this same characteristic, mitigated by the delivery-status/idempotent-retry model (ADR-012 Decision 6) even though no background job actually calls it yet.
  6. The real-SMTP transport code path (as opposed to the local-capture fallback) has not been exercised against a live mail provider in any environment so far, only unit-tested and code-reviewed (WO-023 Known Limitations) — an operator should perform one live send as part of production deployment verification.
  7. Communication System's `notify()` integration point is proven only via the Announcements fan-out call site — Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine do not yet send real notifications on their own domain events, a functional-completeness gap, not a security gap (ADR-012 Decision 4).

---

## Testing

- **Unit coverage:** Every service in every domain has a dedicated `*.spec.ts` with a mocked repository, covering success paths, not-found, conflict, and authorization branches. `UserRolesService` (WO-021), `ResourcesService` (WO-020), `GoalsService`/`JourneysService`/`MilestonesService`/`TasksService` (WO-022), `NodemailerEmailService` (WO-023), `OrganizationsService`/`OrganizationMembersService` (WO-024, including the last-remaining-`ADMIN` invariant), all seven Stewardship sub-domain services (WO-025 — relationships, capacity, notes, tasks, recommendations, escalations, metrics — 73 tests), and, as of WO-026, all four Communication sub-domain services (notifications, preferences, announcements, messaging — 56 tests) have full branch coverage of their respective logic.
- **Integration coverage:** Introduced in WO-020 (`resources.integration.spec.ts`) — real PostgreSQL, no mocks, verifying Prisma query correctness (array containment, case-insensitive search, unique constraints). Extended in WO-026 (`communication.integration.spec.ts`, 6 tests) — verifies the `[recipientId, dedupeKey]`/`[notificationId, channel]` unique constraints (idempotency), preference upsert idempotency, the Announcement audience OR-query, and the `Conversation.relationshipId` unique constraint. Not yet extended to any other domain's repository beyond these two plus the `findOwnerId()` unit tests added in WO-022.
- **End-to-end coverage:** Introduced in WO-020, extended in WO-021 through WO-026 — full HTTP requests via Supertest against a booted application (real guards, pipes, filters, database), now covering Resources, Administration, Goals/Journeys/Milestones/Tasks, Profile, UserInterests, SavedOpportunities, Auth (WO-023), Organizations + membership management (WO-024), the full Stewardship relationship lifecycle, notes, tasks, recommendations, escalations, metrics, and organization-scoped assignment/reassignment (WO-025, 26 tests), and, as of WO-026, announcement authorization/lifecycle/fan-out, notification ownership/read-state, preference-driven suppression verified live across two recipients, and stewardship/organization messaging with cross-user and cross-organization isolation (31 tests). Real registered users are used for personas that become real-FK-backed rows (`OrganizationMember.userId`, `StewardshipRelationship.memberId`/`.stewardId`, `Notification.recipientId`, `ConversationParticipant.userId`), mirroring the WO-022 `Goal.userId` finding; personas whose role is checked against the *persisted* database row (not just the JWT claim) are granted that role for real via the WO-021 role-grant endpoint before use, a pattern first discovered in WO-025 and reused unchanged in WO-026. **Not present** for Users or Opportunities.
- **Aggregate coverage (`apps/api`, current):** 599/599 tests passing across 51 suites (up from 506/506 across 45 suites at WO-025).
- **Missing tests:**
  - End-to-end tests for Users and Opportunities.
  - Integration-tier (`*.integration.spec.ts`) tests for domains beyond Resources and Communication.
  - A live send against a real SMTP provider (WO-023's real-transport branch is unit-tested only, per Known Limitations — no outbound network access to a real mail relay in this implementation environment; WO-026's notification emails share this same limitation, verified live only against the `jsonTransport` local-capture fallback).
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
  - Organization-scoped steward assignment (ADR-011 Decision 8) and organization-scoped messaging (ADR-012 Decision 9) authority are both broader than "within their organization"/"organization-authorized" strictly implies, pending the same future member-enrollment model — explicitly named, not silent.
  - `NotificationsService.notify()` has exactly one real call site (Announcements fan-out); wiring it into Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine's own lifecycle events is tracked as five small, independent follow-ups (ADR-012 Decision 4).

---

## Documentation Status

- **Completed:** Constitution (OAS series), Implementation Constitution (IC-001–020), Product Architecture (PA-001–020), 12 ADRs, 9 formal Work Order documents (WO-018–026) with matching Operational Verification reports, this Readiness Report.
- **Missing:** Formal WO documents for Batch A–E and Phase 1/Phase 2 (see Technical Debt); a CONTRIBUTING/onboarding guide for new engineers beyond the ADRs themselves.

---

## Version 1 Release Blockers

Only items that should reasonably be resolved before inviting the first external members:

1. **No member-facing frontend.** `apps/web` has zero business logic. There is nothing for an invited member to use. This remains the only unconditional Release Blocker — and, per the Founder Directive above, is now deliberately sequenced *after* every canonical backend domain rather than started next.
2. **AI Intelligence Engine.** PA-020 names AI-assisted guidance as a core Version 1 objective. Whether this specifically blocks an initial invite (versus a fast-follow) is a founder scope decision, not an engineering one — flagged here as a likely blocker pending that confirmation, not asserted outright.

**Resolved as of WO-022:** Unguarded domain endpoints (Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities) — every domain now enforces authentication and ownership.

**Resolved as of WO-023:** No email delivery — account verification and password reset now send real email. Critical Next.js vulnerability in `apps/web` — patched to `15.5.20`.

**Resolved as of WO-024:** Business Portal had zero implementation — verified organization profiles and representative membership now exist (ADR-010).

**Resolved as of WO-025:** Stewardship System existed only as a bare inline role check — a full relationship lifecycle, capacity management, notes, follow-up tasks, recommendations, escalations, and a steward-metrics foundation now exist (ADR-011).

**Resolved as of WO-026:** Communication System had only a narrow transactional-email mechanism (WO-023) — in-app notifications, communication preferences, announcements, and stewardship/organization messaging, all with honest delivery tracking, now exist and are proven reusable by every current and future domain (ADR-012).

---

## Post-Launch Candidates

Safe to defer to Version 1.1 or later:

- MFA
- Platform-wide `AuditLog` table (structured logging is an accepted interim measure)
- Linking `Organization` into `Resource`/`Opportunity` ownership (ADR-010 Decision 6 — purely additive whenever built, per ADR-006 §3's forward declaration)
- Recruitment tooling, partnership management, organization dashboards/analytics (PA-011 components beyond WO-024's foundational scope)
- A member-enrollment/client relationship between `User` and `Organization`, to make organization-scoped steward assignment and organization-scoped messaging precise (ADR-011 Decision 8, ADR-012 Decision 9)
- Real instrumentation for steward `averageResponseTimeHours`/`memberSatisfactionScore` (ADR-011 Decision 7 — reserved fields, no data source yet)
- Automated steward-inactivity detection (currently a manually-selected end reason only)
- Cursor-based pagination (offset pagination is adequate at V1 scale)
- Geographic radius search (PostGIS) for Opportunities/Resources
- ML-powered opportunity/resource scoring (current formula-based scoring is intentional and auditable)
- JWT secret rotation mechanism
- Performance/load testing infrastructure
- Background job queue for outbound email (synchronous send is adequate at V1 traffic)
- Email bounce/complaint/deliverability tracking, and real EMAIL delivery confirmation for Communication System notifications (ADR-012 Decision 5 — `DELIVERED` status reserved but unreachable for that channel)
- Wiring `NotificationsService.notify()` into each existing domain's real lifecycle events (ADR-012 Decision 4)
- Scheduled digests, quiet-hours enforcement, and automated `SCHEDULED → PUBLISHED` announcement transitions (ADR-012 — all stored as a foundation, none actively scheduled in V1)
- Group conversations and Pod-integrated messaging, once Pods exists (ADR-012 Decision 8)

---

## Current Readiness Score

| Category | Score (0–100) | Notes |
|---|---|---|
| Architecture | 91 | Consistent, well-documented layering across every implemented domain, now including proven transitive-ownership-resolution (ADR-008), infrastructure-DI (ADR-009), real-FK-join-table (ADR-010), multi-domain-composition (ADR-011), and a first proven infrastructure-reuse-by-a-second-consumer case (ADR-012, extending rather than duplicating `EmailModule`) patterns; deductions for a still-narrow Administration module and the deliberately-deferred `Organization` linkage into Resources/Opportunities. |
| Security | 88 | Full authorization enforcement across every implemented domain (WO-022), a patched frontend dependency tree, real email delivery with plaintext tokens removed from logs (WO-023), organization-membership authorization mirroring the same server-derived-ownership invariant (WO-024), steward authority resolved server-side with independently-enforced least-privilege visibility shapes (WO-025), and, as of WO-026, messaging/announcement authority resolved the same way with zero public notification-creation surface; remaining deductions for no MFA and no platform-wide audit trail. |
| Testing | 88 | 599 passing tests across three tiers; end-to-end coverage now extends to 11 of 13 implemented domains, up from 2 at WO-021; integration-tier coverage now spans two domains (Resources, Communication); Users/Opportunities remain unit-tested only. |
| Documentation | 88 | Exceptionally thorough governance and per-Work-Order documentation; a few early batches lack formal WO records. |
| Operations | 46 | CI is solid, but there is no deployment pipeline, no monitoring/observability, and no disaster-recovery implementation — only policy documents (IC series) describing what should exist. |
| Performance | 50 | Unverified rather than confirmed poor — no load testing has been performed anywhere in the platform. |
| Developer Experience | 83 | Clear, repeatable patterns a new contributor can follow domain-to-domain, including the ownership-chain, infrastructure-DI, verification-workflow-reuse, multi-domain-composition, and now infrastructure-reuse-across-domains patterns; missing a dedicated onboarding guide. |
| User Readiness | 25 | No frontend, no AI guidance — a real member cannot yet use this platform end-to-end. Communication System backend now exists, but with no frontend it changes nothing a member would directly experience yet; the frontend remains the dominant blocker. |

**Overall Version 1 readiness: ~50%.**

This number is higher than the pre-WO-026 assessment because an eighth PA-020-named Version 1 system (Communication System) is now implemented, tested, and live-verified, following the founder's backend-before-frontend sequencing decision — and because it is genuinely reusable infrastructure, not just another isolated domain, proven by its first real integration (Announcements fan-out) rather than left as an unproven abstraction. It remains well below the Architecture/Testing/Documentation scores because it weighs what an actual invited member would experience today: a mature, well-tested, fully authorization-enforced backend now spanning two-thirds of the named Version 1 systems, still reachable through no usable interface — and, per the Founder Directive, deliberately not gaining one until the remaining four backend domains are also complete. Backend engineering velocity and quality are high; the score will climb domain-by-domain from here without a frontend counting against it, since the frontend is now explicitly out of sequence rather than a currently-expected next step.

---

## Recommended Next Work Order

**Per the Founder Directive (above), this section names only backend Work Orders until every canonical Version 1 backend business domain is implemented and verified.**

**WO-027 — Knowledge System (PA-013).**

With Communication System (WO-026) closing the gap it was chosen to close, Knowledge System is now the *only* domain in the Remaining Backend Domains priority order (see above) that is both not blocked on a founder MVP-scope decision and not blocked on a founder product-scoping decision. AI Intelligence Engine remains blocked on a founder decision (which capabilities, which provider/cost model). Academy — now including, per this WO's canonical decisions, a Steward Content Studio / Media Center — needs curriculum/content-sourcing/media-governance product decisions before backend schema design. Pods has both of its named dependencies resolved (Stewardship for moderation, WO-025; Communication for pod messaging/notifications, WO-026) but still needs product decisions on formation/matching logic. Knowledge System has no such blocker: PA-020's "simplify before expanding" principle placed it lowest-priority precisely because Resource Directory and Opportunity Engine already deliver substantial "trustworthy information" value, not because it is unclear what to build. Expect the same shape of work as WO-020/WO-024/WO-025/WO-026: a new bounded module, reusing the established verification-workflow and layering patterns, integrating with Communication System's `notify()` for any relevant notifications (the first real second call site beyond Announcements, if applicable), with no schema changes to any existing domain required beyond additive back-relations.

If the founder resolves the AI Intelligence Engine's scope decision or an Academy/Pods product-scoping decision before WO-027 begins, that domain should be re-prioritized ahead of Knowledge System — this recommendation reflects the current, still-blocked state of those three domains, not a permanent deprioritization.
