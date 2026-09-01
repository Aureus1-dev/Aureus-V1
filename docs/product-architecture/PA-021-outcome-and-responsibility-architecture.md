# PA-021 — Aureus Outcome & Responsibility Architecture

**Version:** 0.1  
**Status:** Founder-approved architecture candidate; not canonical until governed review and merge  
**Founder direction:** 2026-08-30  
**Original base:** Aureus-V1 `main` `68232e91485d8b8a802712afc301e2d24515ff1b`  
**Current review base after PR #106 merge:** `a43375b85de2dd6424e124c9aed79c4b4b77f2ab`  
**Companion experience architecture:** `PA-022 — Private Steward & Visual Flourishing Experience`  
**Discovery/decision record:** `AUREUS-FINAL-DISCOVERY-AND-EXCELLENCE-SYNTHESIS-001`

## 1. Purpose

PA-001 through PA-020 define the foundational systems of Aureus. This document does not discard those systems. It adds the missing experience and operating layer above them.

The central architectural object is no longer a screen, module, lead, ticket, CRM record, grant, or chat transcript.

The central object is a **Responsibility**:

> Someone is trying to make something true, and Aureus has accepted a bounded part of the work required to move from the current state to a verified outcome.

Aureus is therefore designed as an **interface to outcomes**.

The public interaction contract is:

> Tell Aureus what you want to happen. Aureus carries as much of the work between here and done as it responsibly can.

## 2. One public Aureus

Aureus is the persistent public conversational identity across member, visitor, business, employee, voice, text, web, phone, and compatible third-party-system contexts.

Specialized concepts such as Ward, Revenue Steward, Business Steward, Opportunity Engine, Foundry, System Steward, and domain agents are internal roles, capabilities, or execution modes unless a specific experience requires them to be exposed.

The person should not have to learn a cast of AI characters. They should recognize one Aureus relationship while authority, tenant, privacy, and data boundaries change correctly underneath it.

## 3. The Aureus interaction grammar

Every Aureus experience should follow the same observable grammar when applicable:

1. **Understand the outcome.** Resolve what the person or organization is actually trying to accomplish before presenting a menu.
2. **Look for a better path.** Do not blindly execute an inherited workflow when a materially better responsible path may exist.
3. **Search for leverage.** Look for relevant opportunities, resources, savings, benefits, capabilities, alternatives, or risk reductions.
4. **Make the work visible.** Conversation remains primary while the visual environment assembles the relevant evidence, choices, documents, progress, and decisions.
5. **Ask before taking new authority.** Aureus may notice proactively; it does not silently expand permission.
6. **Carry accepted work.** Once Aureus accepts a bounded responsibility, it tracks commitments, dependencies, deadlines, and next actions.
7. **Bring the human in only where needed.** If a signature, consequential judgment, physical act, approval, credential entry, or other human-controlled step is required, Aureus brings the user directly to that step and then continues.
8. **Verify completion.** “Done” requires evidence appropriate to the responsibility, not merely an attempted tool call.
9. **Show value and provenance.** Preserve what happened, why, source/evidence where required, and measurable outcome/value where appropriate.
10. **Learn safely.** Outcome data may create evaluation and improvement candidates; it may not silently rewrite live policy, authority, prompts, or governance.

## 4. Responsibility model

Every responsibility must be able to represent:

- **Objective** — the outcome sought.
- **Party/context** — who the work is for and the relationship in which Aureus is acting.
- **Success criteria** — what counts as complete.
- **Authority envelope** — what Aureus may do, what requires approval, and what is human-only.
- **Privacy/data envelope** — what information may be used, retained, shared, or transferred.
- **Plan** — the current path from here to done.
- **Commitments** — explicit work Aureus has accepted.
- **Dependencies** — people, systems, documents, events, or time conditions blocking progress.
- **Opportunities** — leverage that may improve the outcome.
- **Actions** — executable next steps.
- **Evidence** — proof of attempted and completed work.
- **State** — active, waiting-on-Aureus, waiting-on-user, waiting-on-third-party, blocked, complete, responsibly-exhausted, cancelled.
- **Outcome** — what actually happened.
- **Value** — money, time, quality, risk, access, wellbeing, revenue, cost, or other measurable improvement where appropriate.
- **Learning event** — a privacy- and authority-safe record that can support evaluation.

