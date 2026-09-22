# Aureus Discovery & Execution Register

**Status:** CANONICAL SEQUENCING REGISTER — bootstrap-safe across review and merge.  
**Reconciled base:** `b1485f279aff07ebaefc1a409e01bd46c02d5e47` — merge of PR #162 / UI-003.  
**Preparation branch:** `docs/master-discovery-execution-register`  
**Current-item rule:** determine the active item from live Git and the merge-stable review-branch / accepted-on-`main` interpretation recorded on that item below. An unmerged candidate remains under verification; once its accepted files are present on `main`, its successor activates automatically. Historical snapshots do not determine current `main`.  
**Founder direction:** replace overlapping sequencing sources with one ordered register while preserving requirements, evidence, history, and governance.

> **Bootstrap rule:** REG-001 established this register as the single cross-program sequencing authority. Successor items use the same merge-stable pattern: review-branch state is candidate evidence only; accepted-on-`main` state advances the queue without requiring a status-only cleanup commit. No later feature is authorized merely because it appears in this register.

## 1. Why this register exists

Aureus accumulated several legitimate but overlapping sources of execution truth:

- `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md` — older Product V1 / Business-first PF and OR sequence;
- GitHub Issue #122 (`PEOPLE-000`) — the People completion ladder;
- `release-gates/manifest.json` — Living Release Gate work-order registry;
- merged `SAI-001` — Steward Answer Intelligence architecture and its SAI-002…SAI-006 successors;
- GitHub Issue #143 plus the closed-unmerged PA-024 candidate — governed Skills / Context Compiler / adaptive intelligence direction;
- the historical `docs/steward-voice-interface-standard` branch — source evidence for the fresh AUREUS-016 Voice & Interface canon reconciliation;
- historical Founder walkthrough issues #95 and #145, whose checklists predate later repairs and the Living Release Gate;
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

## 4. REG-001 reconciliation snapshot

This section records the repository state used to reconcile REG-001. It is a historical anchor for this bootstrap slice, not a live current-main pointer. **After REG-001 merges, and after any later repository change, determine current `main` from live Git rather than from this snapshot.**

### Reconciliation base / `main` at reconciliation

`b1485f279aff07ebaefc1a409e01bd46c02d5e47` — `main` when REG-001 was reconciled; merge of PR #162 / UI-003 Active Work Surface.

### UI-003 release evidence

- PR #162 exact accepted head: `47cd41a925951091bec4fa8f3978d0a6ab4d6099`.
- Merged to `main` as `b1485f279aff07ebaefc1a409e01bd46c02d5e47`.
- Steward Release Gate run #9 targeted that exact merged SHA.
- Living Exact-Deployment Gate completed successfully, including registry validation, browser runtime resolution, every required automated release contract, evidence verification, and evidence preservation.
- Separate Accountable Steward mobile + desktop walkthrough remains a human acceptance fact and must only be marked complete when actually performed.

### Open pull requests

**None** at the reconciliation snapshot before REG-001 PR creation.

### Active open issues after REG-001 reconciliation

- **#122 — PEOPLE-000:** remains open as the People domain requirements ladder. Steps 1–6 are now explicitly marked complete; the issue points sequencing to this register and no longer claims Step 1 as the immediate target.
- **#143 — governed skills / adaptive intelligence:** remains open as DOCUMENTED / UNIMPLEMENTED architecture evidence. It explicitly does not authorize immediate runtime work; Housing remains the first bounded skill proof at item 12. Old PR #144 stays historical evidence only.
- **#99 — temporary Prisma/deepmerge audit exception:** remains open as DEFERRED MAINTENANCE. It resumes only when the upstream dependency trigger is satisfied and does not preempt this register.

### Issues dispositioned during REG-001

