# ADR-011 — Stewardship System

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-025 |
| Authority | PA-012, PA-018, ADR-003, ADR-007, ADR-008, ADR-010 |

---

## Context

PA-012 (Stewardship System) is one of the twelve Version 1 systems named in PA-020. Prior to this Work Order, `STEWARD` existed only as a platform role (WO-021/ADR-007) checked inline at moderation gates in Opportunities, Resources, and Organizations (`verify`/`reject` actions) — there was no dedicated domain, no relationship model between a steward and the members they support, and no data model for stewardship notes, follow-up tasks, recommendations, escalations, or steward metrics.

This WO was commissioned with a binding set of canonical product decisions from the founder, reproduced in full in `docs/work-orders/WO-025-Stewardship-System.md`, covering steward assignment authority, capacity limits, steward authority boundaries, relationship lifecycle, member-visible experience, and a steward-metrics foundation — anchored by the foundational principle: **"a steward is a guide, not an owner."** Members retain ownership of their account, goals, journeys, opportunities, and every decision they make; the Stewardship System exists to encourage, organize, mentor, and support, not to control.

Per the founder's Version 1 architectural decision (2026-07-15), the canonical backend is being completed domain-by-domain before any frontend work begins. WO-025 is the next Work Order in that sequence: per the Remaining Backend Domains audit recorded in `docs/releases/version-1-readiness.md` after WO-024, Stewardship System was the highest-priority remaining domain not blocked on a founder MVP-scope decision (unlike the AI Intelligence Engine) and not itself blocked on another undelivered domain (unlike Communication System, Pods, or Academy).

---

## Decisions

### 1. A new bounded `StewardshipModule` with seven internal sub-domains, following the established layering pattern

**Decision:** Stewardship lives in a new `apps/api/src/stewardship/` module, internally organized into seven sub-domains — `relationships/` (core lifecycle), `capacity/`, `notes/`, `tasks/` (follow-up tasks), `recommendations/`, `escalations/`, and `metrics/` — each following the `interface → Prisma repository → service → controller → DTO` pattern established since ADR-003, registered together under a single `StewardshipModule`.

**Rationale:** The canonical product decisions describe one cohesive domain with several distinct sub-capabilities, not seven independent domains — they share a single core entity (`StewardshipRelationship`) that every other sub-domain hangs off of. A single module with internal sub-directories mirrors the precedent already set by Business Portal's `organizations/members/` nested sub-resource (ADR-010 Decision 1), scaled to more sub-resources because Stewardship has more distinct capabilities than Business Portal's membership model alone.

---

### 2. `StewardshipRelationship` is the central entity; every other sub-domain hangs off it by `relationshipId`

**Decision:** `StewardshipNote`, `StewardshipTask`, `StewardshipRecommendation`, and `StewardshipEscalation` all carry a real Prisma `@relation` foreign key to `StewardshipRelationship.id`, never directly to `User`. A steward's authority over a member is always resolved by first loading the relationship and checking `relationship.stewardId === caller.id`.

**Rationale:** Directly encodes the foundational principle at the schema level — there is no code path where a steward can create a note, task, recommendation, or escalation about a member without an existing, explicit `StewardshipRelationship` authorizing that connection. This also gives "maintain a complete stewardship history" (canonical decision §4) a natural join target: querying everything that happened during a given relationship is a single foreign-key lookup, not a reconstruction from scattered `stewardId`/`memberId` pairs.

---

### 3. Steward assignment is a four-origin state machine (`PENDING`/`ACTIVE`/`ENDED`), never an in-place mutation

**Decision:** `StewardshipRelationshipOrigin` has four values (`MEMBER_REQUEST`, `AI_RECOMMENDATION`, `ORGANIZATION_ASSIGNMENT`, `ADMIN_ASSIGNMENT`). A member request or an AI recommendation always creates a `PENDING` row; only a Platform/System Administrator's `activate` action, or direct organization/admin assignment, can create or promote a row to `ACTIVE`. Reassignment (`reassign`) never mutates an existing row's `stewardId` — it ends the current row (preserving `endReason`/`endedById`/`endedAt`) and creates a brand-new `ACTIVE` row.

