# PA-023 — Reality, Matter & Execution Architecture

**Version:** 0.1  
**Status:** Founder-directed architecture candidate; independent review required before freeze  
**Date:** 2026-09-18  
**Companion architecture:** `PA-021 — Aureus Outcome & Responsibility Architecture` and `PA-022 — Private Steward & Visual Flourishing Experience`  
**Runtime authority:** None. This document does not itself create schema, grant authority, enable execution, or change production behavior.

## 1. Why this architecture exists

PA-021 correctly makes `Responsibility` the durable root of work Aureus has accepted and defines Aureus as an interface to outcomes. That remains governing.

The platform still needs a clean representation of the world on either side of a Responsibility:

- what is true now;
- what was true before;
- how Aureus knows it;
- what remains uncertain or disputed;
- what real-world situation requires coordinated stewardship;
- what must happen, by whom, under what rule or commitment, and by when;
- which permitted action can change reality;
- what evidence proves that reality actually changed.

The missing layer is not another CRM, profile, case system, workflow engine, or task manager. It is a governed substrate for **reality and transition**.

The platform model is therefore:

```text
Reality
  + Intent / Desired State
  -> Outcome Compilation
  -> Matter(s), when coordinated real-world stewardship is needed
  -> Obligation(s)
  -> Responsibility / accepted Aureus commitment
  -> Authority + Capability selection
  -> Action / Execution
  -> Independent Evidence / Verification
  -> Outcome
  -> Reality updated
  -> Learning candidate / Foundry evaluation
```

This is an extension of PA-021, not a replacement for it.

## 2. Core primitives and boundaries

### 2.1 Reality Graph — what is true

The **Reality Graph** is a privacy-scoped, provenance-bearing representation of material current and historical state needed for stewardship.

A Reality fact must be able to preserve, where applicable:

- subject / entity / relationship it concerns;
- fact or state assertion;
- source and provenance;
- epistemic status such as VERIFIED / OBSERVED / REPORTED / INFERRED / ESTIMATED / UNKNOWN;
- confidence or uncertainty where material;
- the time the fact was true or effective (`valid time`);
- the time Aureus learned, observed, or recorded it (`known time`);
- currentness / freshness / expiry where applicable;
- contradiction or dispute state;
- privacy/context classification;
- authoritative source-of-truth pointer when another system owns the fact.

The Reality Graph is **not** permission. Knowing a fact does not grant authority to use, share, expose, or act on it.

The Reality Graph is **not** a universal surveillance profile. Facts remain scoped by principal, context, privacy, consent, tenant, household, relationship, law, and purpose. Context Firewall and minimum-necessary disclosure remain mandatory.

External systems may remain authoritative. Aureus can maintain a normalized operational view while preserving the source system as source of truth.

### 2.2 Intent / Desired State — what someone wants to become true

Intent describes the legitimate state a principal is trying to create, preserve, avoid, or understand.

Intent does not itself create a Responsibility. Aureus may understand or explore an intent before accepting work.

A desired state should preserve:

- principal / context;
- requested outcome;
- success criteria where known;
- constraints and preferences;
- non-negotiables;
- time horizon;
- authority boundaries;
- uncertainty and unresolved questions.

### 2.3 Matter — the coordinated real-world situation

A **Matter** is a bounded real-world situation that requires coordinated stewardship across facts, parties, evidence, obligations, institutions, decisions, or professionals.

Examples include a legal dispute, disability claim, benefits appeal, insurance claim, housing problem, tax notice, medical-billing dispute, warranty claim, licensing process, or complex business transaction.

A Matter is **not** the accepted-work root. `Responsibility` remains the canonical record of what Aureus has agreed to carry.

A Matter may exist before Aureus accepts work, may have multiple Responsibilities over time, and may continue after one Responsibility ends.

A Matter should reuse source-domain truth rather than copy it. It may reference:

- parties / roles;
- relevant Reality facts;
- documents / evidence pointers;
- external claim / case / transaction identifiers;
- institution / jurisdiction / forum;
- obligations and deadlines;
- professional participation;
- decisions;
- communications;
- current posture / status;
- verified outcomes.

Domain specializations remain authoritative where needed. `LegalMatter` keeps legal-specific rules, jurisdiction gates, professional boundaries, provenance rules, and legal action gates. Generalization must not flatten domain meaning.

### 2.4 Obligation — what must happen

An **Obligation** is a sourced requirement, promise, dependency, or condition that must be satisfied, monitored, waived, superseded, expired, or truthfully left unmet.

It is stronger than a generic task.

An Obligation should be able to preserve:

- obligor / responsible actor;
- beneficiary / affected party where relevant;
- source or basis: law, court order, contract, policy, promise, application requirement, operational commitment, dependency, or other governed source;
- required condition or action;
- valid / effective time window;
- due date or due rule and the basis used to derive it;
- confidence / verification status of the date or rule;
- consequence or dependency if unmet;
- current owner;
- authority needed to satisfy it;
- completion evidence requirement;
- state: pending, satisfied, waived, superseded, expired, disputed, blocked, or responsibly unresolved as domain rules allow.

