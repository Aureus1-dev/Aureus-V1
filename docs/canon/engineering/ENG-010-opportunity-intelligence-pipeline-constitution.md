# ENG-010 — Opportunity Intelligence Pipeline Constitution

**Document ID:** ENG-010
**Title:** Opportunity Intelligence Pipeline Constitution
**Status:** Draft for Founder Approval
**Authority:** Canonical upon Founder Approval, scoped to the Opportunity Intelligence Pipeline
**Version:** 1.1

---

# 1. Purpose

This Constitution establishes the governing rules for the Opportunity Intelligence Pipeline — the system by which Aureus discovers, validates, scores, reviews, publishes, and learns from opportunities on a Member's behalf.

Its purpose is to ensure that automated discovery never compromises the trust, dignity, agency, or safety the rest of Aureus is built to protect, and that every future engineer or AI system extending this pipeline inherits the same guardrails rather than rediscovering them by trial and error.

This Constitution governs the *pipeline's* conduct. It does not restate or replace PC-009 (Opportunity Canon) or PC-010 (Discovery Canon), which govern the meaning and purpose of opportunity and discovery for the Member; it exists to translate those principles into concrete engineering rules for one specific, higher-risk subsystem — the only part of Aureus that ingests content from outside the platform's own trust boundary and feeds it toward a Member.

This document defines enduring principles, not implementation. Database schemas, source adapters, scheduled-job mechanics, and API shapes belong in architecture documents and work orders beneath this one — they should be free to change as technology does, without the principles here ever needing to change with them.

---

# 2. Order of Authority

When interpreting this pipeline's requirements, authority shall be applied in the following order:

1. The Aureus Living Constitution (ALC-001)
2. PC-009 (Opportunity Canon) and PC-010 (Discovery Canon)
3. ENG-001 (AI Engineering Constitution)
4. This Constitution (ENG-010)
5. PA-007 (Opportunity Engine Architecture)
6. Approved architecture and ADRs for this pipeline
7. Existing repository implementation
8. Historical work orders for this pipeline

If two authorities conflict, follow the higher authority. If equal, follow the newest approved decision. If still unresolved, stop and request Founder clarification. Nothing in this document may be read to permit what ALC-001, PC-009, PC-010, or ENG-001 forbid.

---

# 3. Philosophy

The Opportunity Intelligence Pipeline exists to widen what a Member can discover, not to replace their judgment about what to do with it.

Automation earns its place in this pipeline only where it demonstrably serves the Member better than the absence of automation would — by surfacing more real opportunities, sooner, more accurately, than a human alone could find. It never earns its place by being cheaper, faster, or more scalable at the expense of accuracy or trust.

This pipeline shall be judged by whether the opportunities it surfaces are worthy of a Member's trust (PC-009 §9) — not by discovery volume, publication throughput, or engagement.

Where a design choice trades Member trust for pipeline efficiency, efficiency loses.

---

# 4. Mission Alignment

The Opportunity Intelligence Pipeline exists to help Members flourish by helping them discover meaningful next steps — not to maximize discovery volume, publication throughput, engagement, or any other measure of pipeline activity for its own sake.

Every material engineering decision in this pipeline shall be tested against this question: which choice better advances a Member's flourishing while preserving their trust? Where two technically valid implementations differ, the one that better answers that question shall be preferred — even where the alternative would be simpler, cheaper, or faster to build. This is the operational form of §3's Philosophy: a test to actually apply, not only a sentiment to agree with.

---

# 5. Definition of Success

This pipeline's success shall never be measured by its own internal activity — not by candidates found, scans completed, sources checked, or AI calls made. Those are signs that the pipeline is running; they are not signs that the pipeline is working.

Success shall instead be measured by outcomes such as:

- Members finding real opportunities they would not otherwise have found.
- Members successfully completing opportunities they pursued through Aureus.
- The time from an opportunity's discovery to a Member receiving a relevant recommendation.
- The accuracy of recommendations — how often what the pipeline surfaces genuinely fits the Member who receives it.
- Member trust and satisfaction with what the pipeline surfaces.

Any dashboard, metric, or Founder briefing built for this pipeline shall report activity in service of these outcomes, never activity as a substitute for them.

---

# 6. Trust Model

## 6.1 Source Trust Is Earned, Never Assumed

Every source of discovered opportunities shall be represented as an explicit, individually governed `OpportunitySource` record. Scanning shall default to deny: a source that is not present, or present but not `enabled`, shall never be scanned, regardless of how it was discovered or how confident any AI system is in its legitimacy.

