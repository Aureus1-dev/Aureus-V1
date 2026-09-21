# Aureus Founder Control Center

**Status:** HISTORICAL BUILD-CONTROL SNAPSHOT — superseded for current sequencing by `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md`.  
**Last reconciled:** 2026-09-02  
**Scope:** Preserved product-construction and release evidence from that date. This document does not amend governance or constitutional authority and must not be used for current SHAs, `NOW`/`NEXT` sequencing, or current PR/issue status.

> **Current execution truth:** after REG-001 is independently accepted and merged, use the Master Discovery & Execution Register for what comes next, the applicable current work order for the bounded job, live GitHub state for exact SHAs/PRs/CI, and the Living Release Gate plus Accountable Steward walkthrough for release acceptance. The historical `NOW`, `NEXT`, repository baselines, and Issue #95 references below are retained as evidence of the September 2 operating state only.

## 1. What this dashboard recorded

At the time of the September 2 snapshot, this was the Founder's one-page answer to five questions:

1. What is live now?
2. What are we building now?
3. What is broken or unproven?
4. What comes next?
5. What requires the Founder's decision or real-world test?

The dashboard was not another customer-facing Aureus feature. It was the control plane for the build at that time. It is now preserved rather than continuously updated so later sessions cannot mistake stale SHAs or old sequencing for present truth.

## 2. Historical system baseline

| Repository | `main` recorded in this snapshot | Role recorded at the time |
|---|---|---|
| Aureus-V1 | `80a0e1f5083c751bc91e9830122fc01d6516dfd1` | Product/runtime owner. OR-002 PR #111 was merged; post-merge CI run `33588099069` was SUCCESS including Docker. OR-003 was planned from this exact main. |
| Aureus-Foundry | `e6c0a4558145c6f00d5e7734be95af08daf8241a` | Main was the production-neutral baseline. Draft PR #7 was the governed Claude review meeting room; latest closure-review head `6ea7ae4327933d9789c231433fb3251654a39bbc` had passed Foundry CI but was not merged. |
| Aureus-Library | `ea9887c50550e466411742c3f3fc53a3de7f264f` | Governed durable knowledge and release integrity layer |

### Product construction completed as of this snapshot

The business-product sequence PF-004 through PF-012 was recorded as merged. The repository already contained:

- business tenant foundation;
- business knowledge workspace;
- account-free public Ward;
- consented lead and human handoff;
- business operations console;
- Kitchen & Bath vertical pack;
- pilot-operability and release controls;
- phone/SMS continuity scaffolding;
- Founder walkthrough / first-client release gate.

The recorded job was no longer to invent those foundations. It was to complete, harden, verify, simplify, and connect the system.

## 3. Historical active work snapshot

### CLOSED — Outcome architecture reconciliation

- V1 PR #107 merged the reviewed PA-021 / PA-022 outcome, Responsibility, Private Steward, Visual Flourishing, final discovery, and execution-sequence architecture.
- Exact merged PR #107 content head: `317ead09576c67ac4894743780e35f879aae1903`.
- Resulting merge commit: `47119f4cf824e06098bcaa370a6a6ef8cab9c47b`.
- Claude post-merge independent verdict: PASS WITH CONDITIONS / FOLLOW-UP PR REQUIRED; no Critical/High finding and no revert recommended.
- Post-merge CI run `33509252590`: SUCCESS.

### CLOSED — Completion Case transition gate

- V1 PR #109 formalized the Business/shared ↔ Personal/private transition boundary required by the independent review.
- Exact reviewed head: `8d431754a21413fc92ffdd7a059198ce34ebcd20`.
- Claude closure verdict: PASS; no P0/P1; READY FOR FOUNDER MERGE DECISION.
- Resulting V1 main at that point: `2c545de9e25b3c740db0fec6183f6ef9efbf541b`.
- Post-merge main CI run `33576038825`: SUCCESS.
- OR-CCT-001 did not authorize cross-context transfer; it defined the gate a later implementation must pass.

