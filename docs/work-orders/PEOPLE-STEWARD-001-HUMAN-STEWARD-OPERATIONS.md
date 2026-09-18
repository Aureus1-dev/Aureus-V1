# PEOPLE-STEWARD-001 — Human Steward Operations

**Program:** GitHub Issue #122 — PEOPLE-000  
**Step:** 4 — Human Steward Operations  
**Base:** `b5fd5f1d1066e48ebaa10e4eeae6dd8ddcf860d5`  
**Branch:** `people-step4-human-steward-operations`  
**Status:** Constructor implementation

## Objective

Turn the existing member-requested Human Steward path into an accountable operating loop without creating a second case system.

A real Personal Need Responsibility that reaches the existing `NeedEscalation` path must be visible to the correct human operators, acquire one explicit current human owner through the existing `StewardshipRelationship`, respect steward capacity, surface urgency for supervision, preserve handoff history, and remain open until the source-domain outcome is truthfully known.

## Architectural rule

Step 4 composes existing canonical primitives rather than replacing them:

- `Responsibility` remains the accepted member work and no-abandonment root.
- `StatedNeed` remains the source need.
- `NeedEscalation` remains the member-explicit Human Steward request and queue source.
- `StewardshipRelationship` remains current member↔steward ownership and caseload source.
- `StewardCapacity` remains the capacity limit.
- `StewardshipEscalation` remains the staff-only accountability/supervision record and carries triage severity/history.
- `StewardshipNote` remains relationship note storage with existing PRIVATE/SHARED visibility semantics.
- `NeedOutcomeReport` remains source-domain truth for whether the underlying need was actually resolved.

No new `Case`, `Ticket`, `NavigatorCase`, `Assignment`, or second workflow table is introduced.

## PA-023 platform alignment — no Step-4 scope expansion

The branch also carries the architecture candidate `PA-023 — Reality, Matter & Execution Architecture` and its follow-on work order `AUREUS-RME-001-REALITY-MATTER-OBLIGATION-FIRST-PROOF.md` so the newly discovered platform model is preserved in repository truth and sequenced with the active People program.

This **does not widen Step 4 runtime scope**.

For this slice:

- `Responsibility` still means the bounded work Aureus accepted; Step 4 must not replace it with `Matter`, `Reality`, or `Obligation`.
- `NeedEscalation` is still the Human Steward request/queue source; Step 4 must not add a generalized Matter or Obligation table.
- `StewardshipRelationship` is still human ownership/caseload; assignment never becomes authority and never becomes a universal case owner.
- T0–T3 triage changes supervision/latency only; it does not create Reality truth, new authority, or outcome proof.
- resolving the Human Steward step still does not prove the real-world need changed.
- Human Steward Operations is treated as one future **execution capability/resource** that a governed Responsibility may route to when a person is genuinely required.

The follow-on sequencing decision is:

> The previously planned Step-5 deadline/reminder/callback work should be implemented as the first sourced **Obligation** slice under PA-023/RME-001, rather than as a standalone reminder subsystem.

That future slice must first perform repository reuse analysis and prove source/basis, owner, due rule, truth status, authority, completion evidence, Responsible Continuation, and verified state change. It is not authorized for implementation by Step 4.

## Member privacy boundary

Being assigned as a Human Steward does **not** grant access to raw/private AI conversations, connected accounts, documents, calendar/email, private Responsibility evidence, or consequential action authority.

The operations queue exposes only the minimum coordination facts required for the assigned work: Human Steward request identity/status, member identifier, source need identifier, bounded member-provided escalation reason, canonical Responsibility identifier when one can be deterministically resolved, current steward relationship ownership, triage classification, and operational timestamps.

Runtime sharing/acting authority remains governed by People Step 2.

## Operating model

### Queue

- Platform/System Administrators can see every open `NeedEscalation` for supervision and assignment.
- A Human Steward can see only open escalations whose member currently has an ACTIVE `StewardshipRelationship` assigned to that steward.
- Unassigned work remains visible to administrators; it never disappears because no steward relationship exists yet.
- A relationship ambiguity (more than one ACTIVE steward relationship for the same member) is surfaced as an ownership conflict instead of silently picking one.

### Assignment / caseload

- Administrator assignment reuses `StewardshipRelationshipsService.assignByAdmin()` when no active relationship exists.
- Reassignment reuses the existing immutable-history `reassign(... ADMIN_REASSIGNMENT ...)` path when a different active steward already owns the member relationship.
- Existing persisted STEWARD-role checks and `StewardCapacity` enforcement remain authoritative.

### Acknowledge / resolve

- For People Step 4 operations, only the current assigned steward or a Platform/System Administrator may acknowledge or resolve a Human Steward request.
- Resolving `NeedEscalation` means the human handoff/work step ended. It **never** completes the underlying `Responsibility` or proves the member's need was resolved.
- Step 1 remains responsible for asking for post-handoff outcome evidence and completing/exhausting the Responsibility only from the source-domain evidence rules.