**Rationale:** This is the direct architectural enforcement of canonical decision §1 ("AI may recommend a steward but may never automatically assign one") and §4 ("do not delete historical relationships; maintain a complete stewardship history"). There is structurally no method any `AI_SERVICE_ACCOUNT`-authenticated caller can invoke that produces an `ACTIVE` row — `recommendSteward()` unconditionally creates `PENDING`, and every method capable of setting `ACTIVE` independently checks the caller's role and excludes that account type. Never mutating `stewardId` in place (rather than a simpler `UPDATE ... SET stewardId = ...`) is a deliberate one-line-more-expensive choice that makes "history" true by construction rather than by convention.

---

### 4. Steward capacity is enforced from a single Prisma column default — the number `25` is never hardcoded in application code

**Decision:** `StewardCapacity.maxActiveMembers` carries `@default(25)` in the Prisma schema — the only place the literal `25` appears anywhere in the codebase. `IStewardCapacityRepository.findOrCreate()`'s upsert deliberately omits `maxActiveMembers` from its `create` payload so Postgres, not application code, supplies the value. `StewardshipRelationshipsService.assertCapacityAvailable()` reads the persisted value at assignment time and never compares against a literal constant.

**Rationale:** Directly satisfies canonical decision §2 ("do not hardcode the limit anywhere... Platform Administrators may change this limit later"). Making the database column default the single source of truth, rather than a TypeScript constant referenced everywhere, means changing the default for future stewards is a migration, and changing an individual steward's limit is a normal `PATCH` — no code deploy required either way.

---

### 5. Three distinct least-privilege visibility shapes, not one generic pattern, across notes/tasks/escalations

**Decision:** `StewardshipNote` has a `visibility` enum (`PRIVATE`/`SHARED`, default `PRIVATE`) — the member sees only `SHARED` notes, the steward/admin see all. `StewardshipTask` (follow-up tasks) is fully member-visible but member-**read-only** — only the steward/admin have a management (`PATCH`) endpoint. `StewardshipEscalation` is never exposed to the member at all — every method on `StewardshipEscalationsService` is steward-or-admin-only.

**Rationale:** Canonical decision §3 lists "escalate issues" under Steward Authority, not Member Experience, and §5 explicitly separates "shared stewardship notes" (member-visible) from the implied existence of private/internal notes ("private moderation/internal notes must never be visible to members"). Collapsing these into one generic visibility flag would either over-expose escalations (a member seeing an issue raised about them before a steward has resolved it) or under-expose follow-up tasks (a member should see what they've been asked to do, per "assigned tasks" in §5, even though they can't edit the task record itself). Three tailored authorization shapes, each matched to its own canonical requirement, was judged clearer and safer than one shared abstraction with per-field escape hatches.

---

### 6. Member-overview and steward-metrics endpoints compose across six existing domains via minimal additive module exports and direct service reuse, never by duplicating their query logic

**Decision:** `GET /stewardship/relationships/:id/member-overview` (steward-only) and the steward-metrics computation both walk the member's `Goal → Journey → Milestone → Task` ownership chain by importing `GoalsModule`/`JourneysModule`/`MilestonesModule`/`TasksModule` directly into `StewardshipModule` and injecting their already-exported repository tokens. `TasksModule` and `OrganizationsModule` each gained one additional repository-token export (`TASK_REPOSITORY`, `ORGANIZATION_REPOSITORY`/`ORGANIZATION_MEMBER_REPOSITORY`) with no change to either module's service logic. Recommendations validate their `opportunityId`/`resourceId` targets by injecting `OpportunitiesService`/`ResourcesService` directly and calling their existing, caller-free `findById()` methods rather than exporting new repository tokens for those two domains.

