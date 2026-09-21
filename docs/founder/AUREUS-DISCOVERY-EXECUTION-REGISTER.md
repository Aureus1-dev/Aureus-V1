# Aureus Discovery & Execution Register

**Status:** BUILDING — candidate canonical sequencing authority; not yet merged or accepted.  
**Reconciled base:** `b1485f279aff07ebaefc1a409e01bd46c02d5e47` — merge of PR #162 / UI-003.  
**Preparation branch:** `docs/master-discovery-execution-register`  
**Current slice:** REG-001  
**Founder direction:** replace overlapping sequencing sources with one ordered register while preserving requirements, evidence, history, and governance.

> This document becomes the single sequencing authority only after REG-001 receives independent review and is merged. Until then, existing accepted repository governance remains controlling. No later feature implementation is authorized by this document alone.

## 1. Why this register exists

Aureus accumulated several legitimate but overlapping sources of execution truth:

- `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md` — older Product V1 / Business-first PF and OR sequence;
- GitHub Issue #122 (`PEOPLE-000`) — the People completion ladder;
- `release-gates/manifest.json` — Living Release Gate work-order registry;
- merged `SAI-001` — Steward Answer Intelligence architecture and its SAI-002…SAI-006 successors;
- GitHub Issue #143 plus the closed-unmerged PA-024 candidate — governed Skills / Context Compiler / adaptive intelligence direction;
- the unmerged `docs/steward-voice-interface-standard` branch — Steward Voice & Interface canon;
- Founder walkthrough issues #95 and #145, whose checklists partly predate later repairs and the Living Release Gate;
- later Founder discoveries: Truth / Service Ledger, Mission portfolio structure, Carry Board/Card, Mission Rooms, Artifact Factory, Housing as the first full Mission proof, Flourishing Model, Resource Marshal, Community Operating System, foundational Steward domains, and the Flourishing Economy / institutional scale sequence.

All remain evidence or requirements sources. Once REG-001 is accepted, they no longer independently determine what Aureus builds next.

## 2. Canonical lifecycle and dispositions

Lifecycle:

`DISCOVERED -> CANONICALIZED -> WORK_ORDERED -> BUILDING -> VERIFYING -> ACCEPTED -> DEPLOYED`

Portfolio disposition:

- **COMPLETED** — accepted work already merged; deployment may still be separately gated.
- **IN FLIGHT** — the current candidate being built or verified.
- **DOCUMENTED / UNIMPLEMENTED** — direction exists but runtime work is not accepted.
- **DISCOVERED / UNWRITTEN** — Founder-approved direction still needs a thin canonical work order.
- **SUPERSEDED** — preserve evidence; do not resume or merge the old candidate as-is.
- **DEFERRED** — valid work intentionally held behind dependencies.

## 3. Sequencing and governance rules

1. **One canonical next item.** “What is next?” resolves from this register after acceptance.
2. **One implementation lane by default.** Parallel work requires an explicit safe parallel lane.
3. **Constructor and verifier remain separate.** Any head movement invalidates exact-head verification evidence.
4. **Requirements do not independently reorder execution.** Older Product, People, Business, Foundry, Launch, and architecture documents stay binding where applicable but become inputs to this register.
5. **Reuse before replacement.** Reuse accepted Responsibility, Authority, Household, Human Steward, Obligation, Evidence, Matter, Communication, Opportunity, Pods, Library, Business, Foundry, and related primitives before adding a new durable truth owner.
6. **No second truth universe.** New UI or participation surfaces may project canonical truth; they may not create parallel case, CRM, profile, evidence, or workflow reality.
7. **Living Release Gate remains permanent.** Production-impacting work orders register against existing truthful release contracts rather than inventing a new workflow per slice. Docs-only work states why it creates no deployed acceptance condition.
8. **The register moves with accepted work.** Every future work order / implementation PR must update the relevant register item on acceptance or explicitly prove no register change is required.
9. **History is preserved.** Superseded PRs, issues, and branches remain evidence.
10. **Production acceptance is exact-deployment acceptance.** Green CI is mechanical evidence, not the member experience.
11. **Human acceptance stays human.** The Accountable Steward walkthrough is not silently converted into an automated claim.

