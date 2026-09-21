# Aureus Steward Answer Intelligence Standard

**Status:** Proposed shared Foundry / V1 intelligence operating standard  
**Work order:** `SAI-001 — Steward Answer Intelligence Architecture`  
**Scope:** Member Steward, People, Business/Ward answer quality where applicable, voice/text continuity, evidence routing, prompt compilation, presentation, governed execution handoff, and outcome learning  
**Principle:** The person speaks normally. Aureus does the prompt engineering, context assembly, expertise routing, evidence work, verification, and presentation required to help them well.

## 1. Purpose

Aureus must not require a member, customer, Founder, employee, or business owner to become a prompt engineer in order to receive high-quality help.

A request should not be treated as only the literal words typed or spoken. Aureus should understand the situation, identify the intended outcome, assemble only the context that matters, choose the smallest competent expertise and tool set, gather evidence when required, reason and verify proportionally to consequence, and present the smallest useful result in one coherent Steward voice.

The target is not:

`user message -> prettier prompt -> model -> answer`

The target is:

```text
human situation / request / event
-> understand the intended outcome
-> compile an Answer Contract
-> assemble the smallest sufficient context
-> route the smallest competent expertise + tools
-> gather / refresh evidence when needed
-> compile the execution instruction
-> produce / challenge / verify proportionally
-> compose the member-facing response
-> carry or hand off the next action where authorized
-> observe the outcome
-> learn safely from what actually happened
```

Prompt engineering is therefore an internal Aureus capability, not a burden placed on the person.

## 2. Relationship to existing Aureus intelligence

This standard extends existing architecture; it does not create a second intelligence system.

It operates in service of:

- [Executive Intelligence Standard](EXECUTIVE-INTELLIGENCE-STANDARD.md), which already establishes shared context, evidence standards, question/prompt compilation, smallest-competent-skill routing, critic/verifier roles, synthesis, and outcome learning for executive work;
- [Just-in-Time Intelligence](JUST-IN-TIME-INTELLIGENCE.md), which requires demand-driven context and research rather than giant preloaded dossiers or prompt libraries;
- [Tool Intelligence Operating Model](TOOL-INTELLIGENCE-OPERATING-MODEL.md), which governs current tool/capability selection and targeted deep evaluation;
- [PS-001 — Personal Steward Constitution](personal-steward/PS-001-personal-steward-constitution.md), which governs dignity, agency, truth, flourishing, non-manipulation, privacy, and success measured by the person rather than interaction frequency;
- `ADR-015 — AI Intelligence Engine`, which remains the accepted V1 baseline for reviewable provider abstraction, auditable prompt code, deterministic application orchestration, and no inferred authority for irreversible action;
- the Outcome / Responsibility architecture and current product execution rules, which govern accepted work, authority, persistence, evidence, completion, and repair.

The Executive Intelligence Standard and Steward Answer Intelligence share primitives. They differ primarily in audience, consequence model, context boundary, output form, and accountable owner.

A member asking for help does **not** become an executive decision merely because Aureus uses the same question compiler, evidence classifier, critic, verifier, or tool-intelligence machinery internally.

## 3. One Aureus, two visible layers

Internally, Aureus may use substantial structure. Externally, the person should experience one Steward.

### Internal layer

May contain:

- detailed context packets;
- domain instructions;
- evidence requirements;
- tool schemas;
- competing candidate answers;
- critic findings;
- verification results;
- uncertainty labels;
- execution plans;
- definition-of-done checks.

### Person-facing layer

Should contain only what helps the person understand, decide, act, consent, or see what Aureus is carrying.

The complexity belongs behind Aureus. It must not leak into a member-facing pseudo-dashboard of AI machinery merely because the machinery exists.

## 4. The Answer Contract

Before material work, Aureus should be able to represent the request as an `AnswerContract` or equivalent runtime object.

Minimum fields:

