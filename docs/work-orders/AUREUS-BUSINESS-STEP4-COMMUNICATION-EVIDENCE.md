# Aureus Business Step 4 — Communication & Evidence

**Status:** Frozen implementation contract  
**Repository:** Aureus-V1  
**Branch:** `chatgpt/aureus-business-step4-communication-evidence`  
**Parent candidate:** Step 3 `46059c5e9ef84a2e15aadd48d2c0e01b65dedad0`  
**Depends on:** Step 1 Business Identity & Boundary + Step 2 Authority, Consent & Trust + Step 3 Responsibilities & Promises

## 1. Single job

Make Business Responsibility state and evidence understandable and reliably communicated to the correct business people without creating a second notification system, inbox, CRM, evidence database, or chat identity.

The proof is:

`Responsibility state/evidence changes → canonical Responsibility event remains source of truth → correct tenant members are notified when attention is actually required → evidence can be inspected as a truthful receipt → notification/delivery never becomes completion evidence by itself`

Step 4 is the bridge between durable work and the Step 5 Owner Experience.

## 2. Reuse rules

Reuse the existing Communication system:

- `NotificationsService.notify()` is the only notification delivery integration.
- Existing in-app/email preference and delivery tracking semantics remain authoritative.
- `ResponsibilityEvent` remains the evidence ledger for Responsibility work.
- No new message, notification, task, audit, or generic evidence table is allowed unless repository evidence proves the existing primitives cannot carry the required semantics.

A notification is a communication about work. It is never proof that the work itself completed.

## 3. Stable Step 4 event vocabulary

Step 4 may emit only these Responsibility communication types:

- `business.responsibility.accepted`
- `business.responsibility.needs_you`
- `business.responsibility.resumed`
- `business.responsibility.completed_reported`
- `business.responsibility.cancelled`

Every notification data payload is bounded to identifiers and presentation-safe state, such as:

- organization id
- responsibility id
- responsibility status
- evidence level when present

Do not copy raw transcripts, files, credentials, secrets, private conversation contents, model reasoning, or arbitrary tool payloads into notifications.

## 4. Attention routing

Communication must follow current Step 1 membership and role state at send time.

- `needs_you`: notify current OWNER / ADMIN / MANAGER. This is the primary attention event.
- `accepted`: notify current OWNER / ADMIN / MANAGER only when the accepting actor is not already one of those recipients; avoid self-noise and duplicate fan-out.
- `resumed`: no mandatory fan-out; the state is visible through the Responsibility itself. Emit only when needed to close an existing needs-you communication loop.
- `completed_reported`: notify current OWNER / ADMIN / MANAGER except the attesting actor.
- `cancelled`: notify current OWNER / ADMIN / MANAGER except the cancelling actor.

OPERATOR may accept and pause/resume work but does not receive organization-wide management notifications by default. VIEWER / MEMBER never receive management notifications merely because they belong to the tenant.

Cross-tenant notification is a blocker.

## 5. Delivery truth

Reuse Communication's existing truth model:

- in-app row persisted → may be `DELIVERED`;
- email send accepted by the email provider → may be `SENT`;
- Step 4 must not label email as `DELIVERED` without an actual delivery confirmation mechanism;
- notification failure must not rewrite or roll back the underlying Responsibility event;
- a retried notification must be idempotent by deterministic `dedupeKey`.

The Responsibility transition is the business truth. Notification delivery is secondary communication truth.

## 6. Evidence receipt

Add a tenant-scoped, read-only evidence projection for a Business Responsibility:

`GET /organizations/:organizationId/responsibilities/:id/evidence`

The response is derived from the canonical Responsibility + ordered ResponsibilityEvents and includes only inspectable facts:

- responsibility id / organization id
- objective
- promise and completion criterion
- current status
- due/completed timestamps
- ordered lifecycle entries with event type, actor class, actor user id when allowed, timestamp
- source-system / source-record reference / source-state when present
- `REPORTED` vs `VERIFIED` evidence level exactly as stored
- a plain evidence summary that never upgrades `REPORTED` to `VERIFIED`

This endpoint is not a second source of truth and stores nothing new.

Any current organization member may inspect the tenant's Business Responsibility receipt, matching Step 3 read access. Cross-tenant requests return Not Found.

## 7. Evidence rules

- `COMMITMENT_RECORDED` proves Aureus recorded a promise; it does not prove the promised outcome happened.
- `ACTION_EVIDENCED` with `REPORTED` proves a report/attestation was recorded; it is not independent verification.
- `VERIFIED` may appear only when an existing canonical event already contains VERIFIED evidence from a real verification source.
- Notification existence, read state, email sent state, AI output, tool success text, and model judgment cannot upgrade evidence.
- Step 4 must preserve uncertainty rather than smoothing it away in copy.

## 8. Step 5 interface contract

Step 5 Owner Experience may rely on these stable interfaces from Steps 1–4:

- organization identity / current membership roles from Step 1;
- Trust & Permissions state from Step 2;
- Business Responsibility list/detail/lifecycle from Step 3;
- Business Responsibility evidence receipt from Step 4;
- existing user notifications for needs-you attention.

Step 5 must not read database tables directly from the web app or invent parallel owner state.

## 9. Required tests

Step 4 is not complete until tests prove:

1. needs-you produces an idempotent notification to the correct current management recipients;
2. cross-tenant members receive nothing and cannot inspect evidence;
3. VIEWER / MEMBER / OPERATOR do not receive management fan-out by default;
4. the acting manager is not spammed by their own completion/cancellation event;
5. notification retries do not duplicate rows;
6. notification failure does not roll back a valid Responsibility state/event transition;
7. notification records contain no raw secrets/transcripts/files/tool payloads;
8. evidence receipt is derived from canonical Responsibility events and creates no new evidence persistence;
9. a REPORTED completion remains visibly REPORTED everywhere;
10. notification/delivery state cannot convert REPORTED evidence to VERIFIED;
11. evidence receipt enforces Step 1 tenant boundary and Step 3 read rules;
12. Personal Responsibility behavior remains unchanged;
13. Step 2 authority grants/suspensions remain unchanged;
14. existing Communication preferences/delivery tests remain green;
15. full typecheck, lint, migrations, API/web tests, production build, seed, and Docker verification pass.

## 10. Explicit non-goals

- no Step 5 Owner Experience UI;
- no Step 6 Employee Experience;
- no customer journey/delivery workflow;
- no Slack/SMS/Twilio implementation unless already present and required by existing Communication semantics;
- no external-system execution;
- no AI-generated completion verification;
- no new CRM/inbox/workflow engine;
- no broad redesign of the existing Communication module.

## 11. Done

Step 4 is done only when its exact PR head passes full CI + Docker verification and receives an independent exact-head review with no blocking/high finding. The Step 4 constructor may repair findings but cannot certify its own repair.

Step 5 may be developed concurrently as a stacked branch/PR against this Step 4 branch, but Step 5 may not merge before the final Step 4 merge. After Step 4 merges, Step 5 must be rebased/retargeted onto final `main`, rerun all gates, and receive a fresh exact-head review.