## 4. Current repository snapshot

### Current main

`b1485f279aff07ebaefc1a409e01bd46c02d5e47` — merge of PR #162 / UI-003 Active Work Surface.

### UI-003 release evidence

- PR #162 exact accepted head: `47cd41a925951091bec4fa8f3978d0a6ab4d6099`.
- Merged to `main` as `b1485f279aff07ebaefc1a409e01bd46c02d5e47`.
- Steward Release Gate run #9 targeted that exact merged SHA.
- Living Exact-Deployment Gate completed successfully, including registry validation, browser runtime resolution, every required automated release contract, evidence verification, and evidence preservation.
- Separate Accountable Steward mobile + desktop walkthrough remains a human acceptance fact and must only be marked complete when actually performed.

### Open pull requests

**None** at this snapshot.

### Open issues requiring reconciliation

- **#122 — PEOPLE-000:** Steps 1–6 are implemented/merged. Keep as the People domain ladder; point sequencing to this register.
- **#143 — governed skills / adaptive intelligence:** relevant architecture anchor. Old PR #144 is closed unmerged. Housing remains the first bounded runtime proof when this item reaches its turn.
- **#145 — Founder Walkthrough blocking product defects:** re-audit against later fixes (#146–#163, UI-003, voice/release-gate hardening). Retain only genuinely unresolved defects.
- **#95 — older Founder Walkthrough launch plan:** preserve historical evidence; move still-valid acceptance requirements into the Living Release Gate/current work orders rather than keeping a competing release queue.
- **#136 — PEOPLE-HOUSEHOLD-001:** implementation was merged through PR #137; confirm acceptance linkage, then disposition/close as stale execution work.
- **#99 — temporary Prisma/deepmerge audit exception:** valid maintenance item; deferred until the external dependency changes.

### Completed foundations to reuse

- People Step 1 Universal Need -> Resolution — PR #123 + hardening #126.
- People Step 2 Authority / Consent / Privacy — PR #135.
- People Step 3 Household & Relationship Continuity — PR #137.
- People Step 4 Human Steward Operations — PR #139.
- People Step 5 Obligation & Follow-through / Housing proof — PR #141.
- People Step 6 Documents / Evidence / Verification — PR #142.
- Legal / Matter Stewardship contract + first implementation — PRs #131–#132.
- Work Surface design portfolio — PR #151.
- Production UI Slice 1 — PR #158.
- Production Carry State / UI Slice 2 — PR #160.
- Executive Intelligence Standard — PR #161.
- Hall / brevity repair — PR #163.
- SAI-001 Steward Answer Intelligence architecture — PR #164.
- Living Release Gate / LRG-001 — PR #165.
- UI-003 Active Work Surface — PR #162, merged to `b1485f279...`.
- Voice / release-gate hardening and production model alignment — PRs #149–#159.

### Superseded candidates whose evidence remains useful

- PR #153 — fixture-only Work Surface prototype; superseded by production UI slices.
- PR #144 — PA-024 governed-skills docs candidate; closed unmerged. Reconcile/transplant later rather than resurrect unchanged.
- PR #124 — OR-004 Revenue Completion candidate; closed unmerged. Preserve commercial design/code evidence for later.
- PR #140 — Production House convergence candidate; closed unmerged. Preserve as later Business / tenant-zero evidence.
- PR #121 — Steward Character candidate; preserve only still-valid rules after reconciliation with #163, Executive Intelligence, SAI, and Voice & Interface canon.
- PR #127 — original People Experience contract candidate; superseded by refreshed/merged PR #133.

## 5. Canonical ordered queue

### 01 — UI-003 Active Work Surface

**Disposition:** COMPLETED / MERGED  
**Stage:** ACCEPTED by independent exact-head verification; merged; automated exact-deployment gate passed.  
**Merged SHA:** `b1485f279aff07ebaefc1a409e01bd46c02d5e47`  
**Remaining acceptance fact:** record Accountable Steward mobile + desktop walkthrough when actually performed.