1. **Intent** — what the person appears to be asking for.
2. **Desired outcome** — what they are actually trying to accomplish.
3. **Situation / event** — what is happening now.
4. **Relevant context** — only the facts, history, files, relationships, commitments, permissions, and prior attempts needed for this task.
5. **Known facts** — supported by current context or evidence.
6. **Unknown material facts** — missing facts that could change the responsible next step.
7. **Uncertainty state** — known / observed / reported / inferred / estimated / unknown where material.
8. **Time sensitivity** — deadlines, urgency, or decay.
9. **Consequence level** — low, moderate, high, or otherwise governed classification.
10. **Required expertise** — the smallest competent skill set.
11. **Evidence requirements** — what must be retrieved, refreshed, cited, calculated, or verified.
12. **Permissions / authority** — what Aureus may know, say, navigate, prepare, or do.
13. **Applicable doctrine / policy** — constraints that cannot be overridden by a prompt.
14. **Answer strategy** — direct answer, targeted research, comparison, plan, draft, explanation, calculation, tool use, human escalation, or combination.
15. **Verification requirements** — what must be independently checked before the result is treated as trustworthy.
16. **Presentation strategy** — how much, in what form, and what the person needs to see now.
17. **Next action** — what happens after the answer.
18. **Definition of done** — observable completion, not merely message delivery.
19. **Outcome** — what actually happened when available.
20. **Learning candidate** — a bounded, provenance-linked lesson that may improve future help after appropriate validation.

Not every field must be materialized or persisted for every low-consequence request. The contract is a semantic standard, not a requirement to create database rows for trivial conversation.

## 5. Situation and question compilation

Aureus should compile the real question before sending material work downstream.

Internally it asks:

- What outcome is the person actually trying to produce?
- Is the literal question the real need, or only the visible symptom?
- What has already been established in this conversation or accepted Responsibility?
- What does Aureus already know that must not be re-asked?
- What fact would most change the next responsible action?
- Is an answer enough, or is execution the real need?
- Is the request current, local, regulated, consequential, or otherwise evidence-sensitive?
- What would make a fluent answer dangerously incomplete?

Example:

`My landlord says I have to be out Friday. What do I do?`

should compile toward the intended outcome and underlying questions: immediate housing stability, operative notice type, deadlines, legal/resource routes, moving or emergency assistance, permissions, and what can be carried before Friday. It should not merely generate generic tenant advice.

## 6. Context Intelligence

Aureus assembles the **smallest sufficient context packet**.

Retrieve only what can materially improve the outcome, such as:

- established objective and active work;
- relevant prior answers and facts;
- current Responsibility / commitments;
- deadlines;
- files or evidence supplied for this matter;
- known preferences that affect presentation or execution;
- permissions and authority boundaries;
- prior failed attempts;
- applicable location or jurisdiction only when required;
- current product/system state when the task depends on it.

Do not dump an entire person profile, full transcript history, or unrelated institutional context into every prompt.

### Continuity rule

Never re-ask for an objective or fact Aureus already knows and can responsibly reuse.

A greeting, capability question, route change, voice/text switch, or reopened conversation must not silently reset active context. PR #163 established this rule in the live Member Steward prompt; this standard generalizes the lesson beyond scripted greetings.

## 7. Expertise Intelligence

Aureus routes the **smallest competent skill set**, reusing the same principle as Executive Intelligence.

Examples:

- simple stable factual question -> one answering skill;
- housing crisis -> housing + legal-information + benefits/resource navigation as needed;
- debt payoff question -> financial reasoning + benefits-safety considerations if material;
- business pricing decision -> finance + market + strategy as needed;
- software defect -> engineering + relevant product/runtime context;
- consequential cross-domain problem -> multiple skills + critic/verifier when warranted.

Skills are reasoning/expertise lenses. They do not acquire new authority merely because they were invoked.

The person should still experience one Aureus Steward rather than a panel of AI characters.

## 8. Evidence Intelligence

Aureus decides whether the request can be answered from stable knowledge or requires fresh evidence.

Possible routes:

`known context -> retrieve -> research -> calculate -> inspect file -> query connected source -> use governed tool -> ask one necessary question -> human verification`

Rules:

- **Confidence cannot exceed evidence.**
- Current or volatile claims require current evidence when material.
- Jurisdiction-specific claims require the correct jurisdiction.
- High-consequence claims require stronger source and verification standards.
- Missing evidence is represented as missing; fluency must not fill the gap.
- Known / observed / reported / inferred / estimated / unknown distinctions remain visible where material.
- Source conflicts are preserved and investigated, not averaged into fake certainty.

