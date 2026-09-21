# Aureus Discovery & Execution Register

**Status:** STAGED — candidate canonical sequencing authority; not yet merged or accepted.  
**Prepared from main:** `14e85b1c179a80b52d9d9fb0c3183a91d9d07303`  
**Preparation branch:** `docs/master-discovery-execution-register`  
**Founder direction:** replace overlapping sequencing sources with one ordered register while preserving their requirements, evidence, and history.  

> This document becomes the single sequencing authority only after it is reconciled onto the post-UI-003 main, independently reviewed, and merged. Until then, existing repository governance remains controlling and PR #162 / UI-003 remains the sole in-flight implementation PR.

## 1. Why this register exists

Aureus currently has several legitimate but overlapping sources of execution truth:

- `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md` — older Product V1 / Business-first PF and OR release sequence;
- GitHub Issue #122 (`PEOPLE-000`) — 15-step People completion ladder;
- `release-gates/manifest.json` — Living Release Gate work-order registry;
- `SAI-001` — Steward Answer Intelligence with planned SAI-002…SAI-006 successors;
- GitHub Issue #143 / the closed-unmerged PA-024 candidate — governed Skills / Context Compiler / adaptive intelligence direction;
- the unmerged `docs/steward-voice-interface-standard` branch — Steward Voice & Interface canon;
- open founder-walkthrough issues whose checklists partly predate later repairs and the Living Release Gate;
- Founder discoveries developed after those documents: Mission portfolio structure, Carry Board/Card, Mission Rooms, Artifact Factory, Housing as the first full Mission proof, Resource Marshal, Community Operating System, and the later Flourishing Economy / institutional scale sequence.

All of these remain evidence or requirements sources. They no longer independently determine what Aureus builds next once this register is accepted.

## 2. Canonical execution states

Every active item has one lifecycle stage:

`DISCOVERED -> CANONICALIZED -> WORK_ORDERED -> BUILDING -> VERIFYING -> ACCEPTED -> DEPLOYED`

Portfolio disposition is recorded separately:

- **COMPLETED** — accepted implementation/documentation is already merged; deployment may still be separately gated where applicable.
- **IN FLIGHT** — one exact current candidate is being built or verified.
- **DOCUMENTED / UNIMPLEMENTED** — governing direction exists, but runtime work is not yet accepted.
- **DISCOVERED / UNWRITTEN** — Founder-approved direction exists but still needs a thin canonical work order.
- **SUPERSEDED** — do not merge/resume the old candidate as-is; preserve it as implementation/design evidence and transplant only still-valid content.
- **DEFERRED** — valid work intentionally held behind earlier dependencies.

## 3. Sequencing and governance rules

1. **One canonical next item.** Asking “What is next?” must resolve from this register, not from an older chat, issue, branch, or roadmap.
2. **One implementation lane by default.** Do not start another implementation PR while an earlier required implementation PR is unresolved unless the register explicitly marks a safe parallel lane.
3. **Constructor and verifier stay separate.** Builders do not self-certify. Any head movement invalidates the prior exact-head review.
4. **Requirements are not sequencing authority.** Older Product V1, People, Business, Foundry, Launch, and architecture documents remain binding where applicable but do not independently reorder this register.
5. **Reuse before replacement.** Existing Responsibility, Authority, Household, Human Steward, Obligation, Evidence, Opportunity, Business, Communication, Pods, Library, Foundry, and other accepted primitives are reused unless evidence proves a replacement is necessary.
6. **No second truth universe.** New surfaces may project canonical truth; they may not create a competing case/CRM/profile/evidence/workflow reality merely to simplify UI.
7. **Living Release Gate is the permanent release framework.** Every PR must explicitly assess release impact. Every production-impacting work order must be registered in `release-gates/manifest.json` against truthful automated/manual contracts. Docs-only work must state why it does not create a new deployed acceptance condition rather than inventing a fake release contract.
8. **The register moves with every accepted change.** Each future work-order/implementation PR must update this register's status/dependency row or explicitly prove why no register change is required.
9. **History is preserved.** Superseded PRs/issues/branches are never treated as if they did not happen; they remain design/implementation evidence but cannot silently become current candidates.
10. **Final production acceptance is exact-deployment acceptance.** Green CI is mechanical evidence, not proof that the member experience works in production.