**Rationale:** Extends the "minimal additive module exports" pattern established in WO-022 (and reused for `OrganizationsModule` within WO-024 itself) to a domain that needs read access into six already-shipped domains rather than one or two — the widest cross-domain reach of any Work Order so far. The two-tier approach (repository-token export for domains needing raw entity access; direct service injection for domains where an existing service method already does exactly what's needed) avoids exporting more surface area than each specific need requires, while still reusing 100% of existing query logic — no domain's Goal/Journey/Milestone/Task/Opportunity/Resource retrieval logic is duplicated inside Stewardship.

---

### 7. Steward metrics are computed on demand, not stored, with two fields intentionally reserved as `null`

**Decision:** `activeMemberCount`, `tasksCompleted`, and `escalationsResolved` are live counts computed at request time. `memberGoalCompletionRate` and `averageJourneyProgress` are computed on demand by walking every assigned member's goals/journeys/milestones and return `null` (not `0`) when the steward has no assigned members or those members have no goals yet. `averageResponseTimeHours` and `memberSatisfactionScore` are hardcoded `null` unconditionally — documented as intentionally deferred instrumentation with no data source yet.

**Rationale:** Directly satisfies canonical decision §6 ("implement a foundation... design these to be expandable without schema redesign"). Computing on demand rather than maintaining denormalized counters avoids an entire class of consistency bugs (stale counters after a task is deleted, a relationship ends, etc.) at V1's scale, and keeps the response DTO shape stable — when response-time tracking or a satisfaction-survey mechanism is eventually built, populating those two fields requires no schema change to `StewardMetricsResponseDto`, only a new data source feeding already-reserved fields. Returning `null` rather than `0` for "no data yet" preserves the ability to distinguish "this steward's members have made no progress" from "this steward has no members to measure."

---

### 8. Organization-scoped assignment authority is checked at the organization-representative level, not the member-enrollment level — a documented, deliberate scoping limitation

**Decision:** "Organizations may assign stewards to members within their organization" (canonical decision §1) is implemented as: the caller must be an `ADMIN` `OrganizationMember` of a `VERIFIED` `Organization`. There is **no** check that the target member is actually enrolled with or a client of that organization, because no such enrollment relationship exists in the schema yet — WO-024's `Organization`/`OrganizationMember` model represents organization *representatives* (staff who act on behalf of a business), not a member-to-organization client relationship.

**Rationale:** Named explicitly rather than silently narrowed, following the same scope-discipline precedent WO-024 itself set when it deferred `Resource`/`Opportunity` → `Organization` linkage (ADR-010 Decision 6). Building a member-enrollment model was out of scope for this WO's founder instruction and has no other consumer yet; inventing one here to close this gap would have expanded WO-025's blast radius into a second, unrelated schema design decision. This is recorded as a Known Limitation in `docs/work-orders/WO-025-Stewardship-System.md` and tracked as a Future Extension Point below, exactly as ADR-010 §6 tracked its own analogous deferral.

---

## Risks

| Risk | Mitigation |
|---|---|
| Organization-assignment authority is checked at the representative level, not a member-enrollment level (Decision 8) | Explicitly named, not silent; any `ADMIN` representative of any `VERIFIED` organization can currently assign a steward to any member, which is broader than the canonical phrase "within their organization" strictly implies. Acceptable at V1 scale given no enrollment model exists yet; tracked as a Future Extension Point. |
| `averageResponseTimeHours`/`memberSatisfactionScore` have no data source and are permanently `null` until a future WO instruments them | Explicitly documented as reserved/deferred fields (Decision 7), not silently omitted from the response shape — consumers can rely on the fields always being present, just not always populated. |
| Member-overview and metrics computation walk multiple nested collections (goals → journeys → milestones → tasks) with N+1-shaped repository calls rather than a single aggregate query | Consistent with the existing codebase-wide precedent of favoring per-domain repository method reuse over cross-domain raw SQL/aggregation queries (no domain in this codebase does aggregate joins across module boundaries); acceptable at V1 scale, revisit if a steward's assigned-member count grows large enough to matter. |
| Relationship creation/activation and capacity lookups are two sequential, non-transactional writes in some paths (e.g. `assignByOrganization` creating a relationship without wrapping the capacity check in the same transaction) | Consistent with the existing codebase-wide precedent (no service anywhere uses `$transaction`, per ADR-010 Risks); a rare race between two simultaneous assignments to the same steward could transiently exceed capacity by one, recoverable by an Administrator reassignment, not a corrupted invariant. |

---

## Future Extension Points

- A member-enrollment/client relationship between `User` and `Organization`, distinct from `OrganizationMember` (representative staff), which would let organization-scoped steward assignment (Decision 8) be checked precisely rather than at the representative level.
- Real instrumentation for `averageResponseTimeHours` (would require tracking first-response timestamps on notes/tasks/escalations) and `memberSatisfactionScore` (would require a member-facing feedback/survey mechanism — likely a Communication System dependency).
- Steward-initiated resignation as a distinct, structured action rather than a generic `end` with `STEWARD_RESIGNATION` reason (currently supported via the existing `end` endpoint's reason enum, but could grow its own notification/handoff workflow once Communication System exists).
- Automated steward-inactivity detection (currently `STEWARD_INACTIVITY` is a valid end reason an Administrator can select manually; no automated detection job exists yet).
- Community-moderation authority for stewards (canonical decision §3: "moderate community content only when separately authorized") has no implementation yet — no community-content domain exists to moderate (depends on Pods/Communication System).