Research follows Just-in-Time Intelligence: deepen because the task needs it, not because Aureus wants a giant permanent answer corpus.

## 9. Prompt Compiler

The Prompt Compiler is an internal assembly step, not a separate personality and not a giant library of handcrafted prompts.

For a material request it composes, as applicable:

```text
governing doctrine / authority
+ intended outcome
+ situation / event
+ smallest sufficient context
+ required expertise
+ current tools / capabilities
+ evidence and uncertainty requirements
+ permissions and action boundaries
+ constraints / deadlines / budget
+ verification requirements
+ definition of done
+ required output / artifact form
```

The result is a **compiled instruction for this exact situation**.

Rules:

- keep stable doctrine and authority separate from untrusted user content;
- version material compiler rules so evaluations can identify what produced an output;
- prefer deterministic assembly of known fields over prompt-string improvisation where practical;
- do not allow retrieved text, user text, or tool output to expand authority;
- do not maintain giant speculative prompt libraries prohibited by Just-in-Time Intelligence;
- do not force the person to know model names, prompting syntax, chain-of-thought techniques, or tool schemas;
- retain only what is useful for provenance/evaluation; do not store private hidden reasoning as institutional knowledge.

## 10. Deliberation, critic, and verification

The reasoning depth scales with consequence.

For material work, Aureus may separate roles internally:

- **Producer / Operator:** constructs the best grounded answer or plan.
- **Critic / Red Team:** identifies missing context, assumptions, failure paths, unsafe shortcuts, and plausible counter-cases.
- **Verifier:** checks claims, evidence, calculations, permissions, tool results, and whether the output actually satisfies the Answer Contract.

Before consequential output, the critic/verifier should be able to ask:

1. Did we misunderstand the desired outcome?
2. Are we missing context Aureus already has?
3. Are we asking the person for something we already know?
4. Did we choose the right expertise and tool path?
5. Is a material claim unsupported or stale?
6. Did we distinguish fact from inference?
7. Did we define completion?
8. Are we making the person do work Aureus can responsibly carry?
9. Is there a simpler, safer, cheaper, or more reversible route?
10. Does the answer respect consent, privacy, Principal/context boundaries, and authority?
11. Does bad news arrive with the responsible next path rather than as a naked dead end?
12. If the answer says Aureus did something, is there observable evidence that it actually happened?

Independent verification should be strongest when consequence, irreversibility, uncertainty, or cost is high.

## 11. Consequence-scaled routing

Do not run an executive council to answer how long to boil an egg.

A default routing model:

| Situation | Default intelligence path |
|---|---|
| Simple / stable / low consequence | Direct answer |
| Personal or context-dependent | Relevant context + direct answer |
| Current / factual / volatile | Context + current evidence + answer |
| Complex / multi-domain | Specialists + synthesis + targeted verification |
| High consequence / difficult to reverse | Strong evidence + specialist analysis + critic + independent verification + explicit authority boundary |
| Requires execution | Answer Contract -> governed action / Responsibility path rather than stopping at prose |

Latency, cost, and cognitive load are part of quality. More reasoning is not automatically better reasoning.

## 12. Presentation Composer

The Prompt Compiler optimizes the work instruction. The **Presentation Composer** optimizes what the person should receive.

These are separate concerns.

The internal work product may be long and technical. The person-facing response may appropriately be four sentences and one action.

Presentation rules:

- one coherent Aureus voice;
- lead with the useful result, not AI process narration;
- short by default for ordinary conversation;
- expand when the task, safety, consequence, artifact, or explicit request needs detail;
- use real names, real numbers, and concrete next actions when known;
- explain why an ask is necessary when the reason is not obvious;
- never re-ask known context;
- do not expose private chain-of-thought;
- distinguish uncertainty where it changes the decision;
- do not let brevity omit information the person actually needs;
- pair material bad news with the strongest responsible next path;
- preserve continuity across text, voice, route changes, and return sessions;
- do not advertise a capability that is not actually available.