### Triage / urgency

The frozen PEOPLE-EXP-001 triage language is represented explicitly:

- `T0_EXPLORE`
- `T1_IMPORTANT`
- `T2_FOUNDATION_RISK`
- `T3_IMMEDIATE_SAFETY`

A triage assessment creates a staff-only `StewardshipEscalation` accountability record on the current relationship, preserving the exact Human Steward request ID, triage level, reason, actor, and timestamp. Mapping to the existing severity model is:

- T0 → LOW
- T1 → MEDIUM
- T2 → HIGH
- T3 → CRITICAL

Reassessment creates a new immutable-content accountability record; older triage records are closed rather than rewritten. Urgency changes speed and supervision only. It never expands authority.

### Handoff / supervision

- The current steward may request a handoff by opening a staff-only accountability escalation. The current relationship remains ACTIVE until an administrator completes reassignment.
- This prevents a handoff request from creating an ownerless gap.
- Administrators supervise through the all-open queue and existing internal stewardship escalation records.

## Scope

Implement:

1. open Human Steward queue retrieval;
2. least-privilege steward/admin queue visibility;
3. deterministic Responsibility linkage from the Step-1 Personal Need `successCriteria.statedNeedId` contract;
4. current ownership derived from ACTIVE `StewardshipRelationship`;
5. admin assignment/reassignment with existing capacity checks;
6. assigned-steward/admin acknowledge and resolve paths;
7. T0–T3 triage recorded through existing staff-only accountability records;
8. current-steward handoff request that does not abandon ownership;
9. regression tests proving privacy, ownership, capacity, handoff, triage, and Step-1 outcome truth boundaries.

## Out of scope

- PA-023/RME-001 runtime implementation in Step 4;
- Step 5 sourced Obligation/deadline/reminder/callback execution;
- Step 6 document/evidence system;
- Step 7 member Truth / Service Ledger UI;
- generalized member Hall redesign;
- institution-specific queues;
- parent/minor/guardian workflow;
- autonomous assignment by AI;
- raw transcript access for human staff;
- legal/financial authority expansion;
- a new CRM/case-management source of truth.

## Acceptance criteria

1. A Platform/System Administrator can list every open member-requested Human Steward escalation.
2. A steward sees only work currently assigned through an ACTIVE relationship to that steward.
3. Unassigned work stays visible to administrators and cannot be acknowledged/resolved by an unrelated steward.
4. Assignment creates or reuses one ACTIVE Stewardship relationship and enforces the existing STEWARD role + capacity checks.
5. Reassignment ends the prior relationship through the existing immutable-history path before the new owner becomes active.
6. More than one ACTIVE relationship for one member is surfaced as an ownership conflict; Step 4 never guesses the owner.
7. Queue output resolves the canonical Personal Need Responsibility by the existing `successCriteria.statedNeedId` contract and does not expose private objective/evidence/conversation payloads.
8. Acknowledgement/resolution requires current assigned steward or Platform/System Administrator.
9. `NeedEscalation.RESOLVED` still does not complete the Responsibility or assert underlying-need resolution.
10. T0–T3 triage creates attributable staff-only oversight history and maps deterministically to LOW/MEDIUM/HIGH/CRITICAL severity.
11. Triage does not create AuthorityGrants or expose new private data.
12. A steward handoff request leaves the current steward owning the member until administrator reassignment completes.
13. Existing Stewardship notes/tasks/escalations, People Step 1, Authority Step 2, and Household Step 3 behavior remain intact.
14. PA-023/RME-001 documentation introduces no runtime/schema/authority behavior and does not weaken any Step-4 boundary.
15. Exact-head typecheck, lint, Prisma migrate deploy, complete serial API suite, web tests, monorepo build, Founder Pilot seed synchronization, and Docker verification are green before independent review.

## Independent review gate

Constructor evidence is not approval. Freeze one exact head SHA only after the complete mechanical gate is green, then send that exact base/head and complete diff to an independent reviewer. Founder retains merge authority.

Because this branch now also carries PA-023/RME-001 documentation, the independent reviewer must issue **two explicit judgments** on the same exact head:

1. **PEOPLE-STEWARD-001 implementation judgment** — whether Step 4 runtime is safe, bounded, and merge-ready under the existing People contract; and
2. **PA-023/RME-001 architecture judgment** — whether the new platform architecture is coherent, non-duplicative, privacy/authority safe, and ready to freeze as direction for the next slice.

A PASS on PA-023/RME-001 does not claim those concepts are implemented. A PASS on Step 4 does not authorize RME-001 construction. Founder retains separate merge/freeze authority.