- **#136 — PEOPLE-HOUSEHOLD-001:** CLOSED / COMPLETED. PR #137 is the accepted Step-3 implementation record.
- **#95 — older Founder Walkthrough ordered launch plan:** CLOSED / SUPERSEDED AS SEQUENCING. Historical requirements remain evidence; release acceptance moved to the Living Release Gate/current work orders.
- **#145 — Founder Walkthrough blocking product defects:** CLOSED / SUPERSEDED AS A CURRENT QUEUE. Repaired items are linked to later PRs; residual UX evidence is retained for current Voice/Interface/state work and exact-deployment human walkthroughs.

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

**Review-branch interpretation:** IN FLIGHT / VERIFYING. PR #166 is the candidate and remains Draft/HOLD until fresh exact-head independent review passes.  
**`main` interpretation after accepted merge:** COMPLETED / ACCEPTED. REG-001 is docs-only and creates no production deployment gate of its own.  
**Work order:** `docs/work-orders/REG-001-Master-Discovery-Execution-Register.md`  
**Dependency:** post-UI-003 main satisfied.  
**Successor activation:** the presence of this accepted register on `main` makes Item 03 — AUREUS-016 — the current construction item automatically.

REG-001 acceptance proves that this register:

- is the single sequencing authority;
- classifies older queues as requirements/evidence/historical/deferred rather than competing “next” lists;
- reconciles current PR/issue state and stale Founder walkthrough queues;
- preserves constructor/verifier separation and Living Release Gate doctrine;
- requires future work orders to name register parent/predecessor and update the register on acceptance;
- implements no later feature.

### 03 — AUREUS-016 Steward Voice & Interface canon reconciliation

**Review-branch interpretation:** IN FLIGHT / VERIFYING when the AUREUS-016 changes exist only on `docs/aureus-016-voice-interface-reconciliation`; they remain candidate canon until exact-head independent review and Founder merge authorization.  
**`main` interpretation after accepted merge:** COMPLETED / ACCEPTED Member Experience canon reconciliation; docs-only and no production deployment gate of its own.  
**Work order:** `docs/work-orders/AUREUS-016-Steward-Voice-Interface-Canon-Reconciliation.md`  
**Fresh branch:** `docs/aureus-016-voice-interface-reconciliation`  
**Historical source branch:** `docs/steward-voice-interface-standard` at `4a9db08c4fa39982cf36ead4705d13b9798bb5d4`  
**Successor activation:** once the accepted AUREUS-016 canon and this register transition are present on `main`, Item 04 becomes current automatically, beginning with **UI-004 — Waiting**.

AUREUS-016 must:

- preserve `AUREUS-004 — THE STEWARD CANON` as the relationship-level Steward standard;
- reconcile, rather than silently layer, the conflicting fixed-opening and always-first-question clauses in `AUREA-002 — ARRIVAL CANON`;
- preserve PR #163 / UI-003 normal Hall opening: one `How can we help?`, one `Tell me what you want to accomplish.`, and the composer;
- preserve early preferred-name/pronunciation care without turning it into a gate before help;
- preserve short, first-person, concrete language and continuity across voice/text;
- make every ask carry its reason and every wait carry truthful holder/chase information when known;
- keep bad-news recovery, choice, done, and quiet as one underlying Steward state grammar;
- place access/account/authority requests only at real Carry Boundaries and preserve reversibility/transparency;
- record the Founder-approved refinement of the historical access rule: **deliver first by default, but when the member's requested outcome genuinely cannot responsibly proceed without a smallest-necessary access/account/connection/authority dependency, Aureus may ask for it before delivering additional work; convenience or broader data collection is not sufficient; the reason, unlocked work, alternatives, and revocability/choice must be explained; access never expands authority by itself**;
- keep SAI-001 as the intelligence/presentation architecture rather than duplicate it;
- keep LRG as release authority and Human/Accountable Steward acceptance separate;
- preserve later Carry Board/Card, Mission Rooms, and Truth/Service Ledger principles without implementing or reordering their registered slices.

### 04 — Steward interaction-state implementation slices

