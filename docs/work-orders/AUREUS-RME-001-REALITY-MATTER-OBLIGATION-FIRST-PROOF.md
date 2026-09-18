# AUREUS-RME-001 — Reality / Matter / Obligation First Proof

**Architecture:** `PA-023 — Reality, Matter & Execution Architecture`  
**Program relationship:** follow-on platform slice after PEOPLE-STEWARD-001 Human Steward Operations  
**Status:** Architecture work order candidate; do not implement until PA-023 is independently reviewed/frozen and the prior active slice is dispositioned  
**Runtime authority:** None from this document alone.

## 1. Job

Prove the smallest complete transition from source-backed reality to a verified change in reality **without** creating a generalized graph database, second case system, second Responsibility system, or generic task/workflow engine.

The proof must reuse existing Aureus primitives wherever they already own truth.

Target loop:

```text
source-backed Reality fact
-> desired state
-> existing domain Matter reference where applicable
-> sourced Obligation
-> existing Responsibility
-> Authority/Policy decision
-> permitted execution OR bounded human/professional gate
-> independent evidence
-> verified Outcome
-> Reality history updated
-> privacy-safe learning candidate
```

## 2. Why this follows PEOPLE-STEWARD-001

PEOPLE-STEWARD-001 establishes one accountable Human Steward operating capability: queue visibility, current human ownership, capacity, triage, handoff, and truthful resolution of the human step.

That Human Steward capability should become one execution resource available to future Responsibilities; it should not become the system that manually stores all case truth.

The previously planned Step-5 deadline/reminder/callback capability is therefore reframed:

> **Do not build a standalone reminder engine. Build the first sourced Obligation slice.**

A reminder is merely one possible delivery behavior around an Obligation. The durable truth is the sourced requirement/commitment, owner, due rule, status, completion evidence, and continuation path.

## 3. Required pre-build reuse analysis

Before schema or service design, inspect current `main` and classify each proposed need as **REUSE / EXTEND / PROJECT / BUILD / REJECT** across at least:

- `Responsibility` / `ResponsibilityEvent`;
- Personal Need resolution (`StatedNeed`, `NeedEscalation`, `NeedOutcomeReport`, `UnresolvedNeed`);
- `LegalMatter` dates, facts, sources, documents, action gates, and outcomes;
- Authority / Responsibility Passport / Context Firewall primitives;
- Household / relationship continuity;
- Goals / Journey / Task / Milestone structures, if any are currently authoritative for the same semantic need;
- Communication / notification infrastructure;
- Documents / evidence primitives;
- Opportunity / external-source projections;
- stewardship relationships, capacity, escalations, notes, and operations;
- Foundry learning candidate contract;
- Library retrieval/source pointers.

If an existing object already owns the truth, the first implementation must reference/project it rather than copy it unless a concrete lifecycle or availability requirement proves copying necessary.

## 4. First vertical proof

The constructor must select **one** existing People Responsibility on current `main` and prove the whole loop.

Preferred first source, subject to reuse analysis:

- a Personal Need Responsibility with an existing Human Steward or Legal Matter path;
- one material source-backed state fact;
- one material due/required condition that can be represented as a sourced Obligation;
- one execution path that either:
  - Aureus can safely carry under existing authority, or
  - requires one bounded Human Steward / member / qualified-professional step.

Do not add multiple verticals merely to prove generality.

### Example shape, not a hard-coded product scenario

```text
source says condition X is currently true
-> principal wants state Y
-> source/rule/commitment creates Obligation O
-> existing Responsibility accepts carrying the bounded work
-> gateway classifies the next action
-> authorized actor performs the action
-> independent receipt/observation proves O satisfied
-> state Y becomes source-backed Reality
-> Responsibility may advance only under its existing completion rules
```

The implementation must prove the architecture from repository truth, not from this example text.

## 5. Minimal Reality representation

The first proof should prefer a **projection/read model or narrowly scoped fact record** over a universal graph schema.

At minimum the proof must be able to answer:

- What fact/state are we relying on?
- Who/what is the subject?
- What source owns or supports it?
- Is it VERIFIED / OBSERVED / REPORTED / INFERRED / ESTIMATED / UNKNOWN as applicable?
- When was it valid/effective?
- When did Aureus know/record it?
- Is it current, stale, contradicted, superseded, or unknown?
- Which context/principal/privacy boundary governs access?

A source-domain correction must not leave a false competing copy presented as truth.

## 6. Minimal Matter behavior

Do **not** create a universal Matter table merely because PA-023 defines Matter.

For the first proof:

- if the chosen path already has a `LegalMatter`, use it;
- if another existing bounded domain object already functions as the situation container, reference it;
- if no Matter is needed for the first proof, omit it and document why.

The proof is successful if the architecture works without unnecessary persistence.

## 7. Minimal Obligation contract

The first Obligation must preserve at least:

- source/basis;
- responsible actor / current owner;
- required condition or action;
- due date or due rule if one exists;
- due-date provenance and verification state;
- consequence/dependency if unmet where known;
- authority class for satisfaction;
- completion evidence requirement;
- state;
- relationship to the canonical Responsibility;
- domain/source pointer so truth is not duplicated.

