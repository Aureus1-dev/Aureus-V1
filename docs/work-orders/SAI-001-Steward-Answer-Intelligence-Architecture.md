# SAI-001 — Steward Answer Intelligence Architecture

## Status

**COMPLETED / MERGED architecture slice.** Accepted through PR #164. Its successor names remain planning anchors; current cross-program sequencing is controlled by `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md` after REG-001 acceptance.

This work order did **not** change production behavior, model routing, authority, persistence, or independently authorize a successor implementation order.

## Historical base

This slice was branched from the exact `main` that existed after PR #163 reconciliation. That base statement is historical evidence, not current repository status.

## Why this work exists

The Founder identified a missing capability in the Aureus intelligence model: members and customers should never need to know how to prompt an AI well in order to receive the best available help.

The initial idea of a separate `Prompt Engineer` was refined into a broader architecture:

- prompt engineering is an internal capability;
- the real unit is a situation-aware `Answer Contract`;
- the system should compile the true question, context, expertise, evidence, tools, constraints, verification, and definition of done;
- the internal work instruction and the person-facing presentation are separate artifacts;
- reasoning and verification depth scale with consequence;
- answers should route into governed execution when the person actually needs an outcome rather than information;
- outcome-linked learning should improve future help without optimizing for engagement or creating an unrestricted psychological profile.

The repository already contains most of the upstream primitives in the Executive Intelligence Standard, Just-in-Time Intelligence, Tool Intelligence, PS-001, ADR-015, and Outcome/Responsibility architecture. The correct change is to connect and specialize those primitives for Steward answers rather than create another AI subsystem.

## Objective

Create one authoritative Steward Answer Intelligence standard that answers:

1. How does Aureus turn natural human language into the right internal work instruction?
2. How does it decide which context, evidence, expertise, tools, and verification are necessary?
3. How does it preserve continuity and avoid re-asking what it already knows?
4. How does it separate internal reasoning/work products from the visible Steward response?
5. How does it scale depth to consequence so ordinary answers remain fast and consequential answers become rigorous?
6. How does an answer transition into governed execution / Responsibility when prose is insufficient?
7. How does Aureus learn which helping strategies work without optimizing for engagement or silently creating new authority?
8. Where does this capability live today versus the eventual Foundry runtime?

## Deliverables

### 1. `docs/foundry/STEWARD-ANSWER-INTELLIGENCE-STANDARD.md`

Must define:

- relationship to Executive Intelligence, JIT Intelligence, Tool Intelligence, PS-001, ADR-015, and Outcome/Responsibility;
- `AnswerContract` semantic fields;
- Situation/Question Compiler;
- Context Intelligence;
- Expertise Intelligence;
- Evidence Intelligence;
- Prompt Compiler;
- Producer/Critic/Verifier roles;
- consequence-scaled routing;
- Presentation Composer;
- execution/Responsibility handoff;
- Person Context vs Help Strategy Evidence distinction;
- quality/optimization hierarchy;
- learning loop;
- runtime placement and non-microservice rule;
- staged implementation sequence;
- minimum evaluation set;
- anti-patterns and completion criteria.

### 2. `docs/foundry/README.md`

Create a compact index that makes the Foundry intelligence standards discoverable and explains their relationship.

### 3. This work order

Preserve the Founder intent, architectural boundaries, acceptance criteria, and successor implementation sequence.

## Governing architecture decisions

### A. No separate visible Prompt Engineer

Prompt engineering is internal. The person speaks normally.

### B. One intelligence system

Steward Answer Intelligence reuses Executive Intelligence primitives where applicable. It does not create separate facts, separate authority, or separate skill personas.

### C. Prompt Compiler != prompt library

Use just-in-time compilation from governed inputs rather than maintaining a giant speculative prompt collection.

### D. Prompt Compiler != Presentation Composer

The best internal instruction can be large and structured while the best person-facing answer can be short.

### E. Confidence cannot exceed evidence

