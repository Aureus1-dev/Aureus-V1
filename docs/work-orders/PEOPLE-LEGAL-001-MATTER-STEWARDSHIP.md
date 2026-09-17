# PEOPLE-LEGAL-001 — Legal / Matter Stewardship

**Status:** Founder-decided capability contract; implementation not yet merged  
**Founder decision date:** 2026-09-17  
**Canonical issue:** #130  
**Construction base:** `631253c8a71560d296a1e2ab4f648ca41d7de880`  
**Repository:** `Aureus1-dev/Aureus-V1`  
**Branch:** `people/legal-001-matter-stewardship`

---

## 1. Decision

Legal / Matter Stewardship is a **core Aureus People capability**.

Aureus is a **Matter Steward / Case Steward, not a lawyer**. It does not replace licensed counsel and it does not acquire the legal authority, professional role, or decision rights of the member or counsel merely because it can organize or execute work.

The governing objective is:

> carry as much of the legal matter as responsibly possible while preserving truth, privacy, agency, evidence, authority, and appropriate human/legal judgment.

A legal matter is not complete because Aureus produced information or made a referral. Stewardship continues through the relevant action, deadline, filing/service, hearing, order, follow-up obligation, or verified outcome unless responsibility is truthfully transferred or the member ends the work.

---

## 2. Canonical matter loop

```text
member conversation / real-world event
    -> legal matter recognized
    -> canonical Responsibility opened or linked
    -> jurisdiction + forum + procedural posture identified
    -> urgency / deadline risk established
    -> current authoritative law + procedure verified
    -> court / agency / docket records attached where available
    -> facts + chronology + evidence organized
    -> counsel / legal-aid / appointed / right-to-counsel options checked
    -> member and counsel prepared
    -> member decisions + legal/human gates honored
    -> permitted filings / service / tasks / follow-up tracked
    -> hearing / conference / appointment preparation
    -> orders / obligations / appeal or reconsideration windows tracked when relevant
    -> outcome verified
    -> ledger closed, transferred, paused, appealed, reopened, or truthfully continued
```

The loop is a specialized expression of the existing Aureus People flow, not a second People operating system.

---

## 3. Non-negotiable role boundary

### The member owns

The member remains principal. The member owns:

- goals and desired outcome;
- the truth of their personal facts and statements;
- whether to retain or dismiss counsel where legally permitted;
- whether to file, answer, plead, settle, appeal, accept/refuse an offer, testify, waive a right, or take another personal legal position;
- signatures, certifications, sworn statements, and attestations unless lawfully delegated through a valid mechanism;
- authorization for Aureus to take any consequential action on their behalf.

Aureus must not convert convenience into loss of agency.

### Licensed counsel owns

Where counsel is engaged, the licensed lawyer owns the professional legal judgment and representation reserved to counsel, including individualized professional advice within the attorney-client relationship, litigation strategy, advocacy, and acts reserved by law or professional rules.

Aureus supports counsel; it does not compete with or silently override counsel.

### Aureus owns stewardship

Within granted authority, Aureus may carry:

- matter intake and structured chronology;
- authoritative-source retrieval and freshness checks;
- evidence and document organization;
- docket / agency / notice reconciliation;
- deadline and obligation tracking;
- counsel / legal-aid / right-to-counsel resource discovery;
- preparation packets for the member and counsel;
- official form and procedure retrieval;
- permitted administrative execution;
- follow-up and status tracking;
- outcome verification and ledger integrity.

### A human steward / authorized person carries

A human handles acts requiring judgment, identity, physical presence, professional authority, reliable verification, or a legally reserved human act when Aureus cannot lawfully or reliably perform them. Examples include signatures/certifications, sworn statements, service that legally requires a person, physical filing where no governed digital path exists, court or agency appearances, and fact verification that cannot be established from trustworthy records.

---

## 4. Mandatory current-law rule

Aureus must **never answer a material legal question from model memory alone**.

Before relying on a legal proposition or procedural instruction, Aureus must establish as applicable:

1. jurisdiction;
2. forum / court / tribunal / agency;
3. matter type;
4. procedural posture / stage;
5. relevant date or time period;
6. current authoritative source;
7. whether the source controls, merely informs, or is uncertain in the member's situation.

Legal research must prefer authoritative current sources appropriate to the matter, including as applicable:

- constitutions, statutes, codes, regulations, ordinances, and official rules;
- official court and agency procedures, filing rules, notices, instructions, and forms;
- official docket / case / agency records;
- controlling or otherwise applicable judicial decisions from authoritative publishers or courts;
- official government guidance where it has relevant legal or procedural weight.

Secondary sources may help explain or locate authority, but they must not silently replace current controlling or official authority when the matter is consequential.

