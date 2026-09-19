# PA-024 — Governed Skills & Adaptive Intelligence Architecture

**Version:** 0.1  
**Status:** Founder-directed architecture candidate; independent review required before freeze  
**Date:** 2026-09-18  
**Tracking issue:** #143 — `AUREUS-INTELLIGENCE-ARCH-001`  
**Extends:** PA-006, ADR-015, PA-021, PA-022, PA-023  
**Runtime authority:** None. This document does not create schema, grant authority, enable a provider, authorize spend, activate autonomous execution, or modify production behavior.

## 1. Why this architecture exists

Aureus already has the correct durable product substrate:

- `Responsibility` is the accepted-work/no-abandonment root;
- Authority, consent, privacy, tenant, household, and context boundaries remain machine-enforced outside the model;
- PA-023 defines Capability as the smallest sufficient authorized combination of deterministic code, AI models, APIs, connected systems, humans, professionals, institutions, and physical action;
- Foundry evaluates outcomes and learning candidates but does not own live truth or authority;
- ADR-015 establishes a swappable provider boundary and a deterministic V1 AI orchestration baseline.

The missing layer is a disciplined way for Aureus to gain new competence without creating a permanent autonomous agent for every vertical, duplicating governance inside each agent, or coupling the product to one model provider.

The architectural direction is:

> **One logical Aureus Steward identity; many governed skills; constrained workers only when the work requires a separate actor; one shared authority/evidence/governance substrate underneath them all.**

This is an extension of existing architecture, not a rewrite of it.

## 2. Core distinctions

### 2.1 Aureus Steward — the relationship and responsibility-bearing interface

To the member or business, Aureus presents one coherent Steward relationship:

- understands the desired outcome;
- maintains continuity;
- accepts bounded Responsibility;
- chooses relevant capabilities;
- asks for authority only when needed;
- coordinates execution;
- preserves truth and evidence;
- returns to the principal when judgment or choice is required;
- remains accountable for truthful continuation until the Responsibility reaches a valid terminal state.

"One Steward" is a product and orchestration identity. It is **not** one omniscient process with blanket data or tool access.

### 2.2 Skill — reusable governed competence

A **Skill** is a versioned, reviewable package of procedural knowledge that teaches Aureus or an authorized worker how to perform a bounded class of work.

A Skill may contain:

- instructions / procedure;
- domain knowledge pointers;
- tool guidance;
- deterministic scripts;
- output/evidence contracts;
- verification rules;
- escalation rules;
- examples and eval cases.

A Skill does **not**:

- grant authority;
- widen data access;
- decide its own privacy scope;
- bypass a domain service;
- become a second system of record;
- self-deploy a new version;
- silently mutate policy.

Subject matter alone is not a reason to create another agent. Housing, Financial, Legal, Documents, Benefits, Employment, Production, etc. should normally become **skill packs** over shared platform primitives.

### 2.3 Worker / agent — a separate actor only when needed

A separate worker is justified when the work genuinely requires one or more of:

1. parallelism;
2. context isolation;
3. a distinct authority or tool boundary;
4. independent verification / producer-reviewer separation;
5. durable delegated execution over time;
6. a specialized execution environment;
7. blast-radius containment.

A new vertical name is **not** sufficient justification.

Workers remain subordinate to Responsibility, Authority, Context Firewall, evidence, audit, cost, stop conditions, and human/professional gates.

### 2.4 Workflow — deterministic coordination where determinism is enough

If a task can be expressed safely as deterministic application logic, a workflow remains preferable to agentic freedom.

The system should choose the least complex mechanism that can responsibly produce the required outcome:

```text
deterministic code
  -> tool/API call
  -> governed skill
  -> constrained worker
  -> multi-worker orchestration
```

Complexity is earned by evidence, not by novelty.

### 2.5 Tool — an operation, not authority

Tools expose bounded operations. They should be designed around high-signal outcomes rather than mirroring every low-level provider endpoint.

A tool invocation must independently enforce:

- caller identity;
- principal / tenant / context;
- resource ownership or valid delegation;
- capability scope;
- purpose / minimum necessary fields where applicable;
- spend / rate / consequence controls;
- auditability.

A model claiming it is authorized has no effect on tool authorization.

### 2.6 Provider / model — replaceable reasoning capacity

OpenAI, Anthropic, Google, open models, or future providers are reasoning/execution suppliers, not the owner of Aureus.

Aureus owns:

- identity;
- permissions and authority;
- Responsibilities;
- memory and live product state;
- skills and versions;
- context compilation;
- orchestration policy;
- evidence and verification;
- evals and outcome history;
- Library / Foundry governance.

Provider selection must remain replaceable and evidence-driven.

## 3. Governed Skill Contract

Every production-eligible Skill or Skill Pack must have a contract that can be independently reviewed.

Minimum contract:

```text
Skill ID / namespace
Version
Status (candidate / approved / deprecated / disabled)
Owner / accountable maintainer

Purpose
When to use
When not to use
Required inputs
Optional inputs
Required source freshness / jurisdiction / domain constraints

Context requirements
Minimum-necessary fields
Forbidden context
Data classification

Allowed tools / capabilities
Authority required for each consequential capability
Spend / rate / iteration limits
Stop conditions

Procedure / heuristics
Expected outputs
Evidence required
"Done means" criteria
Verification method
Independent-review requirement where consequence warrants

Escalation / human / professional gates
Failure / safe-degradation behavior
Telemetry / outcome measures
Known limitations

Source / research provenance
Eval set(s)
Last evaluated
Next review / expiry
Change history
```

Skill activation never substitutes for the existing Authority gateway.

## 4. Context Compiler

Aureus should not solve privacy or quality by placing the member's entire history into every model invocation.

The **Context Compiler** is the governed boundary that transforms live Aureus state into the minimum sufficient task packet for a particular skill/worker/model call.

Conceptually:

```text
Responsibility + current task
+ authorized source pointers
+ skill contract
+ policy / tenant / context rules
        |
        v
relevance + authority + freshness + minimization
        |
        v
bounded task packet
        |
        v
provider / worker
```

It should preserve:

- principal and context;
- allowed purpose;
- source provenance;
- truth type / uncertainty;
- only the fields needed for the task;
- tool permissions as references/capabilities, not leaked credentials;
- explicit exclusions where material;
- context version / fingerprint for later audit and eval.

A worker may know that another protected domain exists without being allowed to read it.

Context minimization is both a privacy control and a performance control.

## 5. Provider-neutral Model Exchange

Provider selection must be evidence-driven **by task**, not a permanent global winner.

Foundry should maintain a governed model/capability scorecard across representative eval families such as:

- planning;
- coding;
- debugging;
- research;
- document understanding;
- vision;
- extraction;
- tool use;
- long-context work;
- conversation quality;
- factual grounding;
- professional-boundary compliance;
- verification;
- cost;
- latency;
- reliability.

No single scalar score should erase consequence, safety, or domain-specific differences.

A routing policy may prefer different models for different steps. Example:

```text
planner -> Provider A
parallel research -> Providers B/C
executor -> Provider A or deterministic workflow
independent verifier -> provider/model lineage different from producer where useful
```

Routing policy changes are governed releases, not silent self-modification.

## 6. Foundry as the experimental nervous system

Foundry should grow into four related laboratories while staying outside live authority.

### 6.1 Model Arena

Continuously compare provider/model versions on frozen and newly admitted eval sets.

A new model is a challenger, not an automatic upgrade.

Promotion evidence should include:

- outcome/task success;
- safety/authority compliance;
- hallucination/factual error;
- tool-call accuracy;
- latency;
- cost;
- variance / reliability;
- regression against prior champion.

### 6.2 Orchestration Laboratory

Experiment with topology, not only model identity.

Examples:

- one strong model;
- planner -> worker -> verifier;
- deterministic workflow + one agentic step;
- N parallel candidates -> independent synthesizer;
- cheap broad search -> expensive final reasoner;
- same-provider vs cross-provider reviewer;
- skill-driven single worker vs multi-worker decomposition.

The goal is not maximum agent count. The goal is the smallest topology that reliably produces the required outcome under the relevant cost/safety constraints.

### 6.3 Simulation / Eval Library

Every material production failure, edge case, regression, near miss, and successful hard case should become a candidate permanent eval.

Eval cases should preserve:

- input state;
- only the information that was available at the time;
- authority/context conditions;
- expected invariant/end state;
- grading method;
- provenance;
- date/model/skill/workflow versions;
- known ambiguity.

Conversational and real-world tasks may require multiple graders: deterministic state checks, rule-based assertions, model-based rubric graders, and human review for high-consequence ambiguity.

### 6.4 Foresight / counterfactual evaluation

For serious decisions, Foundry may preserve:

```text
snapshot of what was known then
-> forecast / alternatives / confidence
-> chosen action
-> actual outcome later
-> calibration / error analysis
```

Historical simulations must prevent hindsight leakage. Future information cannot be supplied to the historical decision-maker.

## 7. Frontier Radar and Library

Aureus should systematically monitor the external frontier so architecture-changing discoveries do not depend on the Founder personally finding a video.

Priority sources include:

- official OpenAI product/research/engineering releases;
- official Anthropic engineering/research/releases;
- official Google/DeepMind/Google Cloud agent engineering releases;
- major open protocols/standards such as MCP/A2A/OpenTelemetry where relevant;
- high-signal open-source agent/harness projects;
- peer-reviewed or otherwise credible research with direct product implications;
- lawful public competitor documentation, demos, workflows, customer feedback, and engineering publications.

Each admitted frontier item should preserve:

- source URL / publisher / date;
- claim(s);
- evidence strength and limitations;
- affected Aureus component(s);
- whether it is informational, a hypothesis, or an implementation candidate;
- experiment needed to validate value inside Aureus;
- expiry/recheck date where the technology can change quickly.

External claims never become production truth merely because a leading provider published them.

## 8. Frontier / Abstraction Check before major new AI subsystems

Before constructing a substantial new AI-facing subsystem, the work order must answer:

1. Is this already an existing Aureus capability?
2. Is it a Skill rather than a new agent?
3. Is it a tool rather than a Skill?
4. Is deterministic workflow enough?
5. Is this primarily a context/retrieval problem?
6. Does an open protocol or maintained external harness responsibly remove custom infrastructure?
7. What current frontier evidence materially affects the design?
8. What is the smallest experiment that could falsify the proposed architecture?
9. How will we know the new design beats the existing one?
10. What becomes permanent regression/eval coverage if it fails?

The reusable template lives at `docs/ai/FRONTIER-ABSTRACTION-CHECK.md`.

## 9. Tool and protocol reuse

Aureus may use protocols/harnesses such as MCP, A2A, vendor agent runtimes, or future equivalents when they reduce custom infrastructure.

They remain below Aureus governance.

An external protocol or hosted agent runtime must never:

- become the source of Aureus authority;
- receive blanket member/business context by default;
- own durable Aureus memory or truth unless explicitly designed and governed as an external source of truth;
- bypass audit/evidence;
- make provider switching impossible without a justified, explicit decision.

Prefer adapters and portable contracts over provider-specific business logic.

## 10. Production observation and the governed self-healing loop

The long-term target is fast closed-loop improvement without allowing production to rewrite itself unsafely.

A material production failure should flow through:

```text
production trace / member-visible failure
        |
        v
classify + preserve evidence
        |
        v
reproduce in isolated test/sandbox
        |
        v
convert to permanent candidate eval
        |
        v
coding agent / engineer proposes repair
        |
        v
independent evaluator reviews
        |
        v
tests + security + authority + regression suite
        |
        v
risk / reversibility gate
        |
        +--> human approval when required
        |
        v
canary / bounded rollout
        |
        v
observe
   /           \
verify        regress
  |              |
promote        rollback
  |
  v
outcome + lesson -> Foundry / Library
```

