# PRODUCTION-HOUSE-000 — Tenant-Zero Production System

**Status:** architecture candidate only — not active implementation authority  
**Track:** Aureus Business / internal Tenant Zero  
**Repository:** Aureus-V1  
**Base:** current `main` at branch creation  
**Implementation authority:** none. This document does not reorder the active V1 execution registry, authorize spend, activate vendors, change schema/code, deploy anything, or admit an external client.

## 1. Purpose

Aureus should be able to take a production request such as:

> Tell Aureus what you want to accomplish. Aureus figures out how to get it done.

and carry that request through research, creative development, production, finishing, delivery, measurement, and learning using the best available tools without making the user or operator manually orchestrate a pile of vendors.

The first proving ground is Aureus itself.

The Production House is therefore **Tenant Zero on the existing Aureus platform**, not a separate studio platform, parallel CRM, separate knowledge system, or second orchestration engine.

The goal is not to become "an AI video generator." The goal is a governed production capability that can produce complete professional campaigns and other media outputs by coordinating specialized tools, humans, rights, evidence, cost, and outcome data through the existing Aureus rails.

## 2. Non-negotiable architectural rule

Everything in this work order extends or applies existing primitives before adding new ones.

### Reuse first

- **Aureus-V1** remains the relationship, consent, permissions, tenant, conversation, Responsibility, handoff, and outcome surface.
- **Library** remains the governed operating memory and canonical knowledge layer.
- **Foundry** remains the provider-neutral research, comparison, evaluation, routing, experimentation, and learning layer as it becomes production-ready.
- **Responsibility / Evidence / Outcome** remains the execution-proof grammar.
- **Authority / Policy Gateway / Context Firewall** remains the action boundary.
- **Existing organization / tenant isolation** remains the business boundary.
- **Existing audit and ledger semantics** remain the proof trail.

Do not create a parallel production database, parallel orchestration engine, parallel Library, second agent authority model, or standalone "creative AI OS" unless a later review proves the existing primitive cannot responsibly carry the need.

## 3. Product promise

The internal operating promise is:

`request → understand the job → research what good requires → select the right tools → create → review → revise → finish → deliver → measure → learn`

The operator should experience one Aureus surface even when the work uses many providers underneath.

The system should answer:

1. What are we trying to accomplish?
2. Who is it for?
3. What evidence says this creative approach is appropriate?
4. Which tool or human should do each part?
5. What rights and consent apply?
6. What will it cost?
7. What is the current state?
8. What still blocks completion?
9. What proof shows it is finished?
10. What happened after release, and what should we learn?

## 4. Production House as Tenant Zero

Aureus itself is the first production tenant.

This lets the system learn from real work before an external client depends on it.

The first portfolio should include four distinct jobs:

1. **Who we are** — explain the Foundation-to-Flourishing / Steward promise.
2. **What we can build for you** — show the request-to-finished-output process and result.
3. **Depth and range** — prove the system can coordinate original score, voice, footage, graphics, editing, finishing, and delivery rather than only template assembly.
4. **Unexpected creative uses** — use production itself as R&D and show novel applications discovered through real work.

Every produced asset must have one explicit job. "Make good content" is not an acceptable objective.

## 5. One internal research capability, not two engines

The previously discussed Craft Research Engine and Demand Discovery Engine converge into one governed internal research capability with different query classes.

### Query class A — Craft

Examples:

- What makes this kind of opening retain attention?
- What camera/editing language fits this emotional job?
- What can the current version of this editing or generation tool actually do?
- How do respected practitioners solve this problem?
- What failure modes should we expect?

### Query class B — Demand / Voice of Customer

Examples:

- What do people repeatedly complain about in this category?
- What outcomes are people trying to buy?
- What words do customers naturally use?
- What objections repeatedly block conversion?
- Which unmet needs are frequent, intense, and poorly served?

### Query class C — Tool capability

Examples:

