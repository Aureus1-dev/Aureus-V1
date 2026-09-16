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

This slice records and governs facts about actions performed by authorized humans or external systems. It does **not** autonomously send a proposal, sign a contract, accept terms, capture payment credentials, move money, or promise a construction schedule.

## 2. Reuse decision

The implementation reuses the canonical layers already built in Steps 3 and 4.

### Transaction truth

`WardLead` remains the consented customer transaction envelope and the source of the coarse sales outcome:

`SUBMITTED → ACCEPTED → CONTACTED → CLOSED | LOST`

OR-004 does not add `Deal`, `Project`, `Proposal`, `Contract`, `Payment`, or duplicate pipeline tables.

### Carried-work truth

The first revenue milestone lazily establishes one idempotent Step 3 `BUSINESS_PROMISE` Responsibility for the lead using a deterministic namespaced UUID request key.

The Responsibility:

- is `BUSINESS_TENANT` / `BUSINESS_PRIVATE`;
- carries `GUIDANCE_ONLY` authority;
- is provenance-bound to the retained Ward conversation;
- stores `domain = OR004_REVENUE_COMPLETION` and the canonical lead id inside the existing bounded `successCriteria` contract;
- inherits the exact `WardLead.retentionExpiresAt` deadline;
- is completed through the canonical Step 3 completion service when the sales responsibility reaches operations handoff or a recorded loss.

### Evidence truth

Revenue milestones reuse Step 4 `ResponsibilityEvent` as reference-only evidence.

Each revenue report is an append-only `ACTION_EVIDENCED` event with:

- `sourceSystem = AUREUS_BUSINESS_REVENUE`;
- `sourceRecordType = RevenueMilestone.<STAGE>`;
- an immutable source record id containing the reporting business user id plus caller request UUID;
- a bounded opaque evidence reference in `sourceState`;
- `evidenceLevel = REPORTED`.

The implementation does **not** add revenue JSON blobs to the customer handoff or copy raw proposals/contracts/payment data into Aureus.

## 3. Revenue stages

1. `READY_PROJECT_VALIDATED`
2. `PROPOSAL_RECORDED`
3. `FOLLOW_UP_RECORDED`
4. `DECISION_RECORDED`
5. `CONTRACT_RECORDED`
6. `DEPOSIT_RECORDED`
7. `OPERATIONS_HANDOFF_RECORDED`

Every stage means only that an authorized business representative **reported** the milestone and supplied an opaque evidence reference. It is never independent verification.

## 4. Write contract

Every request supplies:

- `stage` — one bounded stage above;
- `requestKey` — caller-generated UUID used for idempotent retry;
- `evidenceReference` — 1–72 characters, identifier-safe characters only; no free-form document/payment content;
- `decision` — only for `DECISION_RECORDED`: `ACCEPTED | DECLINED | REVISION_REQUESTED`.

No arbitrary notes, contract bodies, signatures, card/bank values, passwords, or raw payment data are accepted by this endpoint.

## 5. Stage ordering

### READY_PROJECT_VALIDATED

Requires:
- OR-003 Ready Project exists;
- `readinessStatus = READY_FOR_EXPERT_REVIEW`;
- lead is non-terminal;
- work-record authority.

May occur once.

### PROPOSAL_RECORDED

Requires:
- Ready Project validation exists;
- lead is `CONTACTED`;
- work-record authority.

A second proposal is allowed only after the latest decision is `REVISION_REQUESTED`; it represents the revised proposal. Otherwise a second proposal with a new request key is rejected.

### FOLLOW_UP_RECORDED

Requires:
- a proposal exists;
- the latest proposal is awaiting decision;
- work-record authority.

May repeat with distinct request keys.

### DECISION_RECORDED

Requires:
- a proposal exists;
- that latest proposal has no later decision yet;
- lead is `CONTACTED`;
- manager authority.

Effects:
- `ACCEPTED` unlocks contract recording;
- `REVISION_REQUESTED` requires a later proposal before another decision;
- `DECLINED` records the milestone and moves the existing `WardLead` to `LOST` with a factual reported outcome reason.

### CONTRACT_RECORDED

Requires:
- latest decision `ACCEPTED`;
- lead remains `CONTACTED`;
- manager authority.