The interface is an outcome surface. It should show what Aureus is carrying, what the person needs to do, evidence/progress when real, and what happens next—not the internal prompt stack.

## 13. Answers should continue into outcomes

Aureus must detect when information is only an intermediate step.

If someone asks, `How do I get my electricity turned back on?`, the real success condition is not a polished explanation. The system should determine whether there is an authorized resource, application, call, form, payment arrangement, document, or human route Aureus can help carry.

When execution is required:

```text
Answer Intelligence
-> governed execution / Responsibility
-> permissions and approvals
-> observable action/evidence
-> completion or responsibly exhausted state
```

An answer should not create fake action. Existing authority and tool boundaries remain in force.

## 14. Person Context vs Help Strategy Evidence

Aureus should conceptually distinguish:

### Person Context

Facts about the person that are legitimately relevant and permitted to be used.

### Help Strategy Evidence

Outcome-linked evidence about which approaches worked or failed in comparable situations, including presentation or sequencing choices when appropriate.

This distinction does **not** authorize a new unrestricted psychological profile or hidden persuasion system.

A learning candidate such as `one recommended next action reduced confusion in this workflow` is different from retaining speculative personality labels about a person.

Rules:

- retain only what is necessary and permitted;
- attach provenance and outcome evidence;
- distinguish individual preference from generalizable lesson;
- avoid sensitive inference unless explicitly necessary, lawful, governed, and appropriate;
- do not use Help Strategy Evidence to manipulate, create dependence, or maximize engagement;
- validated reusable lessons may enter governed Library knowledge; one interaction does not become doctrine.

## 15. Optimization target

Answer Intelligence must not optimize for chat length, time in app, repeat use, emotional dependence, or persuasion for its own sake.

A default quality hierarchy is:

1. intended outcome achieved or materially advanced;
2. correctness and evidence quality;
3. safety, trust, privacy, and authority integrity;
4. amount of avoidable work Aureus responsibly carried;
5. time and effort saved for the person;
6. clarity and usability;
7. member/customer satisfaction;
8. cost / latency appropriate to the consequence.

These dimensions may trade off. The governing mission and safety/authority boundaries are not overridden by a higher short-term satisfaction score.

## 16. Learning loop

Eligible interactions follow:

```text
situation
-> Answer Contract
-> compiled instruction / routed expertise
-> answer or governed action
-> observable outcome
-> evaluation
-> candidate Help Strategy lesson
-> independent validation when material
-> governed policy / Library update only when authorized
```

Learning may propose improvements to routing, prompt assembly, evidence standards, presentation, or tool choice. It may not silently mutate live authority, policy, or governing doctrine.

Useful evaluations include:

- Was the intended outcome understood?
- Was a necessary question asked, or an unnecessary one imposed?
- Was known context reused correctly?
- Were material claims supported?
- Was the answer appropriately concise or detailed?
- Did the person have to perform avoidable coordination?
- Did the next action actually work?
- Did the result persist to completion where Aureus accepted responsibility?
- What failed, and was repair completed?

## 17. Runtime placement

Do **not** create a new repository or premature microservice solely for Answer Intelligence.

Current posture:

- V1 remains the live product/runtime owner for member/business conversation, authorization, product state, Responsibilities, and current provider calls;
- Foundry supplies the shared intelligence architecture, offline evaluation, routing/evidence patterns, and later governed runtime capability after its production blockers are closed;
- Library receives only governed durable knowledge, not every prompt, response, retrieved page, or hidden intermediate thought;
- the current direct V1 request path must not be made dependent on an unproductionized Foundry service merely to satisfy this standard.

This standard therefore defines the target contract now while allowing staged implementation inside the existing modular architecture.

Any implementation that materially changes ADR-015's current deterministic orchestration or provider boundary requires an explicit architecture reconciliation rather than silently treating this document as permission to introduce an autonomous agent loop.

## 18. Implementation sequence

Recommended thin slices:

### SAI-001 — Architecture and evaluation contract

- this standard;
- repository placement/indexing;
- explicit boundaries with Executive Intelligence, Just-in-Time Intelligence, Tool Intelligence, PS-001, ADR-015, and Outcome/Responsibility;
- implementation/evaluation work order.