## 4. Current repository snapshot

### Current main

`14e85b1c179a80b52d9d9fb0c3183a91d9d07303` — merge of PR #164 (`SAI-001`).

### Open pull requests

- **PR #162 / UI-003 Active Work Surface** — the only open PR. Current exact head: `47cd41a925951091bec4fa8f3978d0a6ab4d6099`. Build & Test and Docker evidence are green. It remains Draft/HOLD pending fresh independent exact-head review, then merge authorization. Final release remains separately gated by deployment identity, Living Release Gate, and Accountable Steward walkthrough.

### Open issues requiring reconciliation

- **#122 — PEOPLE-000:** active umbrella; Steps 1–6 are now implemented/merged. It remains a requirements ladder, not a competing sequencing registry.
- **#143 — governed skills / adaptive intelligence:** direction remains relevant; the old docs PR #144 was closed unmerged and its branch is far behind current main. Reconcile onto fresh main when its turn arrives.
- **#145 — founder walkthrough blocking product defects:** many original items were repaired by later PRs (#146–#163 and voice/release-gate work). Re-audit the checklist against current product evidence; do not leave resolved boxes looking current.
- **#95 — older founder walkthrough ordered launch plan:** preserve historical acceptance evidence, but reconcile remaining tests into the Living Release Gate / current product sequence rather than maintaining a second release queue.
- **#136 — PEOPLE-HOUSEHOLD-001:** implementation was merged via PR #137. The issue is stale as an execution blocker and should be dispositioned/closed after confirming its acceptance record.
- **#99 — temporary Prisma/deepmerge audit exception:** valid maintenance item; deferred until a compatible upstream Prisma release exists.

### Important completed foundations

These are not next-step candidates; they are substrate to reuse:

- People Step 1 Universal Need → Resolution — PR #123 plus hardening #126.
- People Step 2 Authority / Consent / Privacy — PR #135.
- People Step 3 Household & Relationship Continuity — PR #137.
- People Step 4 Human Steward Operations — PR #139.
- People Step 5 Obligation & Follow-through Housing proof — PR #141.
- People Step 6 Documents / Evidence / Verification — PR #142.
- Legal / Matter Stewardship contract + first implementation — PRs #131–#132.
- Work Surface design portfolio — PR #151.
- Production UI Slice 1 — PR #158.
- Production Carry State / UI Slice 2 — PR #160.
- Founder Hall/brevity repair — PR #163.
- Executive Intelligence Standard — PR #161.
- Steward Answer Intelligence architecture / SAI-001 — PR #164.
- Living Release Gate / LRG-001 — PR #165.
- Production voice/release-gate hardening and proven model alignment — PRs #149–#159.

### Superseded candidates whose evidence remains useful

- PR #153 — fixture-only Work Surface prototype; superseded by production UI slices.
- PR #144 — PA-024 governed-skills docs candidate; closed unmerged. Transplant/reconcile, do not resurrect unchanged.
- PR #124 — OR-004 Revenue Completion candidate; closed unmerged. Preserve useful design/code evidence; commercial sequence is deferred below.
- PR #140 — Production House convergence candidate; closed unmerged. Preserve as Business/tenant-zero evidence for later institutional lane.
- PR #121 — Steward Character candidate; closed unmerged. Reconcile only still-valid voice/character rules against later #163, Executive Intelligence, SAI, and the Voice & Interface canon.
- PR #127 — original People Experience contract candidate; superseded by refreshed/merged PR #133.

## 5. Canonical ordered queue

### 01 — UI-003 Active Work Surface

**Disposition:** IN FLIGHT  
**Stage:** VERIFYING  
**Canonical candidate:** PR #162 @ `47cd41a925951091bec4fa8f3978d0a6ab4d6099`  
**Dependency:** none; finish before another implementation PR.  

