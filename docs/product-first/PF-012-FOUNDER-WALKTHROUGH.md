# PF-012 — Founder Walkthrough and First Client Gate

## Purpose

PF-012 is the final release gate for the founding Kitchen & Bath web pilot. Automated CI proves code and images; it does not prove that a real person can complete the product journey on the deployed site. The Founder must therefore complete the same walkthrough on both mobile and desktop against one exact deployed V1 commit.

No first external business may begin until the automated PF-012 PR gate is green **and** the Founder walkthrough receipt passes against that same deployed commit.

## Before the walkthrough

Record these values before touching the product:

- exact deployed V1 SHA;
- exact Foundry SHA;
- exact Library SHA;
- deployed web origin;
- deployed API origin;
- date/time and device/browser;
- tenant/business used for the drill.

Confirm `/health/ready` succeeds and the web root loads. If deployment changes during the walkthrough, stop: the evidence no longer describes one deployment.

## Run twice: MOBILE and DESKTOP

For every numbered step record `PASS` or `FAIL`, a timestamp, and a short evidence note. A screenshot/video reference is useful but does not replace the written observation.

### 1. Business onboarding

Create or use the founding test business. Confirm tenant identity, membership, public profile, service area, business hours, contact routes, escalation target, and publication state are understandable and tenant-scoped.

Pass only if a second tenant cannot be reached by changing an organization identifier.

### 2. Knowledge setup and approval

Install/use the Kitchen & Bath pack, edit business-specific claims, move records through review, and approve only reviewed material.

Pass only if draft/rejected/stale material cannot ground the public Ward.

### 3. Public Ward question

Open the public tenant Ward without an Aureus account and ask a realistic remodeler question answerable by approved knowledge.

Pass only if the answer is grounded and its displayed sources belong to the correct tenant.

### 4. Clarification

Ask a follow-up that depends on the prior turn. Confirm the Ward remains in the same conversation and does not invent facts when the approved packet is insufficient.

### 5. Consented lead

Create a human handoff using the minimum project/contact fields. Read the exact consent copy before approving it.

Pass only if the handoff is created after affirmative consent, confirmation is visible, and retention/deletion information is understandable.

### 6. Business notification

Confirm the assigned business operator receives the expected notification evidence. Do not mark this PASS merely because a notification row exists if the configured external delivery path is expected to send a real message.

### 7. Human acceptance and handoff

Open the Business console, find the exact lead, inspect its Ward conversation/sources, assign/accept it, and advance only through allowed lead states.

Pass only if another tenant cannot read or mutate the lead.

### 8. Outcome recording

Advance the lead through the real follow-up state and record a CLOSED or LOST outcome with the required reason where applicable.

Confirm the pipeline reflects the new state.

### 9. Correction and deletion

Propose a correction to an approved knowledge record. Confirm the old approved version remains live until the replacement is separately reviewed and approved. Then exercise the visitor handoff deletion path and confirm attributed retained data is no longer available.

### 10. Failure mode and provider-outage drill

Exercise at least these failures without changing the deployed application code:

- unavailable/failed AI provider path;
- unknown business question with no grounded approved answer;
- invalid or cross-tenant identifier attempt;
- replay/expired private continuation or Ward token where applicable.

Pass only if the product fails closed, makes no false delivery/booking/quote claim, and still presents an honest human-contact route when configured.

## Accessibility observations

During both device runs, complete the PF-010 manual accessibility review: keyboard/focus on desktop; zoom/reflow and touch targets on mobile; labels, errors, source controls, handoff consent, and status changes on both. Record defects rather than making an unsupported WCAG-conformance claim.

## Phone/SMS status

PF-011 repository continuity may be present while a live telephony provider is not configured. In that state record `PHONE_SMS = NOT_CONFIGURED` and do not advertise phone/SMS functionality. This does not convert the web walkthrough into a failure.

If phone/SMS is to be offered, separately require a real inbound-call → disclosure → SMS continuation → same Ward conversation → consented handoff drill using the actual provider/number before marking it live.

## Release decision

The receipt may be signed `PASS` only when:

1. all ten steps pass on MOBILE;
2. all ten steps pass on DESKTOP;
3. both runs name the same deployed V1 SHA;
4. required PF-010 environment/operability evidence is present;
5. no unresolved severity-1 trust, privacy, tenant-isolation, consent, or data-loss defect exists.

Any application-code deployment after the walkthrough invalidates the receipt and requires a fresh walkthrough against the new SHA.