UI-003 no longer blocks construction of docs-only REG-001.

### 02 — REG-001 Master Discovery & Execution Register

**Disposition:** IN FLIGHT  
**Stage:** BUILDING / CANONICALIZING  
**Branch:** `docs/master-discovery-execution-register`  
**Work order:** `docs/work-orders/REG-001-Master-Discovery-Execution-Register.md`  
**Dependency:** post-UI-003 main satisfied.

Acceptance must:

- make this register the single sequencing authority;
- classify older queues as requirements/evidence/historical/deferred rather than competing “next” lists;
- refresh current PR/issue state;
- reconcile stale Founder walkthrough issues;
- preserve constructor/verifier separation and Living Release Gate doctrine;
- require future work orders to name register parent/predecessor and update the register on acceptance;
- avoid implementing any later feature.

### 03 — AUREUS-016 Steward Voice & Interface canon reconciliation

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Stage:** CANONICALIZED on an unmerged historical branch; requires fresh-main reconciliation.  
**Branch:** `docs/steward-voice-interface-standard`

Do not merge that branch as-is. Its two documents must be transplanted onto fresh `main` and reconciled with #163, UI-003, LRG-001, Executive Intelligence, and SAI-001.

Preserve the core doctrine:

- the interface is the Steward’s body;
- short, first-person, concrete language;
- every ask carries its reason;
- every wait carries holder / next chase truth;
- bad news never arrives naked;
- never re-ask known facts;
- do not request more access without having delivered value since the last ask;
- account/authority requests only at real Carry Boundaries;
- one underlying work model across Listening, Understanding, Agreement, Working, Asking, Waiting, Choosing, Recovering, Done, and Quiet.

### 04 — Steward interaction-state implementation slices

**Disposition:** DISCOVERED / UNWRITTEN  
**Dependencies:** accepted Voice & Interface canon + merged UI-003.

Thin order:

1. **UI-004 — Waiting** — holder, last chase, next chase, expected range, and “nothing you need to do” when true.
2. **UI-005 — Asking** — one clear ask, why it is needed, what happens after, no re-asking established facts.
3. **UI-006 — Bad News / Recovering** — what failed, what remains true, next safe route, holder, repair action.
4. **UI-007 — Choosing** — real options, tradeoffs, uncertainty, authority, next action; Aureus does not silently decide for the person.
5. **UI-008 — Done + Quiet** — verified completion/testimony and a quiet state that does not manufacture engagement.

LISTENING / UNDERSTANDING / AGREEMENT / WORKING remain part of the same state grammar unless implementation evidence proves a missing primitive.

### 05 — PEOPLE-007 Truth / Service Ledger + Testimony

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Dependencies:** People Steps 1–6 complete + interaction-state truth model.

Canonical job:

`asked -> accepted/promised -> carried -> waiting/holder -> evidence -> done/outcome`

Member-facing testimony shows work Aureus carried; it is not a technical audit dump. Reuse Responsibility events, Obligation/follow-through, Evidence, Communication, Matter, and outcome truth.

### 06 — Life Map -> Mission -> Workstream -> Action

**Disposition:** DISCOVERED / UNWRITTEN  
**Dependencies:** Truth / Service Ledger + existing Responsibility model.

Formalize a private Life Map, durable Missions, several Workstreams under each Mission, bounded Actions/Obligations, multiple simultaneous Missions, editable member-owned “Done means,” and cross-Mission dependencies.

Do not duplicate Journey/Goal/Responsibility truth merely to obtain hierarchy. Reuse analysis must decide whether Mission is an extension/projection or a carefully bounded new durable container.

### 07 — Carry Board + Carry Card

**Disposition:** DISCOVERED / UNWRITTEN  
**Dependencies:** Mission model + Authority + Truth / Service Ledger.

Carry Board answers:

- Aureus carries;
- Together;
- You carry;
- A person must.

Carry Card is portable, scoped, permissioned truth over canonical holder/evidence/authority data — not another case/profile database.

