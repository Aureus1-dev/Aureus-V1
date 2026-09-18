# PA-023A — Persistent Participant & AI-First Communication

**Parent architecture:** `PA-023 — Reality, Matter & Execution Architecture`  
**Status:** Founder-directed amendment candidate; independent review required before fold-in/freeze  
**Date:** 2026-09-18  
**Branch purpose:** Preserve this amendment without moving the exact PR #139 head currently under independent review.  
**Runtime authority:** None. This document does not itself enable calls, recordings, messages, submissions, or external actions.

## 1. Discovery

Communication should not be treated as inherently human work.

Phone, email, SMS, chat, portal messaging, scheduling, and similar communication channels are **execution capabilities**. When a valid Responsibility requires communication, Aureus should carry that communication itself whenever the applicable authority, identity, disclosure, privacy, recording/consent, professional-boundary, and counterpart rules permit it.

The default should therefore move from:

```text
Aureus prepares a person
-> person contacts the outside party
-> person reports back
-> Aureus resumes
```

toward:

```text
Aureus prepares a bounded communication mission
-> Authority/Policy Gateway permits the channel/action
-> Aureus communicates directly
-> preserves attributable evidence / receipts
-> creates or updates resulting Obligations / Reality facts
-> escalates only the bounded portion requiring a person
-> resumes execution afterward
```

A human is not required merely because the medium is a telephone.

## 2. Persistent Participant doctrine

When Aureus has accepted a Responsibility, Aureus should remain the **persistent participant** in execution wherever responsibly possible.

Aureus should not disappear at the exact moment real work begins and then depend on a human to reconstruct what happened.

Where allowed, Aureus should remain present before, during, and after communication so the same stewardship context survives the interaction.

A communication may therefore transition among:

```text
Aureus alone
-> Aureus + member / Human Steward / professional
-> Aureus alone
```

without abandoning the underlying Responsibility or requiring the participant to restart the matter from the beginning.

Persistent participation does not authorize surveillance, hidden recording, impersonation, or unrestricted transcript retention. Privacy, notice, consent, law, policy, and minimum-necessary data rules remain controlling.

## 3. Bounded Communication Mission

Every consequential outbound or interactive communication should operate from a machine-enforced bounded mission derived from the Responsibility Passport and applicable policy.

At minimum the mission should define, where relevant:

- principal / context;
- related Responsibility / Matter / Obligation;
- exact communication objective;
- counterpart / destination and how identity is verified;
- allowed facts / fields Aureus may disclose;
- facts Aureus may request or confirm;
- actions Aureus may perform during the interaction;
- actions requiring new approval;
- actions reserved to the member, authorized human, or qualified professional;
- prohibited actions;
- spending / commitment / settlement / signature limits;
- required disclosure that Aureus is an AI or automated representative where applicable;
- recording/transcription rules and consent state;
- retention / redaction requirements;
- escalation triggers;
- completion / evidence standard;
- Responsible Continuation path if the counterpart refuses, the channel fails, identity cannot be verified, or authority is insufficient.

The communication model may propose language. It may not widen the mission or reinterpret a prohibition as permission.

## 4. AI-first call execution

For a permitted phone call, Aureus should be able to:

1. identify the correct destination from a governed source;
2. place the call through an approved communications provider;
3. make any required identity / AI / recording disclosure;
4. navigate menus and waits where permitted;
5. disclose only mission-necessary authorized information;
6. ask bounded questions;
7. obtain attributable responses, names/roles where available, reference numbers, promised dates, and next requirements;
8. distinguish what the counterpart **said** from what an authoritative source independently proves;
9. create/update sourced Obligations, communications evidence, and Reality projections under existing truth rules;
10. request approval or bring an authorized person into the live interaction when a decision exceeds its authority;
11. continue the Responsibility after the call rather than treating the call itself as completion.

Aureus must not silently impersonate the member, Human Steward, lawyer, clinician, accountant, employee, officer, or any other person/professional role.

## 5. Human/professional join-in

Aureus should escalate **inside the communication** when possible rather than abandoning the interaction.

Examples of human/professional-required transitions include:

- legally or contractually required identity confirmation;
- member-owned consequential choice;
- signature / certification / sworn statement;
- licensed professional judgment or representation;
- negotiation or settlement authority not granted to Aureus;
- highly relational/sensitive interaction where human presence is intentionally part of the service;
- physical observation/action;
- counterpart refusal to proceed with an AI/automated agent where no alternate permitted route exists.