Non-negotiable rules:

- production incidents may trigger investigation automatically, but not unrestricted production writes;
- model-generated code executes first in an isolated environment;
- proposer and certifier are separate for consequential changes;
- credentials remain outside untrusted model-generated execution environments;
- every repair must be reproducible and attributable;
- rollback must be defined before canary promotion;
- a fixed bug should normally become a regression test/eval;
- no skill, policy, routing rule, model, or code patch silently self-promotes to production.

## 11. Relationship to the current People program

This document does **not** interrupt or widen People Step 5 or Step 6.

Current order remains:

1. Step 5 — Obligation / Follow-through;
2. Step 6 — Documents / Evidence / Verification;
3. first bounded governed Skill Runtime proof after Steps 5 and 6 are reconciled and merged;
4. Step 7 — Truth / Service Ledger, extended internally to preserve the execution provenance needed for evals and learning;
5. integrated Founder product walkthrough checkpoint before proliferating additional vertical intelligence surfaces;
6. continue PEOPLE-000 completion using evidence from the first skill/ledger proof.

The first Skill proof should reuse a real Housing/People journey and existing primitives rather than invent a generic skills marketplace.

A useful first proof is:

```text
one existing Responsibility
-> one versioned Housing-related skill
-> Context Compiler creates minimum-necessary task packet
-> existing Authority gateway permits/denies tools
-> bounded worker/deterministic execution
-> Step 6 evidence / verification
-> truthful Responsibility continuation/completion
-> Step 7 execution provenance
-> one Foundry eval comparison
```

## 12. Truth / Service Ledger extension requirement

Step 7 remains member-facing asked/promised/done/waiting/proof/outcome truth.

Internally, the same execution evidence should be able to answer, where applicable:

- which Skill and version ran;
- which model/provider/version performed each AI step;
- which workflow/orchestration topology was used;
- which tools were called;
- which context package/version was supplied;
- what authority decision governed the action;
- token/cost/latency/attempt counts;
- which evidence resulted;
- who/what verified it;
- actual downstream outcome;
- whether a human/professional gate was required;
- whether the member corrected or disputed the result.

This provenance must not turn the member ledger into an engineering telemetry dump. Member projection and internal audit/eval projection remain purpose-specific.

## 13. Product integration checkpoint

The Founder should not wait until the end of the full PEOPLE-000 program to see whether the product feels like Aureus.

After the first governed Skill proof plus usable Step 7 ledger, run a real mobile-first integrated journey:

```text
How can we help?
-> real need
-> Aureus accepts bounded work
-> skill activates invisibly
-> permissions appear only when needed
-> documents/evidence appear when relevant
-> human Steward only when needed
-> waiting / needs-you / carrying states remain truthful
-> verified outcome
-> proof visible to member
```

The checkpoint asks whether the product experience is coherent, not whether individual backend services are elegant.

## 14. Architecture invariants

1. One logical Aureus Steward does not mean blanket data/tool authority.
2. Skill activation never grants authority.
3. Skills are competence; workers provide bounded agency; core services own durable truth.
4. Subject matter alone does not justify another permanent agent.
5. Deterministic execution is preferred when it is sufficient.
6. Provider/model outputs are evidence/input, never authority.
7. Aureus remains provider-neutral at the governance/state layer.
8. Context is minimum-necessary and purpose-scoped.
9. Tool authorization is enforced independently of model claims.
10. Producer and consequential verifier/certifier remain separate.
11. Foundry experiments do not mutate live policy/skills/routing/code without governed promotion.
12. Production failures feed regression/eval learning.
13. External frontier claims become hypotheses until validated against Aureus needs/evals.
14. Open protocols/harnesses may reduce implementation work but may not own Aureus governance.
15. No generalized skill marketplace, multi-agent swarm, self-healing production writer, or universal Context store is built before a bounded proof earns it.
16. Responsibility / Authority / Evidence / Outcome semantics from PA-021/PA-023 remain controlling.
17. No new AI layer becomes a second CRM, case system, workflow root, truth ledger, or member profile.
18. Model/provider selection is continuously re-evaluable rather than permanently hard-coded.
19. No one provider should need the complete Aureus memory to perform a bounded task.
20. The smallest safe mechanism that works is preferred.

