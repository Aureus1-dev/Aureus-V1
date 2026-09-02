# OR-003 — Kitchen & Bath Ready Project

**Status:** Implementation candidate  
**Repository:** Aureus-V1  
**Base:** `80a0e1f5083c751bc91e9830122fc01d6516dfd1`  
**Branch:** `feat/or-003-kitchen-bath-ready-project`  
**Architecture:** PA-021 Outcome & Responsibility Architecture  
**People proof:** OR-001 + OR-002  
**Cross-context gate:** OR-CCT-001

## 1. Objective

Prove the first Business-side outcome surface:

`fuzzy Kitchen & Bath intent → customer-supplied discovery → grounded project state → distilled Ready Project → explicit unresolved transaction barriers → exact expert/human work still required`

The contractor should receive a **Ready Project**, not be forced to reconstruct the project from a raw conversation transcript.

OR-003 must reduce low-value discovery burden without pretending Aureus can measure a site, determine final scope, fabricate a quote, promise availability, decide permitting, or make a consequential business commitment.

## 2. Smallest safe architecture

Reuse the existing PF-009 Kitchen & Bath path:

- published Business tenant;
- approved Kitchen & Bath vertical pack;
- WardConversation;
- consented WardLead;
- retained `qualificationSignals`;
- KitchenBathIntakeDto;
- business lead queue/detail;
- tenant-scoped authorization and 90-day handoff retention.

**Do not create a second lead/project/CRM source of truth.**

The Ready Project is a deterministic projection of the already-retained, consented project state. The retained WardLead + Kitchen & Bath qualification envelope remain authoritative for this slice.

A Ready Project projection may be regenerated from those stored facts. That avoids a second mutable copy drifting away from the customer-supplied source.

## 3. Why OR-003 does not create a Business Responsibility row yet

The public Kitchen & Bath visitor is a guest, not necessarily an Aureus User.

The current Responsibility Core's `BUSINESS_CUSTOMER_SHARED` principal shape requires both a User principal and an Organization principal. OR-003 must not manufacture a User identity, silently convert a visitor to a personal Aureus account, weaken that DB invariant, or bypass OR-CCT-001 merely to claim Responsibility reuse.

Therefore this slice preserves the existing consented WardLead as the shared transaction envelope and builds the Ready Project inside that context.

Later Business Responsibility work may bind this transaction when the identity/Principal contract legitimately supports it. OR-003 does not pre-empt that decision.

## 4. Customer discovery additions

The existing intake already captures:

- project type;
- rooms;
- scope;
- project location;
- desired timing;
- decision/ownership status;
- optional budget range;
- design help;
- optional attachment references.

OR-003 adds optional, explicitly customer-supplied value criteria:

- priorities;
- must-haves;
- concerns / things to avoid.

These fields are transparent project context. They are not a hidden qualification score, demographic inference, propensity score, or model-derived customer profile.

### Priority vocabulary

The first bounded priority vocabulary is:

- LOOK_AND_FEEL
- FUNCTION_AND_LAYOUT
- DURABILITY
- BUDGET_CONTROL
- TIMING
- ACCESSIBILITY
- LOW_MAINTENANCE
- RESALE_VALUE
- ENERGY_EFFICIENCY
- OTHER

A visitor may select zero to six.

## 5. Ready Project contract

A Ready Project contains:

- contract version;
- lead/project identity;
- vertical;
- readiness status;
- customer-stated intent;
- project constraints/context;
- customer-stated priorities/must-haves/concerns;
- source/evidence basis;
- Transaction Barrier Graph;
- exact expert/human validation still required;
- explicit boundaries on what the packet does **not** establish.

### Readiness states

- `READY_FOR_EXPERT_REVIEW` — required structured intake is present and the project is ready for a human expert to review.
- `INCOMPLETE_SOURCE` — the retained record declares itself Kitchen & Bath but required persisted source facts are missing/malformed.

`READY_FOR_EXPERT_REVIEW` does **not** mean quote-ready, contract-ready, site-verified, finance-approved, permit-cleared, or construction-ready.

## 6. Transaction Barrier Graph

OR-003 establishes the first deterministic barrier graph for:

- DESIRE
- FIT
- PRICE
- FUNDING
- AVAILABILITY
- TIMING
- KNOWLEDGE_UNCERTAINTY
- TRUST
- DECISION_AUTHORITY
- ADMINISTRATIVE_FRICTION
- ALTERNATIVES

Each barrier is represented as one of:

- `CUSTOMER_STATED`
- `OPEN`
- `EXPERT_REQUIRED`
- `BUSINESS_REQUIRED`
- `NOT_ASSESSED`

The graph is **not a score** and must never be collapsed into hidden lead quality/ranking.

### Deterministic first mapping