The human receives the prepared context and exact question/decision, participates only as needed, and Aureus resumes stewardship afterward.

## 6. Communication evidence is not automatic truth

A call or message produces evidence, not universal truth.

The architecture must distinguish at least:

- Aureus observed/heard a statement;
- a named/identified representative reported a statement;
- an institution sent a written notice;
- an authoritative system returned a status;
- Aureus inferred a conclusion;
- the real-world outcome was independently verified.

A representative saying “your application was approved” is not automatically equivalent to a verified authoritative approval unless the governing domain accepts that statement as sufficient evidence.

A call recording/transcript, when lawfully created and retained, remains sensitive evidence subject to the same privacy/context/retention rules as other private matter data.

## 7. Learning from communications

Privacy-safe, governed communication outcomes may support learning such as:

- which contact route actually reaches the correct unit;
- routing/menu patterns;
- wait/response characteristics;
- common document requests;
- repeated transfer/failure patterns;
- promise reliability;
- discrepancies between reported procedure and authoritative procedure;
- which authorized routes lead to verified resolution.

Do not promote one representative's statement into institutional policy.

Raw private calls/transcripts do not become shared Library knowledge by default. Any generalized learning must pass the existing privacy, transformation, evidence, governance, and Library admission rules.

## 8. Human Steward role refinement

PA-023 currently describes Human Stewards/professionals as scarce human judgment / authority / verification capacity. This amendment sharpens that rule:

> Humans supply scarce human capability. Communication medium alone does not make work human-only.

Human Stewards should not become default telephone operators, message relays, or manual note-takers merely because external work is conversational.

Aureus should carry administrative communication whenever responsibly possible and route humans for the parts that genuinely require human judgment, authority, relationship, professional role, identity, physical action, or verification.

## 9. Safety and authority invariants

1. Communication never creates authority that did not already exist.
2. A phone number, email address, portal access, or connected account is a capability/destination, not permission.
3. Aureus does not impersonate a person or professional.
4. Recording/transcription occurs only when applicable law/policy/consent requirements are satisfied.
5. Sensitive information is disclosed on a minimum-necessary basis.
6. Counterpart authentication and destination integrity matter; Aureus must not disclose private data merely because someone answered a number.
7. A representative statement preserves speaker/source attribution and does not silently become VERIFIED institutional truth.
8. New consequential decisions trigger approval/human/professional gates rather than model improvisation.
9. Communication success is not Responsibility completion.
10. The communication executor may not self-certify consequential real-world completion where independent assurance is required.
11. Failed/refused communication triggers Responsible Continuation rather than abandonment.
12. Humans can join a live communication without transferring ownership of the whole Responsibility to the human.

## 10. Relationship to RME-001

RME-001 should not be widened into a complete voice/telephony platform.

The first RME proof may use an existing bounded communication capability if one already exists and can be governed under current authority.

If communication infrastructure is not already sufficient, AI-first calling should be implemented as its own bounded Execution Adapter slice after PA-023/PA-023A are independently reviewed and frozen.

That slice must prove:

```text
Obligation requiring external communication
-> bounded mission
-> authority/policy decision
-> AI communication attempt
-> attributable communication evidence
-> human join-in only if required
-> resulting Obligation/Reality update
-> independent outcome verification where required
-> Responsible Continuation
```

## 11. Independent-review questions

Reviewers should attack at least:

1. Is “AI-first” actually safer/better than prepared human calls for the proposed domains?
2. Can Aureus reliably disclose its identity/role without impersonation or confusion?
3. Can laws/policies around recording, automated calling, consent, identity, regulated communications, and professional representation be enforced outside the model?
4. Can authentication challenges force disclosure of private information before the counterpart is verified?
5. Could a voice agent be socially pressured into expanding authority?
6. Can a human join without losing call state, attribution, privacy boundaries, or Responsibility ownership?
7. How do we prevent raw transcript accumulation from becoming a surveillance database?
8. What evidence from a call is sufficient for each domain, and what still requires independent verification?
9. Can communication learning be generalized without exposing member/tenant/private information?
10. Are there contexts where the correct default should remain human-led even though AI technically could speak?
11. Can the same bounded mission model govern phone, SMS, email, portal messaging, and scheduling without flattening channel-specific legal/technical rules?
12. Does this doctrine reduce Human Attention Budget without weakening trust or agency?

A review PASS authorizes an architecture direction only. It does not enable autonomous calls or any provider integration by itself.
