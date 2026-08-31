# OR-001 Responsibility Core — Reuse Analysis

**Status:** Design evidence for PA-021 / AUREUS-OUTCOME-RECONCILIATION-001  
**Repository baseline inspected:** `68232e91485d8b8a802712afc301e2d24515ff1b`  
**No runtime/schema change in this document.**

## Question

Can the approved PA-021 Responsibility abstraction be implemented entirely by reusing current V1 persistence, or is one new generic aggregate justified?

## Existing candidates inspected

### Goal → Journey → Milestone → Task

Current strengths:

- durable user-owned objective (`Goal`);
- one journey per goal;
- ordered milestones;
- ordered tasks;
- status/progress already represented;
- existing member UI/API behavior can remain useful.

Current limitations for the PA-021 Responsibility root:

- `Goal` is directly `userId`-owned; it cannot represent guest, business-tenant, business-customer, employee, organization-owned, or shared-transaction responsibility without changing its meaning;
- `Task` is subordinate to `Milestone`, not a generic Aureus commitment;
- no authority envelope;
- no privacy/data-sharing envelope;
- no explicit waiting-on-user / waiting-on-Aureus / waiting-on-third-party / blocked / responsibly-exhausted state;
- no due date on the general Task model;
- no dependency graph;
- no completion-evidence link;
- no external-system/source provenance;
- no terminal outcome/value record;
- no explicit context boundary separating personal, business-private, and shared transaction work.

**Decision:** KEEP and UPGRADE as an optional planning/progress projection. Do not mutate Goal/Journey/Task into the universal cross-context Responsibility root.

### StewardshipTask

Current strengths:

- durable task;
- relationship scoped;
- description;
- due date;
- pending/in-progress/completed/cancelled.

Limitations:

- bound to `StewardshipRelationship`;
- created-by-human semantics;
- no general party/context representation;
- no authority/privacy envelope;
- no dependency/evidence/outcome/value/provenance model.

**Decision:** KEEP for human stewardship work. Do not widen into a universal responsibility object.

### WardLead + WardLeadEvent

Current strengths:

- tenant-scoped;
- explicit consent metadata;
- append-only state history;
- assignment;
- status/outcome reason;
- retention boundary;
- attributable conversation;
- good pattern for tenant isolation and event evidence.

Limitations:

- specifically a consented Business lead;
- status model is sales-handoff specific;
- contains lead contact/project fields that do not belong in general responsibilities;
- cannot represent People work, internal Business operations, system transitions, or non-sales outcomes.

**Decision:** KEEP. Reuse its design lessons (tenant-scoped compound relations, append-only events, consent provenance, retention), not the table itself.

### Conversation / AiConversation / WardConversation

Current strengths:

- durable relationship/transcript state;
- member and Business/public conversation foundations already exist;
- useful provenance link for “where this responsibility began.”

Limitations:

- conversation is not work;
- a responsibility may outlive a conversation;
- one responsibility may span multiple conversations/channels;
- a conversation may contain multiple responsibilities.

**Decision:** KEEP. Responsibility may reference origin/current conversation context, but conversation must not become the responsibility source of truth.

### Opportunity / StatedNeed / ResourceOffer

Current strengths:

- verified opportunity data;
- source/freshness/verification;
- stated-need attribution to member AI conversation;
- explicit offer/accept/decline records;
- current fail-closed verified action path.

Limitations:

- represents available leverage and member response, not the full work-to-completion chain;
- cannot carry arbitrary dependencies, commitments, external system steps, or final cross-domain outcomes.

**Decision:** KEEP and compose into Responsibility as opportunity/leverage inputs.

### ConsentRecord / guided-application consent

Current strengths:

- existing consent concepts and application-guidance safety boundaries.

Limitations:

- no single generic authority envelope tied to an accepted piece of work;
- consent alone does not describe what Aureus is allowed to execute.

**Decision:** KEEP. Responsibility stores references/versions to applicable authority/privacy decisions rather than inventing a second consent subsystem.