- DESIRE → CUSTOMER_STATED from the customer's scope/priorities.
- FIT → EXPERT_REQUIRED; site conditions/measurements/feasibility are not known from this intake.
- PRICE → BUSINESS_REQUIRED; no fabricated quote/range.
- FUNDING → NOT_ASSESSED unless a later lawful financing slice explicitly gathers it.
- AVAILABILITY → BUSINESS_REQUIRED; no invented schedule/slot.
- TIMING → CUSTOMER_STATED when desired timing exists, otherwise OPEN.
- KNOWLEDGE_UNCERTAINTY → EXPERT_REQUIRED.
- TRUST → NOT_ASSESSED; Aureus does not infer trust from behavior.
- DECISION_AUTHORITY → CUSTOMER_STATED when the visitor supplied it, otherwise OPEN.
- ADMINISTRATIVE_FRICTION → NOT_ASSESSED.
- ALTERNATIVES → NOT_ASSESSED.

## 7. Expert-required boundary

Every Ready Project must plainly state that a qualified business expert still needs to validate, as applicable:

1. physical measurements and site conditions;
2. scope feasibility and trade dependencies;
3. final materials/specifications;
4. final pricing/allowances;
5. actual scheduling/availability;
6. code/permit requirements where applicable;
7. assumptions that materially affect a proposal.

Aureus may organize the uncertainty. It may not silently convert it into certainty.

## 8. Public experience

After a successful consented Kitchen & Bath handoff, the visitor should see a calm Ready Project confirmation instead of only:

> “Your request was shared.”

The result should make clear:

- what Aureus understood;
- what matters to the customer;
- what the business now has;
- what still needs an expert;
- that no quote/appointment/approval was fabricated.

The existing consent and 90-day retention/deletion boundary remain unchanged.

## 9. Business experience

The business lead detail should display the Ready Project **before** the raw attributed conversation.

The contractor should be able to answer at a glance:

- What is the customer trying to accomplish?
- What matters most?
- What constraints did the customer state?
- What is still unknown?
- What does the expert actually need to validate next?

The raw conversation remains available as attributable evidence, not the primary reconstruction interface.

## 10. Failure / integrity rules

- Ready Project facts come only from retained customer-supplied/system-observed source fields.
- No LLM-generated fact is admitted into the packet in OR-003.
- If the K&B source envelope is missing or malformed, fail closed to `INCOMPLETE_SOURCE`; do not guess.
- Existing non-Kitchen & Bath handoffs return no Ready Project.
- A stale/different second K&B intake for one handoff remains a conflict under the existing intake hash rule.
- Cross-tenant reads remain impossible through the existing tenant-scoped lead query.
- Deleting/expiring the handoff removes the source; no independent Ready Project copy survives.
- Public response must not expose tenant-private notes or business-only information.
- Business response must not expose data outside the consented handoff envelope.

## 11. Deny paths / tests

Tests must prove at minimum:

1. unapproved Kitchen & Bath pack cannot create the specialized handoff/Ready Project;
2. required K&B source facts produce `READY_FOR_EXPERT_REVIEW`;
3. non-K&B lead produces no Ready Project;
4. malformed K&B source produces `INCOMPLETE_SOURCE`, not guessed facts;
5. priority/must-have/concern fields are sanitized, bounded, and stored as visitor-supplied signals;
6. no score/ranking/fit label is generated;
7. PRICE remains BUSINESS_REQUIRED with no fabricated amount;
8. FIT remains EXPERT_REQUIRED with no inferred measurements/feasibility;
9. TRUST remains NOT_ASSESSED;
10. absent timing/decision authority stay OPEN rather than inferred;
11. public Ready Project confirmation contains only customer/shared transaction information;
12. tenant business lead detail exposes the Ready Project only through existing tenant authorization;
13. Ready Project appears before raw transcript in business UI;
14. public UI makes expert-required boundaries visible;
15. exact same handoff retry regenerates the same project state without duplicate persistence;
16. different second intake still fails conflict;
17. deleting/expiring the WardLead source leaves no separate Ready Project persistence behind;
18. OR-CCT-001 remains unimplemented and no account conversion occurs.

## 12. Explicit non-goals

- no autonomous quote;
- no estimate;
- no site measurement;
- no permitting determination;
- no financing approval;
- no appointment booking;
- no proposal generation yet;
- no contract/deposit;
- no browser action;
- no hidden lead score;
- no customer sentiment/trust inference;
- no Business Responsibility principal workaround;
- no cross-context transfer;
- no CRM replacement;
- no duplicate project database;
- no generic workflow engine.

## 13. Done

OR-003 is ready for independent review only when:

- existing OR-001/OR-002/PF-009 behavior remains green;
- Ready Project server projection is deterministic and deny-path tested;
- customer value criteria are transparent and bounded;
- public confirmation and business Ready Project surfaces are tested;
- full CI + Docker verification pass on one exact head;
- exact SHA is frozen;
- Claude independently reviews that exact SHA;
- Founder separately decides merge.