### CLOSED — OR-001 Responsibility Core

- V1 PR #110 merged the first thin durable Responsibility Core.
- Exact independently reviewed content head: `e5125181a06e6bb9bfecc5d2c15c5eb4dc57a7fc`.
- Resulting main: `29e402941cece696040dbbf6ae675b308a8291db`.
- Claude verdict: PASS / READY FOR FOUNDER MERGE DECISION; no P0/P1 findings.
- Post-merge CI run `33579400562`: SUCCESS.
- First proof: owned conversation + verified Opportunity → explicit bounded Responsibility → durable commitment → waiting-on-member → referenced REPORTED domain evidence → deterministic completion.

### CLOSED — OR-002 People help-to-completion

- V1 PR #111 merged the first durable People help-to-completion experience.
- Exact independently reviewed content head: `2af8ec409c34a4992d2a000992937fcd029afac3`.
- Claude verdict: PASS / READY FOR FOUNDER MERGE DECISION; no P0/P1 findings.
- Resulting main: `80a0e1f5083c751bc91e9830122fc01d6516dfd1`.
- Post-merge CI run `33588099069`: SUCCESS including Docker.
- Proof: verified application help → durable private Responsibility → leave/return → exact session/Responsibility binding → pause/resume → explicit member-reported outcome → truthful completion surface.

### HISTORICAL NOW — OR-003 Kitchen & Bath Ready Project

**Working branch recorded then:** `feat/or-003-kitchen-bath-ready-project`  
**Base recorded then:** `80a0e1f5083c751bc91e9830122fc01d6516dfd1`  
**Work order:** `docs/work-orders/OR-003-Kitchen-Bath-Ready-Project.md`

Goal recorded then:

`fuzzy project intent → customer-supplied discovery → distilled Ready Project → explicit Transaction Barrier Graph → exact expert validation still required`

OR-003 reused the consented PF-009 Kitchen & Bath handoff rather than creating a second CRM/project source of truth. The Ready Project was defined as a deterministic projection of retained customer-supplied/system-observed facts; the raw Ward transcript remained attributable evidence but was no longer the contractor's primary reconstruction interface.

The first barrier graph kept uncertainty explicit: desire, fit, price, funding, availability, timing, knowledge/uncertainty, trust, decision authority, administrative friction, and alternatives. No hidden lead score or inferred trust/propensity was introduced.

This slice intentionally did **not** manufacture a Business-customer Responsibility principal for account-free visitors. Responsibility principal constraints and OR-CCT-001 remained intact.

Acceptance required:

1. deterministic Ready Project and deny-path tests;
2. customer/business Outcome Surface tests;
3. exact-head CI + Docker success;
4. fresh independent Claude review;
5. Founder merge decision.

### HISTORICAL NEXT after OR-003

The snapshot said to proceed to OR-004 Revenue Completion. **That sequencing statement is superseded.** Current order comes only from the Master Discovery & Execution Register after REG-001 acceptance.

## 4. Definition of complete V1 recorded here

V1 was not defined by the number of features. The core promise recorded here was:

`Understand → tell the truth → give a real next step → preserve context → obtain consent where required → hand off → record the outcome → recover safely when something fails.`

For the founding Business Ward pilot:

`Business onboarding → approved knowledge → public Ward → answer/clarify → consented human handoff → business follow-up → outcome → correction/deletion → failure drill.`

No external business begins until the applicable automated release gate and the Founder/Accountable Steward mobile/desktop walkthrough pass against the same exact deployed V1 SHA.

## 5. The build operating system

### Human/AI roles

