# Aureus Version 1 Readiness Report

> **This is the canonical, living release-tracking document for Aureus Version 1.**
> It is updated after every completed Work Order rather than superseded by a new file. Do not create a new readiness report — edit this one.

Last updated: 2026-07-15 (after WO-029 — AI Intelligence Engine)

---

## Founder Directive: Backend-Before-Frontend Sequencing

**2026-07-15 — the founder has made a Version 1 architectural decision: the entire canonical backend (all twelve PA-020-named Version 1 systems) will be completed before any frontend work begins.** This supersedes the WO-023-era recommendation to start a frontend foundation next. Until every canonical Version 1 backend business domain is implemented and verified, this report's Recommended Next Work Order section will name only backend Work Orders — frontend implementation remains a known, tracked gap (see Version 1 Release Blockers) but is explicitly out of sequence until that condition is met.

---

## Executive Summary

- **Overall Version 1 readiness: ~59%.**
- **Implementation status:** The backend architecture is mature and consistent — twelve domain modules (Member Core, Journey Engine, Opportunity Engine, Resource Directory, Authentication/IAM, Administration & Operations, Business Portal, Stewardship System, Communication System, Knowledge System, Academy, and, as of WO-029, the AI Intelligence Engine) are implemented, tested, and live-verified, every one of them enforces authentication and ownership on every endpoint (WO-022), and account verification/password reset deliver real email (WO-023), joined by a genuinely reusable notification/messaging/announcement infrastructure now proven by a fourth independent consumer (WO-029). A full domain audit against PA-020 (performed before WO-024) confirmed 5 of 12 named Version 1 systems were substantially complete at that point; Business Portal became the 6th, Stewardship System the 7th, Communication System the 8th, Knowledge System the 9th, Academy the 10th, AI Intelligence Engine is now the 11th. **One domain remains — Pods — blocked on a founder product-scoping decision; it is the only PA-020 domain not yet engineering-ready to start. See Remaining Backend Domains and Recommended Next Work Order below for what unblocking it requires.**
- **Release recommendation:** **Do not invite external members yet, and do not begin frontend work yet** (see Founder Directive above). The API backend for the systems built so far is production-quality, fully authorization-enforced, and now delivers real account-verification/password-reset email, in-app/email notifications, announcements, stewardship/organization messaging, a verified/searchable knowledge repository, a full Academy — courses, learning paths, enrollments, progress tracking, course completion, steward certification, and a Steward Content Studio for media — and an AI Intelligence Engine that explains, guides, and recommends across every one of those domains without ever acting on a member's behalf automatically — but the canonical backend itself is not yet complete. With eleven of twelve backend domains now built, only one founder decision (Pods' product scope) stands between this platform and a fully complete canonical backend.

---

## Remaining Backend Domains (PA-020 Audit)

A full audit against PA-020's twelve named Version 1 systems, cross-referenced with the actual repository state, was performed before WO-024 (see WO-024's founder-instruction record). Result at that time: **5 of 12 implemented, 7 remaining.** WO-024 (Business Portal), WO-025 (Stewardship System), WO-026 (Communication System), WO-027 (Knowledge System), WO-028 (Academy), and WO-029 (AI Intelligence Engine) close six of the seven. **1 remains, currently blocked, not engineering-ready to start without founder input:**

1. **Pods (PA-009).** Community formation; both named dependencies — Stewardship (moderation, WO-025) and Communication (pod messaging/notifications, WO-026) — are implemented. **Blocked only on formation/matching-logic product decisions** — dependency-wise fully unblocked.

**No remaining domain is currently engineering-ready.** This has been true since the WO-027 readiness update, but the gap has narrowed to a single domain. See Recommended Next Work Order below for what is needed to unblock it.

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
| WO-026 (ADR-012) | Communication System (PA-015) | #20 | Merged to `main` | 2026-07-15 |
| WO-027 (ADR-013) | Knowledge System (PA-013) | #21 | Merged to `main` | 2026-07-15 |
| WO-028 (ADR-014) | Academy Foundation (PA-010) | #22 | Merged to `main` | 2026-07-15 |
| WO-029 (ADR-015) | AI Intelligence Engine (PA-006) | *pending PR* | Implemented, not yet merged | 2026-07-15 |

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

- **Test status:** ✅ 785/785 automated tests passing (unit, Prisma integration, and full HTTP end-to-end tiers) as of WO-029.
- **CI status:** ✅ Green. `.github/workflows/ci.yml` provisions a PostgreSQL service container, generates the Prisma client, runs `migrate deploy`, the full test suite, and the full monorepo build on every push/PR.
- **Build status:** ✅ All 3 packages (`@aureus-v1/api`, `@aureus-v1/shared`, `@aureus-v1/web`) build cleanly.
- **Database migration status:** ✅ 14 migrations, all applied, `prisma migrate deploy` idempotent.
- **Dependency health:** ✅ `apps/web`'s `next` dependency was patched from `15.3.3` to `15.5.20` — the critical RCE and 24 other known vulnerabilities previously reported are resolved. `apps/api` and `packages/shared` continue to have no known vulnerabilities in their dependency trees. A few dev-only packages emit deprecation warnings (`@types/helmet`, transitive `glob`/`inflight`) — cosmetic, no action required.