Finish sequence:

1. independent exact-head re-review;
2. repair only if a real finding remains;
3. merge exact accepted head;
4. deploy exact resulting main to web/API;
5. Living Release Gate against that exact deployment;
6. Accountable Steward mobile + desktop walkthrough against the same SHA.

No later implementation item begins first.

### 02 — REG-001 Master Discovery & Execution Register

**Disposition:** IN FLIGHT  
**Stage:** BUILDING / CANONICALIZING  
**Candidate:** this document on `docs/master-discovery-execution-register`; no PR while #162 remains open.  
**Dependency:** reconcile onto the exact post-#162 main before review/merge.  

Acceptance must:

- make this register the single sequencing authority;
- demote older execution orders from priority authority to requirements/evidence inputs;
- map every active issue/branch/work-order/discovery to one disposition and lifecycle stage;
- add an explicit register-update rule to future work-order/PR templates or execution guidance;
- reconcile stale founder-walkthrough issues;
- preserve current governance and Living Release Gate rules;
- avoid implementing any later feature.

### 03 — AUREUS-016 Steward Voice & Interface Canon

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Stage:** CANONICALIZED on an unmerged historical branch; requires fresh-main reconciliation.  
**Current branch:** `docs/steward-voice-interface-standard`  
**Branch reality at this snapshot:** 2 commits ahead / 10 commits behind `main`; exactly two added docs:

- `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md`
- `docs/work-orders/AUREUS-STEWARD-VOICE-INTERFACE-001.md`

Do not merge that branch as-is. After REG-001:

- transplant the two docs onto fresh current main;
- reconcile with PR #163 Hall/brevity rules, UI-003, LRG-001, Executive Intelligence, and SAI-001;
- preserve: interface-as-Steward-body, holders, reasons for asks, visible chase/wait truth, bad-news recovery, never re-ask, earned access, reversible delegation, Show me everything, Mission Rooms, scoped sharing, proposals, testimony/ledger, and belonging continuing after work ends;
- send the fresh exact head for independent review.

### 04 — Steward interaction-state implementation slices

**Disposition:** DISCOVERED / UNWRITTEN  
**Stage:** DISCOVERED  
**Dependencies:** accepted Voice & Interface canon + merged UI-003.  

One underlying work model; do not build separate pages/apps.

Planned thin slices, in order:

1. **UI-004 — Waiting:** holder, last chase, next chase, expected range, “nothing you need to do” when true.
2. **UI-005 — Asking:** one clear ask, why Aureus needs it, what happens after it is supplied, no re-asking established facts.
3. **UI-006 — Bad News / Recovering:** bad news never arrives naked; show what failed, what remains true, next safe route, holder, and repair action.
4. **UI-007 — Choosing:** compare real options, tradeoffs, uncertainty, authority, and next action without silently deciding for the person.
5. **UI-008 — Done + Quiet:** verified completion/testimony, work Aureus carried, what remains open elsewhere, and a quiet state that does not manufacture engagement.

LISTENING / UNDERSTANDING / AGREEMENT / WORKING remain part of the same state grammar; create separate slices only if implementation evidence shows a real missing primitive.

### 05 — PEOPLE-007 Truth / Service Ledger + Testimony

**Disposition:** DOCUMENTED / UNIMPLEMENTED at program level; thin work order still required.  
**Stage:** CANONICALIZED in PEOPLE-000 / People experience contract, not yet WORK_ORDERED as an implementation slice.  
**Dependencies:** Steps 1–6 complete; interaction-state truth model available.  

Canonical job:

`asked -> accepted/promised -> carried -> waiting/holder -> evidence -> done/outcome`

The member-facing view is testimony of work carried on the person's behalf, not a technical audit dump. It becomes the common truth source for Waiting, recovery, Active Work, Carry Card, Mission Rooms, and completion.

Must reuse Responsibility/ResponsibilityEvent, Obligation/follow-through, Evidence, Communication, Matter and outcome truth instead of creating a second ledger of reality.