No production behavior change is implied merely by merging SAI-001 documentation.

### SAI-002 — Answer Contract + consequence router

- typed runtime contract or equivalent;
- deterministic consequence/evidence routing baseline;
- continuity/context reuse tests;
- no new consequential authority.

### SAI-003 — Evidence + expertise routing

- smallest-competent-skill routing;
- evidence freshness/uncertainty requirements;
- current source/tool selection hooks;
- provenance visible to verification.

### SAI-004 — Prompt Compiler + Presentation Composer

- reviewable instruction assembly;
- one coherent Steward output layer;
- text/voice parity where appropriate;
- regression evaluation set for brevity, continuity, evidence, and non-repetition.

### SAI-005 — Critic / verifier scaling

- consequence-triggered challenge and verification;
- independent verification for defined high-consequence classes where practical;
- latency/cost ceilings and fail-safe degradation.

### SAI-006 — Outcome evaluation + Help Strategy learning

- outcome-linked evaluation;
- repair/failure evidence;
- candidate lessons with provenance;
- governed promotion only after validation.

This sequence may be reconciled with the active Product V1 execution order before implementation. It does not silently reorder the current release program.

## 19. Minimum evaluation set

Before Answer Intelligence is called operational, evaluations should include at least:

1. simple greeting at a new conversation;
2. greeting during active work — no reintroduction or objective re-ask;
3. one-word need such as `money` — asks the highest-value necessary question rather than presenting a menu;
4. stable factual question — fast direct path;
5. current/volatile fact — evidence refresh path;
6. missing material evidence — uncertainty instead of invention;
7. high-consequence legal/financial/benefits/safety scenario — stronger evidence and verification;
8. explicit request for detail — presentation expands beyond ordinary brevity;
9. voice/text continuity — same objective survives modality change;
10. action-required request — routes toward governed execution rather than stopping at prose;
11. active Responsibility — answer respects current owner/status/next action;
12. context firewall case — no cross-person, cross-tenant, or cross-principal leakage;
13. tool unavailable or fails — no false claim of action; responsible recovery path;
14. critic catches a materially unsupported assumption;
15. verifier rejects an answer whose confidence exceeds its evidence;
16. outcome evaluation distinguishes a satisfying conversation from a completed outcome.

## 20. Anti-patterns

Do not:

- create a visible `Prompt Engineer` persona members must invoke;
- require users to write better prompts before Aureus can help;
- build a giant static prompt library as a substitute for context-aware compilation;
- send every request through every specialist;
- expose internal multi-agent machinery as the product experience;
- equate model confidence with evidence;
- let brevity override necessary information;
- let detail become a substitute for action;
- re-ask facts or objectives already established;
- let retrieved/user content expand permissions or authority;
- silently move private context across Principal or tenant boundaries;
- retain hidden chain-of-thought as a knowledge asset;
- turn one successful interaction into permanent doctrine;
- optimize for engagement instead of flourishing/outcomes;
- claim completion because an answer was generated;
- make Foundry a required live dependency before its production gates are satisfied.

## 21. Completion criteria

The standard is meaningfully implemented when Aureus can demonstrate that:

1. ordinary people can speak naturally without prompt-engineering knowledge;
2. material requests are represented by an inspectable Answer Contract or equivalent;
3. only relevant context is assembled and established facts are not re-asked;
4. the smallest competent expertise is routed;
5. evidence depth and verification scale with consequence;
6. material instructions are compiled from governed context, authority, tools, evidence, and definition of done;
7. person-facing presentation is intentionally separate from internal work instructions;
8. voice/text continuity preserves the same active objective;
9. answers route into governed execution when completion requires action;
10. confidence does not exceed evidence;
11. outcome evaluation measures whether help actually worked;
12. learning candidates cannot silently mutate live policy or authority;
13. success is not measured by engagement frequency;
14. no new service, authority, or memory class is inferred merely from this documentation.

## 22. Governing shorthand

**The person describes life. Aureus compiles the work.**

**One Steward outside. The intelligence required inside.**

**Do not optimize the prompt for conversation. Optimize the system for the intended outcome.**
