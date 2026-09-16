# OR-004 — Revenue Completion

**Status:** implementation candidate  
**Repository:** `Aureus1-dev/Aureus-V1`  
**Frozen implementation base:** `83d6916e412561a52d47de7fd6ca72e5ab3e8d6d`  
**Branch:** `chatgpt/or-004-revenue-completion`  
**Governing architecture:** `docs/product-architecture/PA-021-outcome-and-responsibility-architecture.md`  
**Execution registry:** `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md`

## 1. Objective

Complete the first Kitchen & Bath revenue path without creating a second CRM or pretending Aureus has authority it does not have.

The vertical slice is:

`Ready Project → expert validation → proposal recorded → follow-up recorded → customer decision → contract/deposit boundary → operations handoff → terminal sales outcome`

This slice records and governs facts about actions performed by authorized humans or external systems. It does **not** autonomously send a proposal, sign a contract, accept terms, charge a card, move money, or promise a construction schedule.

## 2. Reuse decision

### KEEP

- `WardLead` remains the canonical consented customer transaction envelope.
- `WardLead.status` remains the coarse sales-handoff lifecycle (`SUBMITTED → ACCEPTED → CONTACTED → CLOSED/LOST`).
- `WardLeadEvent` remains the tenant-scoped append-only transaction history.
- OR-003 `KitchenBathReadyProject` remains the deterministic project-intake projection.
- Organization membership and tenant guards remain the authority boundary.
- Responsibility remains the durable work/commitment layer; OR-004 does not create a parallel generic task engine.

### EXTEND

`WardLeadEvent` receives the minimum structured revenue-milestone envelope required to represent facts that the current four event shapes cannot represent truthfully:

- one revenue event type;
- one bounded revenue-stage enum;
- one idempotency key for retried writes;
- one bounded JSON metadata payload.

No `Deal`, `Project`, `Proposal`, `Contract`, `Payment`, or duplicate pipeline table is added.

## 3. Revenue stages

The bounded stage vocabulary is:

1. `READY_PROJECT_VALIDATED`
2. `PROPOSAL_RECORDED`
3. `FOLLOW_UP_RECORDED`
4. `DECISION_RECORDED`
5. `CONTRACT_RECORDED`
6. `DEPOSIT_RECORDED`
7. `OPERATIONS_HANDOFF_RECORDED`

A stage record means only that an authorized business representative **reported** that milestone and supplied its bounded supporting facts. It is not independent verification.

## 4. Stage contracts

### READY_PROJECT_VALIDATED

Requires:
- OR-003 Ready Project exists;
- `readinessStatus = READY_FOR_EXPERT_REVIEW`;
- lead is non-terminal;
- authorized tenant worker.

Payload:
- `note` — factual expert-validation note, 3–500 chars.

This records that required expert review occurred. It does not claim site conditions are independently verified by Aureus.

### PROPOSAL_RECORDED

Requires:
- lead status `CONTACTED`;
- Ready Project validation exists;
- authorized tenant worker.

Payload:
- `proposalReference` — business-owned opaque reference, 1–120 chars;
- `proposalAmountCents` — optional non-negative integer;
- `note` — optional factual note, max 500 chars.

Aureus does not generate/send/approve the proposal in this slice.

### FOLLOW_UP_RECORDED

Requires:
- proposal exists;
- lead non-terminal;
- authorized tenant worker.

Payload:
- `note` — factual follow-up note, 3–500 chars.

Multiple follow-ups are allowed; every write requires a unique idempotency key.

### DECISION_RECORDED

Requires:
- proposal exists;
- lead status `CONTACTED`;
- `OWNER`, `ADMIN`, or `MANAGER` authority (or existing privileged platform authority).

Payload:
- `decision`: `ACCEPTED | DECLINED | REVISION_REQUESTED`;
- `note` — factual decision basis, 3–500 chars.

Effects:
- `DECLINED` atomically records the decision and moves the existing `WardLead` to `LOST` with the factual outcome reason.
- `ACCEPTED` and `REVISION_REQUESTED` do not create a new lead status.
- a later `ACCEPTED` decision may follow `REVISION_REQUESTED`; `DECLINED` is terminal through the existing lead lifecycle.

### CONTRACT_RECORDED

Requires:
- latest recorded decision is `ACCEPTED`;
- lead remains `CONTACTED`;
- `OWNER`, `ADMIN`, or `MANAGER` authority.

