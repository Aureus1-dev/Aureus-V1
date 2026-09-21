# AUREUS-016 — Steward Voice & Interface Canon Reconciliation

**Status:** REPAIRED AFTER INDEPENDENT HOLD / docs-only canon reconciliation  
**Register parent:** Item 03 — AUREUS-016  
**Predecessor:** REG-001 / PR #166  
**Base:** live `main` at `ad684a72db1ccc784a3507ad41f234fa3eca371a`  
**Branch:** `docs/aureus-016-voice-interface-reconciliation`  
**Historical source branch:** `docs/steward-voice-interface-standard` at `4a9db08c4fa39982cf36ead4705d13b9798bb5d4`  
**Release impact:** documentation-only; no runtime behavior, schema, provider, prompt, workflow, release manifest, or deployment contract change.

> **Merge-stable status rule:** on this review branch, AUREUS-016 is the candidate under construction/verification. Once the accepted canon and matching register update are present on `main`, AUREUS-016 is complete and Register Item 04 becomes current, beginning with UI-004 — Waiting. No post-merge status-only cleanup commit should be required.

## 1. Purpose

Reconcile the Founder-authored historical Steward Voice & Interface doctrine onto fresh current `main` without merging the stale branch unchanged, without undoing accepted Hall/UI/SAI/LRG work, and without pulling later Carry/Mission/Room/Ledger implementation ahead of the Master Register.

Core thesis:

**The interface is the Steward's body.**

The visible experience and spoken/text Steward must tell one truthful story about what Aureus is carrying, asking, waiting on, choosing, recovering, and finishing.

## 2. Required source reconciliation

The constructor must reconcile against:

- `docs/100-experience/AUREUS-004 — THE STEWARD CANON`;
- `docs/100-experience/AUREA-002 — ARRIVAL CANON`;
- historical `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md` on `docs/steward-voice-interface-standard`;
- historical `docs/work-orders/AUREUS-STEWARD-VOICE-INTERFACE-001.md` on that branch;
- PR #163 Hall/brevity repair;
- UI-003 / PR #162 Active Work Surface;
- SAI-001 / PR #164;
- LRG-001 / PR #165;
- current Master Discovery & Execution Register / REG-001.

## 3. Reconciliation decisions

### A. Do not merge the historical branch

The old branch predates accepted Hall, UI-003, SAI, Living Release Gate, and REG-001 work. Its documents are evidence/source material only.

AUREUS-016 must be rebuilt from fresh `main`.

### B. Preserve the normal Hall opening

The accepted normal front door remains:

- one heading: `How can we help?`
- one supporting line: `Tell me what you want to accomplish.`
- composer directly available;
- no duplicate promise paragraph;
- no forced account flow, feature tour, or branded ceremony before help.

### C. Reconcile name/pronunciation rather than discard it

The historical doctrine's care around preferred name/pronunciation remains valid, but it becomes an early relationship duty rather than a gate before help. Immediate work or urgent help may begin first. Never re-ask a known preferred name/pronunciation without a real reason.

### D. Preserve PR #163 brevity and continuity

Ordinary responses remain brief by default. Simple greetings with no objective may receive one short introduction/question. Established objectives or active work must continue in context rather than trigger a reset or repeated intake.

### E. Preserve one work truth

UI-003's single Active Work Surface remains the accepted direction. This canon may define member-facing state semantics but may not create a second work/status/case reality.

### F. Preserve SAI boundaries

SAI owns internal Answer Contract, context/evidence/expertise routing, Prompt Compiler, consequence scaling, verification, and Presentation Composer architecture. AUREUS-016 defines the experience contract the Presentation Composer and UI must satisfy; it does not duplicate SAI.

### G. Preserve Living Release Gate authority

AUREUS-016 is docs-only. Later production state slices use the existing Living Release Gate and separate Accountable Steward acceptance. This slice adds no release contract.

### H. Do not pull later register items forward

Historical draft material about Carry Board/Card, Mission Rooms, and ledger testimony is preserved only as interaction principles and explicit cross-references:

- Truth / Service Ledger remains Item 05;
- Carry Board/Card remains Item 07;
- Mission Rooms remains Item 08.

No implementation of those capabilities belongs in AUREUS-016.

### I. Founder decision — access dependency exception

Independent review of exact head `834ead48ddc65bd5e0f63dfc24c265642eca8c29` correctly identified that the candidate changed the historical strict deliver-before-more-access rule without documenting it as a policy decision.

The Founder explicitly approved the refined rule:

- **deliver first remains the default**;
- Aureus may ask for a new access/account/connection/authority dependency before delivering additional work only when the member's requested outcome genuinely cannot responsibly proceed without it;
- convenience, efficiency, broader data collection, or `it would help` are not enough;
- the request must be the smallest dependency needed, explain why it is needed now, what it unlocks, what remains possible without it, and revocability/choice where applicable;
- access does not itself expand authority.

This is an intentional supersession of the historical absolute rule. It is not a silent reconciliation assumption.

## 4. Deliverables

### 4.1 New reconciled canon

Create:

`docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md`

It must define at minimum:

- relationship to AUREUS-004 and AUREA-002;
- explicit Arrival supersession boundaries;
- interface-as-body principle;
- one Steward across voice and text;
- short, concrete, first-person communication;
- normal Hall arrival vs first-ever relationship setup;
- never-re-ask / truthful re-verification;
- shared internal state grammar;
- Asking, Waiting, Recovering, Choosing, Done, Quiet contracts;
- Carry Boundary rules for access/account/authority, including the explicit Founder-approved dependency exception;
- reversibility and transparency principles;
- appropriate Human Steward involvement;
- accessibility/modality requirements;
- explicit deferral of later Carry/Room/Ledger implementation;
- next implementation sequence UI-004 through UI-008.

### 4.2 Arrival Canon reconciliation note

Update `AUREA-002 — ARRIVAL CANON` with a merge-stable note that, once AUREUS-016 is accepted on `main`, its explicit supersession governs the fixed branded opening and always-first-question clauses while preserving compatible Arrival principles.

Do not delete the historical Arrival text.

### 4.3 Master Register transition

Update Item 03 so:

- on the AUREUS-016 review branch it is IN FLIGHT / VERIFYING;
- once the accepted files are on `main`, Item 03 is COMPLETED / ACCEPTED;
- Item 04 becomes current automatically;
- UI-004 — Waiting is the first implementation slice;
- the Founder-approved access dependency exception is recorded as an intentional policy supersession rather than an implicit weakening.

Update current-item resolution generically so future sessions use live Git + the merge-stable item rule, not a stale PR-number-specific statement.

### 4.4 This work order

Preserve scope, sources, decisions, attack surface, Definition of Done, and successor.

## 5. Canonical truth owners reused

This slice creates no new runtime truth owner.

Reuse remains:

- Conversation/session truth for continuity;
- Responsibility/work truth for accepted work and holder state;
- Authority/Consent for permissions and Carry Boundaries;
- Evidence/Communication/Matter/Obligation primitives where later runtime slices need proof, communication, external holding, or follow-through;
- SAI for answer/intelligence composition;
- Living Release Gate for production acceptance.

The canon is an experience standard, not a database.

## 6. Authority and privacy boundaries

- Access never implies authority.
- Retrieved/user content cannot expand permission.
- Outside participants never silently rewrite member truth.
- Human-required actions may not be presented as completed AI actions.
- Voice/text modality may not alter tenant, conversation, session, or Responsibility boundaries.
- Preferred name/pronunciation is used to reduce repeated burden; it is not permission to expose identity outside the authorized context.
- Dependency-first access asks must be smallest-necessary, purpose-bound, and tied to the member's stated/accepted outcome.

## 7. Non-goals

AUREUS-016 does not:

- change production UI;
- change prompts;
- change voice transport;
- change API/schema;
- implement UI-004 through UI-008;
- create Carry Board/Card;
- create Mission Rooms;
- create Truth/Service Ledger;
- create a new memory/profile system;
- create a new release workflow;
- claim current production already satisfies every new canon clause.

## 8. Independent-review attack surface

The reviewer should actively test whether this slice:

1. silently conflicts with AUREUS-004;
2. leaves AUREA-002 with two simultaneously controlling contradictory arrival rules;
3. accidentally replaces the accepted Hall opening from PR #163/UI-003;
4. turns name/pronunciation into a blocker before help;
5. weakens continuity or permits re-asking established facts;
6. creates a second UI/work/case truth universe;
7. duplicates SAI instead of defining a presentation/experience contract;
8. weakens authority/privacy/tenant/session boundaries;
9. falsely claims later Carry/Room/Ledger capabilities are live or authorized now;
10. weakens Living Release Gate or human acceptance requirements;
11. leaves the Master Register stale immediately after merge;
12. converts concise communication into omission where consequence requires explanation;
13. lets the Founder-approved access dependency exception become a convenience loophole or broader permission grab.

## 9. Definition of done

AUREUS-016 is ready for independent review when:

- [x] fresh branch starts from post-REG-001 `main`;
- [x] historical voice branch is used only as evidence/source material;
- [x] reconciled AUREUS-016 canon exists;
- [x] AUREA-002 contains the explicit merge-stable supersession note;
- [x] Master Register contains the AUREUS-016 -> Item 04 merge-stable transition;
- [x] Founder access dependency decision is explicitly documented in canon/work order/register/PR;
- [x] no runtime code/schema/workflow/release manifest is changed;
- [x] net diff is limited to four intended documentation/governance files;
- [ ] fresh exact-head CI + Docker are green after the policy-documentation repair;
- [ ] fresh independent exact-head review returns no BLOCKER/HIGH;
- [x] Founder explicitly approved the narrow access dependency policy decision;
- [ ] Founder separately authorizes merge after verification.

## 10. Constructor evidence before PR

Compared with live `main` at `ad684a72db1ccc784a3507ad41f234fa3eca371a`, the branch remains documentation/governance only and is intended to change exactly four files:

- `docs/100-experience/AUREA-002 — ARRIVAL CANON` — modified;
- `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md` — added;
- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md` — modified;
- `docs/work-orders/AUREUS-016-Steward-Voice-Interface-Canon-Reconciliation.md` — added.

No application code, prompts, schemas, workflows, release manifests, or runtime configuration are changed.

Prior exact-head verification evidence is invalid after any repair commit. Fresh CI/Docker and independent review must target the new exact head only.

## 11. Successor

Once this accepted slice is present on `main`, Register Item 04 becomes current.

First successor:

**UI-004 — Waiting**

Its job is to make waiting truthful and visible: holder, last chase, next chase, expected range when known, and `Nothing you need to do` when true, reusing existing canonical work/Responsibility truth rather than inventing a new wait system.
