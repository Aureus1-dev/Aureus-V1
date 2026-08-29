# GUIDED-APPLICATION-001 — See → Guide external application assistance

Status: implementation candidate  
Parent execution ledger: GitHub Issue #95 §3  
Authority: Founder launch execution order in Issue #95. This work order does not authorize Prefill→Act, merge, deployment, or external production use.

## Outcome

Let a member move from a verified Opportunity in the Hall to a real third-party application and ask Aureus to **see one member-chosen screen frame and explain it field-by-field** without taking control of the browser, inventing personal facts, or storing screenshot images.

## Scope boundary

This is See → Guide only.

Allowed:
- preserve the selected VERIFIED + ACTIVE Opportunity and Hall conversation as durable session context;
- open the verified canonical application in another tab;
- record explicit member grant/revoke timestamps for screen analysis;
- capture a member-selected display with the browser Screen Capture API when available;
- accept a member-selected screenshot fallback when live display capture is unavailable;
- send one downscaled frame at a time through the existing audited AI request path;
- explain visible fields and identify the safest next member-controlled step.

Not allowed:
- browser/computer control;
- clicking, typing, scrolling, autofill, submission, accepting terms, or signing;
- invented or inferred member facts;
- persistent screenshots or extracted secret-field values;
- model-generated application URLs;
- reading a stale/replaced application destination without forcing a fresh session.

Prefill→Act remains Issue #95 §4 and requires its own Founder-governed implementation.

## Privacy and consent

- The database stores the guidance session, selected Opportunity/application URL snapshot, consent timestamps, and last-frame-analysis timestamp.
- The database does **not** have a screenshot/blob field for this feature.
- Frame image bytes exist only in the member's browser, the in-flight request, the current configured AI provider request, and transient application memory.
- Consent is explicit, revocable, and expires after 30 minutes.
- Every analysis request rechecks active consent.
- Browser screen capture is initiated only by a direct member action.
- Stopping the browser share attempts immediate server-side revocation; the 30-minute server expiry remains a fail-safe.

## Sensitive fields

The model is instructed never to transcribe, repeat, request, or choose values for:
- passwords, passcodes, and PINs;
- Social Security numbers;
- full bank/routing/account numbers;
- credit/debit card numbers and CVV/CVC/security codes;
- identity-document numbers;
- signatures;
- legal declarations, certifications, or attestations.

The server does not trust the model's sensitivity classification. Field labels matching those categories are deterministically overwritten to `MEMBER_CONTROL`, with fixed guidance telling the member to enter/review the value themselves.

Before every frame, the UI tells the member to hide already-filled sensitive values.

## Source and opportunity integrity

A guidance session may start only when:
- the Hall conversation belongs to the caller;
- the Opportunity is `VERIFIED + ACTIVE`;
- it is not deleted or past its deadline;
- the selected canonical application destination is HTTPS.

Before every frame the server rechecks the Opportunity state and deadline. If the canonical application destination changed after session start, analysis fails closed and the member must start a fresh guidance session.

## AI boundary

`AiCapability.APPLICATION_GUIDANCE` runs through the existing `AiRequestsService` choke point, preserving:
- platform/user/capability budget controls;
- provider audit rows;
- moderation;
- prompt-injection handling;
- provider fallback.

The internal provider contract is multimodal and provider-neutral:
- text parts;
- base64 image parts with a verified image MIME type.

Concrete providers translate only at the edge. The screenshot itself is explicitly described to the model as untrusted third-party page content.

Provider output is not rendered directly. The service requires JSON, rebuilds the response into a fixed server-owned shape, caps fields/lengths, redacts common numeric secret patterns, and fails closed to generic guidance on malformed output.

## Frame limits

The browser downscales a screen/screenshot before upload. The API accepts at most:
- encoded base64 length: 82,000 characters;
- decoded bytes: 60 KiB;
- JPEG, PNG, or WebP;
- image magic bytes must match the declared MIME type before any provider call.

The normal API JSON body limit is intentionally left unchanged.

## Automated evidence required

Before review:
- provider-neutral OpenAI image mapping test;
- provider-neutral Anthropic image mapping test;
- stub never echoes image bytes;
- multimodal moderation test;
- multimodal prompt-injection wrapper test;
- unverified Opportunity cannot start a session;
- no active consent blocks analysis;
- consent older than 30 minutes blocks analysis;
- changed application destination blocks analysis;
- image bytes reach the audited AI request but not persistence writes;
- deterministic MEMBER_CONTROL override for sensitive fields;
- malformed provider JSON fails closed;
- UI does not expose capture controls before consent;
- UI states no-storage and sensitive-field boundary;
- Opportunity action exposes guidance only by explicit member click;
- typecheck, lint, migration deploy, API/web tests, production build, seed sync, and Docker verification green at exact head.

## Physical mobile / real third-party acceptance

This item cannot be honestly certified by unit tests or a desktop CI runner. Before marking Issue #95 §3 fully accepted in production, test on the Founder's real mobile device against a currently verified third-party application:

1. Start in the Hall and obtain a server-verified Opportunity action.
2. Tap **Guide me through it**.
3. Confirm the same Hall conversation and selected Opportunity remain visible after opening the external application in another tab.
4. Before consent, confirm no screen/screenshot analysis control is usable.
5. Grant consent deliberately.
6. If the mobile browser offers live display capture, select the application screen and request one frame. If it does not, use **Share a screenshot instead**.
7. Confirm Aureus describes visible form fields without claiming to know the member's personal answer.
8. Reach at least one sensitive field and confirm Aureus says the member must enter/review it themselves and does not repeat an already-filled sensitive value.
9. Stop sharing/revoke consent and confirm a later frame is rejected until consent is granted again.
10. Return to the Hall and continue the same conversation.
11. Confirm no browser action, autofill, or final submission occurred.

Record device/browser, exact Opportunity/application, and pass/fail evidence in Issue #95.

## Merge and deployment gate

Constructor may implement and prepare exact-SHA evidence. Independent review is required before merge. Merge and deployment remain Founder-gated.