**UI-004 accepted-on-`main`:** COMPLETED / ACCEPTED as code. PR #169 merged as `f60df8d0f8ce0600b2449a77fa0051b8d3659753`; exact production deployment/Living Release Gate and Accountable Steward walkthrough remain separately evidenced release facts.  
**UI-005 accepted-on-`main`:** COMPLETED / ACCEPTED as code. PR #170 merged as `180da9bbc4b7d9ae00aa3f77ed8176a378179d4b`; exact production deployment/Living Release Gate and Accountable Steward walkthrough remain separately evidenced release facts.  
**UI-006 review-branch interpretation:** IN FLIGHT / BUILDING-VERIFYING when the Bad News / Recovering implementation exists only on `feat/ui-006-bad-news-recovering`; it remains a production candidate until exact-head CI/Docker, independent review, and Founder merge authorization are satisfied.  
**`main` interpretation after accepted UI-006 merge:** UI-006 is COMPLETED / ACCEPTED as code; production deployment remains separately evidenced. **UI-007 — Choosing** becomes the current construction slice automatically.  
**UI-004 work order:** `docs/work-orders/UI-004-Waiting.md`  
**UI-005 work order:** `docs/work-orders/UI-005-Asking.md`  
**UI-006 work order:** `docs/work-orders/UI-006-Bad-News-Recovering.md`  
**Dependencies:** accepted AUREUS-016 Voice & Interface canon + merged UI-003 Active Work Surface + accepted UI-004 Waiting + accepted UI-005 Asking.  
**UI-006 truth owners reused:** existing Active Work surface; conversation-scoped Responsibility `BLOCKED` / `RESPONSIBLY_EXHAUSTED` truth; bounded People Step-5 `BLOCKED` / `MISSED` / `DISPUTED`, `reviewRequired`, `reviewReason`, and real `nextAttemptAt`; no new recovery persistence, retry engine, or parallel work model.

Thin order:

1. **UI-004 — Waiting** — COMPLETED / ACCEPTED as code. Holder, real last/next follow-up when recorded, due/provenance when known, and `Nothing you need to do.` only when canonical ownership/review truth supports it. A due time is not silently relabeled as a response ETA, generic activity is not relabeled as a chase, and a later broader wait after Step-5 satisfaction requires explicit post-satisfaction Responsibility transition evidence.
2. **UI-005 — Asking** — COMPLETED / ACCEPTED as code. One sourced ask, why it is needed, what Aureus will do after receiving it, truthful effort only when known, an alternate route when one exists, and no re-asking established facts. Coarse `WAITING_ON_USER` alone may not fabricate a specific request.
3. **UI-006 — Bad News / Recovering** — IN FLIGHT on its review branch. What failed or changed, what remains true, what Aureus actually preserved/did, next safe route when one exists, holder only when independently proven, repair/review action, and a real checkpoint only when one exists. No cause, holder, alternate, or retry date may be fabricated merely to make bad news feel active.
4. **UI-007 — Choosing** — real options, tradeoffs, uncertainty, authority, next action; Aureus does not silently decide for the person.
5. **UI-008 — Done + Quiet** — verified completion/testimony and a quiet state that does not manufacture engagement.

**UI-006 successor activation:** accepted UI-006 implementation plus this register transition on `main` advances the current construction item to **UI-007 — Choosing**. The UI-006 exact-deployment gate and Accountable Steward walkthrough remain release/acceptance facts and must not be fabricated by queue advancement.

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

`PRODUCT-V1-EXECUTION-ORDER.md` is now explicitly labeled a historical execution / requirements record and points to this register for current sequencing.

- merged Business/OR primitives remain reusable;
- old unmerged #124 / #140 remain superseded candidates, not current execution;
- Business/commercial work is not rejected — it resumes at item 17 or through an explicit Founder-amended safe parallel lane;
- older Business-first order may not silently preempt the person-side Mission / Responsibility / Ledger / Skills proof sequence.

### PEOPLE-000

Issue #122 now explicitly remains the People domain definition rather than the execution queue. Steps 1–6 are marked complete and sequencing points here. Step 7 onward retains requirements value.

### Living Release Gate

