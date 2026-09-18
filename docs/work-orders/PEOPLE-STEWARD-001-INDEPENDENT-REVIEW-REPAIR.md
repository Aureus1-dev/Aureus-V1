# PEOPLE-STEWARD-001 — Independent Review Repair Record

**Independent review target:** `af20021058e04c1b8616d458fbe075c92397efb7`  
**Review verdict:** BLOCKED  
**Repair state:** constructor repair in progress; new exact head must be re-reviewed  
**Base:** `b5fd5f1d1066e48ebaa10e4eeae6dd8ddcf860d5`

This record preserves the independent review disposition instead of rewriting it after repairs. No verdict on the blocked SHA transfers to a later head.

## Blocking findings and repair

### B1 — circular module dependency / red CI

Finding: `StewardshipModule -> ResponsibilitiesModule -> CommunicationModule -> StewardshipModule` prevented API bootstrap.

Repair:

- removed `ResponsibilitiesModule` from `StewardshipModule`;
- provided the narrow read-only `RESPONSIBILITY_REPOSITORY` binding directly with `PrismaResponsibilityRepository`;
- preserved Responsibility as read-only linkage for the Human Steward queue.

Required proof: exact-head CI must typecheck, boot the API suite, build, and pass Docker verification.

### B2 — legacy Need escalation acknowledge/resolve bypass

Finding: old `/needs/escalations/:id/acknowledge|resolve` endpoints allowed any STEWARD to mutate any escalation without current-owner enforcement.

Repair:

- removed those legacy mutation routes from `NeedsController`;
- Human Steward acknowledge/resolve now has one exposed mutation path under `/people/steward-operations/...`;
- underlying `NeedEscalation` repository mutation remains reusable internally, but authorization is enforced by Human Steward Operations before mutation.

Required proof: unrelated stewards cannot acknowledge/resolve another member's request through any live route.

### B3 — parallel assignment implementation and race

Finding: Step 4 directly mutated Prisma while the existing Stewardship relationship endpoints had their own assignment/reassignment paths, allowing contradictory ACTIVE ownership and capacity races.

Repair:

- introduced `STEWARDSHIP_OWNERSHIP_REPOSITORY` as the single atomic persistence boundary for ACTIVE ownership mutation;
- administrator assignment, organization assignment, PENDING activation, and reassignment all pass through the same row-locking mutation discipline;
- `HumanStewardOperationsService` no longer calls Prisma for assignment and reuses `StewardshipRelationshipsService.assignByAdmin()` / `.reassign()`;
- ownership mutations lock the member and target steward consistently before checking current ownership and target capacity;
- reassignment ends the current owner and creates the replacement in the same database transaction.

Required proof: concurrent assignment cannot produce contradictory ACTIVE owners or exceed capacity through mixed endpoints.

## HIGH findings and repair

### H1 — status leak before authorization

Repair:

- Human Steward role is checked before escalation lookup for operator endpoints;
- for non-admin stewards, current ACTIVE relationship ownership is established before resolved/open state is disclosed;
- unauthorized stewards receive the same opaque not-found boundary;
- status-specific conflict is evaluated only after operator authorization.

### H2 — constructor evidence overstatement

Repair:

- the blocked review is preserved in this record;
- no claim of green mechanical validation is made until the new exact head actually passes;
- the implementation now matches the work-order reuse rule by routing active relationship ownership through the canonical relationship service plus one shared atomic repository.

## MEDIUM findings addressed in the repair

- Steward queue reads now query only open escalations for the current steward's ACTIVE member set rather than projecting every open member escalation before filtering.
- Triage output now includes explicit provenance: `HUMAN_RECORDED` vs `SYSTEM_CRISIS_SIGNAL`.
- Active-relationship lookup for ownership classification requests at most two rows because the semantic question is 0 / 1 / conflict.

## Still required before re-review

- exact-head TypeScript / lint / Prisma / API / web / build / seed / Docker green;
- adversarial regression coverage for mixed-endpoint concurrency and opaque authorization;
- exact changed-file set and final head frozen in constructor evidence;
- independent reviewer must re-review the full base-to-new-head diff; no prior PASS/BLOCKED result transfers automatically.
