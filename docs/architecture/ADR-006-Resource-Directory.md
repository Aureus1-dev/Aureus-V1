# ADR-006 — Resource Directory

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-14 |
| Work Order | WO-020 |
| Authority | PA-014, PA-011, PA-012, PA-018, ADR-004, ADR-005 |

---

## Context

PA-014 defines the Resource Directory as Aureus' trusted catalog of external organizations, programs, services, professionals, tools, and community resources. It is architecturally adjacent to the Opportunity Engine (ADR-004) — both are verified external-entity catalogs — but serves a distinct purpose: connecting members to *ongoing* resources (a legal aid clinic, a food bank, a technology tool) rather than *time-bound* opportunities (a grant, a job posting).

WO-020 implements the Resource Directory as a complete, production-ready domain, reusing the architectural patterns established by the User Module (ADR-003), Opportunity Engine (ADR-004), and Authentication/IAM (ADR-005) rather than introducing new ones.

---

## Decisions

### 1. Reuse `VerificationStatus` and `SourceType` rather than duplicating them

**Decision:** `Resource.verificationStatus` uses the existing `VerificationStatus` enum (`DRAFT → PENDING_REVIEW → VERIFIED / REJECTED → ARCHIVED`) unchanged. `Resource.sourceType` uses the existing `SourceType` enum, extended with one new value: `EXTERNAL_SOURCE` (PA-014 lists "Approved external sources" as an input the Opportunity Engine's enum didn't anticipate).

**Rationale:** Both domains are verified external-entity catalogs with the same review lifecycle. Duplicating the enum would fragment the workflow model for no benefit and violate the explicit instruction to reuse existing patterns rather than redesign. Adding `EXTERNAL_SOURCE` is additive and backward compatible — it does not change the meaning of any existing value, and benefits the Opportunity Engine equally should it need the same input type in the future.

---

### 2. `Resource.status` gets its own enum, not `OpportunityStatus`

**Decision:** A new `ResourceStatus` enum (`DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`) rather than reusing `OpportunityStatus` (`DRAFT`, `ACTIVE`, `EXPIRED`, `ARCHIVED`).

**Rationale:** Opportunities are inherently time-bound (`EXPIRED` is a meaningful terminal state tied to a deadline). Resources — an organization, a hotline, a software tool — do not expire on a calendar; they become temporarily unavailable (`INACTIVE`) or are permanently retired (`ARCHIVED`). Forcing `EXPIRED` onto a Resource would be semantically incorrect and confuse operators reviewing the directory.

---

### 3. Organization ownership via `ownerId`, derived from the JWT — not a request body field

**Decision:** `Resource.ownerId` identifies the user account (an `ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`/`STEWARD`/`PLATFORM_ADMINISTRATOR`) that manages the listing. It is set from `request.user.id` (the authenticated caller) at creation time and is never accepted as client input. `Steward`/`PLATFORM_ADMINISTRATOR` may manage any resource regardless of `ownerId` (moderation authority per PA-018).

**Rationale:** This is a direct improvement over the Opportunity Engine's precedent, where `submittedById`/`createdById`/`reviewedById` are trusted request-body fields (flagged as technical debt in ADR-004 and again in ADR-005, recommended as WO-021 there: *"derive reviewer identity from JWT instead of request body"*). Since Resource Directory is a new domain built after JWT authentication existed, there is no reason to repeat a known-bad pattern — deriving identity from the verified JWT closes a spoofing vector (a caller can no longer claim to be a different user) without any loss of functionality.

**Note on PA-011 (Business Portal):** No `Organization` entity exists yet — Organization Profiles are explicitly a Business Portal (PA-011) component, a separate, not-yet-implemented domain. `Resource.organizationName` (free text) plus `Resource.ownerId` (the managing user account) is therefore the correct V1 modeling: it mirrors the Opportunity Engine's `provider: String` decision (ADR-004 §5, applied to `tags`) and defers a normalized `Organization` model until the Business Portal WO defines it. When PA-011 is implemented, `Resource.ownerId`'s role-based semantics extend naturally to `Resource.organizationId` with a migration; no architecture is broken by this sequencing.

---

### 4. `RolesGuard` for moderation, service-layer ownership check for management

**Decision:** `verify`/`reject` are gated purely by role (`@Roles(STEWARD, PLATFORM_ADMINISTRATOR)`) at the controller — only Stewards/Admins may ever call them, ownership is irrelevant. `update`/`remove`/`submitForReview`/`archive` require authentication only at the controller (`@UseGuards(JwtAuthGuard)`); the service then enforces "owner OR Steward/Admin" via a private `getOwnedOrThrow` helper.

**Rationale:** Role-only checks are a property of the *action* (verification is exclusively a moderation act); ownership checks are a property of the *resource instance* (management is owner-or-moderator). The former is expressible declaratively with the existing `RolesGuard`; the latter requires the resource to be loaded first, so it belongs in the service, mirroring the `UsersController.assertSelfOrPrivileged` pattern from ADR-005 §6, generalized from "self" to "resource ownership."

---

### 5. Scoring service mirrors `OpportunityScoringService`, not a shared abstraction

**Decision:** `ResourceScoringService` duplicates the *shape* of `OpportunityScoringService` (40/35/25-point formula, 7-day/365-day freshness decay) but is a separate class over separate fields, not a shared generic base class.