- Which current provider best fits this exact shot or task?
- What are the provider's current limits, supported controls, terms, price, latency, export formats, and failure behavior?
- Is a vendor being deprecated or materially changed?

### Query class D — Market and performance

Examples:

- What formats are working now for the intended audience?
- What did our own retention, completion, click, conversion, or recall data show?
- Which creative hypothesis beat its forecast?

These classes share one source registry, evidence model, provenance discipline, Library-admission path, and user surface.

## 6. Evidence hierarchy

Production decisions should distinguish evidence strength rather than treating all inspiration as equivalent.

A practical ordering is:

1. our own verified performance and outcome data;
2. controlled tests / credible benchmarks;
3. authoritative tool documentation, standards, manuals, and release notes;
4. documented practitioner case studies and production breakdowns;
5. repeatable audience / customer signal;
6. professional convention and craft theory;
7. aesthetic preference / speculative idea.

Lower-ranked evidence can generate a hypothesis. It should not masquerade as proof.

## 7. Capability and provider routing

Aureus should not hard-code one vendor as "the video model," "the image model," or "the editor."

Each production step should be expressed as a capability requirement, for example:

- photoreal still generation;
- typography/logo-safe image generation;
- character consistency;
- camera-motion control;
- synchronized dialogue;
- short cheap iteration clip;
- music generation;
- voice generation / dubbing;
- dialogue cleanup;
- long-form editorial;
- motion graphics;
- vertical adaptation;
- captioning;
- color finishing;
- audio mastering;
- export / delivery.

Foundry/provider routing should eventually evaluate candidate tools against task-specific dimensions such as:

- output quality;
- controllability;
- consistency;
- latency;
- cost;
- rights / license fit;
- privacy / data handling;
- export quality;
- API availability;
- vendor stability;
- failure rate;
- geography / availability;
- human correction burden.

### Vendor-churn rule

No vendor-specific object may become the canonical production object.

Projects must retain provider-neutral manifests, inputs, prompts/instructions where lawful, references, edit decisions, source assets, rights records, and final outputs so a vendor can be swapped without rebuilding the business process from zero.

A provider may be preferred. It may not become an architectural single point of failure.

## 8. Current tool candidates are provisional, not canon

Specific tools discussed during discovery — including DaVinci Resolve as a likely initial post-production spine and specialized image/video/music/voice generators — remain **activation-time candidates**.

Before implementation or spend, Aureus must verify the current version, availability, price, commercial terms, API/support surface, data handling, and deprecation status.

No historical chat claim about a vendor is permanent product truth.

The intended editing posture is interoperability rather than lock-in: the production manifest should be able to preserve work across professional post tools and open media formats where practical.

## 9. The Production Manifest

Every production Responsibility should have one durable provider-neutral manifest containing at minimum:

- production/project ID;
- tenant / Principal;
- stated objective;
- target audience;
- channel / placement;
- intended outcome metric;
- brief and constraints;
- style-bible revision;
- script / story revision;
- shot / asset list;
- source assets and provenance;
- generation / transformation steps;
- provider/model/version used for each generated asset;
- prompts/instructions/settings where retainable;
- human contributors and approvals;
- consent and rights records;
- music / voice / likeness rights;
- edit decision / assembly references;
- quality reviews;
- disclosure requirements;
- deliverable variants;
- cost records;
- release/publish destinations;
- forecasted result;
- measured result;
- lessons / Knowledge Candidates.

This is the production-specific view of existing Responsibility / Evidence / Outcome mechanics, not an independent ledger.

## 10. Style Bible

Aureus requires a canonical production style bible to stop aesthetic drift across multiple tools.

It should govern at least:

- brand purpose and emotional promise;
- audience posture;
- language and voice;
- visual identity;
- typography rules;
- logo treatment;
- color language;
- composition principles;
- character / subject continuity;
- lighting / texture posture;
- camera language;
- edit rhythm;
- music / sound identity;
- caption / subtitle behavior;
- disclosure treatment;
- accessibility requirements;
- prohibited manipulations;
- examples of approved and rejected expression.