A sale, benefit application, hiring process, employee onboarding, supplier transition, business-system migration, customer complaint, job search, or personal objective can all be modeled as different responsibility types.

## 5. Completion and commitments

Aureus should not stop at advice when the user has asked Aureus to help carry the work.

A recommendation is not completion.

A link is not completion.

A form draft is not completion.

A tool invocation is not completion.

Each accepted commitment remains visible to the system until it reaches one of the valid terminal states.

Aureus must be able to answer:

- What did I say I would do?
- What have I completed?
- What am I waiting on?
- What do I need from you?
- What is the deadline?
- What evidence proves the state?
- What happens next?

The user experience should minimize task-management burden. Aureus should prefer:

> “I handled these things; I need you for these two.”

over exposing a large queue of work the user must manually manage.

## 6. Conversation is the home; work is durable

Conversation is the primary human interface. It should not degrade into a conventional stacked chatbot or require the user to understand internal modules.

Durable structured work exists beneath and around the conversation.

When a conversation turn ends, the relationship does not need to end. Aureus may continue carrying explicitly accepted responsibilities. On return, Aureus should resume with the current state of the work rather than forcing the person to reconstruct the transcript.

The durable continuity object is therefore **work and responsibility**, not merely chat history.

## 7. Adaptive visual experience

Aureus should not merely describe the world in text when a visual, interactive representation materially improves understanding or action.

The environment may bring forward:

- relevant business/project imagery;
- options and comparisons;
- measurements and designs;
- applications and documents;
- calendars;
- maps;
- financial or value comparisons;
- progress paths;
- third-party system screens;
- exact approval or human-action surfaces.

The visual rule is:

> Conversation causes the environment to rearrange itself around the outcome.

When human participation is required, unrelated complexity should recede and the required decision/action should come forward.

## 8. Systems and capability stewardship

Aureus is not a CRM-replacement strategy, SaaS replacement strategy, or proprietary-stack maximization strategy.

Aureus is vendor-agnostic and outcome-loyal.

For each external or internal tool, Aureus should determine the capability it is intended to provide and choose among:

- **USE** — the current system is already the best responsible choice.
- **TEACH** — the user needs help extracting value from it.
- **CONFIGURE** — the system can already provide the needed capability with better setup.
- **WRAP** — Aureus becomes the simpler interface while the system remains underneath.
- **CONNECT** — good systems need orchestration across their boundary.
- **AUTOMATE** — repetitive work can be carried without user effort.
- **CONSOLIDATE** — redundant systems can be reduced.
- **REPLACE** — a materially superior option exists and switching creates enough net value to justify risk and disruption.
- **BUILD** — no existing option responsibly provides the required capability.
- **REMOVE** — the capability or expense is unnecessary.

Aureus should replace an existing system only when the customer demonstrably benefits after accounting for migration, reliability, training, integration, and switching costs.

**Goals are durable. Tools are replaceable.**

## 9. Canonical domain model above vendors

Aureus must not model its understanding according to any single vendor.

External concepts are mapped into Aureus-owned canonical concepts.

Examples:

- Salesforce Opportunity / HubSpot Deal / spreadsheet row → Aureus Opportunity.
- QuickBooks invoice payment / other accounting result → Aureus Payment Outcome.
- External task/ticket → Aureus Action or Commitment as appropriate.
- External hiring stage → Aureus Responsibility state in the relevant hiring domain.

This allows Aureus to operate above the tool layer while preserving each external system as the source of truth where it remains authoritative.

## 10. Opportunity and counterfactual behavior

For meaningful objectives Aureus should ask:

> Is there anything available that could materially improve this outcome?

Potential leverage may include money, benefits, grants, rebates, refunds, incentives, better suppliers, underused software, process changes, training, people, financing, scheduling, automation, partnerships, existing entitlements, or elimination of unnecessary work.

Aureus must distinguish verified/current opportunities from suggestions or hypotheses.

Aureus should also perform a bounded **better-way check** before major execution:

> Is the requested path actually the best responsible way to achieve the stated outcome?

This does not authorize hidden paternalism. Aureus surfaces tradeoffs and preserves user authority.

## 11. People and Business are contexts, not separate Aureus products

The shared Aureus Core serves both contexts.

### People stewardship
Applies the same responsibility, completion, opportunity, system-orchestration, adaptive-visual, and learning primitives to individual goals, hardship, growth, opportunity, learning, work, and flourishing.

### Business stewardship
Applies the same primitives to revenue, customer experience, hiring, onboarding, procurement, operations, growth, system utilization, and other business outcomes.

Capabilities improved in one context should be reusable in the other when privacy, authority, and domain rules permit.

## 12. Kitchen & Bath as first complete Business proof

Kitchen & Bath remains the first Business vertical.

The first golden journey is:

`fuzzy kitchen intent → deep conversational discovery → adaptive visual exploration → grounded project state → verified opportunities where relevant → Ready Project → expert/physical validation → proposal → questions/revisions → contract/deposit → operations handoff → outcome`

The contractor should receive a distilled **Ready Project**, not a raw transcript.

The initial objective is to move as much uncertainty and low-value discovery work as responsibly possible before scarce human expert time is required.

Existing CRM/project/construction systems remain in place where they are the better tool. Aureus operates through or around them.

## 13. Business-customer trust boundary

Aureus may operate for a business and advocate for the legitimate transaction, but it may not preserve revenue by deception, concealed material facts, fabricated urgency, exploitative treatment, or knowingly steering a person toward a materially worse outcome solely because it benefits the paying client.

Aureus does not use a client website as a general competitor-marketing funnel.

When an opportunity relevant to the current transaction is found, Aureus may surface it if doing so is consistent with the client relationship and Aureus standards.

If the person explicitly asks Aureus to carry separate unfinished work to completion, that responsibility may transition into a personal Aureus context with appropriate consent and privacy boundaries.

## 14. Identity and memory boundaries

Identity, relationship, conversation, transaction, and personal memory are distinct concepts.

At minimum the architecture must support:

- guest/session continuity;
- business-specific recognized-customer continuity;
- personal Aureus identity;
- business-private information;
- shared transaction information;
- personal/private information.

A business may not receive later personal Aureus information merely because the person first met Aureus on the business website.

A personal Aureus context may not receive business-private notes or pricing authority merely because the person participated in the transaction.

Do not ask a first-time business visitor for an abstract “Aureus memory” relationship merely to increase account conversion. Persistent personal Aureus continuity should emerge naturally when the person asks Aureus to carry work beyond the immediate business interaction.

## 15. Outcome Graph and Learning Fabric

The valuable learning unit is:

`intent + context + action + system/resource + intermediate result + final outcome + value`

not a transcript alone.

Aureus should normalize appropriate events from connected systems into canonical outcome events while retaining source provenance.

Learning must remain scoped:

- private/person-specific learning stays private as required;
- tenant-specific operational learning stays tenant-scoped;
- generalized product learning uses only information and transformations permitted by consent, contract, policy, privacy, and law;
- no raw private dataset is silently promoted into shared intelligence;
- learned candidates do not mutate live behavior without evaluation and governed promotion.

The desired loop is:

`Observe → Detect → Hypothesize → Replay → Shadow → Experiment → Evaluate → Approve → Deploy → Monitor/Roll back`

## 16. Value Ledger

For meaningful work Aureus should be able to preserve:

- recommendation/action;
- reason/evidence where appropriate;
- alternatives considered where material;
- party/context;
- cost;
- measurable value created or protected;
- final result;
- confidence/uncertainty;
- provenance;
- lessons eligible for evaluation.

For businesses, value may include revenue, margin, cost removal, hours returned, conversion, quality, risk, and completion.

For people, value may include money saved/obtained, income, time, opportunity, access, quality, risk avoided, responsibilities completed, and other mission-relevant outcomes.

The ledger is evidence, not gamification and not permission to reduce flourishing to one numerical score.

## 17. Human/AI authority model

Every executable action must fit one of these classes:

1. **Aureus may execute** within current authority.
2. **Aureus may execute after explicit approval.**
3. **The human must perform the action; Aureus guides and resumes afterward.**
4. **A qualified external human/professional/worker must perform it; Aureus coordinates.**
5. **Aureus may not responsibly carry it; Aureus explains and finds the best allowed next path.**

High-consequence authority may not be expanded by model confidence or user-interface convenience.


### 17.1 Responsibility Passport and Authority/Policy Gateway

Every active Responsibility must have a machine-enforced **Responsibility Passport** that binds, at minimum:

- responsibility and party/context identity;
- objective and success criteria;
- current authority class and approval state;
- privacy/data envelope;
- allowed, approval-required, human-only, and prohibited actions;
- resource/provider/tool constraints;
- spend, time, freshness, and expiry limits where applicable;
- evidence and verification requirements;
- policy/version provenance.

Every consequential action must pass through an **Authority/Policy Gateway outside the model**. A model may propose a route or action; it may not grant itself permission, reinterpret a denial as approval, widen the passport, or use confidence as authority.

### 17.2 Smallest sufficient resources and Responsible Continuation

Aureus chooses the smallest sufficient authorized combination of APIs, MCP, A2A, Make.com, browser/computer-use, AI models, deterministic code, external systems, and humans required to carry the Responsibility.

Make.com and similar automation systems are execution/integration infrastructure, not Aureus's brain and not authority sources.

If one route is blocked, denied, unavailable, or fails, Aureus does not silently abandon the underlying Responsibility. It performs **Responsible Continuation**:

1. preserve the Responsibility and evidence of the failed/denied route;
2. determine whether an authorized alternative path exists;
3. continue through the best allowed path when one exists;
4. bring the human in only for judgment, authority, credentials, physical action, or verification that genuinely requires them;
5. move to BLOCKED or RESPONSIBLY_EXHAUSTED only when no responsible authorized continuation remains.

### 17.3 Independent Execution Assurance

Important work requires verification appropriate to its consequence.

The executor may provide evidence, but may not certify its own consequential work. Execution Assurance must use a sufficiently independent verifier, deterministic check, authoritative receipt, human confirmation, or field verification as the Responsibility requires.

A tool-call success response is not completion evidence by itself. If required independent assurance is unavailable, the Responsibility remains unverified rather than being promoted to complete.

## 18. The Aureus Test

Before a major capability ships, ask:

> If this capability had never existed and Aureus invented it, what would it look like?

Then test whether the design:

- starts from the intended outcome rather than inherited software categories;
- looks for a better path and relevant leverage;
- makes the situation visually understandable;
- does as much work as responsibly possible;
- asks before expanding authority;
- carries accepted work to completion;
- brings humans in only where necessary;
- proves what happened;
- preserves unfinished commitments;
- learns safely from outcomes.

If the capability merely recreates conventional software with a chatbot on top, it should be redesigned.


### 18.1 Hospitality, service recovery, and continuous plussing

Aureus applies validated excellence mechanisms from exemplary hospitality and service institutions across member, business, employee, and program experiences without copying surface rituals.

The operating standard is:

- recognize the person and context without making memory feel invasive;
- prepare before asking the person to repeat known information;
- anticipate likely friction while preserving choice and authority;
- make ownership visible;
- coordinate backstage complexity behind one coherent Aureus relationship;
- recover failures through: **Hear once → own the case → prepare → repair → prove the repair → tell the person**;
- continuously “plus” the experience using privacy-safe outcome evidence rather than novelty for its own sake.

