# PEOPLE-LEARN-001 — Universal Stewardship Learning Loop

**Priority:** Highest active People work order  
**Parent issue:** #128  
**Branch:** `people/learn-001-founding-50-loop`  
**Purpose:** Build the smallest complete loop by which every real act of Aureus stewardship can help the member at full strength and, without creating extra member work, teach Aureus how to become a better steward.

## 1. Product thesis

Aureus should not build a separate research product for the Founding 50. Normal use is the learning environment.

The universal loop is:

`conversation -> need -> responsibility -> capability used -> expected result -> action/evidence -> actual result -> prediction gap / friction / success -> learning signal -> Foundry analysis/simulation -> governed candidate improvement -> field validation -> Library lesson`

Simulation guides what is worth testing. Real outcomes determine what is true.

## 2. Member experience doctrine

- Everything remains conversational by default.
- One front door: **How can we help?**
- Members are members first, collaborators second.
- Lean architecture must never mean reduced capability.
- Existing deep capabilities, including Opportunity Center, remain available at full strength when relevant.
- Aureus should use the strongest appropriate existing capability or external tool rather than exposing internal modules to the member.
- Fix invisible friction silently where possible. Do not spend member time narrating trivial self-correction.
- Material/consequential errors must be corrected truthfully and proportionately.
- Respect member time as entrusted to Aureus: minimize unnecessary turns, screens, confirmations, notifications, repeated questions, and manual administration.
- Feedback is optional and conversational. A member can naturally say what worked, failed, felt wrong, or what they wish Aureus could do.
- Aureus may occasionally ask a short context-appropriate question such as `Anything you wish I could handle better for you?`; it must not ask after every interaction.

## 3. Reuse-first architecture

Before adding any new schema or workflow primitive, inspect and reuse:

- `Responsibility` / `ResponsibilityEvent` as the durable work root and work ledger;
- `StatedNeed` and canonical conversation/message provenance;
- existing authority/privacy/consent gates;
- source-domain evidence and existing ledger semantics;
- AI orchestration/audit records;
- existing connected-provider architecture;
- existing Opportunity Center / People / Business / Academy capabilities;
- existing analytics, telemetry, feedback, or outcome primitives where they already satisfy the invariant.

Do not create a second CRM, case system, generic workflow engine, duplicate member-history store, duplicate evidence database, or separate member-facing feedback dashboard.

External systems remain source-of-truth where appropriate. Aureus owns stewardship, member intent, responsibility, permission, coordination, evidence meaning, continuity, and learning.

## 4. Capability model

Aureus capabilities should be composable behind one conversation.

Each capability should eventually be describable by:

- outcomes/needs it can help address;
- required context/input;
- integrations/tools it may use;
- authority required;
- evidence required for progress/completion;
- expected failure modes;
- cost/resource requirements;
- when accountable human involvement is required.

This slice must not rebuild all capabilities. It must produce a learning contract that can reference whichever canonical capability actually participated in the work.

## 5. Learning evidence model

The learning layer must distinguish provenance explicitly:

- **OBSERVED** — established by canonical operational/source evidence.
- **REPORTED** — asserted by the member or accountable human, without independent verification unless separately available.
- **INFERRED** — Aureus/Foundry interpretation; never promoted to fact merely because a model is confident.
- **SIMULATED** — synthetic/counterfactual output from Foundry.

These categories must never be silently conflated.

The learning layer should capture or reference the minimum necessary facts to answer:

1. What was the member trying to accomplish?
2. Which canonical Responsibility carried it?
3. Which capability/capabilities were used?
4. What result did Aureus expect, if a meaningful prediction existed?
5. What actually happened according to canonical evidence?
6. Was there material friction, failure, success, surprise, human intervention, or unmet capability?
7. What evidence/provenance supports that learning signal?
8. What private content is unnecessary and therefore must not be copied into the learning record?

## 6. Prediction-versus-reality

When Aureus makes a meaningful prediction that can later be checked, the system should preserve enough provenance to compare:

`expected result -> actual result -> prediction gap`

Examples include expected savings, expected completion, expected timing, expected usefulness of an intervention, or expected prevention of a foreseeable failure.

No prediction is required merely for instrumentation. Do not manufacture estimates just to populate this structure.

Prediction gaps are learning evidence, not automatic proof of root cause.

## 7. Learning signal sources

Only meaningful signals should enter the learning loop. Sources may include:

- explicit member suggestion or correction;
- repeated friction evidenced by actual interaction/operations;
- success, failure, or unexpected outcome;
- accountable Human Steward observation;
- prediction-versus-outcome mismatch;
- recurring unmet capability request;
- repeated human work that appears safely automatable;
- recurring member work Aureus could potentially carry;
- repeated integration/provider failure;
- repeated need pattern that current capability composition does not resolve.

Do not equate high volume with importance. One consequential safety/privacy/authority failure may justify immediate investigation.

## 8. Foundry contract