### 06 — Life Map -> Mission -> Workstream -> Action

**Disposition:** DISCOVERED / UNWRITTEN  
**Stage:** DISCOVERED  
**Dependencies:** Truth / Service Ledger and existing Responsibility model.  

Formalize:

- private **Life Map** as the person's connected context, not a worthiness score;
- **Mission** as a durable outcome such as “Get me stable by January,” not a tiny task;
- multiple **Workstreams** (Housing, Work, Transportation, Documents, Money, etc.) under one Mission;
- bounded **Actions/Obligations** beneath workstreams;
- several simultaneous Missions coordinated as a portfolio;
- editable member-owned “Done means”;
- cross-Mission dependencies;
- member surface generally exposes only the one thing the person actually needs to handle now.

Do not create duplicate Responsibility truth merely to obtain hierarchy. The work order must decide whether Mission is a new durable container, an extension/projection of existing Journey/Goal/Responsibility primitives, or a carefully bounded addition after reuse analysis.

### 07 — Carry Board + Carry Card

**Disposition:** DISCOVERED / UNWRITTEN  
**Stage:** DISCOVERED  
**Dependencies:** Life/Mission model + Authority + Truth/Service Ledger.  

**Carry Board** answers:

- Aureus carries;
- Together;
- You carry;
- A person must.

**Carry Card** is portable, permissioned truth about the work. Support an overall authorized view plus Mission-specific views. It must minimize repeated explanation to landlords, realtors, family, caseworkers, partners, or other participants.

Carry Card is a projection over canonical holder/evidence/permission truth, not another profile/case database.

### 08 — Mission Rooms + scoped participation

**Disposition:** DISCOVERED / UNWRITTEN  
**Stage:** DISCOVERED  
**Dependencies:** Carry Card + Authority + Household/relationship primitives + canonical Mission truth.  

Implement in this thin order:

1. guest link / one requested action;
2. outside input -> proposal -> member approval;
3. persistent Participant;
4. member-to-member shared outcome.

Invariant: **a Room is the same work seen from another seat.** Outside participants never silently rewrite the member's canonical record. This becomes the direct line for member <-> landlord, member <-> realtor, member <-> family/partner, or two members working on one outcome.

### 09 — SAI-002 through SAI-006

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Stage:** WORK-ORDER ANCHORS DEFINED by merged SAI-001; implementation not authorized yet.  
**Dependency:** interaction truth model above, so Answer Intelligence knows what action, evidence, completion, continuity, and done actually mean.

Order is fixed by SAI-001:

1. `SAI-002` — Answer Contract + deterministic consequence router;
2. `SAI-003` — evidence / expertise routing + uncertainty contract;
3. `SAI-004` — Prompt Compiler + Presentation Composer;
4. `SAI-005` — consequence-scaled Critic / Verifier;
5. `SAI-006` — outcome evaluation + governed Help Strategy learning.

SAI improves question interpretation and work quality; it does not create a second execution authority, memory universe, or autonomous policy mutation loop.

### 10 — Aureus Artifact Factory

**Disposition:** DISCOVERED / UNWRITTEN  
**Stage:** DISCOVERED  
**Dependency:** SAI presentation/answer contract is useful but Artifact Factory remains a durable product-object architecture, not chat prose formatting.

First proof: resume.

`structured truthful artifact -> renderer(s) -> .docx / PDF / plain text / copyable content`

Requirements:

- one master resume;
- truthful job-specific variants without invention;
- provenance for claims/facts where material;
- reusable structured object beneath renderers;
- same architecture later supports housing packets, letters, appeals, budgets, proposals, estimates, forms, and business documents.

### 11 — Housing as the first full Mission-system vertical proof

**Disposition:** DISCOVERED / partially documented across existing Housing/People/Legal work  
**Stage:** CANONICALIZED conceptually; thin integrated work order still required.  
**Dependencies:** Mission model, Carry Card, Rooms, Artifact Factory, Ledger, Waiting/Recovery, Authority.

Prove one real mission end-to-end:

`housing goal -> readiness -> search/resources -> money/assistance -> documents -> landlord/realtor communication -> legal/matter support where needed -> moving/transportation -> obligations/waits/proposals -> evidence -> keys-in-hand / member-defined done`

This is also the first proof of **Aureus Housing for Realtors**:

`referral link -> member Mission -> readiness / Carry Card -> Aureus carries the middle -> member returns ready to act`

Realtor/landlord access remains narrow, explicit, revocable, and Mission-scoped.

### 12 — Governed Skill runtime proof through Housing

**Disposition:** DOCUMENTED / UNIMPLEMENTED  
**Stage:** architecture candidate exists; runtime proof not yet accepted.  
**Sources:** Issue #143 and closed-unmerged PR #144 / `docs/pa024-governed-skills-adaptive-intelligence`.  
**Branch reality at this snapshot:** 1 docs commit ahead / 129 commits behind current main; do not resume unchanged.  
**Dependencies:** Steps 5/6 already complete; Housing provides the bounded end-to-end path.

Reconcile the still-valid PA-024 direction onto current architecture, then prove exactly one governed versioned skill end-to-end:

- one logical Aureus Steward;
- skill pack adds competence, never authority;
- minimum-necessary Context Compiler;
- provider-neutral model selection;
- machine-enforced Authority/privacy/tool gates remain controlling;
- independent verification where consequence requires it;
- no silent self-modification;
- production failures can become governed eval/regression candidates.

Do not build a generalized skill runtime until this bounded proof earns it.

### 13 — PEOPLE-008 Flourishing Model / Life optimization

**Disposition:** DOCUMENTED / UNIMPLEMENTED at PEOPLE-000 level, extended by newer discovery.  
**Stage:** CANONICALIZED; thin implementation work order required.  
**Dependencies:** one full Mission proof + Truth/Service Ledger + private Life Map.

Requirements:

- person-defined multidimensional flourishing, not a hidden worthiness score;
- baseline, trajectory, uncertainty, goals, and member-visible explanation;
- person can say “tell me my whole life” or start with one need;
- Aureus identifies connected constraints/opportunities responsibly;
- anticipation is permissioned and non-intrusive: “I found something I think I can make easier. Want me to carry it?”

### 14 — Resource Marshal + Verified Local / Partner Network

**Disposition:** DISCOVERED / partially documented  
**Stage:** CANONICALIZED conceptually; work order(s) required.  
**Dependencies:** Housing proof provides first real network and resource-flow evidence; Flourishing Model provides prioritization context.

Unify inventory/routing of:

- programs and public benefits;
- money/funds;
- donated goods;
- jobs and paid work;
- people/skills/volunteers;
- space;
- transportation;
- vendors/partners/institutional capacity;
- community capacity.

Rule: route existing lawful capacity before new spend/hire/program creation. Ledger records commitments, holder, evidence, outcome, and unresolved gaps.

This work also advances PEOPLE-000 Step 10 Verified Local & Partner Network without creating another directory product.

### 15 — Community Operating System on existing Pods/community primitives

**Disposition:** DISCOVERED / UNWRITTEN  
**Stage:** DISCOVERED  
**Dependencies:** Life/Mission, Resource Marshal, Rooms, existing Pods/community reuse analysis.  

Do not create a second social network. Reuse first.

Capabilities to test:

- local events and gatherings;
- “come hang out” vs “carry something” distinction;
- micro-contributions and recurring community duties;
- matching people, needs, resources, time, and place;
- paid Community Steward anchors;
- belonging/community continuity after a Mission closes;
- quiet home state: “You're good today. Here's what's happening around you.”

### 16 — Foundational Steward-domain expansion behind one Steward

**Disposition:** DOCUMENTED / partially implemented across domains; broader common model deferred.  
**Stage:** DEFERRED until common machinery is proven.  
**Dependencies:** governed Skill proof + Mission/Ledger/Artifact/Resource machinery.

Expand as skills/workstreams, not separate apps/personalities:

- Financial Steward;
- Housing breadth;
- Legal / Matter breadth;
- Work / Capability;
- Household / relationship continuity;
- counseling / mental-health navigation where appropriate and within safe scope;
- transportation;
- document and benefits specialization;
- other foundational flourishing domains earned by evidence.

### 17 — Opportunity Intelligence, Flourishing Economy, Business & institutional scale

**Disposition:** DOCUMENTED / partially implemented / DEFERRED as the next major scale lane.  
**Stage:** DEFERRED until the person-side common system proves one full real vertical.  

This lane includes:

- Opportunity Radar / Graph;
- demand aggregation and buyer proof;
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

### Disposition of the older Product V1 / Business-first execution order

The older PF/OR sequence remains a requirements and historical-evidence source. It is **no longer allowed to independently claim “next”** once this register is accepted.

- Already-merged Business/OR primitives remain COMPLETED and reusable.
- Unmerged old merge candidates (for example PR #124 Revenue Completion and PR #140 Production House convergence) are SUPERSEDED AS CANDIDATES, with useful evidence preserved.
- Commercial/business work is not rejected. It resumes as a deliberate parallel/scale lane only when this register reaches item 17 or when the Founder explicitly amends the register with a bounded parallel exception.
- No old Business-first document may silently preempt the person-side Mission/Responsibility/Ledger/Skills proof.

## 6. Stale-queue cleanup actions

These are repository-hygiene actions, not new product slices.

1. **Issue #136:** confirm PR #137 acceptance record, then close/disposition as completed rather than leaving Step 3 apparently open.
2. **Issue #145:** reconcile each blocker against PRs #146–#163 and current product/release evidence. Keep only genuinely unresolved acceptance paths.
3. **Issue #95:** convert remaining relevant production acceptance items into Living Release Gate/manual-contract coverage or current work-order acceptance. Mark historical completed items and stop using #95 as an independent execution order.
4. **Issue #143:** keep open as the governed-skills architecture anchor until the reconciled PA-024/first Housing skill proof supersedes it; link the old PR #144 as historical candidate only.
5. **Issue #122:** update Steps 1–6 to completed and point Step 7 onward to this register; keep the ladder as domain-definition truth, not priority truth.
6. **Issue #99:** retain as deferred dependency maintenance with an external-upstream trigger.
7. Preserve closed-unmerged branches/PRs as evidence unless a separate cleanup policy explicitly authorizes deletion.

## 7. Future work-order template requirements

Every new thin work order should declare:

- register item / parent item;
- exact predecessor dependency;
- disposition and lifecycle stage;
- canonical truth owner(s) reused;
- explicit non-duplication analysis;
- authority/privacy boundary;
- what “done” means;
- automated evidence required;
- manual Accountable Steward evidence required when production-impacting;
- Living Release Gate contract IDs or an explicit docs-only/no-deployment-impact statement;
- successor item;
- which register row must change after acceptance.

## 8. Definition of done for REG-001

REG-001 is complete only when:

- this register is reconciled onto the exact post-UI-003 `main`;
- current PR/issue state is refreshed;
- Product V1 execution docs and Founder execution guidance point here for sequencing;
- PEOPLE-000 points here for order while preserving its domain ladder;
- stale founder-walkthrough issues are reconciled or have explicit cleanup dispositions;
- no competing document still truthfully describes itself as the sole active sequencing authority without a pointer to this register;
- independent review finds no lost requirement, silent supersession, or governance weakening;
- Founder authorizes merge;
- future “What is next?” queries have one repository answer.

## 9. Immediate next action

**Do not advance this preparation branch to a PR yet.**

Current next action remains:

`PR #162 exact head 47cd41a... -> independent verification -> accepted merge -> exact deployment -> Living Release Gate -> Accountable Steward walkthrough`

After #162 is accepted, rebase/recreate this register branch from the resulting `main`, update UI-003 to ACCEPTED/DEPLOYED as evidence warrants, refresh open issue/PR state, then submit REG-001 for independent review. Only after REG-001 is accepted should the Steward Voice & Interface canon become the next construction candidate.