May occur once.

The evidence reference points to the business/external contract record. Aureus does not create a signature or assert legal enforceability.

### DEPOSIT_RECORDED

Requires:
- contract exists;
- lead remains `CONTACTED`;
- manager authority.

May occur once and is optional because OR-004 does not invent whether a particular business requires a deposit.

A deposit report is not a verified payment and does not prove margin or retained earnings.

### OPERATIONS_HANDOFF_RECORDED

Requires:
- accepted decision;
- contract exists;
- lead remains `CONTACTED`;
- manager authority.

A prior deposit report is allowed but not universally required.

Effects:
- records the operations-handoff milestone;
- moves the existing `WardLead` to `CLOSED` with the factual outcome reason that an accepted sale was reported as handed to operations;
- completes the canonical revenue Responsibility through Step 3;
- does not claim remodeling/project completion.

## 6. Authority tiers

### Work-record authority

`OWNER`, `ADMIN`, `MANAGER`, `OPERATOR` may record:

- Ready Project validation;
- proposal existence;
- follow-up existence.

### Manager boundary authority

Only `OWNER`, `ADMIN`, `MANAGER` may record:

- customer decision;
- contract boundary;
- deposit boundary;
- operations handoff.

`VIEWER` and `MEMBER` do not receive revenue mutation actions.

The endpoint records reported facts only. No role gains signature/payment/autonomous-closing authority through OR-004.

## 7. Concurrency and idempotency

- The canonical Step 3 Responsibility is get-or-created using Step 3's advisory-lock request-key mechanism.
- Every revenue write obtains a PostgreSQL advisory transaction lock for the exact `(organizationId, leadId)` revenue stream before reading prerequisites.
- The request UUID is persisted in the immutable evidence provenance record.
- A repeated request key with the identical stage/reference/decision returns the already-recorded state rather than writing another milestone.
- Reusing a request key for different content is a conflict.
- Different request keys cannot race prerequisite ordering because the whole lead revenue stream is serialized.
- Terminal leads reject new milestone reports.

For terminal revenue events, `WardLead` outcome + revenue evidence are written in one DB transaction. Step 3 Responsibility completion is an idempotent governed continuation immediately afterward. If that continuation cannot be confirmed, the API surfaces failure/uncertainty; retrying the same milestone converges completion without duplicating the revenue evidence.

## 8. Read projection

`GET /organizations/:organizationId/business-leads/:leadId` adds `revenueCompletion` for Ready Projects.

It is derived from the canonical lead + canonical Responsibility events and contains:

- contract version;
- Responsibility id/status when established;
- current reported stage;
- lead status;
- chronological milestone ledger;
- opaque evidence references;
- reporter provenance where recoverable;
- latest decision;
- server-calculated `availableActions` for the caller's current organization role;
- plain-language next required action;
- explicit `REPORTED` evidence notice;
- bounded Economic Stewardship evidence.

The web UI consumes `availableActions`; it does not recreate the authority/state machine in the browser.

## 9. Economic Stewardship truth contract

OR-004 intentionally stops where evidence stops.

### Earn — `UNKNOWN`

OR-004 records proposal existence but does not ingest proposal value. No revenue amount is invented.

### Convert — `REPORTED`

Report the current milestone and canonical `WardLead` outcome. Do not infer probability or fabricate a conversion rate from one transaction.

### Keep — `UNKNOWN`

A reported deposit is not margin, retained earnings, profitability, or cash-confirmation evidence.

### Compound — `UNKNOWN`

OR-004 introduces no repeat/referral/retention source.

## 10. OR-003 barrier integrity

The original Ready Project remains an immutable deterministic projection of its retained handoff source. OR-004 does not rewrite customer discovery or qualification signals after the fact.

Revenue progress may inform later Outcome Graph work, but OR-004 does not silently mark these OR-003 barriers resolved:

- FUNDING;
- TRUST;
- AVAILABILITY;
- TIMING;
- DECISION_AUTHORITY.

A proposal or deposit report is not enough to prove those facts.

## 11. Privacy and retention