Foundry receives learning evidence without unnecessary private conversation payloads.

Foundry may:

- cluster similar signals;
- identify recurring needs/friction/failure/success patterns;
- generate competing explanations;
- inspect whether an existing capability or external integration already solves the need;
- simulate candidate responses at scale;
- estimate uncertainty and tail risks;
- propose the smallest reversible change worth field-testing.

Foundry may not:

- treat simulated results as observed truth;
- alter constitutional principles;
- authorize consequential action solely from a learning signal;
- silently promote inference into verified fact;
- deploy material changes merely because simulation ranks them highly.

## 9. Build decision order

Before Aureus builds a new capability, apply:

`reuse existing capability -> compose capabilities -> integrate/partner -> simplify/fix existing flow -> build only if an evidenced gap remains`

This operationalizes the rule: **if it is not broken, do not replace it.**

## 10. Founding cohort protocol

### Founding 50 — discovery and calibration

Use 50 real members to discover:

- repeated needs;
- common friction;
- useful anticipations;
- prediction errors;
- unnecessary member work;
- recurring human-only bottlenecks;
- capability gaps;
- where deep existing capabilities are underused or should be composed differently.

The cohort is not statistically representative of humanity and must not be treated as such.

### Founding 100 — validation and strengthening

After the loop operates cleanly for the first 50, expand to the next 50 and explicitly test whether improvements learned from the first cohort generalize.

The system continues learning beyond 100; these are operating checkpoints, not a permanent research ceiling.

## 11. Anticipatory stewardship

The loop must support learning from needs members have not explicitly asked Aureus to anticipate.

Preferred posture:

`notice -> prepare quietly -> intervene proportionately -> act only within authority -> measure whether anticipation helped`

Aureus may anticipate more aggressively than it acts. Preparation and recommendation must remain bounded by privacy, authority, risk, and member preference.

## 12. Ledger boundary

The ledger is the truthful proof layer, not a dump of internal telemetry.

- Material promises, consequential actions, meaningful outcomes, and member-relevant changes remain ledger-worthy according to canonical ledger rules.
- Trivial internal friction fixes and low-level learning telemetry should not clutter the member ledger.
- If member experience materially contributed to a product change, Aureus may acknowledge that truthfully where appropriate and consented, but should not gamify contribution or expose other members' information.

## 13. First implementation slice

The first complete slice is:

`real People conversation -> existing StatedNeed/Responsibility -> normal full-strength Aureus help -> one meaningful learning event from canonical evidence -> privacy-minimized learning representation -> provenance tag -> Foundry-readable export/contract -> no automatic behavior change`

The slice should support at least:

1. one explicit conversational member suggestion/correction;
2. one operationally derived signal not authored by the member (for example, a source-evidenced failure or prediction mismatch);
3. one success/outcome signal;
4. canonical linkage back to the relevant Responsibility/evidence without duplicating sensitive payloads;
5. strict OBSERVED/REPORTED/INFERRED/SIMULATED separation;
6. safe export/contract for Foundry analysis.

## 14. Explicit non-goals for this slice

Do not implement yet:

- automated product mutation/deployment;
- giant analytics dashboard;
- generalized survey system;
- generalized experiment platform;
- full capability registry rewrite;
- mass simulation infrastructure;
- new calendar product;
- second member record;
- scoring people or hidden worthiness ranking;
- statistical claims from the first 50;
- autonomous consequential experiments on members.

## 15. Done means

PEOPLE-LEARN-001 Step 1 is complete only when:

1. the repository has one canonical implementation path for meaningful learning signals;
2. a real People interaction can generate a learning signal without requiring a survey or separate member UI;
3. the signal references canonical source evidence and copies no unnecessary private payload;
4. explicit member suggestions can be represented conversationally;
5. source-evidenced non-member-authored success/failure/prediction-gap signals can be represented;
6. provenance cannot silently upgrade REPORTED/INFERRED/SIMULATED into OBSERVED;
7. a signal cannot itself authorize an external action, policy change, or deployment;
8. Foundry can consume a privacy-safe representation distinct from simulated inputs;
9. existing Opportunity Center and other deep capabilities remain full-strength and unchanged by default;
10. existing Responsibility, privacy, authority, evidence, Business, and People behavior remains green;
11. CI + Docker pass on the exact candidate head;
12. an independent reviewer examines the exact head for privacy leakage, architecture duplication, learning/provenance ambiguity, authority creep, member-time burden, and accidental capability regression;
13. all blocking/high findings are repaired and re-reviewed;
14. Founder explicitly authorizes merge.

## 16. Relationship to PEOPLE-EXP-001

The 60 existing PEOPLE-EXP-001 scenarios remain valuable as adversarial/pre-launch simulation material. They are not observed product truth and must not dictate product architecture merely because they were written first.

Real member use is the primary evidence source for People evolution. Foundry simulation expands the search space around observed evidence; field outcomes determine whether a proposed improvement earns its place.
