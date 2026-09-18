# PEOPLE-HOUSE-001 — Household & Relationship Continuity

Status: implementation candidate for independent review
Program: PEOPLE-000 Step 3
Frozen base: `7572ecf59b182c888a620216c73e14185cf66e1d`

## Outcome

Aureus can preserve the minimum household structure needed to carry real life work across time without turning a household into a second CRM, silently making one adult visible to another, or treating family relationship as permission.

This slice implements:

1. a durable household identity;
2. explicit invitation + acceptance before another adult becomes a household member;
3. bilateral confirmation of adult-to-adult relationships;
4. bilateral confirmation of household dependencies;
5. opt-in participation on one exact canonical `Responsibility` without copying the Responsibility into a household case system;
6. member departure that ends that member's active household coordination edges;
7. an append-only household-domain event trail;
8. privacy-safe reads scoped to the caller's own relationship/dependency graph.

## Non-negotiable boundary

**Relationship does not equal authority.**

A HouseholdMembership, HouseholdRelationship, HouseholdDependency, or HouseholdResponsibilityParticipant row MUST NOT by itself grant access to another adult's:

- AI conversations or raw transcripts;
- Documents/files;
- ConnectedAccount data;
- calendar/email;
- private Responsibility payload or evidence;
- external account actions;
- sharing authority;
- legal or financial decision authority.

Those remain governed by the Step 2 authority/consent layer and future domain-specific execution gates. The household API deliberately returns no private Responsibility objective/status/evidence and does not call the Step 2 evaluator to manufacture implicit grants.

## Adult-core scope

Step 3 is the adult household continuity substrate. Parent/child and minor-specific authority, guardian verification, Academy, and governed childhood work remain Step 14. A label such as `PARENT_OR_GUARDIAN` is member-described relationship context; it is not verified legal guardianship and MUST NOT be used as legal-action authority.

## Canonical Responsibility reuse

Shared household work remains one existing `Responsibility`. `HouseholdResponsibilityParticipant` is only a participation edge containing:

- exact Responsibility id;
- exact participant id;
- invite/accept/end state;
- provenance timestamps.

It stores no objective, evidence, conversation source, outcome, or copied workflow state. Existing Responsibility ownership remains unchanged.

## Privacy behavior

An ACTIVE member may see:

- the active member identifiers in their household;
- only Relationship rows where they are one of the two adults;
- only Dependency rows where they are dependent or supporter;
- only Responsibility participation edges where they are owner or participant.

They may not see relationship/dependency edges solely between two other household adults through this API.

A PENDING invitation does not permit reading household state. A nonmember receives a not-found boundary rather than household existence detail.

## Lifecycle

### Membership
`PENDING → ACTIVE | DECLINED`; `ACTIVE → ENDED`.

Only the invited user may accept/decline their invitation. Creating an invitation never creates ACTIVE membership.

### Relationship
`PENDING → ACTIVE | DECLINED`; `ACTIVE/PENDING → ENDED` when a party leaves.

A member may propose only a relationship that includes themselves. The other named adult must confirm it.

### Dependency
`PENDING → ACTIVE | DECLINED`; `ACTIVE/PENDING → ENDED` when a party leaves.

The proposal records direction explicitly (dependent/supporter). The other involved adult must confirm it. No free-text health/family narrative is stored here.

### Shared Responsibility participation
`PENDING → ACTIVE | DECLINED`; `ACTIVE/PENDING → ENDED` when owner/participant leaves the household.

Only the current Personal Responsibility principal may invite a participant. The participant must accept. Acceptance is coordination consent only; `dataAuthorityGranted` remains false.

## Database invariants

- at most one current PENDING/ACTIVE membership per household+user;
- no self-relationship;
- at most one current relationship per unordered adult pair in a household;
- no self-dependency;
- at most one current dependency per dependent+supporter+kind;
- at most one current participant edge per Responsibility+participant;
- foreign keys preserve household/user/Responsibility referential integrity;
- HouseholdEvent is append-only by application contract.

## Acceptance tests

1. creator becomes ACTIVE without making anyone else a member;
2. outsider cannot read household state;
3. invitee cannot read household state before acceptance;
4. exact invitee can accept;
5. outsider cannot confirm someone else's relationship;
6. exact other adult can confirm;
7. confirmed relationship does not unlock the owner's private Responsibility endpoint;
8. dependency requires confirmation by the other involved adult;
9. only Responsibility principal can create a household participation invite;
10. participant acceptance does not expose Responsibility payload;
11. shared-participation response says data authority is false;
12. leaving ends the caller's household relationship/dependency/participation edges and removes household read access.

## Deliberate exclusions

- no household CRM/profile dossier;
- no household-wide conversation transcript;
- no automatic family inference from contact lists, email, payroll, address, or connected accounts;
- no unverified legal guardianship powers;
- no minors implementation;
- no steward assignment/caseload logic (Step 4);
- no deadline engine (Step 5);
- no Truth/Service Ledger UI (Step 7);
- no Flourishing score/household ranking;
- no institution visibility.

## Reviewer focus

Block this slice if any path lets household membership or a descriptive relationship become private-data/action authority, if any adult can be enrolled without acceptance, if shared work duplicates the canonical Responsibility payload, if an unrelated household member can see another pair's relationship/dependency, or if leaving does not terminate the departing member's active coordination edges.