- All reads/writes are tenant-scoped by existing organization/lead boundaries.
- Revenue evidence is reference-only and business-private.
- Evidence references are identifier-shaped and bounded, not free text.
- Public/customer Ward routes do not expose private revenue milestones.
- The revenue Responsibility inherits the lead's consented retention deadline.
- Hourly lead purge removes expired OR-004 Responsibilities before deleting the expired handoff/conversation source.

## 12. Failure truthfulness

A failed network/API response does not prove non-commit.

The web UI must say:

> Aureus could not confirm whether that revenue update completed. Refresh this handoff before trying again.

It must never say “nothing changed” after an uncertain mutation.

`REPORTED` is never rendered or spoken as `VERIFIED`.

## 13. UI acceptance

Within the existing business handoff detail, after Ready Project and before raw source transcript:

- show Revenue Completion;
- show current reported stage;
- show next required action;
- show server-authorized next milestones only;
- show chronological milestone evidence and explicit `REPORTED` labels;
- show Earn / Convert / Keep / Compound without fake precision;
- accept opaque evidence references only;
- never expose signature/payment-entry fields;
- after operations handoff, say the **sale** was handed to operations, not that the remodeling project was completed.

## 14. Required tests

### Projection/unit

Prove:
- only valid Step 4 `ACTION_EVIDENCED + REPORTED + sourceSystem` rows enter the revenue projection;
- malformed or `VERIFIED`-mismatched records do not get promoted into this reported milestone surface;
- role/state action availability fails closed;
- operator never receives decision/contract/deposit/handoff actions;
- manager actions follow prerequisite order;
- revision-requested requires a later proposal;
- terminal lead exposes no revenue actions;
- Earn/Keep/Compound unknowns remain explicit.

### API/service

Prove:
- tenant isolation;
- unauthorized membership cannot mutate;
- operator cannot record manager-boundary stages;
- Ready Project validation prerequisite;
- contacted prerequisite for proposal;
- proposal prerequisite for decision;
- accepted decision prerequisite for contract;
- contract prerequisite for deposit/handoff;
- same request key is idempotent;
- same request key with different content conflicts;
- repeated follow-up is allowed;
- revised proposal is allowed only after revision requested;
- decline writes reported decision + canonical `LOST` outcome;
- operations handoff writes milestone + canonical `CLOSED` outcome;
- terminal lead rejects later writes;
- Responsibility completion converges on terminal retry;
- revenue Responsibility retention equals lead retention;
- purge removes expired OR-004 Responsibilities;
- no revenue event is independently verified.

### Web

Prove:
- Revenue Completion renders before source transcript;
- `REPORTED` labeling is visible;
- Keep and Compound remain `UNKNOWN`;
- only server-returned actions are offered;
- no payment/signature form exists;
- uncertain mutation failure never claims non-commit;
- tenant switching cannot leave prior-tenant revenue state/actions visible.

## 15. Explicit non-goals

OR-004 does **not** build:

- proposal generation/sending;
- e-signature;
- card/bank capture;
- payment initiation/refund;
- financing underwriting;
- construction scheduling;
- job costing/margin accounting;
- invoice/accounting replacement;
- CRM replacement;
- external-system execution adapters (OR-005);
- generalized Outcome Graph / Value Ledger persistence (OR-006);
- autonomous consequential closing;
- customer-to-personal Aureus identity promotion.

## 16. Done means

OR-004 is complete when:

1. a Ready Project can be carried through a reference-evidenced operations handoff or recorded loss;
2. `WardLead` remains transaction truth and Responsibility remains carried-work truth;
3. no new CRM/deal/project source of truth is created;
4. every revenue milestone is tenant-scoped, attributable, append-only, idempotent, privacy-bounded, and explicitly `REPORTED`;
5. authority tiers prevent operators from recording consequential-boundary milestones;
6. Economic Stewardship is useful without fabricated revenue/margin/compound figures;
7. the existing Business UI surfaces the revenue chain before transcript evidence;
8. exact-head typecheck, lint, migrations, API tests, web tests, production build, seed, and Docker verification pass;
9. a reviewer with no authorship in the candidate lineage performs an adversarial exact-SHA review with no BLOCKING/HIGH findings;
10. Founder decides merge on that exact reviewed SHA.
