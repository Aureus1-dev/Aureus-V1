# CAP-015 Constitutional Conformance Matrix

**Status:** Active build-control artifact  
**Constitutional status:** CAP-015 is Founder-substance-approved and Under Review; proposed OAS-012 is not yet Canonized.  
**Rule:** Pending canonization, Aureus may implement additive and non-conflicting protections from CAP-015, but may not use the proposal as authority to weaken current Canon or exercise a new constitutional power.

---

## Enforcement ladder

- **R1 — Published rule:** necessary but insufficient for a launch-critical protection.
- **R2 — Review/process:** named accountable review and evidence trail.
- **R3 — Test:** deterministic or scenario test fails on violation.
- **R4 — Type/schema/configuration:** the prohibited state is rejected by a governed contract or configuration.
- **R5 — Structural:** the prohibited capability or authority path does not exist.

For software-addressable protections, prefer R4 or R5 with R3 verification. Human/institutional mechanisms require R2 plus independent evidence, and where technically possible R3/R4 support.

---

| OAS-012 candidate article | Protection | Primary implementation domain | Minimum target | Build status / next concrete evidence |
|---|---|---|---|---|
| 1 | Constitutional supremacy / no lower override | Library + Foundry + V1 | R4 | Add exact constitutional source/revision pin to consumer contracts; fail closed on unknown or stale constitutional baseline. |
| 2 | Purpose / Failure Mode / Assumptions / Present Mechanism | Living Library | R4 | Extend constitutional metadata or governed companion artifact; validate required fields for protected mechanisms. |
| 3 | Qualified-duty interpretation | Governance / audit | R2+R3 | Decision record must name qualifier, factual basis, scope, evidence, reviewer; regression cases for unexplained departures. |
| 4 | Tier I / Tier II process | Governance | R4 | Constitutional action schema with tier, notice, bodies, thresholds, publication, conflict review and effective-state gates. |
| 5 | Significant amendments / member initiative | Governance | R4 | Initiative and amendment state machines; verification must not let an initiating body self-amend its authority. |
| 6 | Mission Protector authority ceiling | Governance + IAM | R4/R5 | Enumerated permission set only; no generic executive scope; residual action requires Tribunal authorization object with expiry. |
| 7 | Tribunal independence/removal | Governance | R4 | Appointment/removal record schema; cause enum; cross-body concurrence; retaliation flag and audit. |
| 8 | Assembly anti-capture/sortition | Governance | R3/R4 | Sampling, acceptance/decline, conflict, accommodation, replacement and attrition records; bias report. |
| 9 | Safeguarding floor | Safety + identity | R4/R5 | No covered youth/vulnerable-person program without safeguarding protocol and accountable-human escalation path. |
| 10 | Class A / Class B emergency protection | Security + release | R4/R5 | Protected-control registry; operations cannot mutate Class A; Class B changes carry expiry/reversion. |
| 11 | Emergency cumulative limits | Governance + incident | R4 | Rolling-window emergency ledger; cause aliasing detection; day 61+ requires recorded concurrence. |
| 12 | No benefit from delay | Governance + release | R4 | Overdue-counterpower state automatically blocks relevant expansion/capability/domain transitions; urgent-need exception logged. |
| 13 | Constitutional clock | Governance | R4 | Earliest-trigger date computed from ratification/member/revenue/capital events; immutable event provenance. |
| 14 | Counterpower funding | Finance + governance | R3/R4 | Protected funding ledger; independent needs assessment; alert/block on silent real-capacity reduction. |
| 15 | Steward confidentiality | Privacy + data | R4 | Access-purpose enum, minimization, member-visible access log, opt-in training consent; generalized-learning route rejects absent consent. |
| 16 | No engagement optimization in incentives | Product + HR + vendor | R4 | Forbidden-metric registry covers product objectives, compensation, performance targets and vendor contracts. |
| 17 | Member-created value | Finance + member rights | R2/R4 | Material-contribution record, compensation/benefit-sharing disposition, independent dispute route. |
| 18 | Abundance measurement | Finance | R3 | Consolidated net-asset calculation includes controlled entities/assets; detect artificial classification/transfer avoidance. |
| 19 | External critic independence | Governance + finance | R4 | Multi-year protected funding instrument and retaliation-resistant renewal/retender record. |
| 20 | Enforcement follows authority | Governance | R3/R4 | Authority graph rather than org-chart-only scope; institution-wide actor can trigger institution-wide consequence. |
| 21 | Review quality over ritual frequency | Safety/governance | R3 | Renewal interval decision uses evidence maturity, clean drills, monitoring, incidents, assumptions; material change reopens review. |
| 22 | Costed Service Floor | Finance + Assembly + Tribunal | R4 | Floor-change packet cannot advance without cost, demand, solvency, alternatives and consequences fields. |
| 23 | Dependency / meaningful exit | Outcomes + member rights | R3 | Exit-cost indicators include two-essential-function threshold and qualitative pre-data trigger. |
| 24 | Transfer/jurisdiction continuity | Legal + governance + IAM | R2/R4 | Mission-critical asset registry; transaction checklist; transferee covenants where lawful; jurisdiction concentration review. |
| 25 | Omissions/non-decisions | Service + case management | R3/R4 | Every undertaken matter has owner, deadline, state and closure/handoff criterion; expired unowned queue item is failure, not neutral state. |
| 26 | Evidence integrity | Security + audit | R4/R5 | Tamper-evident logs, provenance, separation of duties, independent verification source where available; evidence failure triggers authorization uncertainty. |
| 27 | Protected dissent | HR + governance | R4 | Protected-act record, 24-month rebuttable-presumption window, adverse-action conflict check; no gag-clause template. |
| 28 | Constitutional Integrity Register | Library | R3/R4 | Machine-readable Authority→Trigger→Actor→Constraint→Reviewer→Remedy→Deadline→Implementation→Evidence map; validator detects orphans. |
| 29 | Cross-reference map | Library | R3/R4 | Parse/maintain all delegations and resolution state; unresolved operative delegation blocks final amendment release. |
| 30 | Plain-language companion | Experience + governance | R3 | Rights/remedy parity test between legal text and companion; accessibility and translation governance. |
| 31 | Plural adversarial review | Governance | R2 | Independent-review packet and disposition registry; first reviews blind to prior red-team reports where practicable. |
| 32 | Founding Review & Dissent Record | Library | R4 | Separate warning/prediction record from actual Failure Canon; preserve acceptance/rejection reasoning and reconsideration trigger. |
| 33 | Operative defaults | Governance | R4 | Default thresholds/config kept in governed schedule; no silent lower-value override. |
| 34 | Substance over form | Foundry + governance | R3 | Anti-evasion cases test entity/title/vendor/jurisdiction/timing relabeling against same functional conduct. |
| 35 | Competitive pressure not permission | Governance + release | R3 | Scenario tests require reduce/redesign/transfer/suspend/leave rather than constitutional bypass. |
| 36 | Founder-reserved exclusion | Governance + IAM | R5 | CAP-015 carries no transition action, credential-transfer operation, veto mutation, compensation mutation, or founding-period-end trigger. |

