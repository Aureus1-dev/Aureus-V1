# Aureus Founder Control Center

**Status:** Founder-facing build control plane  
**Last reconciled:** 2026-08-27  
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
| Aureus-V1 | `5e4a29a35b243a5bd43e52a90d3eadc473624695` | Product/runtime owner: Hall, Steward, Ward, business console, conversations, tenants, leads, operations, voice, production release path |
| Aureus-Foundry | `e6c0a4558145c6f00d5e7734be95af08daf8241a` | Intelligence production, planning, routing, review, evidence, cost/audit, outcome/evaluation engine; executable offline baseline |
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

### CLOSED PROOF POINT — Verified actionable opportunity handoff (§1)

**Merged PR:** #101  
**Reviewed head:** `749057a85d2335fd6d9e8f864aa82e6ff9bce58e`  
**Resulting V1 `main`:** `5e4a29a35b243a5bd43e52a90d3eadc473624695`  
**Post-merge CI:** run 33102294356 — success on that exact `main` SHA  
**Source of truth:** GitHub Issue #95 §1

The server-owned Opportunity Link Registry now supplies Hall actions only from current VERIFIED + ACTIVE Opportunity records, fails closed on unsafe/stale evidence, preserves the conversation when opening external actions, and keeps model output out of the actionable URL path. Issue #95 §1 is checked complete. This records code/CI acceptance only; deployment and real production walkthrough evidence remain governed separately by Issue #95 §11 and the final completion rule.

### NOW — Temporary Opportunity Center provider rails (§2)

**Working branch:** `fix/temporary-opportunity-provider-rails`  
**Draft PR:** #102 — `Temporary Opportunity Center provider rails`  
**Source of truth:** GitHub Issue #95 §2

Goal: use available providers briefly while keeping replacement easy and preventing referral economics from influencing member recommendations.

Current implementation direction:

- keep existing Opportunity ranking and VERIFIED-action selection authoritative;
- apply provider logic only after the member-first winning Opportunity has been selected;
- support Scrambly and BigCashWeb behind a common temporary-provider adapter seam;
- keep Swagbucks optional unless it is deliberately verified/current and useful;
- accept only configured HTTPS referral destinations and otherwise preserve the canonical verified URL;
- attach plain-language compensation disclosure when a referral rail is actually used;
- keep payout/time-to-cash claims unset unless separately governed evidence supplies them;
- make future Aureus-owned/direct affiliate or offer-wall relationships replace the temporary adapters without changing Hall DTOs or member UX.

Founder input still required before the named temporary rails can be activated:

- the public Scrambly referral URL;
- the public BigCashWeb referral URL;
- optional Swagbucks URL only if the Founder chooses to include it and it is verified/current.

No referral URL has been guessed, fabricated, or committed. PR #102 remains constructor work: final exact-head CI and independent review are required before any merge recommendation.

### NEXT — Founder blocker queue

Order remains governed by Issue #95 unless a newly discovered severity-1 defect preempts it.

1. Guided external application assistance — **See → Guide**.
2. Guided external application assistance — **Prefill → Act**, only after See/Guide is stable and approval boundaries are proven.
3. Exact water-utility hardship production flow.
4. Talk/voice real-device end-to-end verification.
5. Mobile Hall real-device verification.
6. Provider/network failure and recovery behavior.
7. Guest → save/claim → login continuity.
8. Business founder-path regression.
9. Exact-deployment release verification and full Founder walkthrough.

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
