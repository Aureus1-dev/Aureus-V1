# Aureus Founder Control Center

**Status:** Founder-facing build control plane  
**Last reconciled:** 2026-09-02  
**Scope:** Product construction and release truth only. This dashboard does not amend governance or constitutional authority.

## 1. What this dashboard is for

This is the Founder's one-page answer to five questions:

1. What is live now?
2. What are we building now?
3. What is broken or unproven?
4. What comes next?
5. What requires the Founder's decision or real-world test?

The dashboard is not another customer-facing Aureus feature. It is the control plane for the build.

## 2. Current system baseline

| Repository | Current `main` | Role today |
|---|---|---|
| Aureus-V1 | `2c545de9e25b3c740db0fec6183f6ef9efbf541b` | Product/runtime owner. PR #109 is merged; exact-main post-merge CI run `33576038825` is SUCCESS. OR-001 now builds on this exact base. |
| Aureus-Foundry | `e6c0a4558145c6f00d5e7734be95af08daf8241a` | Main remains the production-neutral baseline. Draft PR #7 is the governed Claude review meeting room; latest closure-review head `6ea7ae4327933d9789c231433fb3251654a39bbc` passed Foundry CI but is not merged. |
| Aureus-Library | `ea9887c50550e466411742c3f3fc53a3de7f264f` | Governed durable knowledge and release integrity layer |

### Product construction completed

The business-product sequence PF-004 through PF-012 is merged. The repository already contains:

- business tenant foundation;
- business knowledge workspace;
- account-free public Ward;
- consented lead and human handoff;
- business operations console;
- Kitchen & Bath vertical pack;
- pilot-operability and release controls;
- phone/SMS continuity scaffolding;
- Founder walkthrough / first-client release gate.

The current job is no longer to invent those foundations. It is to complete, harden, verify, simplify, and connect the system.

## 3. Current active work

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
- Resulting current V1 main: `2c545de9e25b3c740db0fec6183f6ef9efbf541b`.
- Post-merge main CI run `33576038825`: SUCCESS.
- OR-CCT-001 does not authorize cross-context transfer; it defines the gate a later implementation must pass.

### NOW — OR-001 Responsibility Core

**Working branch:** `feat/or-001-responsibility-core`  
**Base:** `2c545de9e25b3c740db0fec6183f6ef9efbf541b`  
**Work order:** `docs/work-orders/OR-001-Responsibility-Core.md`  
**Architecture:** PA-021 / PA-022  
**Cross-context boundary:** OR-CCT-001

Goal: prove the smallest durable Responsibility primitive without building a generalized workflow engine.

First proof:

`owned conversation + VERIFIED/ACTIVE opportunity → explicit bounded Responsibility → durable commitment → waiting-on-member when needed → referenced domain evidence → deterministic completion`

The first Responsibility kind is deliberately narrow: `OPPORTUNITY_DECISION`. Completion means the member's concrete Opportunity decision was recorded in the existing `SavedOpportunity.trackingStatus` domain. It does **not** claim external approval, award, benefit receipt, application submission, or other real-world completion.

OR-001 is PERSONAL / GUIDANCE_ONLY / PERSONAL_PRIVATE only. It does not implement Business Responsibilities, cross-context memory transfer, browser/computer use, autonomous submission, personal life-memory storage, Economic Stewardship, Outcome Graph, or learning.

Acceptance still requires:

1. complete implementation and deny-path tests;
2. exact-head CI + Docker success;
3. fresh independent Claude review of the frozen exact SHA;
4. Founder merge decision;
5. deployment/production acceptance separately where applicable.

### NEXT after OR-001

After OR-001 is independently reviewed and merged, proceed to the next Product V1 Execution Order slice rather than reopening broad architecture research. OR-002 proves People help-to-completion and must obey OR-CCT-001 before any cross-context continuation is implemented.

## 4. Definition of complete V1

V1 is not defined by the number of features. It is complete when the core promise works reliably:

`Understand → tell the truth → give a real next step → preserve context → obtain consent where required → hand off → record the outcome → recover safely when something fails.`

For the founding Business Ward pilot:

`Business onboarding → approved knowledge → public Ward → answer/clarify → consented human handoff → business follow-up → outcome → correction/deletion → failure drill.`

No external business begins until the automated release gate and the Founder mobile/desktop walkthrough pass against the same exact deployed V1 SHA.

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
| Founder walkthrough | Human proof that the deployed product actually works | Be replaced by CI or model confidence |

### Required change loop

1. Dashboard identifies one active work order.
2. ChatGPT reads current repository state and governing implementation documents.
3. Work happens on one dedicated branch.
4. Tests are added for the intended behavior and relevant deny paths.
5. Claude independently reviews the requirement, architecture and diff with an explicit instruction to find failure.
6. Findings are reconciled; disagreements remain visible until resolved.
7. CI must pass at one exact head SHA.
8. Gemini performs visual/multimodal evaluation when the change affects UX or real-world screen understanding.
9. The exact SHA is merged and deployed.
10. Production acceptance for that work order is run.
11. A defect becomes the next work order and a permanent regression check where possible.
12. This dashboard is updated before moving on.