## Conclusion

A **new thin Responsibility aggregate is justified**.

It should not replace Goal/Journey/Task, WardLead, Conversation, Opportunity, Consent, or domain records.

Its purpose is to join them safely around an outcome.

## Minimal proposed aggregate

The first implementation should remain intentionally small.

### Responsibility

Required semantics:

- `id`
- `kind` — domain/type identifier, versioned or controlled rather than free-form authority
- `objective` — plain-language intended outcome
- `status`
- `contextType` — at minimum PERSONAL / BUSINESS_TENANT / BUSINESS_CUSTOMER_SHARED
- nullable owner/context references appropriate to the type:
  - `userId`
  - `organizationId`
  - optional origin conversation pointer/reference
- `successCriteria` — structured JSON only if a typed first-domain schema is not yet justified
- `authorityClass` / policy reference — never inferred solely by the model
- `privacyScope` / policy reference
- `dueAt` when the responsibility itself has a deadline
- `createdAt`, `updatedAt`, `completedAt`
- `retentionExpiresAt` where applicable

The first slice should avoid storing arbitrary model reasoning.

### ResponsibilityEvent

Append-only event history.

Minimum event semantics:

- responsibility id;
- event type;
- server-owned actor class / actor id where applicable;
- source system / source record reference where applicable;
- occurred at;
- bounded metadata free of secrets/raw chain-of-thought.

Initial event types should be small and deterministic, e.g.:

- ACCEPTED
- STATE_CHANGED
- USER_INPUT_REQUIRED
- EXTERNAL_WAIT_STARTED
- COMMITMENT_RECORDED
- ACTION_EVIDENCED
- COMPLETED
- RESPONSIBLY_EXHAUSTED
- CANCELLED

### ResponsibilityEvidence

Only if evidence cannot be represented safely as event metadata/reference.

Prefer references to existing durable domain records/documents/tool results rather than copying payloads.

## Status model

The root needs states that current Goal/Journey/Task do not have:

- ACTIVE
- WAITING_ON_AUREUS
- WAITING_ON_USER
- WAITING_ON_THIRD_PARTY
- BLOCKED
- COMPLETED
- RESPONSIBLY_EXHAUSTED
- CANCELLED

State transition authority must be server-owned and domain-policy checked.

A model may propose the next state; it does not create authority to set it.

## Plan/task reuse

Do **not** add a generic duplicate checklist system in OR-001.

Where a personal responsibility naturally maps to a member goal, the existing Goal/Journey/Milestone/Task hierarchy may remain the plan/progress view.

Where a Business responsibility maps to a current lead or later domain workflow, the domain object remains authoritative for domain state.

Responsibility records the cross-domain contract and completion state; domain records remain authoritative for their own facts.

## First implementation proof

OR-001 should prove only:

1. a currently authenticated member can explicitly accept one bounded, non-consequential responsibility originating from an existing conversation/opportunity path;
2. server records the Responsibility and ACCEPTED event;
3. one server-owned commitment/human-needed state can be represented;
4. an existing domain result can be attached/referenced as completion evidence;
5. Responsibility reaches COMPLETED only through an allowed deterministic transition;
6. conversation history can be changed/continued without losing Responsibility;
7. tenant/member access deny paths prove no cross-user/cross-tenant read/write;
8. deletion/retention behavior is explicitly decided for the first domain rather than globally guessed.

This is enough to prove the abstraction without building a generalized workflow engine.

## Explicit non-goals for OR-001

- no autonomous browser control;
- no generic “agent tasks” marketplace;
- no arbitrary user-defined executable workflows;
- no replacement of Journey/Goal/Task;
- no Business sales automation expansion;
- no outcome scoring algorithm;
- no learning-based policy mutation;
- no cross-context memory transfer;
- no new external-system adapter;
- no broad Value Ledger UI.

Those belong to later slices after the core responsibility boundary is proven.