The platform must preserve the difference between a **reported deadline** and a **verified deadline**. A model-generated date is never promoted to an authoritative due date merely because the model is confident.

### 2.5 Responsibility — what Aureus promised to carry

PA-021 remains controlling:

> A Responsibility is the bounded work Aureus has accepted in service of moving from the current state toward a verified outcome.

Do not turn Matter, Reality, Obligation, Goal, Journey, Opportunity, Task, or external ticket objects into competing Responsibility roots.

A Responsibility may carry one or more Obligations, may operate within a Matter, and must retain its existing authority, privacy, evidence, no-abandonment, and completion rules.

### 2.6 Authority — what Aureus is allowed to do

Existing Authority / Responsibility Passport / Context Firewall rules remain authoritative.

Facts never grant authority. Matters never grant authority. Urgency never grants authority. Household relationship never grants blanket authority. Professional assignment never grants authority outside the professional's valid role.

Every consequential action still passes through a machine-enforced gateway outside the model.

### 2.7 Capability — who or what can perform the work

Aureus may select the smallest sufficient authorized combination of:

- deterministic code;
- AI models;
- APIs / connected systems;
- browser/computer-use paths;
- communications infrastructure;
- Human Stewards / Navigators;
- qualified professionals;
- institutions / external providers;
- the member or business user;
- physical workers or field verification.

Capability does not equal authority.

### 2.8 Action / Execution — attempted reality transition

An Action is an attempt to change or inspect reality under valid authority.

Actions should preserve, as consequence requires:

- actor;
- principal / context;
- related Responsibility / Matter / Obligation;
- authority decision;
- tool / provider / professional used;
- requested operation;
- attempt/result receipt;
- cost / spend where relevant;
- timestamps;
- failure / partial-completion state;
- next responsible continuation.

A successful tool call is not proof that the intended real-world state changed.

### 2.9 Evidence and Outcome — what actually happened

Evidence must remain source-attributable and truth-typed. Existing `VERIFIED / OBSERVED / REPORTED / INFERRED / SIMULATED` distinctions remain in force where applicable.

An Outcome is a material state change or preserved state proven to the standard required by the Responsibility.

Completion requires appropriate evidence and, for consequential work, independent Execution Assurance. The executor may provide evidence but may not self-certify consequential completion without the required independent basis.

When an Outcome is verified, relevant Reality facts may be updated or appended. Historical truth must not be overwritten as if Aureus always knew the new information.

## 3. Bitemporal truth

For material facts, Aureus should distinguish:

1. **valid time** — when the fact was actually true/effective in the world; and
2. **known time** — when Aureus learned, observed, or recorded it.

Example: an agency decision may be effective September 1 while Aureus receives the notice September 8. A correction on September 12 must not rewrite history to imply Aureus knew the corrected fact on September 1.

This protects:

- legal and benefits chronology;
- accounting and business auditability;
- insurance / claims history;
- employment and contractual state;
- Foundry forecast evaluation;
- Truth Ledger integrity;
- post-incident reconstruction.

The first implementation does not need a universal temporal database. It must, however, avoid a schema that makes the distinction impossible later.

## 4. Outcome Compiler

The **Outcome Compiler** is the governed planning function that reasons from:

```text
current Reality
+ desired state
+ constraints / preferences
+ authority
+ available capabilities / resources
+ applicable rules / knowledge
+ uncertainty
```

toward one or more responsible paths.

It may:

- identify missing facts;
- identify Matters and Obligations;
- surface dependencies and conflicts;
- identify professional / human gates;
- find leverage, resources, benefits, savings, alternatives, or better paths;
- estimate time, cost, risk, reversibility, human attention, and expected value where supported;
- propose plans and Responsibility candidates;
- ask the principal to choose among consequential alternatives.

It may **not**:

- grant itself authority;
- silently create consequential commitments;
- convert uncertain facts into verified truth;
- make professional-reserved judgments merely because it can model them;
- optimize a person against that person's legitimate choices;
- treat prediction as outcome;
- bypass domain-specific gates.

Foundry may evaluate competing paths and forecasts, but Foundry prediction does not become execution authority.

## 5. Portfolio Stewardship

Individual Responsibilities cannot safely optimize themselves when they compete for scarce shared resources.

**Portfolio Stewardship** coordinates active Responsibilities and Matters across scarce resources such as:

- money / cash;
- time;
- member attention;
- Human Steward capacity;
- professional capacity;
- employee / machine / inventory capacity;
- risk budget;
- deadlines / calendar windows;
- institutional funding / appointment slots.

Portfolio Stewardship may surface conflicts, dependencies, and tradeoffs. It does not silently choose consequential priorities for a principal where human choice is required.

This layer should reuse the existing Human Attention Budget and Flourishing / business-value dimensions rather than reduce all decisions to one scalar score.

## 6. Hall, Library, Foundry, and Human Steward roles

### Hall

Hall is not fundamentally a transcript viewer. It is the human-readable, adaptive projection of current reality and active stewardship.

