# AUREUS-INTELLIGENCE-ARCH-001 — Governed Skills, Foundry & Frontier

**Status:** Architecture packet / docs-only candidate  
**Tracking issue:** #143  
**Architecture:** `docs/product-architecture/PA-024-governed-skills-and-adaptive-intelligence.md`  
**Base:** `ff94fb532497a4e514222eb45b8a9109f6e4f1e8` (People Step 4 merged main)  
**Runtime authority:** None  
**Critical sequencing:** MUST NOT widen People Step 5 PR #141 or People Step 6 PR #142

## 1. Objective

Freeze the smallest coherent architecture direction required to:

- keep one logical Aureus Steward experience;
- expand domain competence through governed Skills/Skill Packs rather than permanent vertical agents by default;
- preserve machine-enforced authority, privacy, context and provider independence;
- make model/provider/workflow choice empirically testable through Foundry;
- turn frontier research and production failures into governed learning inputs;
- establish a safe path toward fast self-diagnosis/self-repair without autonomous production self-modification.

This work order is intentionally documentation-only while People Steps 5 and 6 finish.

## 2. Existing architecture reused

This packet must extend rather than replace:

- PA-006 — AI Intelligence Engine;
- ADR-015 — provider abstraction, AI request audit/cost, deterministic current orchestration and human approval boundaries;
- PA-021 — Responsibility / Outcome architecture;
- PA-022 — Private Steward / member experience boundaries;
- PA-023 — Reality / Matter / Obligation / Responsibility / Authority / Capability / Execution / Evidence / Outcome;
- People Step 1 learning loop — privacy-safe candidate learning without automatic policy mutation;
- People Step 2 Authority / Consent / Privacy;
- People Step 3 household continuity and non-authority relationship semantics;
- People Step 4 Human Steward Operations;
- Step 5 Obligation / Follow-through (currently in construction/review);
- Step 6 Documents / Evidence / Verification (parallel candidate).

No second Responsibility, authority engine, truth ledger, member profile, CRM, workflow root, evidence universe, or learning database may be introduced by this packet.

## 3. Files in this packet

1. `docs/product-architecture/PA-024-governed-skills-and-adaptive-intelligence.md`
2. `docs/work-orders/AUREUS-INTELLIGENCE-ARCH-001-GOVERNED-SKILLS-FOUNDRY-FRONTIER.md`
3. `docs/ai/FRONTIER-ABSTRACTION-CHECK.md`

No runtime source, schema, migration, dependency, provider configuration, environment variable, deployment manifest, or feature flag is changed.

## 4. Decisions frozen if accepted

### 4.1 Product identity

One logical Aureus Steward remains the primary interface. Vertical labels may exist for comprehensibility, but they do not require separate autonomous identities.

### 4.2 Skills before agents by default

Domain procedural expertise should first be represented as governed Skill/Skill Pack capability.

A separate worker/agent must justify itself through parallelism, isolation, authority separation, independent verification, durability, or containment.

### 4.3 Authority remains outside Skills/models

Skills describe how to work. Existing machine-enforced gates decide whether data/tools/actions are permitted.

### 4.4 Context Compiler

Future model/worker calls receive task-specific minimum-necessary context, not blanket member/business history.

### 4.5 Provider competition

OpenAI, Anthropic, Google and future providers remain replaceable. Foundry evaluation by task determines routing candidates.

### 4.6 Foundry laboratories

Foundry becomes the governed place for:

- Model Arena;
- Orchestration Laboratory;
- Simulation/Eval Library;
- forecast/counterfactual evaluation;
- promotion candidates.

Foundry still has no live authority.

### 4.7 Frontier Radar

Official frontier research/releases/protocols plus credible public evidence become sourced Library/Foundry inputs and implementation hypotheses, not automatic production policy.

### 4.8 Governed self-healing

Production failure may automatically create investigation/reproduction/eval work. Code/skill/policy/routing changes may not automatically self-certify or directly promote to production.

## 5. Current construction sequencing

Do not interrupt the active People line.

### Gate A — finish Step 5

PR #141 remains the Step 5 candidate. Its own exact-head CI, review, repair/re-review and Founder merge gates remain controlling.

### Gate B — reconcile and finish Step 6

PR #142 remains a parallel candidate and explicitly follows Step 5. After Step 5 merges, rebase/reconcile Step 6 against resulting `main`, rerun mechanical gates, independently re-review exact head, then Founder decides merge.

### Gate C — first runtime intelligence proof

Only after Gates A and B:

**IA-001A — Governed Skill Contract + Registry (smallest proof)**

Deliver only enough runtime structure to represent/discover one approved versioned Skill without granting any new authority.

Do not build a marketplace or general agent platform.

**IA-001B — Context Compiler (bounded proof)**

For one Skill, prove minimum-necessary task packet construction from existing authorized state. The provider/worker receives no unrelated protected context.

**IA-001C — Housing Skill Pack proof**

Reuse an existing Housing/People journey. Demonstrate:

```text
Responsibility
-> Skill selection
-> Context Compiler
-> existing Authority decision
-> existing tools/services / bounded worker
-> Step 6 evidence + verification
-> truthful Responsibility state
```

This is the first point at which "Skills" become runtime behavior.

### Gate D — Step 7 Truth / Service Ledger

Keep member-facing semantics from PEOPLE-000.

Add only the internal provenance needed to evaluate execution: skill/model/workflow/tool/context/authority/evidence/verifier/outcome references, preferably by reusing existing logs/events before new persistence is added.