Lessons may be generalized across the network only when privacy, consent, tenant, contractual, and governance boundaries permit. Raw private experience data is never silently promoted into shared learning.

## 19. Migration rule for existing Aureus systems

Existing systems are not discarded. Each current capability must be classified during reconciliation as:

- **KEEP**
- **UPGRADE**
- **MERGE**
- **REPLACE**
- **ADD**

The reconciliation must prefer reuse over rewrite and must identify exact existing models/services/routes/components that can serve the new primitives before new persistence or competing sources of truth are introduced.

## 20. V1 completion target

V1 need not implement every future responsibility domain.

The generalized machine is considered proven when one Aureus can, in both a meaningful Business journey and a meaningful People journey:

`accept intent → understand → find leverage → create/continue bounded responsibility → visibly operate across required systems/resources → ask for human participation only where necessary → persist unfinished work → verify completion → show outcome/value → emit safe learning evidence`

Kitchen & Bath is the first Business proof. The People proof should use a real help-to-completion journey rather than a demonstration-only toy workflow.


### 20.1 Current launch sequence

The current Founder sequence is **Business contracts first, with the People side invite-only**. This supersedes older roadmap language that categorically prohibited a Business pilot until a Day-30 public-member sequence.

It does not remove People safety/readiness gates, authorize a public People launch, or turn the Business customer surface into a personal-data acquisition funnel. The shared-core completion claim still requires both a meaningful Business proof and a meaningful People help-to-completion proof.

## 21. Non-goals

This architecture does not authorize:

- replacing external systems merely for ownership;
- autonomous consequential actions outside existing governance;
- cross-tenant or cross-context data leakage;
- hidden affiliate/commercial influence;
- silent self-modification;
- pretending recommendations are completed outcomes;
- using the Business client surface to market unrelated Aureus products;
- exposing private chain-of-thought;
- treating model agreement as authority or proof.

## 22. Architectural consequence

PA-021 changes the organizing question for future work.

Old question:

> Which product module should contain this feature?

New higher-level question:

> What outcome is being sought, what responsibility is Aureus accepting, and which existing capabilities/systems should be composed to carry it safely to completion?

PA-001 through PA-020 remain the capability map underneath this layer until individually revised through governance.


## 23. Final discovery reconciliation — normative additions

The final pre-build synthesis added several named primitives that are now part of the PA-021 architecture even where earlier sections used broader wording.

### 23.1 Principal

Each Responsibility must have a legible **Principal**: the party whose legitimate outcome Aureus is serving in the current context.

The same person may be a personal member, owner, employee, customer, or participant in a shared transaction. One public Aureus does not collapse those roles, permissions, or data boundaries.

### 23.2 Context Firewall

Every delegated model, agent, tool, vendor, integration, or human receives only the minimum data and authority required for the exact Responsibility/action.

The Context Firewall is an enforcement property of orchestration, not a prompt courtesy.

### 23.3 Resource & Authority Graph

Every consequential delegated action should be traceable through:

`Principal → Responsibility → Responsibility Passport → policy decision → delegated capability/resource → exact action → evidence → assurance`

Authority may be object-specific, time-bounded, revocable, conditional, and history-dependent.

### 23.4 Responsibility Memory and No Abandonment

Once Aureus explicitly accepts bounded work, that commitment remains durable until verified completion, cancellation, authority withdrawal, supersession, or RESPONSIBLY_EXHAUSTED with reason/evidence/best next path.

A conversation ending does not terminate accepted work.

### 23.5 Repair Obligation

If Aureus causes or materially contributes to a failure, it should:

`detect → contain → diagnose → correct → re-run → verify → resume → learn`

Failure should increase Aureus ownership rather than create avoidable work for the person.

### 23.6 Uncertainty Map

Material facts must distinguish, where relevant:

- KNOWN / VERIFIED;
- OBSERVED;
- REPORTED;
- INFERRED;
- ESTIMATED;
- UNKNOWN.

Unknowns may gate execution. Fluent model language may not silently upgrade uncertainty.

### 23.7 Shadow Outcome

For consequential planning, Aureus may preview likely outcomes, tradeoffs, or consequences while clearly separating facts, estimates, assumptions, and uncertainty.

Simulation is decision support; it is not completion evidence or certainty.

### 23.8 Causal Learning

Outcome learning should avoid automatic causal credit.

Aureus should distinguish correlation from causal evidence where possible and evaluate interventions over time rather than assuming that an outcome was caused by whatever action preceded it.

### 23.9 Human Attention Budget

Human attention is a stewardship resource.

Aureus should reduce avoidable repetition, chasing, waiting, app navigation, redundant choices, unnecessary forms, and coordination burden.

Necessary consent, accessibility, safety, informed judgment, and high-consequence review are not waste.

### 23.10 Economic Stewardship

Business Responsibilities should continuously evaluate legitimate value across:

- **Earn** — create revenue;
- **Convert** — turn demand into good completed transactions;
- **Keep** — protect revenue, margin, cash, quality, and time from avoidable leakage;
- **Compound** — improve the systems/capabilities that make future outcomes better.

A request for more leads may actually be a conversion, trust, financing, margin, scheduling, or leakage problem.

### 23.11 Transaction Barrier Graph

For a qualified transaction, Aureus should evaluate relevant barriers including desire, fit, price, funding, resource availability, timing, knowledge/uncertainty, trust, decision authority, administrative friction, and alternatives.

Remove legitimate barriers; do not manufacture urgency or conceal harm.

### 23.12 Transaction Steward

When operating for a paying business inside a customer transaction, Aureus remains bound by a Standard of Care.

Business advocacy does not authorize deception, predatory steering, exploitation of vulnerability, fabricated urgency, or concealment of material harm.

### 23.13 Opportunity Creation

A later-stage Aureus may, when lawful and authorized, coordinate creation of a new opportunity from existing components rather than merely discover one.

Examples may include pooled training, group purchasing, coordinated resource arrangements, or new partnerships.

This is not part of the first OR-001 slice and requires domain-specific legal/fairness review.

### 23.14 Systemic Repair

Repeated structural friction should become a candidate for system repair:

`help individual → detect repeated pattern → diagnose shared cause → propose/execute authorized repair → verify broader result`

Aureus should not optimize permanent workarounds when it can responsibly improve the source system.

### 23.15 Excellence Transfer

Aureus should reuse validated mechanisms from exceptional organizations and institutions through governed **Excellence Cards**, preserving the mechanism, why it works, sacrifice/tradeoff, applicability limits, evidence standard, metrics, and transfer eligibility.

Learning sources are:

1. Humanity's Learning;
2. Local Learning;
3. governed Network Learning.

Private data and trade secrets are not involuntary network learning.

### 23.16 Private Steward and Visual Flourishing

PA-022 defines the experience contract for a private Steward that visibly reflects flourishing.

The member experience should emphasize active Responsibilities, progress, meaningful achievements, intentionally preserved life/family moments, what matters, and grounded future possibility.

The visual principle is:

> Show how well life or business is being cared for and moving—not how much data Aureus has collected.

### 23.17 Outcome Surface naming

The adaptive visual environment described in Section 7 is the **Outcome Surface**.

Conversation remains home; relevant work, evidence, decisions, tools, documents, comparisons, and progress come forward around the Responsibility.

### 23.18 Discovery source

The full reasoning, research-track conclusions, rejected theses, V1/V2 placement, and evidence-to-decision record are preserved in:

`docs/product-first/AUREUS-FINAL-DISCOVERY-AND-EXCELLENCE-SYNTHESIS-001.md`

These additions do not authorize runtime behavior by themselves. Implementation remains governed by the ordered OR slices, exact-head review, policy/authority enforcement, and Founder gates.
