# Frontier / Abstraction Check

**Purpose:** Prevent Aureus from building a new AI subsystem when an existing capability, Skill, tool, workflow, protocol, harness, or simpler abstraction already solves the problem.

**Status:** Reusable pre-construction checklist for material AI/agent/intelligence work.  
**Authority:** Execution aid only. Higher Foundation/Constitution/Governance/Product Architecture remains controlling.

Run this check before a substantial new AI-facing work order and again if frontier evidence materially changes during construction.

---

## 1. Problem statement

**Desired real-world outcome:**  
What should become true?

**Principal / context:**  
Who owns the outcome and in which Personal / Business / Academy / institutional context?

**Existing Responsibility / Matter / domain root:**  
What already owns the accepted work and truth?

**Consequence class:**  
What can go wrong, and how reversible is it?

---

## 2. Existing Aureus reuse

Before inventing anything, inspect current repository truth.

- [ ] Existing domain service can do it.
- [ ] Existing deterministic workflow can do it.
- [ ] Existing `Responsibility` / `ResponsibilityEvent` can carry it.
- [ ] Existing Authority / Consent / Context Firewall applies.
- [ ] Existing document/evidence/verification primitive applies.
- [ ] Existing communication/handoff primitive applies.
- [ ] Existing Human Steward/professional gate applies.
- [ ] Existing AI provider/orchestration/audit primitive applies.
- [ ] Existing Foundry/Library contract already represents the learning/knowledge need.

**Reuse disposition:** KEEP / EXTEND / COMPOSE / REPLACE / NEW

Any `NEW` answer must explain why composition/reuse is insufficient.

---

## 3. Choose the smallest correct abstraction

Test in this order:

### A. Deterministic code?
Can ordinary code safely produce the required behavior?

If yes, prefer it unless an eval proves material benefit from model reasoning.

### B. Tool?
Is this primarily a bounded operation against an existing system?

If yes, build/use a governed tool rather than a new agent.

### C. Skill?
Is the missing value mainly procedural/domain competence that a general Aureus worker can reuse?

If yes, define a governed Skill / Skill Pack.

### D. Context/retrieval problem?
Would the existing model/worker perform well if it received the correct minimal current context?

If yes, improve Context Compiler/retrieval instead of adding another agent.

### E. Workflow?
Is there a known sequence with clear gates?

If yes, prefer a deterministic or partially-agentic workflow.

### F. Separate worker/agent?
Only justify when one or more are true:

- [ ] parallel work;
- [ ] context isolation;
- [ ] distinct authority/tool boundary;
- [ ] independent verification;
- [ ] durable delegated execution;
- [ ] specialized sandbox/environment;
- [ ] containment/blast-radius reason.

Subject matter/vertical name alone is not justification.

### G. Multi-worker topology?
What evidence shows one worker/workflow is insufficient?

State the smallest experiment that can prove/disprove the need.

---

## 4. Frontier evidence

Check current, authoritative sources relevant to this exact problem.

Minimum categories when applicable:

- official OpenAI releases / engineering / API changes;
- official Anthropic releases / engineering;
- official Google/DeepMind/Google Cloud releases / engineering;
- open standards/protocols (for example MCP/A2A/OpenTelemetry where relevant);
- high-signal open-source harnesses;
- credible research/evals;
- lawful public competitor product/workflow evidence.

For each material source record:

| Source | Date | Claim | Limitation | Aureus implication | Experiment |
|---|---|---|---|---|---|
| | | | | | |

Do not adopt a provider claim as production truth without Aureus-specific validation.

---

## 5. Build-vs-use check

Can a maintained external primitive responsibly replace custom infrastructure?

Consider:

- provider agent harness/runtime;
- sandbox/runtime;
- MCP server/client;
- A2A or other inter-agent protocol;
- tracing/observability standard;
- retrieval/search infrastructure;
- durable workflow engine;
- eval framework.

For each candidate answer:

1. What code does it remove?
2. What lock-in does it create?
3. Can Aureus keep authority/state/provider routing above it?
4. Can it fail closed?
5. Can we replace it later?
6. What data must leave Aureus?
7. What is the exit plan?

---

## 6. Context / privacy boundary

Define before model selection:

- minimum necessary data;
- forbidden/unrelated data;
- principal/tenant/context;
- purpose;
- source provenance;
- truth/uncertainty status;
- tool permissions;
- retention/logging expectations;
- secrets handling.

**Rule:** A Skill/model/worker may request capability; it may not grant itself capability.

---

## 7. Provider neutrality

List candidate providers/models by role rather than declaring a global winner.

| Role | Candidate(s) | Why eligible | Eval needed |
|---|---|---|---|
| planner | | | |
| executor | | | |
| researcher | | | |
| verifier | | | |
| vision/document | | | |

A vendor-specific harness may be used without moving Aureus identity, authority, durable truth, or routing ownership into that vendor.

---

## 8. Eval / falsification plan

Before building, define how the proposal can lose.

**Existing baseline:**  
What are we comparing against?

**Representative cases:**  
Which real/simulated cases matter?

**Metrics:**  
At minimum consider task success, truth/factuality, authority/safety compliance, tool correctness, cost, latency, reliability, and member/business outcome where measurable.

**Independent grading:**  
What cannot be self-graded by the producer?

**Regression admission:**  
Which failures become permanent tests/evals?

**Promotion rule:**  
What evidence is sufficient to replace the current approach?

---

## 9. Failure and rollback

- Safe failure behavior:
- Maximum iterations / spend / time:
- Human/professional gate:
- Kill/disable switch:
- Rollback path:
- Evidence required before promotion:
- What must never happen automatically:

---

## 10. Decision

Choose one:

- [ ] REUSE existing capability; no new subsystem.
- [ ] ADD/EXTEND a tool.
- [ ] ADD/EXTEND a Skill.
- [ ] IMPROVE Context Compiler/retrieval.
- [ ] ADD deterministic/partially-agentic workflow.
- [ ] ADD constrained worker/agent.
- [ ] EXPERIMENT before architecture decision.
- [ ] DEFER; evidence does not justify build.

**Reason:**

**Smallest correct next proof:**

**Explicit non-goals:**

**Independent reviewer should try to falsify:**

---

## 11. Post-outcome update

After real use, return to this record.

- What actually happened?
- Which assumptions were wrong?
- What did the user/business outcome show?
- Did cost/latency/safety differ from eval?
- Did another model/workflow outperform?
- What becomes a Skill update candidate?
- What becomes a Library/Foundry learning candidate?
- What becomes a permanent regression case?
- Should the abstraction decision change?

The purpose of this check is not to slow construction. It is to keep Aureus from spending weeks building the wrong layer.