### Gate E — Product Integration Checkpoint

Founder tests one complete real journey on phone/mobile-first experience before additional vertical intelligence proliferates.

### Gate F — evaluation and routing proof

**IA-001D — Model/Workflow Eval Harness**

Start with a small representative frozen set from the Housing Skill proof. Compare at least two eligible provider/model/workflow candidates if available, using multidimensional metrics and no automatic production promotion.

### Gate G — frontier intake proof

**IA-001E — Frontier Radar / Library candidate flow**

Ingest official sources with provenance and convert at least one external architecture claim into a bounded Aureus experiment instead of a direct implementation mandate.

### Gate H — self-healing proof (later)

**IA-001F — Sandbox Repair Loop**

Use a deliberately introduced/replayed non-production defect:

```text
trace -> reproduce -> eval case -> repair candidate
-> independent reviewer -> tests/security -> sandbox
-> canary simulation -> verify/rollback evidence
```

No direct production write path is authorized.

The letters above are a proposed runtime decomposition, not merge authorization.

## 6. First Skill acceptance contract

The first Skill proof must demonstrate all of the following:

- stable Skill ID and explicit version;
- discoverable metadata without loading all Skill content;
- explicit when-to-use / when-not-to-use;
- explicit required/forbidden context;
- explicit allowed tools;
- no authority embedded in Skill instructions;
- existing Authority service/tool checks remain authoritative;
- bounded procedure;
- expected output contract;
- evidence requirement;
- "done means" condition;
- verification rule;
- safe failure and escalation;
- telemetry sufficient to know which Skill version ran;
- a Skill version change cannot silently alter production behavior without normal release governance;
- member/business data from another context cannot leak into its task packet.

## 7. Model/provider evaluation contract

A provider/model comparison must:

- use the same frozen task/eval definitions;
- record exact model/provider/version where exposed;
- separate task success from cost/latency;
- include safety/authority compliance;
- include tool correctness where tools are used;
- preserve failures, not only averages;
- prevent the producer from being the sole grader for consequential work;
- avoid declaring a permanent global "best model";
- permit routing changes only after governed approval/release.

## 8. Frontier evidence contract

An external source admitted as a design input must preserve:

- publisher;
- URL;
- publication/release date;
- retrieval/review date when available;
- claim;
- limitations;
- affected Aureus components;
- validation experiment;
- confidence/evidence class;
- recheck/expiry if fast-changing.

Competitor learning must use lawful public evidence. Do not copy proprietary code, trade secrets, credentials, restricted data, or bypass access controls.

## 9. Self-healing safety contract

Any future automatic defect loop must fail closed on:

- inability to reproduce;
- missing tests/eval oracle;
- uncertain authority/privacy impact;
- secret exposure;
- migration/destructive data risk without explicit review;
- production credential access from generated-code sandbox;
- evaluator disagreement on high-consequence impact;
- rollback unavailable;
- canary regressions;
- branch/head drift after review.

"Moments from bug to repair" is an optimization target **inside** these gates, not permission to remove them.

## 10. Constructor evidence for this docs-only packet

Required before independent review:

- exact base and head SHA;
- changed-file set exactly equals the three documentation files;
- no schema/code/config/dependency changes;
- repository documentation/product-contract checks green;
- full CI/Docker only if repository policy automatically requires them for docs-only candidates; report actual result rather than assuming;
- no Step 5/6 branch or PR modification;
- no runtime or merge-authority claim.

## 11. Independent adversarial review

Reviewer must have no authorship in the candidate.

Attack at least:

1. conflict with PA-006 / ADR-015;
2. conflict with PA-023 Capability/Authority boundaries;
3. disguised omniscient super-agent;
4. Skill becoming an authority/policy escape hatch;
5. unnecessary duplicate orchestration/workflow system;
6. provider lock-in hidden in model-neutral language;
7. context leakage / overcollection;
8. Frontier Radar poisoning or ungoverned admission;
9. eval gaming / shared-producer-grader failure;
10. self-healing path that can reach production without a real gate;
11. telemetry/eval privacy leakage;
12. over-engineering before the first bounded proof;
13. accidental Step 5/6 scope expansion;
14. whether Step 7 provenance can reuse existing logs/events;
15. whether a simpler architecture yields the same leverage.

Return BLOCKER / HIGH / MEDIUM / LOW and final PASS / PASS WITH CONDITIONS / HOLD tied to the exact reviewed head.

## 12. Merge gate

Do not merge because the Founder requested that the idea be placed in the repository.

Merge requires:

1. exact-head mechanical evidence appropriate to a docs-only PR;
2. independent exact-head adversarial review;
3. all BLOCKER/HIGH repaired and re-reviewed;
4. head stability confirmation;
5. separate Founder merge authorization.

Merge freezes architecture direction only.

## 13. Founder decisions reserved

The following remain future Founder decisions after evidence exists:

- first runtime Skill namespace/storage representation;
- whether Skill artifacts live solely in V1 or have Library-managed release artifacts;
- exact Foundry/V1 split for eval execution;
- first eligible OpenAI/Anthropic/Google models for the Model Arena;
- whether/when to adopt specific vendor agent runtimes;
- whether/when MCP/A2A become production integration standards;
- thresholds for automatic canary eligibility;
- production incident classes that may automatically open repair work;
- any provider spend increase;
- any move from suggestion/eval to autonomous production mutation.