Conversation remains the control surface, while relevant facts, decisions, evidence, obligations, progress, and required human actions come forward as needed.

### Library

Library stores durable governed knowledge: rules, methods, research, institutional knowledge, practices, policies, and admitted/canonical knowledge objects.

Library is **not** the live member/business Reality Graph and must not become a hidden dynamic profile database.

### Foundry

Foundry is the governed laboratory for forecasting, comparing interventions, evaluating observed outcomes, generating learning candidates, and improving Aureus under approval gates.

Foundry does not own live member truth, grant authority, or silently rewrite Reality.

### Human Steward / professional network

Human Steward Operations should evolve toward scarce human judgment / authority / verification capacity, not a traditional manual case-management department.

Aureus should prepare the exact bounded work requiring a person, route it to the appropriate Human Steward or qualified professional, preserve ownership while handoffs occur, and resume the Responsibility afterward.

## 7. Closed-loop Stewardship

The platform-level loop is:

```text
Observe Reality
-> understand Intent
-> detect the gap / opportunity / risk
-> compile responsible paths
-> obtain required choice / authority
-> accept bounded Responsibility
-> satisfy Obligations through authorized capabilities
-> execute
-> independently verify
-> update Reality
-> measure Outcome / value
-> learn safely
-> continue while unfinished work remains
```

This is the universal stewardship loop across People, Business, Academy, institutions, and internal Aureus operations.

## 8. Architecture invariants

The following are non-negotiable:

1. `Responsibility` remains the accepted-work / no-abandonment root.
2. Reality facts never grant authority.
3. Matter never becomes a second generalized workflow root.
4. Domain-specific semantics and gates are not flattened by universal primitives.
5. External authoritative systems remain source-of-truth where appropriate.
6. No universal profile permits cross-context privacy leakage.
7. Source provenance and uncertainty survive normalization.
8. Reported/inferred/simulated data never silently becomes verified truth.
9. Execution success is distinct from verified Outcome.
10. Human/professional assignment never substitutes for valid authority.
11. The Outcome Compiler proposes; it does not self-authorize consequential decisions.
12. Portfolio optimization preserves principal agency and multidimensional flourishing/business constraints.
13. Historical truth is append/correct/supersede aware; corrections do not falsify what was previously known.
14. Learning candidates do not mutate live Reality, authority, policy, or production behavior without governed promotion.
15. No new generic CRM/case/task/workflow database is introduced merely to implement this architecture.

## 9. First implementation proof

Do not begin with a generalized graph database or universal Matter schema.

The first proof must reuse existing canonical primitives and prove the loop with the smallest additive surface:

```text
one source-backed Reality fact
-> one desired state
-> one bounded Matter reference where needed
-> one sourced Obligation
-> one existing Responsibility
-> one authority decision
-> one permitted action or human-gated action
-> independent evidence
-> verified state change
-> Reality history updated
-> privacy-safe Foundry learning candidate
```

The first candidate should prefer projection/reference over copied domain data and must demonstrate that deleting or changing a source-domain fact does not leave a false second source of truth.

## 10. Sequencing with the current People program

This architecture does **not** widen PEOPLE-STEWARD-001 Step 4.

Step 4 remains Human Steward Operations: queue, ownership, capacity, triage, handoff, and truthful human-step resolution on the existing People primitives.

The Step 4 Human Steward capability becomes one future execution resource available to Responsibilities. Triage changes supervision/latency; it does not mutate Reality or grant authority.

The previously identified follow-on deadline/reminder/callback work should be designed as the first **Obligation** slice rather than as an isolated reminder subsystem. That follow-on should prove sourced due rules, owner, status, evidence, and Responsible Continuation without building a generic task engine.

A separate implementation work order defines the first Reality/Matter/Obligation proof. No runtime implementation is authorized by this architecture document alone.

## 11. Independent review questions

An independent reviewer should try to falsify this architecture, especially:

1. Is `Reality` genuinely missing, or does an existing object already serve the role without duplication?
2. Does Matter create a disguised second case/workflow/CRM system?
3. Does Obligation duplicate Responsibility, Task, Milestone, Journey, Goal, or existing deadline state?
4. Can source-domain truth drift from Reality projections?
5. Can a fact or household/business relationship accidentally become authority?
6. Can one context infer or expose private facts from another?
7. Can the Outcome Compiler become paternalistic or self-authorizing?
8. Can Portfolio Stewardship silently decide priorities the principal must own?
9. Is bitemporal truth worth the complexity, and what is the smallest safe first representation?
10. Does the architecture preserve Legal Matter's specialized professional/jurisdiction gates?
11. Does it preserve Business tenant boundaries and external system sources of truth?
12. Can Human Stewards remain bounded judgment capacity rather than recreating manual case management?
13. Can Foundry evaluate outcomes without gaining live operational authority?
14. What can be deleted from this architecture while preserving the same leverage?
15. Is there a simpler primitive that explains Reality, Matter, Obligation, Responsibility, Action, and Outcome more cleanly?

A review PASS freezes an architecture direction, not implementation. Any material runtime design still requires its own exact-head implementation review and Founder authorization.