| Role | Primary job | May not do |
|---|---|---|
| Founder | Product judgment, priorities, irreversible approvals, real-device acceptance | Be forced to inspect every low-level implementation detail |
| ChatGPT | Lead integrator/executor: inspect state, define smallest correct change, implement/reconcile, audit diff, enforce acceptance sequence | Self-certify its own work as sufficient |
| Claude | Independent adversarial engineer/reviewer: attack assumptions, security, architecture, edge cases, regressions, unnecessary complexity | Become a rubber-stamp reviewer |
| Gemini | Multimodal evaluator: screenshots, recordings, visual/mobile QA, large evaluation sets, later See/Guide screen understanding | Become a required dependency merely because credits exist |
| Foundry | Work-order compilation, consequence/data classification, producer/reviewer routing, evidence, audit, evaluation, disagreement/outcome machinery | Sit in the live customer critical path before its production blockers are closed |
| CI | Mechanical referee for tests, migrations, types, lint, builds, images and contract gates | Claim that production UX works |
| Founder / Accountable Steward walkthrough | Human proof that the deployed product actually works | Be replaced by CI or model confidence |

### Current required change loop

1. Master Discovery & Execution Register identifies the one active item and predecessor.
2. Constructor reads live repository state, the current work order, and governing implementation documents.
3. Work happens on one dedicated branch.
4. Tests/evidence are added for intended behavior and relevant deny paths.
5. An independent reviewer inspects the requirement, architecture, full diff, and exact head with an explicit instruction to find failure.
6. Findings are reconciled; disagreements remain visible until resolved.
7. CI must pass at one exact head SHA.
8. Multimodal/visual evaluation is used when the change affects UX or real-world screen understanding.
9. The exact accepted SHA is merged and, where applicable, deployed.
10. Living Release Gate runs against the exact deployed SHA for production-impacting work.
11. Accountable Steward human acceptance is recorded separately where required.
12. The Master Register is updated before the next item begins.

## 6. Where the Foundry belongs

### Foundry is part of the operating-system direction

The Foundry architecture models:

- request and intent intake;
- clarification and work-order compilation;
- consequence classification;
- data classification;
- immutable policy/routing versions;
- provider/model/capability declarations;
- plans, runs and steps;
- candidate outputs and evidence;
- provenance;
- independent reviews and disagreements;
- approval gates and human decisions;
- artifacts;
- cost and audit records;
- outcomes, feedback, corrections and evaluations.

Learning may propose changes but does not activate live policy itself.

### Historical construction use recorded here

The snapshot proposed using Foundry as the **build and evaluation factory** before making it a runtime dependency:

- compile high-level requests into inspectable work orders;
- classify what is safe to automate versus what needs human approval;
- define producer/reviewer separation;
- run offline evaluation sets;
- preserve review disagreements;
- score candidate approaches against explicit acceptance criteria;
- record outcomes and corrections;
- prove provider-neutral contracts before adding live adapters.

That direction remains evidence, but current Foundry sequencing is controlled by the Master Register.

### Historical blockers before Foundry production runtime

The snapshot listed:

- real provider adapters and contract-quality proof;
- production authentication rather than caller-trusted headers;
- replacement/evolution of the single-node SQLite baseline for production concurrency;
- transport deadlines, retries and distributed recovery appropriate to live adapters;
- production retention, forgetting, encryption/key management and data-residency decisions;
- real Library production retrieval interface;
- production deployment, secrets and observability;
- empirical quality/latency/cost evaluation.

Only after the relevant current work orders and gates are satisfied should V1 make Foundry a required service for live user requests.

## 7. Historical intended end-state architecture

```text
                         FOUNDER CONTROL CENTER
                                  |
                    priorities / decisions / truth
                                  |
                                  v
                              WORK ORDER
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
     ChatGPT — producer / integrator             Claude — adversarial review
            |                                           |
            +---------------------> GitHub <-------------+
                                  |
                         branch / PR / exact SHA
                                  |
                                 CI
                                  |
                        Gemini UX evaluation
                         when applicable
                                  |
                                  v
                             PRODUCTION
                                  |
                         Founder walkthrough
                                  |
                                  v
                             OUTCOME DATA
                                  |
                                  v
                              FOUNDRY
                    evaluation / learning candidate
                                  |
                                  v
                              LIBRARY
                  only through governed admission/release
```