Evidence and uncertainty govern confidence and verification requirements.

### F. Answers are intermediate when the real need is action

When completion requires action, route to the existing governed execution / Responsibility architecture. Do not claim an action occurred without observable evidence.

### G. Outcome optimization, not engagement optimization

Primary quality dimensions are intended outcome, correctness, safety/trust, work carried, time/effort saved, clarity, satisfaction, and proportionate cost/latency. Interaction frequency is not the goal.

### H. Learning cannot self-activate policy

Outcome evidence may create learning candidates. Reusable lessons require validation and governed promotion.

### I. No premature Foundry production dependency

V1 remains the live runtime owner until Foundry production blockers are explicitly closed. This architecture can be implemented incrementally inside the existing modular V1 path.

### J. No silent ADR-015 override

If a later slice introduces runtime orchestration materially beyond ADR-015's accepted deterministic/provider boundary, write an explicit architecture reconciliation first.

## Acceptance criteria

The architecture was reviewable only if independent review confirmed:

- [ ] no contradiction with Executive Intelligence governance or Founder’s Office authority;
- [ ] no duplicate intelligence subsystem is created;
- [ ] PS-001 dignity, agency, non-manipulation, privacy, and non-engagement success principles remain intact;
- [ ] JIT Intelligence's `smallest sufficient context` and no-giant-prompt-library rules are preserved;
- [ ] ADR-015 is not silently superseded;
- [ ] Outcome/Responsibility remains the execution/completion owner;
- [ ] the Answer Contract distinguishes intent, evidence, authority, presentation, action, done, outcome, and learning;
- [ ] consequence scaling prevents over-engineering low-stakes questions;
- [ ] current/volatile and high-consequence matters require appropriate evidence/verification;
- [ ] continuity explicitly prohibits objective/fact re-asking when context is already established;
- [ ] Prompt Compiler and Presentation Composer are distinct;
- [ ] learning optimizes outcome quality rather than engagement;
- [ ] no production capability is claimed merely because the architecture is documented;
- [ ] successor implementation slices are thin and separately reviewable.

## Minimum independent-review attack surface

The reviewer should actively look for:

1. duplicated authority or governance;
2. hidden persuasion / engagement optimization;
3. cross-person or cross-tenant context leakage;
4. giant-context / giant-prompt anti-patterns;
5. accidental requirement for Foundry in the current live critical path;
6. contradiction with ADR-015's no-autonomous-agent baseline;
7. unsupported new memory semantics;
8. ambiguous boundary between answer and consequential action;
9. failure to preserve voice/text continuity;
10. an implementation sequence too broad to verify safely.

## Proposed successor slices after architecture approval

- `SAI-002` — Answer Contract + deterministic consequence router;
- `SAI-003` — evidence / expertise routing and uncertainty contract;
- `SAI-004` — Prompt Compiler + Presentation Composer;
- `SAI-005` — consequence-scaled critic / verifier;
- `SAI-006` — outcome evaluation + governed Help Strategy learning.

These names are planning anchors, not authorization to implement out of order. Their current position is **Master Discovery & Execution Register item 09**, after the preceding work/authority/truth dependencies defined there. Do not use the historical Product V1 execution order to move them ahead of that register.

## Non-goals

This architecture did not:

- add a new model provider;
- add a new runtime service;
- add a database table;
- change the live system prompt;
- change voice behavior;
- change member memory;
- introduce autonomous consequential actions;
- create a new constitutional authority;
- make Foundry a live production dependency;
- independently reorder the current cross-program plan.

## Definition of done

The architecture is ready for implementation planning when an independent reviewer can trace a natural-language request all the way through:

`human situation -> Answer Contract -> context/evidence/expertise -> compiled instruction -> proportionate reasoning/verification -> presentation -> governed action if needed -> outcome -> bounded learning candidate`

without finding a second authority system, a second permanent truth base, or an implied production capability that does not yet exist.