### 08 — Mission Rooms + scoped participation

**Disposition:** DISCOVERED / UNWRITTEN  
**Dependencies:** Carry Card + Authority + Household/relationship primitives + Mission truth.

Thin order:

1. guest link / one requested action;
2. outside input -> proposal -> member approval;
3. persistent participant;
4. member-to-member shared outcome.

Invariant: **a Room is the same work seen from another seat.** Outside participants do not silently rewrite the member’s canonical record.

### 09 — SAI-002 through SAI-006

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Order fixed by merged SAI-001:**

1. SAI-002 — Answer Contract + deterministic consequence router;
2. SAI-003 — evidence/expertise routing + uncertainty contract;
3. SAI-004 — Prompt Compiler + Presentation Composer;
4. SAI-005 — consequence-scaled Critic / Verifier;
5. SAI-006 — outcome evaluation + governed Help Strategy learning.

SAI improves interpretation and work quality; it does not create a second execution authority, memory universe, or silent policy mutation loop.

### 10 — Aureus Artifact Factory

**Disposition:** DISCOVERED / UNWRITTEN  
**First proof:** résumé.

`structured truthful artifact -> renderer(s) -> .docx / PDF / plain text / copyable content`

One master résumé, truthful variants without invention, reusable structured data beneath renderers. Later reuse: housing packets, letters, appeals, budgets, proposals, estimates, forms, and business documents.

### 11 — Housing as first full Mission-system vertical proof

**Disposition:** DISCOVERED / PARTIALLY DOCUMENTED  
**Dependencies:** Mission model, Carry Card, Rooms, Artifact Factory, Ledger.

End-to-end proof should carry: search, readiness, resources, money/assistance, documents, landlord/realtor communication, legal support where relevant, moving/transportation, waits/obligations, testimony, and keys-in-hand completion.

Include **Housing for Realtors** as a bounded participation view: referral -> Mission -> readiness/card -> Aureus carries the middle -> member ready to act, under narrow permissions.

### 12 — Governed Skill architecture proof through Housing

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Anchor:** Issue #143; old PA-024 branch is evidence, not a merge candidate.

First proof must be bounded and Housing-based before generalizing runtime.

Preserve:

- one logical Aureus Steward;
- governed/versioned skill packs;
- worker agents only where parallelism, isolation, authority differences, independent verification, or durable delegation justify them;
- skills never grant authority;
- minimum-necessary Context Compiler;
- provider-neutral routing;
- independent verification;
- no silent self-modification.

### 13 — Flourishing Model / Life optimization

**Disposition:** DISCOVERED / UNWRITTEN

No hidden worthiness score. Model flourishing as multidimensional, member-defined trajectory with uncertainty, goals, and explainability. Anticipation is permissioned and non-intrusive.

### 14 — Resource Marshal + Verified Local / Partner Network

**Disposition:** DISCOVERED / PARTIALLY DOCUMENTED

Inventory and route existing money, benefits, services, jobs, people, skills, volunteers, space, transportation, donated goods, institutional capacity, vendors, and community capacity before new spend/hire. Track commitments and outcomes in the ledger.

### 15 — Community Operating System on existing Pods/community primitives

**Disposition:** DISCOVERED / UNWRITTEN

Do not build a second social network. Reuse Pods/community primitives for local events, low-friction participation, micro-contributions, recurring duties, matching needs/resources/time/place, Community Stewards, and belonging that persists after a Mission ends.

### 16 — Foundational Steward domain expansion behind one Steward

**Disposition:** DISCOVERED / PARTIALLY DOCUMENTED

Expand skills/workstreams behind one Steward rather than separate apps/personas:

- Financial;
- Housing breadth;
- Legal / Matter;
- Work / Capability;
- Household / relationships;
- counseling / mental-health navigation where appropriate;
- transportation.

### 17 — Opportunity Intelligence / Flourishing Economy / Business / institutional scale

**Disposition:** DOCUMENTED / DEFERRED behind person-side proof

Includes:

- Opportunity Graph and buyer proof;
- demand aggregation;
- work decomposition and Work Instruments;
- benefits-safe earnings;
- Flourishing Employment Standard;
- three money loops: stewardship, work, outcomes;
- institutional outcome funding;
- Resource Marshal economics;
- Production House Tenant Zero;
- Institutional Intelligence OS;
- institutional Stewardship;
- later self-building Foundry mechanisms under governance.

Members are not charged as the solvency foundation. Institutions fund stewardship; real buyers fund work; outcome/public-program revenue is supplementary.

## 6. Disposition of older execution authorities

### Product V1 / Business-first order

After REG-001 acceptance, `PRODUCT-V1-EXECUTION-ORDER.md` remains a requirements and historical evidence source, not an independent “next” authority.

- merged Business/OR primitives remain reusable;
- old unmerged #124 / #140 remain superseded candidates, not current execution;
- Business/commercial work is not rejected — it resumes at item 17 or through an explicit Founder-amended safe parallel lane;
- older Business-first order may not silently preempt the person-side Mission / Responsibility / Ledger / Skills proof sequence.

### PEOPLE-000

Keep #122 as the People domain definition. Mark Steps 1–6 complete and direct sequencing questions to this register. Step 7 onward retains requirements value.

### Living Release Gate

LRG remains the release authority for deployed change. This register chooses *what is next*; LRG proves whether production-impacting work is acceptable to release. They do not replace one another.

### SAI-001

Keep its successor order intact, but position SAI-002…006 at item 09 so the answer system is grounded in the work/authority/truth model it must serve.

### Governed Skills

Keep Issue #143 as architecture evidence/anchor. Do not resume PR #144 unchanged. The first runtime proof remains one bounded Housing skill after the integrated Housing vertical is ready.

### Voice & Interface branch

Preserve its two documents as canon candidates, but reconcile/transplant onto fresh current main at item 03 rather than merging the stale branch as-is.

## 7. Stale queue cleanup actions

1. **#136:** verify PR #137 acceptance link, then disposition/close as stale execution work.
2. **#145:** reconcile every blocker against later merged repairs and exact product evidence; retain only unresolved defects.
3. **#95:** move still-valid acceptance requirements into LRG/manual/current work orders and stop treating it as an independent ordered queue.
4. **#143:** keep open as governed-skills anchor until its Housing proof is reconciled and accepted.
5. **#122:** update Steps 1–6 complete and point future execution order to this register.
6. **#99:** keep deferred until its upstream dependency changes.
7. Preserve closed-unmerged branches/PRs as historical evidence unless a separate branch-retention policy explicitly deletes them.

## 8. Required fields for future work orders

Every future work order should state:

- register parent/item;
- predecessor dependency;
- disposition and lifecycle stage;
- canonical truth owners reused;
- non-duplication analysis;
- authority/privacy boundary;
- definition of done;
- automated evidence;
- Accountable Steward/manual evidence if production-impacting;
- Living Release Gate contract IDs, or a truthful docs-only/no-deploy statement;
- successor item;
- register row/status change required after acceptance.

## 9. REG-001 definition of done

REG-001 is ready for independent review only when:

- this register is anchored to exact post-UI-003 main;
- UI-003 is no longer described as an open PR;
- current open PR/issue state is refreshed;
- Product V1 guidance and Founder execution guidance point here for sequencing;
- PEOPLE-000 points here for order while retaining its domain ladder;
- stale walkthrough issues are reconciled/dispositioned;
- no competing document truthfully claims sole active sequencing authority without a pointer to this register;
- future work orders are required to update the register;
- no later feature implementation is included;
- independent review confirms no lost requirement, silent supersession, duplicate truth universe, or governance weakening.

## 10. Immediate next action

Current construction item: **REG-001**.

Sequence:

`finish REG-001 reconciliation -> docs CI -> independent exact-head review -> repair if needed -> Founder merge authorization -> merge REG-001`

After REG-001 is accepted, the next construction candidate is:

**AUREUS-016 Steward Voice & Interface canon reconciliation on fresh current main.**