The control-plane box in this historical diagram is now functionally replaced for sequencing by the Master Discovery & Execution Register plus the applicable work order and live Git state.

### Runtime end state after Foundry productionization

```text
Member / Visitor / Business
            |
            v
        Aureus-V1
 UX + auth + tenant + conversations + product state
            |
            +-------- read approved knowledge --------> Library
            |
            +-------- bounded intelligence work ------> Foundry
                                                        |
                                  producer / reviewer / evidence / approval
                                                        |
                                                        v
                                             provider/model adapters
                                                        |
                                                        v
                                                attributable result
            <-------------------------------------------+
            |
            v
       Human / product outcome
            |
            +-------- feedback/evaluation ------------> Foundry
                                                        |
                                             candidate correction only
                                                        |
                                                        v
                                                   Library review
```

## 8. Connecting independent reviewers

For current V1 work, an independent reviewer should:

1. operate against the exact current PR/head rather than a disconnected copy;
2. read `CLAUDE.md`, `docs/ai/REPOSITORY_STEWARD.md`, the Master Discovery & Execution Register, the current work order, relevant architecture/ADRs, and the entire proposed diff;
3. form an independent view rather than becoming a co-author;
4. return blockers, security/tenant risks, incorrect assumptions, missing tests, simpler alternatives, and PASS/HOLD tied to the exact SHA.

Do **not** use old Issue #95 or the `NOW/NEXT` labels in this file as current reviewer instructions.

### Foundry and Library historical setup evidence

Library bootstrap governance recorded here had merged on `main`:

- Aureus-Library PR #14 merged at reviewed head `e160e0eda88bfa21f33a5c36b6753114404e68b6`; Library `main` in this snapshot was `ea9887c50550e466411742c3f3fc53a3de7f264f`.
- Library had provider-neutral root `AGENTS.md` plus a thin root `CLAUDE.md` on `main`.
- Competing Library PR #13 was closed unmerged and superseded.

Foundry evidence recorded here:

- Aureus-Foundry `main` in this snapshot was `e6c0a4558145c6f00d5e7734be95af08daf8241a`.
- Foundry draft PR #7 was open and unmerged.

Do not copy V1 instructions into another repository. Each entry point must encode that repository's own architecture, commands, test gates, authority boundaries, and cross-repository contract rules.

## 9. Founder decision lane

The Founder should normally see only items in these categories:

- product behavior or experience choice with no existing answer;
- pricing/commercial commitment;
- external client admission;
- material privacy/legal/data-retention choice;
- irreversible or consequential action authority;
- architecture tradeoff with meaningful long-term lock-in;
- acceptance of a known risk that cannot currently be eliminated;
- final Founder/Accountable Steward walkthrough result.

Ordinary bug fixes, test repairs and implementation choices that fit accepted architecture should not be escalated unnecessarily.

## 10. Operating principles

Every build and commercial decision is tested against four simple product principles:

1. **Tell the truth.**
2. **Leave people better.**
3. **Keep the promise.**
4. **Do as much as we responsibly can.**

Trust is the result of repeatedly living these principles rather than a separate slogan.

## 11. Archive rule

This file is now a **frozen historical snapshot**, not living execution truth.

Do not update its old repository SHAs, OR-003 `NOW`, OR-004 `NEXT`, or Issue #95 references as if they were current. Current status changes belong in:

- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md`;
- the applicable current work order;
- live GitHub PR/issue/CI/release evidence;
- the Living Release Gate and separate Accountable Steward acceptance record where relevant.

If this historical snapshot contains a useful requirement, cite and reconcile that requirement into the current work order rather than reviving this file as a second control plane.
