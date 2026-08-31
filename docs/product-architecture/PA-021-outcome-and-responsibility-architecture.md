# PA-021 — Aureus Outcome & Responsibility Architecture

**Version:** 0.1  
**Status:** Founder-approved architecture candidate; not canonical until governed review and merge  
**Founder direction:** 2026-08-30  
**Base:** Aureus-V1 `main` `68232e91485d8b8a802712afc301e2d24515ff1b`

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