---

## Architecture Health

- **ADR compliance:** Fifteen ADRs (ADR-003 through ADR-015) record every significant architectural decision made so far. Every new domain (Journey Engine, Opportunity Engine, Resource Directory, Authentication, Administration, Business Portal, Stewardship System, Communication System, Knowledge System, Academy, AI Intelligence Engine) has followed the layering pattern established in ADR-003: `interface → Prisma repository → service → controller → DTO`, with dependency injection via string tokens and module-level exports rather than direct cross-module instantiation. WO-023's `EmailModule` extended this pattern to a non-persistence infrastructure dependency; WO-024's `Organization`/`OrganizationMember` reused the Resources/Opportunities verification-workflow shape verbatim; WO-025's Stewardship System extended the pattern furthest yet in breadth — seven internal sub-domains under one module, reading across six other already-shipped domains via the minimal-additive-export and direct-service-reuse patterns (ADR-011 Decision 6); WO-026's Communication System both reused that cross-domain pattern and extended ADR-009's `EmailModule` with its own first genuine second-consumer use case (ADR-012 Decision 2); WO-027's Knowledge System reused the Resources/Opportunities/Organizations verification-workflow shape a fourth time and proved Communication System's `notify()` integration point with a *second* independent consumer (ADR-013 Decision 4); WO-028's Academy reused the verification-workflow shape a *fifth* time across two sibling entities (`Course`/`LearningPath`), proved `notify()` with a *third* independent consumer, and is the first domain to combine four sub-domains under one module with a genuinely new capability (lesson-progress-driven auto-completion and certification issuance, ADR-014 Decision 7) built on top of the reused infrastructure rather than being purely another consumer of it; WO-029's AI Intelligence Engine is the platform's first domain built primarily to *read across* nearly every other domain rather than to be read from — it depends on nine other modules and none depend on it (ADR-015 Decision 10, the mirror image of ADR-014 Decision 6's cycle-avoidance work), extended `EmailModule`'s provider-abstraction-with-safe-fallback pattern (ADR-009 Decision 4) into a genuinely swappable, DI-selected multi-provider design (ADR-015 Decision 1), and proved `notify()` with a *fourth* independent consumer via the second forward-provisioned `NotificationCategory` value (`AI_GUIDANCE`) to be consumed.
- **Invariant compliance:**
  - Soft deletion (`deletedAt`), never hard delete — consistently applied across every domain.
  - Response DTOs with `fromEntity()` static factories — consistently applied.
  - Offset pagination (`page`/`limit`, max 100) — consistently applied.
  - Ownership derived from the JWT, never trusted from the request body — followed by Resources, Administration, and, as of WO-022, Goals/Journeys/Milestones/Tasks/Profile/UserInterests/SavedOpportunities; **not** followed by the original Opportunity Engine, which still trusts body-supplied `submittedById`/`reviewedById` (flagged as technical debt in ADR-004/ADR-005, not yet remediated).
  - Guard reuse (`JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`) via the dependency-free `AuthGuardsModule` — consistently applied across every domain module as of WO-022.
  - Transitive ownership resolution (Journey→Goal, Milestone→Journey→Goal, Task→Milestone→Journey→Goal) via a `findOwnerId()` repository method resolved in a single Prisma nested-`select` query (ADR-008) — consistently applied across the three domains that needed it, and reused read-only by Stewardship's member-overview/metrics aggregation (WO-025).
  - Real vs. loose foreign keys: `OrganizationMember.userId`/`.organizationId` (WO-024), `StewardshipRelationship.memberId`/`.stewardId`, `StewardCapacity.stewardId` (WO-025), `Notification.recipientId`, `NotificationDelivery.notificationId`, `NotificationPreference.userId`, `ConversationParticipant.userId`, `Message.senderId` (WO-026), `KnowledgeArticleRevision.articleId` (WO-027), `Enrollment.userId`/`.courseId`, `LessonProgress.enrollmentId`/`.lessonId`, `Certification.userId`/`.courseId`, `Module.courseId`, `Lesson.moduleId`, `CourseRevision.courseId`, `LearningPathCourse.learningPathId`/`.courseId`, `CourseMedia.courseId`/`.lessonId`/`.mediaAssetId` (WO-028), and `AiConversation.userId`, `AiMessage.conversationId`, `AiRequest.userId`/`.conversationId`, `AiRecommendation.userId`/`.opportunityId`/`.resourceId`/`.courseId`/`.aiRequestId` (WO-029) carry real FKs, matching the majority precedent (`Profile`, `Goal`, auth token tables) rather than `Resource.ownerId`/`Opportunity.submittedById`'s documented loose-pointer exception; audit/actor-pointer fields (`requestedById`, `assignedById`, `recommendedById`, `endedById`, `Announcement.authorId`, `Notification.actorId`, `KnowledgeArticle.authorId`/`.lastUpdatedById`, `Course.authorId`/`.lastUpdatedById`, `LearningPath.authorId`/`.lastUpdatedById`, `MediaAsset.uploadedById`, etc.) stay loose, following the same distinction (ADR-010 Decision 3, reaffirmed by ADR-011 through ADR-015).
  - Configurable limits sourced from a single Prisma column default rather than an application-code constant — pattern introduced by `StewardCapacity.maxActiveMembers @default(25)` (ADR-011 Decision 4), directly satisfying a "do not hardcode" founder instruction.
  - Infrastructure built for one domain reused by a second without duplication — `EmailModule` (WO-023/ADR-009), extended rather than reimplemented for WO-026's notification delivery (ADR-012 Decision 2); `NotificationsService.notify()` (WO-026/ADR-012) itself reused a second time by Knowledge (WO-027), a third time by Academy (WO-028), and a *fourth* time by the AI Intelligence Engine (WO-029, ADR-015 Decision 9) — the reuse pattern now has four proof points.
  - Bounded enum + free-text-key extensibility — `Notification.category` (fixed enum, drives preferences) paired with `Notification.type` (free-text, dot-namespaced) lets every current and future domain mint new notification kinds with zero schema migration (ADR-012 Decision 3); WO-027 exercised this mechanism by adding the `KNOWLEDGE` category value; WO-028 consumed the forward-provisioned `ACADEMY` value; WO-029 consumed the *second* forward-provisioned value, `AI_GUIDANCE` — both minted speculatively in WO-026, both now real, independently-proven consumers with zero further schema migration (ADR-012 Decision 3, ADR-014 Decision 8, ADR-015 Decision 9).
  - Verification-workflow reuse now spans five domains — Resources (WO-020), Opportunities, Organizations (WO-024), Knowledge System (WO-027), and Academy's `Course`/`LearningPath` (WO-028, two sibling entities in one domain) — all sharing the same `VerificationStatus` enum and `submit-for-review`/`verify`/`reject`/`archive` action-endpoint shape (ADR-013 Decision 1, ADR-014 Decision 1). The AI Intelligence Engine (WO-029) has no verification workflow of its own — it has no publishable content, only requests and suggestions — so this count remains five, not six; not every domain is expected to need this pattern.
  - Circular-module-dependency avoidance via deliberate scope-narrowing, not code restructuring — WO-028 identified that extending `StewardshipRecommendationType` with a `COURSE` value would create a `Stewardship → Academy → Communication → Stewardship` cycle, and dropped that specific integration from scope rather than restructuring three already-shipped modules' boundaries (ADR-014 Decision 6), the same "don't touch already-shipped domains for a new WO's convenience" discipline ADR-012 Decision 4 established. WO-029 encountered no such cycle by construction — the AI Intelligence Engine is a pure consumer of nine other modules and nothing imports it back (ADR-015 Decision 10) — demonstrating both that the platform's module graph stays acyclic under real pressure and that not every cross-domain integration requires active avoidance work.
  - Real-FK-per-fixed-target-type reuse — `AiRecommendation`'s `opportunityId`/`resourceId`/`courseId` (WO-029) reuses `StewardshipRecommendation`'s exact shape (WO-025/ADR-011) for a second, independently-built domain, reaffirming that a closed, small target-type set should be modeled as real mutually-exclusive nullable FKs, not a polymorphic loose pointer (ADR-015 Decision 5).
- **Remaining architectural concerns:**
  - `Organization` now exists (WO-024/ADR-010), but `Resource`/`Opportunity` are not yet linked to it — `organizationName`/`provider` remain free text (deliberately deferred, ADR-010 Decision 6; ADR-006 §3 addendum records this explicitly). `Course.organizationId` (WO-028) is the first domain to actually link into `Organization` since it was built.
  - No platform-wide audit table — every domain relies on structured logging (documented, intentional, per ADR-004 §7).
  - `AdministrationModule` currently has a single responsibility (role management); as more administrative capabilities are added, watch for it becoming a dumping ground rather than staying cohesive.
  - `hasRole()` (WO-022) is used by every new authorization check but was deliberately not retrofitted onto the pre-existing inline role checks in `UsersController`/`ResourcesController`/`AdministrationModule` (ADR-008 §4) — a minor, tracked inconsistency, not a functional gap.
  - Organization-scoped steward assignment (ADR-011 Decision 8) and organization-scoped messaging (ADR-012 Decision 9) are both checked at the `OrganizationMember` (representative) level, not a member-enrollment level — no member-to-organization client relationship exists in the schema yet; both explicitly deferred to the same future Future Extension Point rather than two separate gaps.
  - Communication System's `notify()` integration method is proven via four real call sites (Announcements fan-out, WO-026; Knowledge author notifications, WO-027; Academy verify/reject/completion/certification, WO-028; AI recommendation generation, WO-029), but is not yet actually called from Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine's real lifecycle events — those already-shipped domains do not yet send real notifications when their own events occur (ADR-012 Decision 4, explicitly deferred as small independent follow-ups; still true as of WO-029, which only wired its own newly-built domain).
  - Academy's Stewardship integration is role-based gating only (`STEWARD` in `ACADEMY_STAFF_ROLES`) — `StewardshipRecommendationType.COURSE` was deliberately not built, to avoid a circular module dependency (ADR-014 Decision 6, tracked as a Future Extension Point, not a silent gap).
  - `LearningPath` has no aggregate completion/progress tracking of its own, only the per-course `Enrollment` completions that compose it (ADR-014 Decision 5) — a deliberate scope-narrowing to avoid building two parallel completion-aggregation systems in one Work Order.
  - `OpenAiProvider`/`AnthropicProvider` (WO-029) have not been exercised against a live external AI vendor in this implementation environment — `AI_PROVIDER` defaults to `stub`, mirroring the WO-023 real-SMTP-untested-here precedent exactly (ADR-015 Known Limitations).
  - AI-driven recommendation rationale generation can silently degrade to a generic, non-personalized string when the provider's response is not valid JSON — a deliberate resilience trade-off (ADR-015 Decision 7), not a defect, but worth remembering when interpreting recommendation quality metrics later.

---

## Security Review

- **Authentication:** ✅ Solid. JWT access tokens (15m default) + rotating, revocable, SHA-256-hashed opaque refresh tokens. Passwords hashed with bcryptjs (12 rounds). Login rejects unknown emails, wrong passwords, and non-`ACTIVE` accounts uniformly (no user-enumeration signal). `JWT_ACCESS_SECRET` is required and validated at startup (min 32 chars). Password reset and email verification now deliver real email (WO-023) rather than only logging tokens; plaintext tokens no longer appear in application logs (ADR-009 Decision 5), a direct security improvement over the ADR-005 §7 interim state.
- **Authorization:** ✅ **Resolved as of WO-022.** Every domain — `Users`, `Auth`, `Opportunities`, `Resources`, `Administration`, `Organizations`, and, as of WO-022, `Goals`, `Journeys`, `Milestones`, `Tasks`, `UserInterests`, `Profile`, and `SavedOpportunities` — now correctly enforces `JwtAuthGuard`/`RolesGuard`/ownership checks. The transitive Goal→Journey→Milestone→Task ownership chain is resolved server-side via `findOwnerId()` (ADR-008), never trusted from the request body. As of WO-025, Stewardship System applies the same server-derived-authority invariant one layer further: steward authority over a member is always resolved from the loaded `StewardshipRelationship` row (`relationship.stewardId === caller.id`), never trusted from the request body, and three distinct least-privilege visibility shapes (notes' `PRIVATE`/`SHARED` split, member-read-only follow-up tasks, steward/admin-only escalations) are each independently enforced per ADR-011 Decision 5. As of WO-026, Communication System extends the same invariant to messaging (participant authorization resolved from an explicit `ConversationParticipant` whitelist populated only from verified relationships/organization co-membership, never re-derived from possibly-stale state at send time) and to announcements (scope-specific authority re-checked against live database state on every create/publish call, never a cached "is author" flag). There is no HTTP path by which an arbitrary caller can create a notification for another user — the only creation path is the in-process `NotificationsService.notify()` method (ADR-012 Decision 4). As of WO-027, Knowledge System reuses the same author/moderator dual-authorization shape established by Resources (WO-020) and applied consistently since; author notifications on verify/reject always target the article's real `authorId`, never body-supplied. As of WO-028, Academy applies the same author/moderator shape across `Course`/`Module`/`Lesson`/`LearningPath`/`MediaAsset`, with nested Module/Lesson authorization always re-derived from the parent Course's ownership (never trusted independently), a deliberately narrower content-authority role set (`ACADEMY_STAFF_ROLES` — Steward/Admin only, per the founder's WO-026 canonical decision), and enrollment/certification access resolved from the loaded `Enrollment`/`Certification` row's real `userId`, never body-supplied. As of WO-029, the AI Intelligence Engine applies the same owner-only shape to conversations, request history, and recommendations, additionally reusing `JourneysService`'s existing ownership check unmodified for Journey Guidance (no new authorization logic duplicated for a capability that reads another domain's owned entity) — and, per the founder's explicit constraint on this domain, no endpoint can trigger a mutating call into another domain on the caller's behalf: recommendation approval/dismissal are pure status changes, verified by the absence of any cross-domain mutating call in that code path. The one remaining known gap is the original Opportunity Engine still trusting body-supplied `submittedById`/`reviewedById` (tracked technical debt, ADR-004/ADR-005, not a missing-guard issue).
- **Input validation:** ✅ Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) applied platform-wide; every DTO uses `class-validator` decorators; no endpoint accepts unvalidated input.
- **Rate limiting:** ⚠️ A single global `ThrottlerModule` policy (100 req/min per IP) applies to every route. `/auth/login` and `/auth/register` have no stricter, brute-force-appropriate limit of their own — acceptable for an internal/limited-cohort stage, but should be tightened before public registration. As of WO-029, AI-provider-calling endpoints carry a tightened per-route override (10–20 req/min) reflecting their real external cost, the first domain to layer a stricter limit on top of the global policy (ADR-015 Decision 8).
- **Secrets/configuration:** ✅ `.env` is gitignored and never committed; `JWT_ACCESS_SECRET` and `DATABASE_URL` are validated at startup via Joi and the process fails fast if absent (WO-018 precedent). ⚠️ `CORS_ORIGIN` defaults to `*` — fine for development, must be set explicitly per environment before production. No secret-rotation mechanism exists yet (single static JWT secret).
- **Remaining risks:**
  1. No MFA. Now the highest-severity open item following WO-022's resolution of the unguarded-endpoints risk and WO-023's resolution of the Next.js dependency vulnerability and missing email delivery.
  2. No platform-wide audit trail (structured logs only).
  3. Single manual database step required to provision the first `SYSTEM_ADMINISTRATOR` per environment.
  4. Opportunity Engine still trusts body-supplied `submittedById`/`reviewedById` rather than deriving them from the JWT (tracked technical debt, not a missing-guard issue — the endpoints are still role-guarded).
  5. Outbound email is sent synchronously in the request path with no retry mechanism (ADR-009 Risks) — acceptable at V1 traffic, not yet a background job; WO-026's notification emails inherit this same characteristic, mitigated by the delivery-status/idempotent-retry model (ADR-012 Decision 6) even though no background job actually calls it yet.
  6. The real-SMTP transport code path (as opposed to the local-capture fallback) has not been exercised against a live mail provider in any environment so far, only unit-tested and code-reviewed (WO-023 Known Limitations) — an operator should perform one live send as part of production deployment verification.
  7. Communication System's `notify()` integration point is proven via four real call sites (Announcements fan-out, WO-026; Knowledge author notifications, WO-027; Academy verify/reject/completion/certification, WO-028; AI recommendation generation, WO-029) — Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine do not yet send real notifications on their own domain events, a functional-completeness gap, not a security gap (ADR-012 Decision 4).
  8. Academy's `MediaAsset.storageRef` is an unvalidated, opaque string — no cloud storage provider is implemented yet, so nothing currently dereferences it, but it should be validated/sanitized once a real upload flow exists (ADR-014 Decision 9, explicitly out of scope for WO-028).
  9. `OpenAiProvider`/`AnthropicProvider` (WO-029) have not been exercised against a live external AI vendor in this environment (no outbound network access to a real AI provider here) — only unit/e2e-tested against the deterministic `stub` fallback, per ADR-015 Known Limitations; an operator should perform one live call per configured provider as part of production deployment verification, mirroring the WO-023 real-SMTP recommendation.
  10. AI provider API keys, once configured, are read only from environment configuration and never logged or echoed in any response — but no secret-rotation or key-scoping mechanism exists yet beyond what the provider's own dashboard offers (same class of gap as the platform's single static `JWT_ACCESS_SECRET`).