**Rationale:** The two domains' scoring inputs are structurally different (benefit/deadline fields vs. contact/location fields) and evolve independently — the Opportunity Engine's future extension point is "replace formula-based scoring with ML-powered scoring" (ADR-004), which should not be entangled with Resource Directory's scoring evolution. A shared abstraction over two structurally different, independently-evolving models would be premature generalization; IC-002/engineering principles favor composition over inheritance and avoiding unnecessary complexity. The formula *shape* is reused (proven, auditable, no AI infrastructure required); the *code* is not force-shared.

---

### 6. `SavedResource` is simpler than `SavedOpportunity` — no `TrackingStatus`

**Decision:** `SavedResource` has `isFavorite`/`notes`/`savedAt`, but no `trackingStatus` field (unlike `SavedOpportunity`, which has `SAVED/APPLYING/APPLIED/RECEIVED/NOT_INTERESTED`).

**Rationale:** `TrackingStatus`'s values model an *application* lifecycle. A member does not "apply" to a legal aid clinic or a software tool the way they apply to a grant — they bookmark it for reference. Reusing `TrackingStatus` here would force an ill-fitting concept onto the data model. `isFavorite` + `notes` covers the actual interaction pattern PA-014 describes ("Resource recommendations," bookmarking for later).

---

### 7. `SavedResourcesController` is guarded from the start (unlike the pre-existing `SavedOpportunitiesController`)

**Decision:** `SavedResourcesController` requires `JwtAuthGuard` and an explicit `caller.id === userId` ownership check on every route.

**Rationale:** `SavedOpportunitiesController` currently has no guards at all (any caller can read/write any user's saved-opportunities list) — a gap identified during this WO but out of scope to fix on that pre-existing controller (per IC-004 Article III, scope discipline; noted as a "Recommended Next Work Order" below rather than fixed silently). Since `SavedResourcesController` is new code, it is built correctly from the outset rather than repeating the gap.

---

### 8. Integration and E2E test tiers added, scoped to this domain

**Decision:** In addition to unit tests (mocked repository, matching every existing domain), this WO adds two new test tiers not previously present anywhere in the repository: a Prisma integration test (`resources.integration.spec.ts`, real PostgreSQL, no HTTP) and a full HTTP end-to-end test (`resources.e2e.spec.ts`, Supertest against a booted `AppModule`, real guards/pipes/filters/DB). The CI workflow (`.github/workflows/ci.yml`) now provisions a `postgres:16` service container and runs `prisma migrate deploy` before the test step so these tiers execute automatically rather than only during manual verification.

**Rationale:** IC-007 (Testing Standard) Article VI states automated testing is the preferred default and manual testing must be documented justification, not a replacement. The repository's prior domains relied on unit tests plus a manually-executed, hand-documented "Operational Verification Report" (WO-018, WO-019) for HTTP/DB-level correctness. That pattern works but does not scale as a CI gate. Adding Jest-native integration/e2e specs (using tooling already present — `@nestjs/testing`, plus `supertest`, a single new dev dependency, the same one NestJS's own project generator scaffolds by default) closes that gap for this domain without touching any other domain's tests, and the CI change benefits every future WO's tests that adopt the same pattern.

**Also fixed as part of "run the complete validation suite":** `apps/web`'s ESLint had no non-interactive config, causing `pnpm run lint` at the monorepo root to hang on a prompt in CI (pre-existing, confirmed unrelated to this WO by reproducing on a clean stash — see WO-019's Operational Verification Report). Added `apps/web/eslint.config.mjs` (the standard Next.js 15 flat-config scaffold) so the existing root `lint` script — already wired into `ci.yml` — passes non-interactively. This was necessary to demonstrate a genuinely green build for this WO's deliverables, not a redesign of `apps/web`.

---

## Risks

| Risk | Mitigation |
|---|---|
| No `Organization` entity — `organizationName` is free text, `ownerId` is one user account | Documented as intentional V1 sequencing (see Decision 3); revisit when PA-011 Business Portal is implemented |
| No admin endpoint exists to grant `ORGANIZATION_REPRESENTATIVE`/`STEWARD`/`PLATFORM_ADMINISTRATOR` roles | Pre-existing gap inherited from ADR-005 (all users register as `MEMBER`); role grants were performed at the database layer for operational verification. Tracked as a recommended follow-up WO (Administration & Operations domain) |
| `SavedOpportunitiesController` remains unguarded | Pre-existing, explicitly out of this WO's scope; recommended follow-up |
| CI now depends on a live Postgres service container | Standard, well-supported GitHub Actions pattern; adds ~10s to CI runtime, no external dependency |

---

## Future Extension Points

- WO-021: Administration & Operations — role grant/revoke endpoints (unblocks live testing of every role-gated feature without direct DB access).
- WO-022: Retrofit `JwtAuthGuard` + ownership onto `SavedOpportunitiesController`, and onto Goals/Journeys/Milestones/Tasks/UserInterests (carried over from ADR-005's recommendation).
- Normalize `Resource.organizationName` → `Resource.organizationId` once PA-011 Business Portal's `Organization` model exists.
- Geographic search (PostGIS) for location-based resource matching, as anticipated by ADR-004's equivalent future extension point for Opportunities.
- AI-powered resource recommendations (PA-006 AI Intelligence Engine) replacing formula-based scoring, mirroring the Opportunity Engine's stated evolution path.
