# AUREUS-COMM-001 — AI-First Communication Execution

**Architecture:** `PA-023 — Reality, Matter & Execution Architecture` + `PA-023A — Persistent Participant & AI-First Communication`  
**Status:** Future implementation work-order candidate; do not construct until parent architecture is independently reviewed/frozen and the active prior slice is dispositioned  
**Runtime authority:** None from this document alone.

## 1. Job

Prove one complete, bounded AI-carried external communication in service of an existing Responsibility while preserving authority, identity, privacy, source attribution, human join-in, independent outcome truth, and Responsible Continuation.

The purpose is not to build a general call center. The purpose is to prove that communication can be treated as a governed Execution Adapter rather than automatically as Human Steward work.

## 2. Target loop

```text
existing Responsibility
-> sourced Obligation requiring external communication
-> bounded Communication Mission
-> Authority/Policy Gateway
-> verified destination/counterpart path
-> Aureus communicates
-> attributable evidence/receipt
-> human/member/professional joins only if required
-> resulting Obligation/Reality state updated
-> independent verification where consequence requires
-> Responsibility continues until its own Done Means is satisfied
```

## 3. Reuse-first requirement

Before adding schema/provider code, inspect current repository and classify each need as REUSE / EXTEND / PROJECT / BUILD / REJECT across at least:

- Responsibility / Responsibility Passport / Authority grants;
- Communication/evidence infrastructure already used by Business;
- People Need/Stewardship communication state;
- Legal Matter action gates and preparation/evidence contracts;
- notification/SMS/email/voice provider abstractions, if any;
- audit / Truth Ledger / evidence receipt structures;
- Reality / Obligation implementation available at construction time;
- Human Steward Operations join/escalation path;
- privacy/redaction/retention controls;
- provider credential/secrets boundaries.

Do not build a second communication truth system if existing receipts/events can represent the required evidence safely.

## 4. First proof constraints

The constructor must select one low-to-moderate consequence communication whose bounded objective can be tested safely.

The first proof must NOT depend on:

- impersonating the member;
- licensed professional judgment;
- agreeing to settlement/contract terms;
- sworn statements/certifications;
- payment initiation;
- emergency dispatch;
- unrestricted private-data disclosure;
- a claim that a spoken response alone proves the final underlying outcome when domain rules require more.

If no suitable current Responsibility exists, stop and document that rather than inventing a fake workflow.

## 5. Bounded Communication Mission contract

The execution input must contain at least:

- principal/context;
- Responsibility ID;
- Matter/Obligation reference where present;
- communication objective;
- destination/counterpart and source used to resolve it;
- allowed disclosures;
- allowed questions/actions;
- approval-required actions;
- human/member/professional-only actions;
- prohibited actions;
- identity/AI disclosure requirement;
- recording/transcription decision and legal/policy basis;
- retention/redaction policy;
- maximum spend/duration/retry bounds where applicable;
- escalation triggers;
- evidence requirement;
- failure/continuation route.

The runtime executor cannot widen this mission.

## 6. Identity and counterpart integrity

The proof must demonstrate that Aureus:

- does not claim to be the member or a professional;
- identifies its role accurately where required;
- verifies the destination/counterpart to the standard required before disclosing protected information;
- stops/escalates when authentication requires a human-controlled secret or identity act not validly delegated;
- preserves who made each material statement when known.

## 7. Human join-in

The first proof must support at least one tested transition where the AI reaches a gate it cannot cross and routes the exact bounded need to the authorized human/member/professional without ending the whole Responsibility.

The test should prove:

```text
AI active
-> gate detected
-> no unauthorized action taken
-> human joins / provides required act or decision
-> evidence preserved
-> AI resumes
```

If live join-in infrastructure is not available, the first implementation may model the transition as a governed pause/resume, but it must preserve the same ownership and evidence semantics.

## 8. Evidence and truth

Store/emit only what is justified and permitted.

The system must distinguish:

- communication attempt;
- connection established;
- counterpart identity/role where known;
- statement reported by counterpart;
- reference/case number;
- promise/commitment and promised date;
- document/status requested;
- authoritative written/system receipt if later obtained;
- independently verified Outcome.

A successful call/message does not by itself complete the underlying Responsibility.

## 9. Recording/transcription

Recording/transcription must be policy-gated outside the model.

The first proof must not assume universal permission to record.

Where recording/transcription is not permitted or not justified, the system should preserve the minimum lawful structured receipt needed for stewardship rather than bypass the restriction.

Raw audio/transcripts must not become cross-member, cross-tenant, Foundry, or Library training/knowledge input by default.

## 10. Learning

Only privacy-safe governed learning candidates may leave the operational context.

Potential learning includes route success, transfer patterns, response latency, promise reliability, and verified process friction.

A single representative statement must not become canonical institutional knowledge.

## 11. Required adversarial tests

At minimum prove:

1. executor cannot call/message outside the permitted destination scope;
2. executor cannot reveal fields outside the bounded disclosure set;
3. prompt/model cannot widen authority or prohibited actions;
4. counterpart identity failure prevents sensitive disclosure;
5. AI does not impersonate member/professional;
6. recording/transcription cannot activate without the policy/consent condition;
7. human-only decision causes a gate, not improvisation;
8. human join/pause does not abandon Responsibility ownership;
9. representative statement remains attributed/reported rather than silently VERIFIED;
10. failed call, refusal, timeout, provider error, or counterparty refusal triggers Responsible Continuation;
11. communication success cannot auto-complete the underlying Responsibility without canonical evidence;
12. private transcript/audio does not leak into Foundry/Library/generalized learning by default;
13. retries respect bounded frequency/spend/contact rules;
14. provider receipt and real-world outcome remain separate;
15. existing People, Business, Legal, Authority, Household, and Human Steward boundaries do not regress.

## 12. Explicit non-goals

Do not build in COMM-001:

- generalized autonomous call center;
- mass outbound campaigns;
- sales persuasion engine;
- collections harassment system;
- emergency-services automation;
- universal recording archive;
- professional impersonation;
- unrestricted negotiation authority;
- generalized payment/contract execution;
- broad computer-use/browser automation;
- cross-tenant communication memory;
- automatic Library canonization of call content.

## 13. Acceptance criteria

COMM-001 is complete only when:

1. one real existing Responsibility drives a bounded communication need;
2. the mission is machine-enforced outside model discretion;
3. counterpart/destination handling is evidence-backed;
4. AI performs only permitted communication actions;
5. at least one human-gate path is proven;
6. communication evidence is source-attributed;
7. outcome truth remains independently governed;
8. failure/refusal preserves the underlying Responsibility and continuation path;
9. privacy/recording/retention rules are enforced outside the model;
10. learning export is privacy-safe and non-canonical by default;
11. exact-head mechanical gates pass;
12. independent exact-head review has zero BLOCKER/HIGH findings;
13. Founder separately authorizes merge.

## 14. Sequencing

Do not append this implementation to PEOPLE-STEWARD-001 while that slice is under independent review.

COMM-001 should begin only after:

- PR #139 is independently reviewed and dispositioned;
- PA-023/PA-023A architecture is reconciled/frozen;
- the relevant Obligation/Reality representation exists or the constructor proves the first communication slice can safely project from existing canonical state without duplicating it.