## 15. Explicit non-goals of the first implementation

The first implementation is **not**:

- a thousand-agent swarm;
- autonomous production deployment;
- autonomous skill self-rewriting;
- a replacement for ADR-015 or existing AI services;
- a new source of member/business truth;
- a second authority engine;
- a full MCP/A2A platform;
- a universal graph database;
- a provider benchmark product;
- a generalized agent marketplace;
- permission to send all member context to any model;
- permission for a coding agent to patch production directly from a live bug.

## 16. Current frontier evidence motivating the direction

These sources are design inputs, not higher-authority canon:

- Anthropic, **Agent Skills** (2025-10-16; open-standard update 2025-12-18): composable skill folders, progressive disclosure, eval-driven skill building, and security cautions.  
  https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Anthropic, **Effective context engineering for AI agents** (2025-09-29): treat context as finite and curate the smallest high-signal set.  
  https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic, **Demystifying evals for AI agents** (2026-01-09): multi-turn/stateful agent evals and verifiable end states.  
  https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Anthropic, **Writing effective tools for AI agents** (2025-09-11): tool quality and eval-driven tool improvement materially affect agent performance.  
  https://www.anthropic.com/engineering/writing-tools-for-agents
- OpenAI, **The next evolution of the Agents SDK** (2026-04-15): controlled sandboxes and agent harness primitives for long-horizon work.  
  https://openai.com/index/the-next-evolution-of-the-agents-sdk/
- OpenAI, **Introducing the Agents API** (2026-09-10): managed long-running agent harness, context, tools, files, code environments, and subagent coordination.  
  https://openai.com/index/introducing-the-agents-api/
- Google Developers Blog, **Driving the Agent Quality Flywheel from Your Coding Agent** (2026-06-30): Build & Test -> Ship & Monitor -> Learn & Refine, connecting production observations back to evaluation and optimization.  
  https://developers.googleblog.com/driving-the-agent-quality-flywheel-from-your-coding-agent/

Re-check rapidly changing provider capabilities at implementation time.

## 17. Independent review questions

An independent reviewer should try to falsify this architecture:

1. Does "one Steward" accidentally create an omniscient super-agent?
2. Can a Skill expand its own permissions or context?
3. Does Skill Runtime duplicate existing service/domain logic?
4. Is "Skill" sufficiently distinct from a workflow, tool, prompt, policy, and agent?
5. Can provider-neutral routing remain provider-neutral after adopting vendor-specific harnesses?
6. Can context minimization be audited and regression-tested?
7. Can evaluator independence be gamed through shared prompts, data, or model lineage?
8. Does the self-healing loop permit any unreviewed path to production?
9. Can incident telemetry leak member/business secrets into evals or Library?
10. Does Frontier Radar become an ungoverned ingestion firehose?
11. Which parts should live in Foundry or Library rather than V1?
12. What should remain deterministic rather than agentic?
13. What can be deleted while retaining the same leverage?
14. Does sequencing truly avoid disturbing Step 5/6?
15. What is the smallest first Skill proof that can fail safely?
16. Are the proposed internal Step 7 provenance fields necessary, or can existing logs/evidence provide them?
17. Could a lower-cost simpler architecture provide equivalent model/provider experimentation?
18. Does this document conflict with PA-006, ADR-015, PA-021, PA-022, PA-023, Authority, or Context Firewall rules?

A PASS freezes direction only. Every runtime slice still requires its own work order, exact-head mechanical evidence, independent review, and Founder authorization.