The style bible belongs in governed knowledge, has revisions, and must be referenced by the production manifest.

Tool-specific prompt recipes may derive from it; they are not themselves the brand source of truth.

## 11. Rights, consent, provenance, and disclosure

This is a release gate, not cleanup work after production.

The system must represent rights and consent for at least:

- voice cloning / synthetic voice use;
- likeness and identifiable people;
- member/customer footage;
- testimonials;
- music and stems;
- stock / licensed media;
- logos / trademarks;
- third-party creative references;
- commissioned work;
- training / reuse rights where relevant;
- channel-specific AI disclosure requirements.

### Voice / likeness rule

No cloned or synthetic rendition of a real person's voice or likeness enters production merely because a tool can create it. The production record must contain the applicable consent / authorization and intended-use boundary.

### Provenance rule

Generated and transformed media should remain attributable to the production step that created it. Do not erase origin information from the internal evidence trail even when the final customer-facing asset does not expose implementation detail.

### Transparency rule

Do not build the growth strategy around making audiences believe synthetic material is documentary reality when it is not.

## 12. Human creative authority

Aureus can research, propose, draft, generate variants, route tools, assemble, critique, and measure.

A human creative authority remains responsible for release judgment while the system is earning evidence.

The human does not need to operate every tool manually. The human must be able to inspect the objective, evidence, rights state, critical creative decisions, review results, and final deliverable before consequential publication when required.

The system should remove sterile production friction without removing generative creative judgment.

## 13. Production workflow

### Gate 0 — Objective

Define one primary job and measurable outcome.

### Gate 1 — Grounding

Research craft, audience, category, tool capability, rights, and channel constraints.

### Gate 2 — Creative concept

Generate multiple concept approaches with rationale, evidence, cost, risk, and required assets.

### Gate 3 — Script / structure

Create the story, beats, hook, CTA, proof, and production plan.

### Gate 4 — Asset plan

Decide what should be:

- real footage;
- generated;
- animated;
- recorded;
- licensed;
- designed;
- captured from product reality.

### Gate 5 — Rights / consent readiness

No production path advances if a required right/consent is unresolved.

### Gate 6 — Production

Route each task to the best eligible tool or person.

### Gate 7 — Assembly / post

Edit, mix, color, caption, version, and finish.

### Gate 8 — Independent quality review

The producer does not self-certify. Review should cover:

- objective fit;
- factual accuracy;
- brand/style adherence;
- continuity;
- technical defects;
- rights/disclosure completeness;
- accessibility;
- channel specification;
- audience risk / ambiguity;
- cost surprises.

### Gate 9 — Small audience test when appropriate

Use bounded testing before expensive or high-exposure release when the objective depends on audience response.

### Gate 10 — Release

Publish or hand off through authorized destinations only.

### Gate 11 — Outcome capture

Record actual performance against the forecast and job.

### Gate 12 — Learning

Create Knowledge Candidates for reusable production knowledge. Do not silently mutate the style bible or live routing policy from one result.

## 14. Testing and the Foundry loop

Every meaningful piece should begin with an explicit prediction such as:

- expected 3-second hold;
- completion rate;
- click-through;
- qualified response;
- sales meeting / inquiry;
- aided recall;
- production cost;
- production cycle time;
- revision count.

After release, capture the actual result.

Foundry should compare forecast to outcome and help distinguish:

- the idea was wrong;
- execution was weak;
- audience/placement was wrong;
- measurement was noisy;
- tool choice created a quality problem;
- cost savings created hidden revision burden;
- the result is real but not transferable.

The purpose is compounding production intelligence, not merely generating more content.

## 15. Repurposing and campaign graph

A finished master should not be treated as a single-use file.

The production system should represent a campaign graph:

`master idea → long-form master → channel cuts → shorts → stills → quotes → thumbnails → captions → sales/demo artifact → Library case study`

Repurposing must preserve context and rights. It should not automatically publish every derivative.

## 16. Economics and the Value Ledger

Production economics should use actual project evidence rather than an invented rate card.

For every project, record:

- external tool/API spend;
- licenses/subscriptions allocable to the job;
- human time where measured;
- generation attempts / discarded renders where useful;
- revision count;
- compute / render expense where material;
- delivery/support time;
- total cost;
- cycle time;
- client / internal value outcome where measurable.

### Tenant-Zero pricing-learning rule

The first Aureus internal campaigns are not external revenue, but they should still be costed like real work.

That creates the first evidence base for later fixed project pricing / retainers / packaged campaign economics.

Do not infer that "AI" means "cheap." Measure the full cost including correction and human attention.

### Commercial boundary

Pricing, contract terms, margin targets, licensing/reuse rights, and first external-client commitment remain Founder decisions and require a later explicit commercial work order.

## 17. Production Conservatory / Academy connection

Learning the craft and producing work are one compounding system.

The operating loop is:

`Learn → Practice → Produce → Measure → Critique → Improve → Teach`

Reusable knowledge should include:

- tool capability cards;
- technique cards;
- failure patterns;
- creative-pattern evidence;
- editing / sound / camera / narrative lessons;
- production checklists;
- benchmark tasks;
- approved prompt/control recipes;
- version-change notes;
- tool deprecation / migration notes.

The Academy should eventually be able to use real production work as curriculum and evidence without exposing private client material outside its permitted context.

## 18. Demand Discovery / Voice-of-Customer mining

Demand research should be a governed source pipeline, not indiscriminate scraping.

Potential source classes include public reviews, forums, social conversation, app reviews, support patterns, search behavior, interviews, sales calls, and first-party customer evidence where lawfully available.

The system should preserve:

- source;
- date / freshness;
- query / category;
- exact or summarized evidence;
- confidence;
- recurrence / cluster;
- audience segment where known;
- privacy / terms constraints;
- derived hypothesis;
- whether the hypothesis has been tested.

Paid social-listening or review platforms are adapters, not the system itself.

Vendor pricing must be re-verified before purchase. No historical monthly figure in chat is purchasing authority.

## 19. Authenticity anchor

Production should retain a strong connection to real people, real work, and real outcomes.

Useful authenticity sources include:

- real product operation;
- real steward/member/client stories with permission;
- real founder / team explanation;
- behind-the-scenes production process;
- actual project evidence;
- honest limitations and lessons.

The answer to low-trust synthetic media is not to hide synthetic production. It is to make the work useful, specific, well-crafted, attributable, and connected to reality.

## 20. First complete Tenant-Zero proof

The first production proof should be one small campaign, not a generalized studio platform.

### Required flow

`Founder request → objective → evidence-backed brief → concept options → selected concept → script/storyboard → rights-ready asset plan → multi-tool production → edit/finish → independent review → Founder release gate → publish/deliver → performance evidence → Foundry evaluation → Library Knowledge Candidates`

### Required outputs

- one master video;
- at least two derivative channel cuts;
- associated thumbnail/still/caption assets;
- complete Production Manifest;
- cost ledger;
- rights/consent record;
- review record;
- release record;
- performance scorecard;
- at least one admitted or rejected Knowledge Candidate decision.

The exact theme may be chosen when this work order becomes active; no production spend is authorized here.

## 21. Initial implementation slices — only after activation

### PH-001 — Production Manifest + style-bible contract

Prove provider-neutral project state, rights fields, style revision binding, and cost/outcome placeholders without calling generation vendors.

### PH-002 — Research and capability registry

Prove one internal research surface, source/provenance records, current-provider capability registry, and stale/deprecation handling.

### PH-003 — Planning and tool routing

Prove a production plan can route tasks to eligible tools without hard-coded vendor identity and can fail closed when a required right, capability, or budget boundary is missing.