## 6.2 Trust Is Tiered and Explicit

Each source shall carry an explicit trust tier reflecting its provenance and track record (e.g. structured government/institutional feed, verified organization, unverified web source). Trust tier shall directly and legibly bound what the pipeline is permitted to do with that source's candidates downstream — a lower-trust source shall never be permitted to skip a validation, verification, or review step that a higher-trust source is also required to pass; trust tiers narrow what is *possible*, they never widen it.

## 6.3 Material Trust Changes Require a Human or a Deterministic Threshold

An AI system may *recommend* a change to a source's trust tier, scan frequency, or enabled state, with a stated rationale. It may never *enact* such a change on its own judgment alone. A trust-tier change, a source being disabled, or a source being blocked shall occur only through:

- An authorized human reviewer's explicit action, or
- A deterministic, pre-approved, published threshold rule (e.g. "N consecutive validation failures disables scanning pending review") that any engineer or Founder can read, verify, and audit without needing to trust an AI's stated reasoning.

An opaque "the AI decided this source was untrustworthy" is never sufficient grounds for a trust or availability change.

## 6.4 Blocking a Source Is Reversible and Explained

Blocking a source shall always record who or what triggered the block, when, and why (`blockedAt`, `blockReason`). A block is a pause on trust, not a verdict — it shall be reviewable and reversible by an authorized human.

---

# 7. Ranking and Scoring Principles

## 7.1 No Opaque Overall Score

The pipeline shall never present, store, or act upon a single overall score without also preserving the component scores, the evidence behind them, and a concise, human-readable rationale. A number a reviewer cannot interrogate is not a score — it is a guess wearing a number.

## 7.2 Required Score Components

At minimum, the following shall be computed and stored as distinct, individually explainable components for every candidate:

- Source trust
- Freshness
- Completeness
- Philadelphia relevance (or the relevant geography for whichever region a future expansion covers)
- Potential impact to the Member
- Urgency
- Estimated Member effort
- Scam/risk signal
- Overall confidence (a synthesis of the above, never a replacement for them)

## 7.3 Urgency Is Distinct From Importance

A high-impact opportunity with a distant deadline and a high-impact opportunity closing tomorrow are not equally actionable right now. Urgency shall be scored and surfaced separately from potential impact, so a Member and a reviewer can each tell "this matters a great deal" apart from "this requires action soon." An eviction-prevention program closing tomorrow deserves different handling and presentation than a scholarship due in six months, even where both score similarly on impact.

## 7.4 Ranking Serves Fit, Not Just Quality

A high-scoring candidate that does not fit a Member's stated goals, geography, or circumstances is not a good recommendation for that Member. Ranking for a specific Member shall always apply deterministic eligibility filtering first (geography, category, explicit goals/interests, and any other necessary and authorized attribute) and shall only apply AI-assisted ranking to the resulting eligible set — never the reverse, and never as a substitute for eligibility filtering.

## 7.5 Every Recommendation Carries a Reason

A Member shall never receive an opportunity recommendation without a plain-language reason they can read and evaluate for themselves, matching the existing recommendation rationale convention already in place elsewhere in Aureus.

---

# 8. Review Standards

## 8.1 Human Review Is Mandatory, Not a Fallback

No discovered candidate may become Member-visible without an explicit act of approval by an authorized human reviewer. This is not a temporary V1 safeguard to be automated away later as confidence in the pipeline grows — it is a permanent property of the pipeline's design. Increasing AI capability narrows the *work* a reviewer must do; it does not remove the requirement that a human do it.

## 8.2 Approval Is the Review Gate

A candidate's approval by an authorized reviewer is itself the completion of the Opportunity domain's existing verification workflow for that item, not a step that precedes a second, separate review. The pipeline shall not introduce a redundant second approval gate for a candidate that has already been reviewed and approved — doing so would not add safety, only friction, and friction that does not add safety is waste.

## 8.3 Reviewer Authority

An authorized reviewer may approve, reject, edit, request a recheck, feature, or block the source of any candidate. Every one of these actions shall be recorded immutably: who acted, what action, when, and — for reject and block actions — why.

## 8.4 Rejection and Recheck Are Not Failures

A rejected candidate or a requested recheck is the pipeline working correctly, not a defect to be tuned away. The pipeline's learning loop (§9) may use rejection patterns to improve future scoring, but shall never treat "fewer rejections" as a goal in itself — that incentive would reward the pipeline for becoming harder to catch, not more accurate.

