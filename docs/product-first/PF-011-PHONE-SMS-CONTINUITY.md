# PF-011 — Phone, Missed-Call, SMS, and Callback Continuity

## Outcome

PF-011 adds the repository-side continuity contract for a business phone channel without claiming that Aureus has provisioned a carrier, phone number, SMS sender, or call-recording program.

The phone channel is an adapter into the existing tenant Ward and PF-007/PF-008 handoff pipeline. It is not a second CRM or conversation store.

## One tenant phone identity

A production telephony provider must map one provisioned phone identity to exactly one published business Ward slug. That provider mapping is an environment/deployment responsibility and is not fabricated in source control.

The normalized provider adapter calls:

`POST /public/wards/:slug/telephony/sessions`

with `x-telephony-webhook-secret` after the provider has authenticated the inbound webhook under its own signature rules. This endpoint creates the same `WardConversation` used by the web Ward and returns a short-lived SMS continuation URL.

## Disclosure and consent

Every phone experience must begin with an equivalent plain disclosure:

> This is Aureus assisting the business. It is not a human.

The repository does not enable call recording. `recording.enabled` is always false in PF-011. Recording may be added only when a later provider-specific integration proves its jurisdictional configuration, storage/retention behavior, and affirmative recording consent.

A missed call alone is not permission to retain the caller's phone number as a lead. The provider may send the private continuation link through a configured transactional SMS path only when that messaging path is lawful/configured. The actual callback queue remains the existing PF-007 consented lead pipeline: the visitor opens the Ward, chooses a preferred contact method, sees the exact consent copy, and affirmatively submits the handoff. Business staff then manage that lead in the PF-008 inbox/pipeline.

## Phone → web continuity

The telephony session endpoint creates a standard Ward conversation and returns an opaque signed continuation token embedded in a web URL.

The token contains no plaintext Ward bearer secret. It is HMAC-signed, tenant/slug-scoped, conversation-scoped, and expires after 15 minutes. It also binds to a prefix of the currently stored bearer hash.

When the visitor opens the link, the web application redeems the token through:

`POST /public/wards/:slug/telephony/continuations/redeem`

Successful redemption rotates the Ward bearer secret and writes the new plaintext bearer only to the visitor's browser session storage. Because the signed token is bound to the prior hash, replay after rotation fails closed.

The continuation token is removed from the browser address bar after redemption.

## After-hours / missed-call behavior

The provider-specific adapter should use the tenant's already configured business-hours and contact-route data to decide which provider experience to present. PF-011 does not invent live availability.

Recommended normalized flow:

1. disclose that the caller is interacting with Aureus, not a human;
2. do not claim a person is available or that a callback is scheduled;
3. create the tenant Ward continuity session;
4. offer/send the private web continuation under the provider's configured SMS rules;
5. on the web, let the visitor continue the same Ward conversation;
6. create a callback/handoff only after PF-007 affirmative consent;
7. staff receive and work the request through the existing PF-008 pipeline.

## Handoff to the business sales team

There is no autonomous sales close. Once the visitor submits the existing handoff, PF-007 assignment and notification route the lead to an eligible tenant operator. PF-008 provides the owner, state transitions, next action, conversation, and grounded-source view.

## Provider boundary / deployment blocker

Repository completion does not provision a real phone identity. Before live phone use, an operator must supply and verify:

- telephony provider account;
- provisioned business phone number or sender identity;
- provider webhook signature verification in the provider-specific edge/adapter;
- `TELEPHONY_WEBHOOK_SECRET` (32+ random characters) shared only between that adapter and Aureus;
- `TELEPHONY_CONTINUATION_SECRET` (32+ random characters; recommended separate from JWT secret);
- production `FRONTEND_URL` so generated links point at the deployed Ward;
- provider-side SMS authorization/compliance settings;
- a real inbound-call → SMS → web → consented handoff drill.

Until those external items exist, PF-011 is repository-ready but telephony is intentionally fail-closed and must not be advertised as active.