## 6. Where the Foundry belongs

### Foundry is part of the operating system now

The Foundry is the intelligence-production layer, not an optional future idea. Its architecture already models:

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

### How we use Foundry during V1 construction

Use Foundry as the **build and evaluation factory** before making it a runtime dependency:

- compile high-level requests into inspectable work orders;
- classify what is safe to automate versus what needs human approval;
- define producer/reviewer separation;
- run offline evaluation sets;
- preserve review disagreements;
- score candidate approaches against explicit acceptance criteria;
- record outcomes and corrections;
- prove provider-neutral contracts before adding live adapters.

This means Foundry participates in how Aureus is built **now**, even while the live member/business request path can continue to run directly in V1.

### What must happen before Foundry becomes a production runtime service

Current known blockers include:

- real provider adapters and contract-quality proof;
- production authentication rather than caller-trusted headers;
- replacement/evolution of the single-node SQLite baseline for production concurrency;
- transport deadlines, retries and distributed recovery appropriate to live adapters;
- production retention, forgetting, encryption/key management and data-residency decisions;
- real Library production retrieval interface;
- production deployment, secrets and observability;
- empirical quality/latency/cost evaluation.

Only then should V1 make Foundry a required service for live user requests.

## 7. The intended end-state architecture

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

## 8. Connecting Claude

### Immediate path — recommended for the next work order

Aureus-V1 already contains a root `CLAUDE.md`. Claude Code should therefore start with V1, because the next active work order is in V1.

Setup:

1. Connect Claude to GitHub and grant access to `Aureus1-dev/Aureus-V1`.
2. Open Claude Code on the web or run Claude Code from a checkout of the V1 repository.
3. Ensure it is operating on the exact work-order branch/PR, not a private disconnected copy.
4. Tell Claude to read `CLAUDE.md`, `docs/ai/REPOSITORY_STEWARD.md`, the Founder Control Center, Issue #95, the relevant ADR, and the entire proposed diff.
5. Its default job in our loop is **review**, not simultaneous competing implementation.
6. Require it to return: blockers, security/tenant risks, incorrect assumptions, missing tests, simpler alternatives and a PASS/HOLD recommendation tied to the exact SHA.

### Foundry and Library setup

Library bootstrap governance is now merged on `main`:

- Aureus-Library PR #14 merged at reviewed head `e160e0eda88bfa21f33a5c36b6753114404e68b6`; current Library `main` is `ea9887c50550e466411742c3f3fc53a3de7f264f`.
- Library now has provider-neutral root `AGENTS.md` plus a thin root `CLAUDE.md` on `main`.
- Competing Library PR #13 is closed unmerged and superseded; do not revive both instruction paths.

Foundry remains separately gated:

- Aureus-Foundry `main` remains `e6c0a4558145c6f00d5e7734be95af08daf8241a`.
- Foundry draft PR #7 remains open and unmerged. Its Claude entry point, operating contract, review work order, and disabled-by-default Anthropic adapter govern only that candidate branch, not `main`.
- Do not merge Foundry PR #7 merely to obtain instruction files or infer provider-use authority from its existence.

Do not copy V1 instructions into another repository. Each entry point must encode that repository's own architecture, commands, test gates, authority boundaries, and cross-repository contract rules.

### Optional later automation

Once the manual loop is proving useful, automate independent review so a PR can trigger Claude review and attach findings to the PR. Automation is an optimization, not a prerequisite to beginning construction.

## 9. Founder decision lane

The Founder should normally see only items in these categories:

- product behavior or experience choice with no existing answer;
- pricing/commercial commitment;
- external client admission;
- material privacy/legal/data-retention choice;
- irreversible or consequential action authority;
- architecture tradeoff with meaningful long-term lock-in;
- acceptance of a known risk that cannot currently be eliminated;
- final Founder walkthrough result.

Ordinary bug fixes, test repairs and implementation choices that fit accepted architecture should not be escalated unnecessarily.

## 10. Operating principles

Every build and commercial decision is tested against four simple product principles:

1. **Tell the truth.**
2. **Leave people better.**
3. **Keep the promise.**
4. **Do as much as we responsibly can.**

Trust is the result of repeatedly living these principles rather than a separate slogan.

## 11. Dashboard update rule

This file is living execution truth, not a historical narrative.

Update it whenever any of the following occurs:

- active work order changes;
- PR opens, closes or merges;
- an exact deployment changes the acceptance baseline;
- a Founder test passes or fails;
- a blocker is discovered or removed;
- Foundry/Library runtime integration materially changes;
- an external business is admitted to a pilot.

For detailed work-order checkboxes and production blocker evidence, Issue #95 remains the current ordered execution ledger until superseded explicitly.