Every material authority used by Aureus should preserve enough metadata to answer:

- **what source is this?**
- **which jurisdiction/forum does it apply to?**
- **when was it checked?**
- **what proposition does it support?**
- **is applicability verified, uncertain, or still requiring licensed judgment?**

If jurisdiction, posture, authority, or deadline treatment is unclear, the system escalates rather than guesses.

---

## 5. Matter ledger

The legal Matter ledger is the truthful operational record of the matter. It is linked to the canonical People `Responsibility`; it is not a replacement Responsibility system.

At minimum, the ledger must be able to represent the following when relevant.

### Identity and scope

- Matter ID;
- canonical Responsibility ID;
- member principal;
- matter type;
- jurisdiction(s);
- court / tribunal / agency / forum;
- current procedural posture;
- urgency and known deadline risk;
- counsel / representative status.

### Parties and real-world subjects

- parties and roles;
- relevant household, employer, landlord/tenant, creditor/debtor, agency, business, or other relationship;
- relevant property, housing unit, vehicle, account, contract, benefit, or other subject matter;
- contact information only where lawful, necessary, and appropriately protected.

### Chronology and facts

- dated events;
- source of each material fact;
- whether each fact is member-reported, document-supported, third-party-reported, officially observed, inferred, disputed, or unknown;
- contradictions and unresolved factual questions.

Aureus must never silently upgrade `REPORTED`, `INFERRED`, or `SIMULATED` material into verified fact.

### Evidence and records

- documents;
- photos / video / screenshots where relevant;
- messages / correspondence;
- notices;
- contracts / leases / policies;
- agency or police records where relevant and lawfully obtained;
- pleadings and orders;
- evidence index;
- missing evidence;
- provenance and custody / source notes sufficient to avoid false certainty.

### Case / agency mechanics

- case, docket, claim, appeal, complaint, citation, or agency numbers;
- judge, hearing officer, mediator, arbitrator, investigator, or assigned official when known;
- filings and filing status;
- service and proof of service;
- hearings, conferences, appointments, inspections, mediations, or other scheduled events;
- deadlines and calculation/source basis;
- orders, rulings, notices, and resulting obligations;
- appeal / reconsideration / review windows where relevant.

### Money and remedies

- amounts claimed, owed, offered, awarded, paid, withheld, or disputed;
- fees / costs where known;
- requested remedies;
- available remedies that authoritative sources identify, without Aureus choosing among them for the member;
- financial consequences and uncertainty where relevant.

### Representation and assistance

- retained counsel status;
- appointed/public-defender status where applicable;
- legal-aid / civil right-to-counsel eligibility or routing status;
- court self-help / official assistance resources;
- referral attempts and outcomes;
- consultation / appointment dates;
- questions reserved for licensed judgment.

### Execution and outcome

- actions completed;
- actor and authority for each consequential action;
- evidence of completion;
- open items;
- next required action;
- blockers;
- verified outcome;
- closure / transfer / pause / reopen reason.

---

## 6. Docket, document, and member-record reconciliation

No single source is assumed complete.

Where available, Aureus reconciles:

```text
member account
+ notices / correspondence
+ filed documents
+ service records
+ docket / agency record
+ official orders / decisions
+ counsel-provided information
= current matter state
```

Conflicts remain visible until resolved. Missing filings, missing service, unexplained docket entries, changed hearing dates, inconsistent case numbers, and contradictory notices are treated as active uncertainty rather than smoothed over.

---

## 7. Counsel and assistance routing

Aureus should seek the best lawful representation/help route available for the actual matter and jurisdiction.

Potential routes include:

- retained licensed counsel;
- free or low-cost civil legal aid;
- jurisdiction-specific right-to-counsel programs;
- appointed counsel where the law provides it;
- public defenders for qualifying criminal matters;
- court / tribunal / agency self-help resources;
- authorized advocates or specialized assistance programs where lawful and appropriate.

### Criminal matters

Aureus does not attempt to replace appointed or retained criminal defense counsel. Its role is to help the member use counsel effectively by organizing chronology, documents, evidence, notices, deadlines, questions, records, and follow-up while preserving counsel's professional judgment and strategy.

### Civil matters

Aureus must not assume a public defender exists. It routes to the correct civil legal-aid, right-to-counsel, self-help, or other lawful system for that jurisdiction and matter type.

### Housing matters

Housing disputes are legal matters when legal rights, process, notices, court/agency action, possession, subsidy/benefit rights, habitability, lockout, eviction, title, or another legal claim is involved. Aureus must determine the actual jurisdiction and current local/state/federal authority that applies; generic national advice is not sufficient for a material housing decision.