### PH-004 — First bounded generation adapter

Connect one low-consequence media generation capability behind the provider-neutral contract, with cost, provenance, retries, timeout, and artifact retention.

### PH-005 — Post-production spine

Connect the chosen editing/finishing workflow while preserving a provider-neutral manifest and exportable assets.

### PH-006 — Independent production QA

Add quality/rights/style/technical review and correction loop.

### PH-007 — Tenant-Zero campaign

Run the first Aureus campaign end to end.

### PH-008 — Outcome and learning loop

Measure actual result, score forecast, create Knowledge Candidates, and update routing/evaluation only through governed review.

### PH-009 — External-client readiness

Only after Tenant Zero proves the loop: commercial packaging, client rights/approval surface, isolation tests, support/failure recovery, pricing evidence, and first-client gate.

## 22. Explicit non-goals for PH-000

This architecture candidate does **not**:

- reorder the active OR or People build sequence;
- create a production schema;
- add a new runtime service;
- activate Foundry in the live critical path;
- purchase software;
- select permanent vendors;
- authorize voice cloning;
- authorize autonomous publishing;
- create a new Library taxonomy without Library review;
- promise viral performance;
- claim that a tool or price from a prior chat is still current;
- create a generalized agency CRM;
- admit an external client;
- replace existing professional tools merely to increase Aureus surface area.

## 23. Architecture acceptance criteria

PH-000 is ready for independent architecture review when a reviewer can answer **yes** to all of the following:

1. Does it reuse V1 / Library / Foundry rather than create competing systems?
2. Is Tenant Zero explicit?
3. Is provider churn treated as a first-class design constraint?
4. Are specific vendors kept outside canonical domain objects?
5. Is the style bible canonical and versioned?
6. Are voice/likeness/music/source rights explicit release gates?
7. Is there producer/reviewer separation?
8. Is performance prediction compared with real outcomes?
9. Is cost measured from real projects before pricing claims?
10. Can external social-listening / generation / editing vendors be swapped?
11. Are private client/member materials protected from ungoverned learning?
12. Is one internal research capability used for craft, demand, tools, and market evidence?
13. Does the work preserve current V1 execution authority instead of silently reprioritizing the repository?
14. Is the first proof one bounded campaign rather than a giant platform build?

## 24. Independent review request

When the Founder chooses to review PH-000, the independent reviewer should be instructed to:

- read `CLAUDE.md`;
- read `docs/ai/REPOSITORY_STEWARD.md`;
- inspect current `main` and the exact PH-000 branch head;
- read the current Product V1 execution registry;
- read the existing AI/provider architecture before proposing new orchestration;
- search for existing media, asset, knowledge, Responsibility, consent, audit, cost, and outcome primitives;
- identify duplicate-system risk;
- identify rights/privacy/tenant-isolation gaps;
- identify places where vendor-specific assumptions leaked into canonical architecture;
- identify missing deny paths;
- distinguish architecture blockers from later implementation details;
- return PASS / PASS WITH CONDITIONS / HOLD tied to the exact SHA.

## 25. Founder decisions deliberately deferred

The following are not required to accept the architecture:

- permanent video generation vendor;
- permanent image generation vendor;
- permanent music provider;
- permanent voice provider;
- permanent editor/post stack;
- paid social-listening vendor;
- final commercial pricing;
- first external Production House client;
- whether public-facing production is branded as "Production House" long term;
- autonomous publish authority.

Those decisions should be made from current evidence when the relevant slice activates.

## 26. Carry-forward principle

**Everything already built is the foundation, not a discard pile.**

The Production House is a demanding new application of the same Aureus promise:

> Tell Aureus what you want to accomplish. Aureus figures out how to get it done.

The product succeeds when the person sees one Steward carrying the outcome while the system responsibly coordinates the best available tools, people, evidence, permissions, and verification underneath.