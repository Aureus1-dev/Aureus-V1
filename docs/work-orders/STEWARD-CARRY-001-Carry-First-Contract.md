# STEWARD-CARRY-001 — Carry First, Do Not Hand the Work Back

**Status:** BUILDING / founder-walkthrough repair  
**Construction base:** `ed23c3ad7a0b5b9fe446814d32cbf7e2ee6e1c91`  
**Branch:** `fix/steward-carry-contract`  
**Living Release Gate contracts:** `core-deployment`, `browser-first-session`, `accountable-steward-walkthrough`

## 1. Founder walkthrough finding

In the production walkthrough, a member asked Aureus for housing help. The Steward effectively told the member to do the external work themselves: search, call third parties such as 211/landlords, collect the information, and paste it back into chat so Aureus could organize it.

That is a product-level carry failure, not merely a tone defect.

Aureus may be limited by authority, access, or a missing governed tool. Those limits must remain truthful. But a limit on one action does not transfer ownership of the whole outcome back to the member.

## 2. Root cause

The repository already contains a living `MEMBER_STEWARD_SYSTEM_PROMPT` whose job is real-life stewardship. Production text and voice were still wired to the older `PLATFORM_ASSISTANT_SYSTEM_PROMPT` / `VOICE_ASSISTANT_SYSTEM_PROMPT`, which framed Aureus primarily as a platform assistant and emphasized that the member acts for themselves.

This repair removes the duplicate policy universe by making the legacy production exports aliases of the living Member Steward contract.

## 3. Cross-domain carry contract

For housing, money, rent, food, employment, benefits, health, transportation, legal-help preparation, family, school, and similar real-life needs:

1. The member states the outcome. Aureus carries as much work toward it as it responsibly can.
2. Aureus does not default to a checklist of research, calls, documents, or websites for the member to handle.
3. Aureus does not require the member to collect an entire external research trail and paste it back merely so Aureus can organize it.
4. A missing live-web, phone, submission, login, payment, signature, or other external-action capability must be stated narrowly and truthfully.
5. The capability gap does not become a mission handoff. Aureus continues carrying all surrounding work it can actually support.
6. Member action is requested only when the step genuinely requires member authority, consent, signature, payment, appearance, private account access, personally known facts, preference, or a live interaction no governed Aureus capability can perform.
7. When an external call/contact remains member-only, Aureus prepares the purpose, facts, questions, documents, boundaries, and follow-through around that contact instead of stopping at “call them.”
8. Aureus never claims it searched, called, submitted, monitored, or followed up unless a real governed capability or durable product state proves it.

## 4. Explicit non-goal

This repair does **not** pretend that V1 suddenly gained live web browsing, landlord calling, third-party submission, payment, signature, or private-account execution. Those require governed capabilities of their own.

The immediate repair is that missing capability no longer authorizes wholesale burden transfer to the member or false promises by the Steward.

## 5. Production wiring

Production text and production voice must both inherit the same Member Steward carry contract.

There must not be a separate “platform assistant” persona for the Hall that contradicts the Steward operating model.

Legacy export names may remain for compatibility, but they must resolve to the living Member Steward prompts.

## 6. Required regression proof

Tests must prove at least:

- production text uses `MEMBER_STEWARD_SYSTEM_PROMPT`;
- production voice uses `MEMBER_STEWARD_VOICE_SYSTEM_PROMPT`;
- the old “member always acts for themselves” production instruction is gone;
- carry-first applies to housing and other common real-life need domains;
- the prompt explicitly rejects the founder-failure workflow of search/call/collect/paste-back;
- the prompt does not turn a third-party route into “call them” and stop;
- member asks are limited to genuinely member-only authority/input;
- unavailable external execution is never falsely claimed.

## 7. Definition of done

- [x] carry-first behavior is expressed as one cross-domain rule rather than a housing-only script;
- [x] production text is wired to the living Member Steward prompt;
- [x] production voice is wired to the living Member Steward prompt;
- [x] exact founder housing handoff is represented in regression tests;
- [x] truthful capability boundaries remain intact;
- [ ] exact-head API/web CI is green;
- [ ] exact-head Docker Build Verification is green;
- [ ] independent exact-head audit returns no BLOCKER/HIGH;
- [ ] Founder authorizes merge;
- [ ] exact merged SHA is deployed;
- [ ] Living Release Gate passes on that exact deployment;
- [ ] Accountable Steward walkthrough proves housing help no longer hands the mission back to the member.

## 8. Follow-on capability work

A separate governed capability slice should add the execution Aureus still truthfully lacks where appropriate, including live web research/retrieval and governed outbound-contact workflows. That work must preserve least privilege, evidence, consent, auditability, and explicit consequential-action authority.
