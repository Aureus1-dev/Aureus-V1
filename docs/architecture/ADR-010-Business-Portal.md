# ADR-010 — Business Portal

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-024 |
| Authority | PA-011, PA-018, ADR-003, ADR-006 |

---

## Context

PA-011 (Business Portal) is one of the twelve Version 1 systems named in PA-020 and, prior to this Work Order, had zero implementation: no `Organization` model, no organization-facing endpoints. ADR-006 §3 explicitly forward-declared this gap when it modeled `Resource.organizationName` as free text: "No `Organization` entity exists yet — Organization Profiles are explicitly a Business Portal (PA-011) component, a separate, not-yet-implemented domain... When PA-011 is implemented, `Resource.ownerId`'s role-based semantics extend naturally to `Resource.organizationId` with a migration; no architecture is broken by this sequencing."

Per the founder's Version 1 architectural decision (2026-07-15), the canonical backend is being completed domain-by-domain before any frontend work begins. WO-024 is the first of the remaining backend Work Orders, chosen because — per the audit performed before this WO — it is the highest-priority *engineering-ready* remaining domain: no founder MVP-scope decision blocks it, unlike the AI Intelligence Engine, and a baseline stewardship function already exists without a dedicated domain, making Business Portal the more urgent gap to close.

This WO scopes strictly to PA-011's foundational responsibilities — "Enable organizations to create verified accounts" and "Maintain transparent organizational profiles" — and defers the responsibilities that depend on product decisions or cross-domain integration work (recruitment tooling, partnership management, dashboards/analytics, and linking `Organization` into `Resource`/`Opportunity` ownership) as named Future Extension Points, consistent with PA-020's Roadmap Philosophy ("simplify before expanding") and every prior WO's scope-discipline precedent.

---

## Decisions

### 1. A new bounded `OrganizationsModule`, following the `interface → Prisma repository → service → controller → DTO` pattern

**Decision:** Business Portal lives in a new `apps/api/src/organizations/` module (`OrganizationsModule`, `OrganizationsController`, `OrganizationsService`, and a nested `members/` sub-domain for representative management), not folded into an existing module.

**Rationale:** Matches ADR-003's layering pattern, applied consistently by every domain since. `Organization` is not a sub-resource of any existing entity (unlike, say, `Profile` under `User`) — it is a new first-class entity with its own lifecycle, so it earns its own top-level module, exactly as Resources (ADR-006) and Opportunities (ADR-004) did.

---

### 2. Verification workflow reused verbatim from Resources/Opportunities, including the shared `VerificationStatus` enum