A housing Matter can include relevant lease/property facts, notices, inspection/code records, payment ledger, subsidy records, court docket, service, hearing dates, defenses/claims identified by authoritative sources, counsel/right-to-counsel routing, and verified disposition — while preserving the member's decisions and all legal gates.

---

## 8. Pro se support

If counsel is unavailable and the member chooses to proceed without counsel, Aureus prepares the member as fully as responsibly possible while remaining a steward rather than counsel.

Permitted support includes:

- current sourced law and official procedure;
- official forms and filing instructions;
- issue / chronology / evidence organization;
- deadline register;
- filing and service checklist;
- hearing / conference preparation;
- practice explaining truthful facts and organizing questions;
- preparation of questions the member may want to ask the court, agency, opposing party, witness, or future counsel, subject to applicable rules;
- tracking what happened and what must happen next.

Aureus must never:

- invent a fact, record, citation, filing, deadline, testimony, or legal authority;
- coach deception or conceal adverse evidence;
- tell a member to make a false statement;
- fabricate evidence or alter evidence deceptively;
- make the member's settlement, plea, filing, waiver, testimony, or appeal decision;
- sign, swear, certify, or attest for the member without lawful authority;
- hold itself out as a lawyer or representative when it is not one.

---

## 9. Preparation packet

Aureus should be able to produce a concise, evidence-linked preparation packet for either counsel or a pro se member containing, as applicable:

1. matter summary;
2. jurisdiction / forum / posture;
3. next known date and deadline register;
4. chronology;
5. parties and roles;
6. issue list;
7. evidence index and missing evidence;
8. docket / filing / service status;
9. current authoritative-source packet with checked dates;
10. member goals and decisions already made;
11. unresolved factual or legal questions;
12. questions requiring licensed professional judgment;
13. next actions and actor/authority for each.

Raw private material should not be copied into broader systems merely to make the packet convenient. Access remains need-based and private by default.

---

## 10. Deadline doctrine

Legal deadlines are high-consequence obligations.

For every material deadline Aureus tracks, it should preserve where reasonably available:

- deadline date/time;
- governing time zone;
- triggering event;
- source / rule / order / notice that establishes the deadline;
- calculation method if calculated;
- filing/service destination and method;
- current completion state;
- proof of completion;
- uncertainty or legal-review requirement.

A deadline inferred from incomplete information is not silently represented as verified.

Where deadline interpretation is ambiguous or high stakes, route to the human/legal gate immediately while still helping gather the records needed to resolve it.

---

## 11. Human / legal gate

Human or licensed-legal judgment is required when any of the following is material:

- individualized professional legal judgment reserved to a licensed professional;
- representation or advocacy requiring legal authority;
- uncertain high-stakes statutory, case-law, jurisdictional, procedural, limitations, or deadline interpretation;
- signatures, certifications, sworn declarations, notarization, or attestations;
- legally reserved filing, service, appearance, negotiation, or representative acts;
- physical-world action Aureus cannot verify or lawfully perform;
- a member asks Aureus to decide a consequential personal legal choice that belongs to the member;
- conflicting sources cannot be resolved with authoritative evidence;
- any other action that law, court/agency rule, Aureus authority policy, or reliability requires a qualified human to perform or verify.

The gate does **not** mean Aureus stops helping. Aureus continues all safe surrounding stewardship — organization, current-source retrieval, evidence preparation, scheduling, deadline tracking, questions, logistics, follow-up — while the gated judgment/action is handled by the proper person.

---

## 12. Privacy and authority

Legal matters remain private by default under Aureus's existing trust doctrine.

Creating a Matter must not make private legal conversations, records, evidence, or strategy casually visible to employees, contractors, institutions, business customers, or other members.

Access requires an actual authorized need and must remain consistent with the existing Aureus consent/authority system.

Aureus must not claim that information is protected by attorney-client privilege merely because it is stored in a Matter. Where privilege, confidentiality, work-product protection, sealing, juvenile/confidential-record rules, or another legal protection may matter, the system should preserve confidentiality and route interpretation to appropriate legal judgment rather than make an unsupported claim.

Consequential external actions require the same explicit authority discipline as the rest of Aureus. A learning signal, model inference, prior similar case, or operational convenience never grants authority.

---

## 13. Truth and provenance

The Matter ledger must preserve the difference among at least:

- **OBSERVED** — directly established by a trusted system/official record or other governed observation;
- **REPORTED** — stated by the member or another source but not independently verified;
- **INFERRED** — derived analytically from other information;
- **SIMULATED** — hypothetical or forecast material.

Those classes must never be silently upgraded.

Legal conclusions require their own source/applicability record. A verified statute is not the same thing as a verified conclusion that the statute governs the member's exact facts.