A `REPORTED` due date may be acted on conservatively, but it may not be rendered as independently verified without supporting evidence.

## 8. Execution and verification

The first proof must separate:

1. plan / proposed action;
2. authority decision;
3. attempted execution;
4. execution receipt;
5. independent evidence of the intended real-world result;
6. Responsibility outcome/completion decision.

No tool response, Human Steward resolution, message sent, resource accepted, form prepared, or action attempted may automatically equal underlying-need completion unless the source-domain completion contract already says so and the required evidence exists.

## 9. Responsible Continuation

If the chosen path fails or is denied:

- preserve evidence of the failure/denial;
- preserve the Obligation if still valid;
- seek the next authorized route;
- route only the bounded human/professional step that genuinely requires a person;
- remain BLOCKED or RESPONSIBLY_EXHAUSTED only under existing governing semantics when no responsible continuation remains.

The first proof must include at least one deny/failure-path test demonstrating that a blocked execution route does not erase the underlying Responsibility or Obligation.

## 10. Privacy and authority invariants

The first proof must demonstrate:

- Reality fact existence grants no SHARE/WRITE/ACT authority;
- Matter participation grants no blanket private-data authority;
- Household relationship grants no authority beyond existing rules;
- Human Steward assignment grants only the minimum operations visibility already authorized by PEOPLE-STEWARD-001 and any separately granted runtime authority;
- no Business/private or cross-member data enters a Personal Reality projection without a valid transition/authority basis;
- Foundry receives only the privacy-safe learning/event contract already permitted, never raw private Matter/Reality payload by default.

## 11. Bitemporal minimum

The first proof must preserve both when feasible without a generalized temporal engine:

- **valid/effective time** of the material state; and
- **known/recorded time** in Aureus.

At minimum add tests proving a later correction does not rewrite the earlier known-state history as if Aureus always knew the correction.

If current source primitives already preserve enough information, reuse them rather than adding duplicate timestamps.

## 12. Hall / member experience

The first proof must not expose a graph editor, case dashboard, task manager, or database schema to the member.

The member-facing projection should answer only what is useful now, such as:

- what is true / materially changed;
- what Aureus is carrying;
- what is due / blocked;
- what needs the member;
- what evidence supports the state;
- what happens next.

`No action needed from you` is a valid and valuable state.

## 13. Explicit non-goals

Do not build in RME-001:

- a Neo4j/graph-database platform;
- a universal Person/Business profile;
- a generalized Matter/Case table without proof of necessity;
- generic workflow designer;
- universal task manager;
- full Portfolio Stewardship;
- autonomous cross-Responsibility prioritization;
- generalized professional marketplace;
- new legal-advice authority;
- full external court/agency integration;
- broad computer-use execution;
- automatic Foundry policy mutation;
- Library storage of live personal/business Reality;
- institution billing/reporting expansion.

## 14. Required adversarial tests

At minimum attack:

1. foreign member / tenant / context cannot read the Reality fact or Obligation;
2. Reality fact cannot be used as authority;
3. source-domain correction/expiry cannot leave a stale competing truth silently active;
4. REPORTED deadline cannot become VERIFIED through projection;
5. Obligation satisfaction cannot automatically complete the underlying need without its canonical outcome evidence;
6. failed/denied action preserves the Obligation and Responsibility for Responsible Continuation;
7. execution actor cannot self-certify consequential completion where independent assurance is required;
8. Human Steward resolution cannot masquerade as real-world outcome;
9. known-time history survives later correction;
10. learning export contains no raw private fact/matter/evidence payload beyond the existing governed contract;
11. chosen implementation does not create a second generic case/workflow truth;
12. existing Legal Matter, People Step 1, Authority Step 2, Household Step 3, Human Steward Step 4, Business Responsibility, and Opportunity behavior do not regress.

## 15. Acceptance criteria

RME-001 is complete only when:

1. reuse analysis is recorded and explains why each new primitive is actually necessary;
2. one source-backed Reality fact participates in one complete stewardship loop;
3. one sourced Obligation is durable and truth-typed;
4. the canonical Responsibility remains the accepted-work root;
5. Matter is reused/omitted rather than generalized without need;
6. one authorized action/human gate changes or preserves real-world state;
7. independent evidence verifies the intended result;
8. Reality history truthfully reflects the new state without rewriting what was previously known;
9. canonical Responsibility completion remains governed by its existing evidence contract;
10. a privacy-safe learning candidate can be produced without granting authority or mutating policy;
11. all deny paths above pass;
12. exact-head mechanical CI/Docker gates pass;
13. independent exact-head review reports zero BLOCKER/HIGH findings;
14. Founder separately authorizes merge.

## 16. Review instruction

Reviewers must ask whether this first proof is **smaller than the architecture**, not whether it implements every PA-023 concept.

The intended outcome is proof that Reality / Obligation / execution can compose with current Aureus primitives safely. Generalization is earned by repeated successful domain proofs; it is not assumed up front.