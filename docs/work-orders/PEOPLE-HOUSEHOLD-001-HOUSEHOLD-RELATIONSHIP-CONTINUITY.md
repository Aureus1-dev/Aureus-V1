# PEOPLE-HOUSEHOLD-001 — Household & Relationship Continuity

**Parent:** #122 — PEOPLE-000 Step 3  
**Tracker:** #136  
**Base:** `7572ecf59b182c888a620216c73e14185cf66e1d`  
**Experience contract:** frozen PEOPLE-EXP-001  
**Authority foundation:** merged PEOPLE-AUTH-001

## Single job

Add a thin, member-controlled household/relationship continuity layer that connects existing Aureus members and existing Responsibilities without creating a second CRM, case system, profile system, consent engine, workflow engine, or evidence store.

## Core doctrine

A household is context, not authority.

Being in the same household must never imply access to another member's private conversations, documents, connected accounts, legal matters, Responsibilities, or personal history. Household membership may make a person eligible to receive an explicit permission; it never creates that permission by itself.

Relationship/dependency facts are reported human context. They are directional and may be disputed. They are never silently upgraded into reciprocal truth, guardianship, legal authority, financial authority, medical authority, or a finding about dependency/eligibility.

## Canonical reuse

- `User` / member identity stays canonical.
- `UserProfile` stays canonical for member profile information.
- `Responsibility` remains the canonical work root.
- `AuthorityRequest` / `AuthorityGrant` / `AuthorityDecision` remain the only runtime permission system.
- household storage may contain linkage metadata only; it must not copy source-domain evidence, conversation text, document contents, connected-account data, or Responsibility evidence.

## Runtime model

### Household

A household is a named member-controlled continuity context.

- one active organizer is required;
- a member may participate in more than one household because real caregiving/living arrangements can overlap;
- household creation does not change any Personal authority;
- deleting/ending a household is outside this first slice; members may leave and organizers may remove another member.

### Household membership

Membership lifecycle:

`PENDING -> ACTIVE -> LEFT | REMOVED`

or

`PENDING -> DECLINED`

Invitation is explicit and acceptance is required. A pending invitee cannot read the active household roster or relationship facts before accepting.

The invite endpoint may accept an email for usability, but the response must not disclose whether an arbitrary email has an Aureus account. If the address matches an existing account, a pending membership is created; otherwise the same neutral response is returned.

### Relationship / dependency fact

A relationship row is always:

- reported by one active household member;
- about the reporter and exactly one other active household member;
- directional;
- provenance `REPORTED`;
- visible only to the reporter and the related member.

Relationship kinds in this adult-core slice:

- `PARTNER`
- `PARENT_OR_GUARDIAN` (descriptive family relationship only; **not** legal guardianship authority)
- `ADULT_CHILD`
- `SIBLING`
- `CAREGIVER`
- `CARE_RECIPIENT`
- `ROOMMATE`
- `OTHER`

Dependency direction:

- `NONE`
- `I_DEPEND_ON_THEM`
- `THEY_DEPEND_ON_ME`
- `MUTUAL`

No non-account person record or minor profile is introduced here. Parent + Child remains separately governed under the Family/Academy expansion gate.

### Shared Responsibility continuity

The household layer may point to an existing Personal `Responsibility`, but may not duplicate its objective, evidence, events, source-domain facts, or terminal truth.

Creating a household Responsibility share requires an existing **active exact Authority grant** with all of the following:

- context: `PERSONAL`;
- subject: Responsibility principal;
- capability: `SHARE`;
- resource class: `RESPONSIBILITY`;
- resource ref: exact Responsibility id;
- recipient kind: `PERSON`;
- recipient ref: exact target household member user id;
- purpose: `Coordinate this household responsibility`;
- minimum field scope: exactly `objective,status`.

The household link stores the `authorityGrantId` as provenance. Read projection must re-check the grant on every read. If that grant is revoked/expired, the shared Responsibility disappears from the recipient's household projection immediately even if the linkage row remains for audit/history.

Only bounded fields authorized above may be projected: Responsibility id, objective, status. No origin conversation, source-domain records, evidence, events, legal matter, documents, or account data are exposed.

### Delegated runtime authority

Step 3 extends the shared Authority primitive with an optional exact `delegateUserId`.

Rules:

- no delegate means the existing self/organization authority behavior remains unchanged;
- a Personal delegated request can only name a currently ACTIVE member of at least one household that the subject is also actively in;
- approval remains with the subject member;
- the grant is actor-bound: a runtime evaluation using `delegateUserId` only permits when the actual actor is that delegate;
- the evaluator must re-check that subject and delegate still share an active household at decision time;
- leaving/removal therefore disables future delegated use without rewriting the grant;
- household relationship kind never automatically creates delegation;
- no legal representative / POA / guardianship inference is created.

`RESPONSIBILITY` joins the Authority resource-class enum and requires an exact Personal resource ref for READ/WRITE/SHARE/ACT. Ownership is verified against `Responsibility.principalUserId`.

## Member experience

The existing Profile becomes the natural home for a `Household & relationships` panel rather than adding another top-level department.

It must plainly communicate:

> Same household does not mean shared private data.

The panel supports:

- create household;
- view own households and pending invitations;
- accept / decline;
- invite another existing Aureus member by account email with a neutral non-enumerating response;
- leave household;
- organizer removes another active member;
- report a directional adult relationship/dependency fact;
- see only relationship facts involving the signed-in member;
- see a Responsibility shared with the member only when the exact Authority grant is still valid.

Permission to share or act remains in Trust & Permissions. Household UI must not create silent authority.

## Required deny-path proof

1. non-member cannot read a household;
2. pending invitee cannot read active roster/relationships before accepting;
3. invitation endpoint is non-enumerating for unknown email;
4. relationship reporter cannot create a fact about two other people;
5. unrelated household member cannot read a relationship fact they are not part of;
6. household membership alone cannot expose another member's Responsibility;
7. wrong recipient / wrong Responsibility / wrong purpose / broader field scope cannot back a share link;
8. revoked/expired grant immediately hides previously shared Responsibility data;
9. delegated authority with wrong actual actor denies;
10. delegated authority after subject/delegate stop sharing an active household denies;
11. exact Responsibility ownership is enforced;
12. no household response contains raw conversation/document/account/source-domain content.

## Non-goals

- Parent + Child/minors;
- legal guardianship, custody, POA, health-care proxy or legal representative status;
- generic contacts/address book;
- non-account household-person profiles;
- staff-facing case management;
- pooled financial assets or household billing;
- copied Responsibility/evidence data;
- automatic sharing from relationship type;
- household-wide transcript/document/account visibility.

## Definition of done

At one exact head SHA:

1. schema + migration establish the thin household linkage model and authority delegation extension;
2. API implements membership lifecycle, scoped relationship facts, exact shared-Responsibility projection and deny paths;
3. Profile exposes the member-facing household continuity experience;
4. complete API E2E and focused web tests prove privacy/authority boundaries;
5. Build & Test green;
6. Docker Build Verification green;
7. independent adversarial review of exact head;
8. all BLOCKER/HIGH findings repaired and re-reviewed;
9. Founder explicitly authorizes merge.