**Decision:** `Organization` carries the identical two-enum shape already used by `Resource`/`Opportunity` — a domain-specific `OrganizationStatus` (`DRAFT`/`ACTIVE`/`INACTIVE`/`ARCHIVED`, matching `ResourceStatus`'s shape) plus the pre-existing, already-shared `VerificationStatus` (`DRAFT`/`PENDING_REVIEW`/`VERIFIED`/`REJECTED`/`ARCHIVED`) — and the same four action endpoints (`submit-for-review`, `verify`, `reject`, `archive`) with identical state-transition rules and `MODERATOR_ROLES` (`STEWARD`/`PLATFORM_ADMINISTRATOR`) gating on `verify`/`reject`.

**Rationale:** Directly satisfies "reuse existing infrastructure and abstractions" rather than inventing a fourth verification workflow shape. `VerificationStatus` was already designed to be domain-agnostic (its values reference no domain-specific concept), and PA-011's "Enable organizations to create verified accounts" is functionally the same shape of problem WO-020/WO-023's predecessor domains already solved: unverified submissions must not appear in public discovery until a Steward or Administrator reviews them.

---

### 3. `OrganizationMember` is a genuine relational join table with real foreign keys, unlike `Resource.ownerId`

**Decision:** `OrganizationMember.userId` and `OrganizationMember.organizationId` both carry real Prisma `@relation` foreign keys (`onDelete: Cascade`), unlike `Resource.ownerId`/`Opportunity.submittedById`, which are plain UUID audit pointers with no FK (ADR-006 §3).

**Rationale:** `ownerId`-style fields are attribution pointers on an already-well-defined entity; `OrganizationMember` is a genuine many-to-many membership relationship between `User` and `Organization` — its entire purpose is to answer "who may act on behalf of this organization," which is exactly the kind of relationship a real foreign key protects (no dangling membership rows pointing at a nonexistent user or organization). This mirrors the precedent already set by `Profile`, `Goal`, and the auth token tables, all of which carry real `User` FKs — real FKs are in fact the majority pattern in this schema; `Resource`/`Opportunity`'s loose pointers are the documented exception (ADR-006 §3), not the default. As with `Goal.userId` (discovered during WO-022), this means any e2e test creating an `OrganizationMember` must reference a real, registered `User` row rather than a synthetic UUID.

---

### 4. Two-role membership model: `ADMIN` and `MEMBER`, no finer-grained permission matrix

**Decision:** `OrganizationMemberRole` has exactly two values. `ADMIN` may manage the organization's profile, verification-workflow actions, and membership; `MEMBER` is a recognized representative with no membership-management authority. The creator of an organization is automatically added as its first `ADMIN` member.

**Rationale:** A minimal, currently-meaningful distinction — YAGNI against a larger permission matrix (e.g. separate "can edit profile" vs. "can manage members" vs. "can publish on behalf of org" grants) that has no current consumer. `MEMBER` remains forward-compatible: once a future WO links `Organization` into `Resource`/`Opportunity` ownership (Decision 6), `MEMBER` is the natural role for "may publish under this organization but may not change who else can."

---

### 5. Last-remaining-`ADMIN` invariant, reused from WO-021's role-hierarchy precedent

**Decision:** Neither `updateRole` (demoting) nor `remove` may leave an organization with zero `ADMIN` members — both throw `ConflictException` if the target is the sole remaining `ADMIN`. Any member (including a `MEMBER`) may remove themselves from an organization; removing someone *else* requires `ADMIN` authority (or platform `STEWARD`/`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`).

**Rationale:** Directly reuses WO-021's "revocation cannot leave a user with zero roles" invariant, applied at the organization-membership level instead of the platform-role level: a headless organization (zero `ADMIN`s) could not be recovered without direct database access, the exact operational failure mode WO-021 existed to eliminate at the platform level. Self-removal ("leave this organization") is allowed unconditionally *unless* it would trigger the same headless-organization state, matching ordinary "leave a team" semantics found in comparable systems.

---

### 6. `Resource`/`Opportunity` → `Organization` linkage is explicitly deferred, not built in this WO

**Decision:** This WO does **not** add an `organizationId` field to `Resource` or `Opportunity`, and does not modify `ResourcesService`/`OpportunitiesService` in any way. `Resource.organizationName`/`Opportunity.provider` remain free text, exactly as ADR-006 §3 left them.

**Rationale:** IC scope discipline, applied the same way it was applied to every prior WO (WO-019 deferring WO-020's retrofit scope; WO-021 deferring further Administration capabilities; WO-022 deferring the `hasRole()` migration onto pre-existing call sites). Touching two already-shipped, fully-tested domains' schemas, DTOs, services, and test suites is a distinct, mechanically similar but non-trivial body of work that deserves its own Work Order — bundling it here would roughly double this WO's blast radius for a capability ("publish under this org") that has no consumer yet (no frontend exists to invoke it). ADR-006 §3's forward declaration already establishes that this migration is purely additive and breaks no existing architecture whenever it is built.

---

## Risks

| Risk | Mitigation |
|---|---|
| Organization creation and first-`ADMIN`-membership creation are two sequential, non-transactional writes (no `$transaction` wrapping) | Consistent with the existing codebase-wide precedent (no service anywhere uses `$transaction`, including `ResourcesService.create()`'s own create-then-`setRef()` sequence) — acceptable at V1 scale, and a failure between the two writes leaves an organization with zero members, which is recoverable by an Administrator, not a corrupted invariant |
| No linkage yet between `Organization` and `Resource`/`Opportunity` — a business cannot yet formally "publish under" its verified organization | Explicitly deferred (Decision 6); the existing free-text fields continue to function exactly as they did before this WO; this is a known, named gap, not a silent one |
| `Organization` has no scoring/ranking mechanism (`confidenceScore`/`freshnessScore`) unlike `Resource`/`Opportunity` | Not requested by PA-011 and not needed for basic verified-account discovery; can be added later if organization search/ranking becomes a real product need |

---

## Future Extension Points

- Normalize `Resource.organizationName` → `Resource.organizationId` and `Opportunity.provider` → `Opportunity.organizationId`, per ADR-006 §3's forward declaration (Decision 6).
- Recruitment tooling (PA-011: "Recruit qualified candidates") — a distinct capability needing its own product scoping.
- Partnership management and organization dashboards/analytics (PA-011 core components not yet built).
- Member engagement tools connecting `Organization` activity back to `Member Core`.
- A finer-grained membership permission model, if `ADMIN`/`MEMBER` proves insufficient once organizations can publish Resources/Opportunities on their own behalf.