Payload:
- `contractReference` — business-owned opaque reference, 1–120 chars;
- `depositRequired` — boolean;
- `note` — optional factual note, max 500 chars.

Aureus does not create a signature, sign, accept terms, or assert legal enforceability.

### DEPOSIT_RECORDED

Requires:
- contract exists;
- contract says `depositRequired = true`;
- lead remains `CONTACTED`;
- `OWNER`, `ADMIN`, or `MANAGER` authority.

Payload:
- `depositReference` — business/payment-system opaque reference, 1–120 chars;
- `depositAmountCents` — non-negative integer;
- `note` — optional factual note, max 500 chars.

Aureus records a reported payment fact only. It does not collect, initiate, refund, or independently verify money movement in OR-004.

### OPERATIONS_HANDOFF_RECORDED

Requires:
- accepted decision;
- contract exists;
- if the latest contract requires a deposit, a deposit record exists after that contract;
- lead remains `CONTACTED`;
- `OWNER`, `ADMIN`, or `MANAGER` authority.

Payload:
- `operationsReference` — opaque downstream work-order/project reference, 1–120 chars;
- `note` — factual handoff note, 3–500 chars.

Effects:
- atomically records the handoff and moves the existing `WardLead` to `CLOSED`;
- `outcomeReason` truthfully states that operations handoff was recorded;
- does not claim project completion or customer flourishing outcome.

## 5. Authority tiers

### Work-record tier

`OWNER`, `ADMIN`, `MANAGER`, `OPERATOR` may record:
- expert validation;
- proposal existence;
- follow-up facts.

### Consequential-boundary record tier

Only `OWNER`, `ADMIN`, `MANAGER` (plus already-authorized privileged platform roles) may record:
- customer decision;
- contract boundary;
- deposit boundary;
- operations handoff / won-sale close.

These writes still record external/human facts. They never execute signatures or payments.

`VIEWER` and `MEMBER` may read tenant data if the existing tenant boundary permits, but may not mutate revenue milestones.

## 6. Ordering and concurrency

- Revenue milestone writes are append-only.
- Every revenue write requires a caller-supplied `idempotencyKey`, 8–120 chars.
- Database uniqueness on `(organizationId, leadId, idempotencyKey)` makes retries safe.
- The service validates prerequisite stages against the same tenant/lead inside the transaction.
- Terminal `CLOSED` / `LOST` leads reject new revenue milestones.
- `FOLLOW_UP_RECORDED` is repeatable.
- Proposal/contract/deposit/handoff stages are single-current-chain facts in OR-004; duplicates with a new key are rejected unless explicitly allowed by the stage contract.
- `DECISION_RECORDED: REVISION_REQUESTED` may repeat; a later `ACCEPTED` or `DECLINED` decision supersedes earlier non-terminal decision reports in the projection without deleting history.

## 7. Read projection

`GET /organizations/:organizationId/business-leads/:leadId` adds `revenueCompletion`, derived from the append-only lead events rather than a second mutable workflow record.

The projection contains:

- contract version;
- current stage;
- ordered reported milestones;
- `nextRequiredAction`;
- `needsHumanApproval` where appropriate;
- proposal amount when business-reported;
- latest decision;
- contract/deposit requirements;
- operations handoff reference when reported;
- explicit evidence label `REPORTED`;
- bounded Economic Stewardship view.

## 8. Economic Stewardship truth contract

OR-004 exposes only what the evidence can support:

### Earn

If a proposal amount is recorded, report the business-reported proposed value. Otherwise `UNKNOWN`.

### Convert

Report the observed/reported revenue stage and whether the existing lead reached `CLOSED` or `LOST`. Do not invent a conversion probability or rate from one transaction.

### Keep

`UNKNOWN` in OR-004. A deposit is cash-flow evidence, not margin, retained earnings, or profitability.

### Compound

`UNKNOWN` in OR-004. No repeat/referral/retention source is introduced by this slice.

This is deliberately incomplete rather than falsely precise.

## 9. Transaction barrier updates

The OR-003 barrier graph remains source truth for customer/project intake. OR-004 may derive revenue-progress barrier observations without rewriting the original Ready Project:

- PRICE: proposal recorded → business-reported price exists.
- ADMINISTRATIVE_FRICTION: contract/handoff milestones may show progress but do not imply all admin friction is eliminated.
- FUNDING: a deposit record does not establish financing adequacy.
- TRUST: never inferred from purchase progression.
- AVAILABILITY/TIMING: operations handoff does not by itself establish final schedule availability.

## 10. Privacy and data minimization

- All revenue writes are tenant-scoped by `organizationId + leadId`.
- Revenue metadata must not contain passwords, card/bank data, signatures, SSNs, authentication secrets, raw contracts, or raw payment credentials.
- References are opaque identifiers only.
- Notes are plain-text sanitized and bounded.
- Public/customer routes do not expose private revenue milestones in OR-004.
- Existing lead retention/deletion continues to cascade over the event history.

## 11. Failure truthfulness

- A failed client response must not be rendered as proof that a write did or did not commit.
- The web UI says it could not confirm the update and requires refresh before retrying when completion is uncertain.
- Idempotency makes a safe retry possible after refresh.
- `REPORTED` is never presented as `VERIFIED`.

## 12. UI acceptance

Inside the existing business handoff detail, before the raw source transcript:

- show a Revenue Completion surface for Ready Projects;
- show current revenue stage and next required action;
- show chronological reported milestones;
- show Economic Stewardship with unknowns explicitly labeled;
- provide only actions the current server authority/state permits;
- never expose payment/signature entry fields;
- never call a reported deposit “verified payment”;
- after operations handoff, show the sale as handed to operations, not the remodeling project as completed.

## 13. Required tests

### API / service

Prove:
- tenant isolation;
- unauthorized roles cannot mutate;
- operator cannot record decision/contract/deposit/handoff;
- Ready Project validation prerequisite;
- contacted prerequisite for proposal;
- proposal prerequisite for decision;
- accepted-decision prerequisite for contract;
- conditional deposit prerequisite for operations handoff;
- idempotent retry returns the existing event/result;
- duplicate non-repeatable stage with a different key is rejected;
- repeated follow-up is allowed;
- decline atomically records decision + `LOST` state/event;
- operations handoff atomically records milestone + `CLOSED` state/event;
- terminal lead rejects later writes;
- cross-tenant idempotency does not collide;
- notes/references are sanitized/bounded;
- reported evidence is never emitted as verified.

### E2E

Prove one exact Kitchen & Bath happy path:

`SUBMITTED → ACCEPTED → CONTACTED → READY_PROJECT_VALIDATED → PROPOSAL_RECORDED → FOLLOW_UP_RECORDED → DECISION_RECORDED(ACCEPTED) → CONTRACT_RECORDED(depositRequired=true) → DEPOSIT_RECORDED → OPERATIONS_HANDOFF_RECORDED → CLOSED`

Also prove one declined path ends `LOST`.

### Web

Prove:
- Revenue Completion is rendered before source transcript;
- reported labeling is explicit;
- unknown Keep/Compound are explicit;
- invalid/unauthorized actions are not offered;
- uncertain mutation failure language does not claim non-commit;
- tenant switch cannot leave prior tenant revenue milestones/actions visible.

## 14. Explicit non-goals

OR-004 does **not** build:

- proposal document generation or sending;
- e-signature;
- card/bank capture;
- payment initiation/refund;
- financing underwriting;
- construction scheduling;
- job costing or margin accounting;
- invoice/accounting replacement;
- CRM replacement;
- external-system adapters (OR-005);
- generalized Outcome Graph / Value Ledger persistence (OR-006);
- autonomous consequential closing;
- customer-to-personal Aureus identity promotion.

## 15. Done means

OR-004 is implementation-complete when:

1. the current `WardLead` transaction can be carried from Ready Project through an evidence-bounded operations handoff or loss;
2. every revenue milestone is tenant-scoped, attributable, append-only, idempotent, and explicitly reported rather than independently verified;
3. the existing lead reaches its real terminal sales outcome without a second CRM/deal truth;
4. authority tiers prevent operators from recording consequential-boundary milestones;
5. Economic Stewardship shows only evidence-supported Earn/Convert facts and labels Keep/Compound unknown;
6. the existing Business UI surfaces the revenue chain and next human action before transcript detail;
7. exact-head typecheck, lint, migrations, API tests, web tests, production build, and Docker verification pass;
8. a reviewer with no authorship in the candidate lineage performs an adversarial exact-SHA review with no BLOCKING/HIGH findings;
9. Founder decides merge on that exact reviewed SHA.