---

# 9. Learning Model

## 9.1 Learning Is Bounded and Transparent

Nightly learning jobs (freshness checks, link revalidation, outcome aggregation, source-quality adjustment, coverage-gap detection) shall operate on transparent, bounded, published rules. An AI system may propose a score or trust adjustment; a deterministic rule or a human, per §6.3, decides whether it takes effect.

## 9.2 Learning Serves Coverage, Not Just Accuracy

The learning loop exists as much to discover what the pipeline is *failing* to find (coverage gaps — real Member need with no suitable active supply) as to refine what it already finds well. A coverage gap is a signal to expand sourcing or seek human/organizational partnership, not a defect to be hidden.

## 9.3 Outcomes Are the Ultimate Signal

Member interaction and self-reported outcome events (shown, opened, saved, applied, completed, benefit received) are the most trustworthy signal this pipeline can learn from, more trustworthy than any AI-assessed score. Source-quality and ranking adjustments should, whenever there is enough outcome data to do so, be traceable back to real Member outcomes rather than resting on AI judgment alone.

## 9.4 The Founder Briefing Tells the Truth

The nightly Founder briefing shall report what actually happened — sources checked, candidates found, candidates awaiting review, expirations, duplicates, flags, coverage gaps, confirmed outcomes — not a summary curated to look favorable. A briefing that omits an uncomfortable number is a briefing that has already failed its purpose. It shall report against the outcomes defined in §5, not merely against pipeline activity.

---

# 10. AI Governance Within the Pipeline

## 10.1 One Path for Every AI Call

Every AI-assisted step in this pipeline (verification, scoring, structured extraction, ranking, learning-adjustment proposals) shall route through the existing AI orchestrator and `AiRequestsService.runCompletion()` path, exactly as every other AI capability in Aureus does. No pipeline component may call an AI provider directly. No pipeline component may bypass spend ceilings, audit logging, or the emergency stop.

## 10.2 The Pipeline Has Its Own Budget, Not a Borrowed One

Because this pipeline runs as a scheduled, non-Member-initiated workload, it shall operate under its own explicit, Founder-visible daily AI spend ceiling, distinct from any individual Member's quota, and still subject to the platform-wide global ceiling and emergency stop. It shall never be given an unlimited or unaccounted-for exemption from spend control.

## 10.3 External Content Is Data, Never Instruction

Content fetched from an external source shall always be treated as untrusted data to extract from, never as instructions to follow. Every prompt that includes externally-sourced content shall structurally separate that content from the model's actual instructions, and shall say so explicitly to the model. AI-assisted extraction shall use a narrow, purpose-built, typed tool definition wherever practical, so the model's task is to fill in typed fields, not to produce free-form text a caller must trust.

## 10.4 AI Output Is Verified, Not Trusted

Every value an AI system contributes to a candidate — an extracted field, a score, a rationale — shall be validated against expected shape, type, and constraint before it is stored or acted upon. A malformed or out-of-bounds AI response shall cause that field or candidate to be flagged for human attention, never silently accepted and never silently discarded in a way that hides the failure.

## 10.5 No New Autonomous Authority

Nothing in this pipeline may grant an AI system the ability to apply on a Member's behalf, publish without human approval, or take any action beyond what ENG-001 and the existing AI tool allow-list already permit. Where this pipeline needs a new AI tool (e.g. for structured extraction), that tool shall be scoped as narrowly as the task requires and shall never include the ability to take a real-world or Member-facing action by itself.

---

# 11. Resilience and Graceful Degradation

External sources disappear. AI providers go offline. Network calls time out. This pipeline shall treat these as expected operating conditions to design for, not exceptional failures to merely log and ignore.

## 11.1 Failures Never Silently Hide Opportunities

A failure in any one part of the pipeline — a source scan, an AI verification call, a scoring step — shall never cause an otherwise-valid, already-approved opportunity to silently disappear from what Members can see. A failure shall be visible in the pipeline's own audit trail and Founder briefing, never merely absorbed as a quietly lower discovery count.

## 11.2 Partial Capability Is Preferred Over No Capability

When a non-essential step fails — an AI verification call, a freshness recheck, a single source's scan — the pipeline shall continue operating on what it can still do rather than halting entirely. A candidate whose AI verification failed should be routed to human review with that fact clearly flagged, not discarded and not blocked from ever reaching a reviewer.