LRG remains the release authority for deployed change. This register chooses *what is next*; LRG proves whether production-impacting work is acceptable to release. They do not replace one another.

### SAI-001

Keep its successor order intact, but position SAI-002…006 at item 09 so the answer system is grounded in the work/authority/truth model it must serve.

### Governed Skills

Issue #143 remains open as DOCUMENTED / UNIMPLEMENTED architecture evidence, not a current queue. Do not resume PR #144 unchanged. The first runtime proof remains one bounded Housing skill after the integrated Housing vertical is ready.

### Voice & Interface branches

The historical `docs/steward-voice-interface-standard` branch is preserved as source evidence only and must not be merged unchanged. AUREUS-016 is reconstructed on fresh `docs/aureus-016-voice-interface-reconciliation` from post-REG-001 `main`. Once its accepted canon is on `main`, the historical branch remains evidence and Item 04 becomes current.

The AUREUS-016 reconciliation also records an explicit Founder policy decision refining the historical deliver-before-more-access rule: deliver first remains the default, with only a smallest-necessary dependency exception when the member's requested outcome genuinely cannot responsibly proceed without the requested access/account/connection/authority. This is an intentional supersession, not a silent weakening, and may not be used merely for convenience or broader data collection.

### Historical Founder walkthrough queues

Issues #95 and #145 are closed as superseded sequencing mechanisms. Their still-valid requirements remain historical evidence and feed current work orders/LRG/manual acceptance when relevant. Neither can independently reorder this register.

## 7. REG-001 cleanup record

1. **#136 — COMPLETE:** linked to accepted PR #137 and closed as completed.
2. **#145 — COMPLETE:** reconciled against later repairs; closed as superseded current queue while preserving residual UX evidence.
3. **#95 — COMPLETE:** closed as superseded ordered queue; still-valid acceptance ideas mapped to LRG/current/future work.
4. **#143 — COMPLETE FOR REG-001:** remains open as governed-skills anchor, explicitly deferred to the Housing skill proof.
5. **#122 — COMPLETE FOR REG-001:** Steps 1–6 marked complete and sequencing redirected here.
6. **#99 — COMPLETE FOR REG-001:** remains open as deferred external-trigger maintenance and cannot preempt current sequence.
7. **Product V1 order — COMPLETE FOR REG-001:** explicitly demoted from active registry to historical requirements record with pointer here.
8. Preserve closed-unmerged branches/PRs as historical evidence unless a separate branch-retention policy explicitly deletes them.

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

## 9. REG-001 acceptance record

The following are the acceptance conditions for the bootstrap slice. On the review branch they are the review gate; once this accepted file is on `main`, they are the historical reason Item 02 is complete:

- this register is anchored to exact post-UI-003 main;
- UI-003 is no longer described as an open PR;
- current open PR/issue state is refreshed;
- Product V1 guidance points here for sequencing while retaining its requirements/history;
- PEOPLE-000 points here for order while retaining its domain ladder;
- stale walkthrough issues are reconciled/dispositioned;
- no competing document truthfully claims sole active sequencing authority without a pointer to this register;
- future work orders are required to update the register;
- no later feature implementation is included;
- exact-head CI is green;
- independent review confirms no lost requirement, silent supersession, duplicate truth universe, or governance weakening.

## 10. Current-item resolution

Determine current work from **live Git** plus the merge-stable interpretation on the relevant queue item; do not use historical SHAs or timestamps as a current-state substitute.

For UI-006 specifically:

- **If the UI-006 implementation/register changes exist only on `feat/ui-006-bad-news-recovering`:** UI-006 is the current candidate under construction/independent verification. UI-007 is not authorized by that branch.
- **If the independently accepted UI-006 implementation and this register transition are present on `main`:** UI-006 is complete as the accepted code slice; its exact-deployment and Accountable Steward evidence remain separate release facts. The canonical current construction item is **UI-007 — Choosing**.

That accepted-on-`main` transition is the queue advancement. No post-merge status-only edit is required merely to mark UI-006 complete.