---

# Project-wide build rule

Every new material feature, workflow, agent capability, permission, business process, financial mechanism, experiment, data use, or release shall identify:

1. the constitutional rule(s) it touches;
2. whether it creates or exercises authority;
3. the responsible human/institutional owner;
4. its enforcement rung;
5. the evidence that proves conformance;
6. rollback/revocation where relevant; and
7. any unresolved constitutional dependency.

A feature with an unresolved constitutional dependency may be researched, mocked, simulated, or shadow-tested if safe, but may not silently acquire production authority.

---

# Repository responsibility split

## Living Library

Owns admitted constitutional records, provenance, constitutional relationship mapping, the integrity register, cross-reference map, historical review/dissent records, and versioned retrieval of governing knowledge. It records constitutional authority; it does not manufacture it.

## Foundry

Consumes the exact governing constitutional release; classifies consequence and authority; refuses prohibited work; assembles evidence and work orders; independently reviews outcomes; records uncertainty and disagreement; and may propose Knowledge Candidates. It may never change Canon automatically.

## Aureus-V1

Implements member/business experience, permissions, consent, memory rights, action states, case ownership, human handoff, safeguarding surfaces, complaints/remedies, release gates, and user-visible constitutional protections.

## Business / Operations

Implements finance, HR incentives, vendor contracts, counterpower resourcing, service-floor solvency, protected dissent, legal structures, and institutional decision processes under the same constitutional baseline.

---

# Stop conditions

A release or expansion must stop when a required constitutional control is absent and the missing control is material to the authority or consequence being introduced.

A stop is not a project failure. It is the enforcement mechanism working.

Where current Canon and CAP-015 differ before CAP-015 canonization, the project shall obey current Canon and may voluntarily implement the stronger CAP-015 protection only where doing so is lawful and non-conflicting.