---

## Testing

- **Unit coverage:** Every service in every domain has a dedicated `*.spec.ts` with a mocked repository, covering success paths, not-found, conflict, and authorization branches. `UserRolesService` (WO-021), `ResourcesService` (WO-020), `GoalsService`/`JourneysService`/`MilestonesService`/`TasksService` (WO-022), `NodemailerEmailService` (WO-023), `OrganizationsService`/`OrganizationMembersService` (WO-024, including the last-remaining-`ADMIN` invariant), all seven Stewardship sub-domain services (WO-025 — 73 tests), all four Communication sub-domain services (WO-026 — 56 tests), `KnowledgeService` (WO-027 — 18 tests, including the substantive-vs-non-substantive-edit revision-creation branch and both notification call sites), all nine Academy sub-domain services (WO-028 — 69 tests, including the full lesson-progress-driven auto-completion and certification-issuance branch tree), and, as of WO-029, all five AI Intelligence Engine services (`AiRequestsService`/`ConversationsService`/`InsightsService`/`RecommendationsService`/`StubAiProvider` — 28 tests, including the JSON-parse-success and non-JSON-fallback branches for recommendation generation and both the SUCCESS and FAILED `AiRequest`-logging branches) have full branch coverage of their respective logic.
- **Integration coverage:** Introduced in WO-020 (`resources.integration.spec.ts`) — real PostgreSQL, no mocks, verifying Prisma query correctness (array containment, case-insensitive search, unique constraints). Extended in WO-026 (`communication.integration.spec.ts`, 6 tests), WO-027 (`knowledge.integration.spec.ts`, 4 tests), WO-028 (`academy.integration.spec.ts`, 7 tests), and WO-029 (`ai.integration.spec.ts`, 4 tests — the real FK from `AiConversation`/`AiRequest` to `User` including rejection for a nonexistent user, ordered message retrieval, and `AiRecommendation`'s real nullable per-target-type FK with its dedup query). Not yet extended to any other domain's repository beyond these five plus the `findOwnerId()` unit tests added in WO-022.
- **End-to-end coverage:** Introduced in WO-020, extended in WO-021 through WO-029 — full HTTP requests via Supertest against a booted application (real guards, pipes, filters, database), now covering Resources, Administration, Goals/Journeys/Milestones/Tasks, Profile, UserInterests, SavedOpportunities, Auth (WO-023), Organizations + membership management (WO-024), the full Stewardship relationship lifecycle (WO-025, 26 tests), announcement/notification/messaging lifecycles with cross-user and cross-organization isolation (WO-026, 31 tests), the Knowledge verification workflow, revision-history creation, and cross-module author-notification delivery (WO-027, 18 tests), the full Academy course/module/lesson authoring and verification lifecycle, the enrollment/lesson-progress/auto-completion/certification-issuance lifecycle, the learning-path course-sequencing lifecycle, and the Steward Content Studio media lifecycle (WO-028, 23 tests), and, as of WO-029, the full AI conversation Q&A lifecycle, all five Insights capabilities, and the full Recommendation generate/approve/dismiss lifecycle including cross-module notification delivery (15 tests). Real registered users are used for personas that become real-FK-backed rows (`OrganizationMember.userId`, `StewardshipRelationship.memberId`/`.stewardId`, `Notification.recipientId`, `ConversationParticipant.userId`, `Enrollment.userId`/`Certification.userId`, `AiConversation.userId`/`AiRequest.userId`/`AiRecommendation.userId`), mirroring the WO-022 `Goal.userId` finding; personas whose role is checked against the *persisted* database row (not just the JWT claim) are granted that role for real via the WO-021 role-grant endpoint before use, a pattern first discovered in WO-025 and reused unchanged since. **Not present** for Users or Opportunities.
- **Aggregate coverage (`apps/api`, current):** 785/785 tests passing across 72 suites (up from 738/738 across 65 suites at WO-028).
- **Missing tests:**
  - End-to-end tests for Users and Opportunities.
  - Integration-tier (`*.integration.spec.ts`) tests for domains beyond Resources, Communication, Knowledge, Academy, and the AI Intelligence Engine.
  - A live call against a real external AI provider (WO-029's `OpenAiProvider`/`AnthropicProvider` are unit/e2e-tested only against the `stub` fallback — no outbound network access to a real AI vendor in this implementation environment).
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
  - `NotificationsService.notify()` has four real call sites (Announcements fan-out, WO-026; Knowledge author notifications, WO-027; Academy verify/reject/completion/certification, WO-028; AI recommendation generation, WO-029); wiring it into Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine's own lifecycle events is tracked as five small, independent follow-ups (ADR-012 Decision 4).
  - `KnowledgeArticleRevision` snapshots only title/summary/content/category — tag/sourceUrl-only edits leave no historical record (ADR-013 Decision 2, deliberate scope decision, not an oversight).
  - `CourseRevision` snapshots only title/shortDescription/fullDescription, the same proportional scoping (ADR-014 Decision 4). `LearningPath` has no revision model at all — its "content" is a fully-reconstructable-from-current-state course ordering, not written content (ADR-014 Decision 4).
  - `StewardshipRecommendationType.COURSE` was not built, to avoid a `Stewardship → Academy → Communication → Stewardship` circular module dependency — Academy's Stewardship integration is role-based gating only (ADR-014 Decision 6).
  - `LearningPath` has no aggregate completion/progress of its own, only the per-course `Enrollment` completions that compose it (ADR-014 Decision 5).
  - `Certification` was initially schema-designed without the `sequenceNumber` column every other ref-bearing model has — caught and corrected via a second migration during WO-028 implementation before the domain shipped, not after (see `docs/verification/WO-028-OPERATIONAL-VERIFICATION.md` Step 2).
  - `OpenAiProvider`/`AnthropicProvider` (WO-029) are implemented but unexercised against a live vendor in this environment — `AI_PROVIDER` defaults to `stub` (ADR-015 Decision 1, Known Limitations), the same class of gap as WO-023's untested-real-SMTP transport.
  - AI recommendation rationale falls back to a generic string when the provider's JSON response doesn't parse — a deliberate resilience decision, not a defect (ADR-015 Decision 7).
  - AI rate limiting is in-memory/per-process only (`ThrottlerModule` override) — no persisted per-user/per-organization spend cap exists yet (ADR-015 Decision 8, Future Extension Point).

---

## Documentation Status

- **Completed:** Constitution (OAS series), Implementation Constitution (IC-001–020), Product Architecture (PA-001–020), 15 ADRs, 12 formal Work Order documents (WO-018–029) with matching Operational Verification reports, this Readiness Report.
- **Missing:** Formal WO documents for Batch A–E and Phase 1/Phase 2 (see Technical Debt); a CONTRIBUTING/onboarding guide for new engineers beyond the ADRs themselves.

---

## Version 1 Release Blockers

Only items that should reasonably be resolved before inviting the first external members:

1. **No member-facing frontend.** `apps/web` has zero business logic. There is nothing for an invited member to use. This remains the only unconditional Release Blocker — and, per the Founder Directive above, is now deliberately sequenced *after* every canonical backend domain rather than started next.

**Resolved as of WO-022:** Unguarded domain endpoints (Goals, Journeys, Milestones, Tasks, UserInterests, Profile, SavedOpportunities) — every domain now enforces authentication and ownership.

**Resolved as of WO-023:** No email delivery — account verification and password reset now send real email. Critical Next.js vulnerability in `apps/web` — patched to `15.5.20`.

**Resolved as of WO-024:** Business Portal had zero implementation — verified organization profiles and representative membership now exist (ADR-010).

**Resolved as of WO-025:** Stewardship System existed only as a bare inline role check — a full relationship lifecycle, capacity management, notes, follow-up tasks, recommendations, escalations, and a steward-metrics foundation now exist (ADR-011).

**Resolved as of WO-026:** Communication System had only a narrow transactional-email mechanism (WO-023) — in-app notifications, communication preferences, announcements, and stewardship/organization messaging, all with honest delivery tracking, now exist and are proven reusable by every current and future domain (ADR-012).

**Resolved as of WO-027:** Knowledge System had zero implementation — a verified, categorized, searchable article repository with revision/version history now exists, reusing the platform's verification-workflow pattern for a fourth time and proving Communication System's reusability with a second independent consumer (ADR-013).

**Resolved as of WO-028:** Academy had zero implementation — Courses, Learning Paths, Modules, Lessons, Enrollments, lesson-progress tracking with auto-completion, a steward-certification foundation, versioned curriculum, and a Steward Content Studio for media now exist, reusing the platform's verification-workflow pattern for a fifth time (across two sibling entities in one domain) and proving Communication System's reusability with a third independent consumer (ADR-014).

**Resolved as of WO-029:** AI Intelligence Engine — PA-020's "AI-assisted guidance" objective, previously flagged as a likely Release Blocker pending founder scope confirmation, is no longer an open question: the founder resolved its scope and it is now implemented (Question Answering, Opportunity/Resource/Journey/Academy explanation and guidance, Knowledge Search, and a human-approved Recommendation engine that never acts on a member's behalf automatically, ADR-015).

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
- Knowledge article revision rollback (restoring a prior version as the live row) — revisions are read-only history in V1 (ADR-013)
- Search relevance scoring for Knowledge articles, unlike Resources' confidence/freshness scores — not requested by PA-013 (ADR-013 Risks)
- Scheduled digests, quiet-hours enforcement, and automated `SCHEDULED → PUBLISHED` announcement transitions (ADR-012 — all stored as a foundation, none actively scheduled in V1)
- Group conversations and Pod-integrated messaging, once Pods exists (ADR-012 Decision 8)
- Real cloud storage provider integration for Academy media (upload endpoints, signed URLs, CDN) — `MediaAsset.storageRef` is an opaque reference only in V1 (ADR-014 Decision 9)
- Learning-path-level aggregate completion/progress tracking — Enrollment is Course-scoped only in V1 (ADR-014 Decision 5)
- `StewardshipRecommendationType.COURSE` (stewards recommending specific courses) — deferred to avoid a circular module dependency (ADR-014 Decision 6)
- Certification renewal, expiration, and external verification/sharing — a minimal functional foundation only in V1 (ADR-014 Decision 7)
- Pods consuming Learning Paths as shared group curricula, once Pods exists (ADR-014 Future Extension Points)
- Document Intelligence integration for the AI Intelligence Engine — conditional on a domain that does not yet exist (ADR-015 Future Extension Points)
- A persisted per-user/per-organization AI spend cap, beyond the current in-memory `ThrottlerModule` override (ADR-015 Decision 8)
- Steward-facing AI capabilities (e.g., AI-assisted drafting of Stewardship notes/escalation summaries) — PA-006's V1 scope is member-facing guidance only (ADR-015 Future Extension Points)
- A real per-provider live-call verification step in a deployment runbook, once real OpenAI/Anthropic credentials exist in a target environment (ADR-015 Known Limitations, mirrors the WO-023 SMTP recommendation)

---

## Current Readiness Score

| Category | Score (0–100) | Notes |
|---|---|---|
| Architecture | 94 | Consistent, well-documented layering across every implemented domain, now including proven transitive-ownership-resolution (ADR-008), infrastructure-DI (ADR-009), real-FK-join-table (ADR-010), multi-domain-composition (ADR-011), infrastructure-reuse-by-a-second-consumer (ADR-012), a verification-workflow pattern proven across five independent domains plus a *third* proof of notification-infrastructure reusability (ADR-013/ADR-014), and, as of WO-029, the platform's first domain built primarily to read across nearly every other domain rather than be read from (nine module imports, zero back-imports, ADR-015 Decision 10) plus a genuinely swappable multi-provider DI pattern extending ADR-009's safe-fallback design; deductions for a still-narrow Administration module and the deliberately-deferred `Organization` linkage into Resources/Opportunities (partially resolved — `Course.organizationId`). |
| Security | 90 | Full authorization enforcement across every implemented domain (WO-022), a patched frontend dependency tree, real email delivery with plaintext tokens removed from logs (WO-023), organization-membership authorization mirroring the same server-derived-ownership invariant (WO-024), steward authority resolved server-side with independently-enforced least-privilege visibility shapes (WO-025), messaging/announcement authority resolved the same way with zero public notification-creation surface (WO-026), Knowledge System's author/moderator authorization following the same established shape (WO-027), Academy's author/moderator/owner authorization extended across five entity types (WO-028), and, as of WO-029, the AI Intelligence Engine's strict owner-only access to conversations/requests/recommendations plus a structurally-verified guarantee that no AI endpoint can mutate another domain's data on the caller's behalf; remaining deductions for no MFA and no platform-wide audit trail. |
| Testing | 91 | 785 passing tests across three tiers; end-to-end coverage now extends to 14 of 16 implemented domains; integration-tier coverage now spans five domains (Resources, Communication, Knowledge, Academy, AI Intelligence Engine); Users/Opportunities remain unit-tested only. |
| Documentation | 88 | Exceptionally thorough governance and per-Work-Order documentation; a few early batches lack formal WO records. |
| Operations | 46 | CI is solid, but there is no deployment pipeline, no monitoring/observability, and no disaster-recovery implementation — only policy documents (IC series) describing what should exist. |
| Performance | 50 | Unverified rather than confirmed poor — no load testing has been performed anywhere in the platform. |
| Developer Experience | 86 | Clear, repeatable patterns a new contributor can follow domain-to-domain, including the ownership-chain, infrastructure-DI, verification-workflow-reuse, multi-domain-composition, and infrastructure-reuse-across-domains patterns, now demonstrated four-plus times each, plus worked examples of both deliberately avoiding a circular dependency (Academy) and building a domain that structurally cannot produce one (AI Intelligence Engine); missing a dedicated onboarding guide. |
| User Readiness | 27 | No frontend — a real member cannot yet use this platform end-to-end. The AI Intelligence Engine, Academy, and every other backend domain now exist, but with no frontend none of it changes what a member would directly experience yet; the frontend remains the dominant, and now nearly only remaining, blocker. |

**Overall Version 1 readiness: ~59%.**

This number is higher than the pre-WO-029 assessment because an eleventh PA-020-named Version 1 system (AI Intelligence Engine) is now implemented, tested, and live-verified, following the founder's backend-before-frontend sequencing decision — and because it both re-validates the notification-infrastructure-reuse pattern a fourth time and introduces the platform's first domain whose entire purpose is safely orchestrating every other domain rather than being a domain itself. It remains well below the Architecture/Testing/Documentation scores because it weighs what an actual invited member would experience today: a mature, well-tested, fully authorization-enforced backend now spanning eleven of twelve named Version 1 systems, still reachable through no usable interface — and, per the Founder Directive, deliberately not gaining one until the remaining backend domain is also complete. **Backend engineering velocity has been high through eleven consecutive domains, and as of this update only one domain (Pods) remains, blocked on a single founder product-scoping decision — see Recommended Next Work Order.**

---

## Recommended Next Work Order

**Per the Founder Directive (above), this section names only backend Work Orders until every canonical Version 1 backend business domain is implemented and verified.**

**No backend Work Order can be recommended without founder input.** With AI Intelligence Engine (WO-029) closing the gap it was chosen to close, the one remaining PA-020 domain — Pods — is blocked on a founder decision, not an engineering one (see Remaining Backend Domains above).

To resume backend Work Order execution, the founder needs to resolve:

1. **Pods (PA-009) product-scoping decisions.** Community/pod formation and matching logic. Both named dependencies (Stewardship for moderation, Communication for pod messaging) are built, so this is immediately engineering-ready once scoped — the last PA-020 domain requiring a founder decision before the canonical backend is fully complete.

Once resolved, Pods becomes the next recommended Work Order — expect the same shape of work as every prior domain WO: a new bounded module, reusing the established layering, verification-workflow (if applicable), and Communication System integration patterns, with no schema changes to any existing domain required beyond additive back-relations. **In the meantime, and per the Founder Directive, this remains a hold on backend progress — it is not a reason to begin frontend work,** since none of the twelve PA-020 domains is itself gated on the frontend, and the founder's instruction was that all twelve complete before frontend work starts. **This is the narrowest this gap has been in the entire Work Order series: eleven of twelve canonical backend domains are complete, and a single founder decision on Pods' formation/matching logic would close it entirely.**