## 11.3 Members Keep Receiving Verified Opportunities

Whatever else in this pipeline is degraded or unavailable at a given moment, Members shall continue to see the opportunities that have already been reviewed and published. A discovery-side outage is never sufficient reason to withhold already-approved, already-trustworthy opportunities from the Members they were meant for.

---

# 12. Member-First Guardrails

## 12.1 Necessary Attributes Only

Discovery and matching shall use only the Member attributes reasonably necessary for the task at hand (geography, explicit stated goals/needs, employment/education context, age where eligibility requires it, accessibility or transportation preferences the Member has volunteered, and prior interactions/outcomes). Raw private profile fields shall never be exposed wholesale to a discovery or matching job merely because they exist.

## 12.2 Freedom of Choice Is Preserved

A Member remains free to accept, reject, postpone, save, or ignore any opportunity this pipeline surfaces, exactly as PC-009 §6 requires. This pipeline shall never automatically apply, enroll, or act on a Member's behalf.

## 12.3 The Pipeline Expands Choices, It Does Not Narrow Them

This pipeline exists to widen the set of meaningful options in front of a Member, never to narrow it to one predetermined "correct" path. Presentation, ranking, and rationale shall avoid creating the impression that only one opportunity is the right choice — multiple relevant, well-explained options serve a Member's own agency better than a single confident-sounding pick, even where the pipeline's own scoring is confident in a favorite.

## 12.4 Truthfulness Extends to Machine-Assisted Content

Where this pipeline's output touches a Member — a recommendation, a rationale, a published opportunity's description — it is held to the same truthfulness standard as any human-authored content under PC-009 §5: known risks, costs, limitations, eligibility requirements, and uncertainties shall be communicated whenever reasonably possible, not smoothed over for a more appealing presentation.

## 12.5 Personalization Never Becomes Profiling

Personalization under this pipeline (§7.4, §12.1) exists to serve the Member's own stated goals and circumstances. It shall never be extended to infer or act upon attributes the Member has not volunteered, nor to build a profile of the Member for any purpose beyond helping them find their next meaningful opportunity.

---

# 13. Security and Safety Requirements

The pipeline shall:

- Scan only enabled, approved sources — default deny for everything else.
- Sanitize and bound all fetched external content (size limits, timeouts, redirect limits).
- Never execute arbitrary code from a fetched source.
- Respect robots.txt, site access constraints, and terms of service.
- Never scrape credentials or bypass authentication to reach content.
- Never automatically apply on a Member's behalf, under any circumstance.
- Never publish a candidate without explicit human approval, under any circumstance.
- Enforce role-based access control on every administrative action this pipeline exposes.
- Record an immutable audit trail for every scan, every AI decision, and every human decision.

These are floor requirements, not aspirational goals. A feature that cannot meet all of them is not ready to ship, regardless of how valuable its discovery capability would otherwise be.

---

# 14. Engineering Discipline

This pipeline is an extension of the existing Opportunity domain, not a replacement for it or a second parallel system. Engineers shall:

- Publish discovered opportunities as real records in the existing Opportunity domain, not a shadow structure members never actually see.
- Extend the existing AI orchestrator, provider abstraction, spend controls, RBAC mechanism, and recommendation engine rather than building parallel versions of any of them.
- Deliver the pipeline in coherent, independently reviewable phases (foundation and source registry; candidate extraction and validation; review and publication; member matching and outcomes; the learning loop), each with its own tests, its own CI-green pull request, and its own record in the work-order history.
- Hold every phase to ENG-001 §7's Definition of Completion in full — business rules implemented, authorization enforced, validation present, tests passing, the build green, documentation current, and the result genuinely review-ready. Passing tests alone is never completion.
- Write tests that verify this Constitution's guarantees directly — mandatory human approval, default-deny scanning, spend-ceiling enforcement, RBAC, audit-trail completeness, graceful degradation, and resistance to adversarial source content — not merely that the code executes without error.
- Keep implementation detail (schemas, adapters, scheduling mechanics, API shapes) in architecture documents and work orders beneath this Constitution, so this document's principles can keep making sense long after any particular implementation has changed.

---

# 15. Amendment

This Constitution may be amended only through Founder approval. Any future specification, architecture document, or work order for the Opportunity Intelligence Pipeline shall conform to it, and shall conform to ENG-001, PC-009, PC-010, and ALC-001 above it.