Aureus tells the truth about what it knows, what source supports it, what is uncertain, what is disputed, and what still requires qualified judgment.

---

## 14. Learning boundary

Matter outcomes may feed the governed stewardship learning loop established by `PEOPLE-LEARN-001`, but learning remains downstream of the truth record.

Learning may identify patterns such as:

- repeated missing-document friction;
- referral failure;
- deadline risk patterns;
- confusing official procedures;
- recurring evidence gaps;
- capability gaps;
- successful preparation methods;
- jurisdiction-specific operational needs.

Learning must not:

- change the live member's legal position;
- grant authority;
- create or submit a filing;
- select a remedy for the member;
- automatically treat one matter's result as controlling law for another;
- deploy a new legal rule or policy without governance and current authority validation.

---

## 15. Reuse before build

Implementation must inspect and reuse the existing canonical primitives before adding new state:

- People `StatedNeed` / need-resolution path;
- canonical `Responsibility` ownership and status;
- consent and authority gates;
- communication records;
- existing evidence / outcome machinery;
- resource / opportunity / provider connections where applicable;
- stewardship-learning projection from `PEOPLE-LEARN-001`;
- Library / Foundry interfaces only through their governed contracts.

Do **not** create a second generalized:

- CRM;
- case-management platform;
- workflow engine;
- member-history store;
- evidence database;
- task system;
- permission system.

Matter-specific state is justified only where the general Aureus primitives cannot faithfully represent legal-specific truth such as jurisdiction, posture, docket, official authority, filings/service, hearings/deadlines, counsel routing, or verified legal outcomes.

---

## 16. First implementation slice

The first code slice should prove one complete Matter path rather than a broad legal platform.

Minimum vertical proof:

```text
real People conversation
 -> legal need recognized
 -> canonical StatedNeed / Responsibility
 -> bounded Matter record linked to Responsibility
 -> jurisdiction + forum + posture + urgency
 -> at least one current authoritative source with provenance/freshness
 -> member-reported fact separated from verified official fact
 -> evidence / notice / deadline represented
 -> representation / legal-aid / self-help route represented
 -> member preparation packet
 -> human/legal gate demonstrated for reserved judgment/action
 -> permitted next action tracked
 -> truthful result/outcome recorded
 -> Matter remains open until completion/transfer/closure is evidenced
```

The first slice must include both allow-path and deny-path proof.

### Required deny-path proof

At minimum prove that Aureus cannot:

- expose one member's Matter to another member;
- treat a civil matter as if a public defender is automatically available;
- represent stale/model-memory-only law as current verified authority;
- upgrade member-reported facts to official facts;
- execute a gated legal action without authority;
- mark a Matter complete because a referral was merely provided;
- reassign evidence or deadlines to the wrong Responsibility / Matter;
- leak raw legal content into the stewardship-learning candidate export.

---

## 17. What Step 1 does not authorize

This contract does not authorize:

- Aureus practicing law;
- autonomous representation;
- autonomous settlement / plea / waiver / filing decisions;
- a generalized law-firm product;
- automatic legal conclusions from model memory;
- automatic changes to legal policy based on learning;
- broad staff access to member legal files;
- bypass of court/agency identity, signature, filing, service, or appearance rules;
- replacement of existing Aureus Responsibility, evidence, consent, or privacy architecture.

---

## 18. Acceptance gate

The implementation is mergeable only after all of the following are true at one exact head SHA:

1. the smallest complete vertical slice is implemented;
2. unit/integration/E2E tests cover the intended path and material deny paths;
3. Build & Test is green;
4. Docker Build Verification is green;
5. an independent reviewer who did not author the candidate adversarially reviews the complete base-to-head change;
6. every BLOCKER/HIGH finding is repaired and receives a fresh exact-head review;
7. the final independent verdict contains zero BLOCKER/HIGH findings;
8. the Founder separately authorizes merge.

No model review, CI result, issue label, or draft PR substitutes for Founder merge authority.

---

## 19. Completion definition

`PEOPLE-LEGAL-001` is complete only when Aureus can truthfully demonstrate a real legal Matter moving from conversation through governed stewardship to a verified outcome while:

- preserving the member as principal;
- using current authoritative law/procedure rather than memory;
- keeping facts/evidence/provenance separate and truthful;
- carrying deadlines and execution rather than merely advising;
- finding and supporting counsel where available;
- responsibly preparing a pro se member where counsel is unavailable and the member chooses to proceed;
- respecting privacy and explicit authority;
- invoking human/legal judgment where required;
- reusing the canonical People/Responsibility/evidence system;
- proving completion through the ledger.

**Help starts here. Completion is proved, not claimed.**
