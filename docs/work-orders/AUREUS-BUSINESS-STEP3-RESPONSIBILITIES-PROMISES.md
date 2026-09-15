# Aureus Business Step 3 — Responsibilities & Promises

**Status:** Implementation candidate  
**Repository:** Aureus-V1  
**Base:** `6add81bf283bcea6032a951f6db59acc4a254630`  
**Branch:** `chatgpt/aureus-business-step3-responsibilities-promises`  
**Depends on:** Step 1 Business Identity & Boundary + Step 2 Authority, Consent & Trust + existing OR-001/OR-002 Responsibility Core

## 1. Single job

Make accepted Business work durable and truthful without creating another CRM, task engine, or authority system.

The vertical proof is:

`business member → bounded Business Responsibility → Aureus promise → current state → needs-you pause/resume → reported completion evidence OR cancellation → durable terminal state`

A Responsibility is the durable work contract. A promise is the human-readable commitment Aureus makes inside that contract. Step 3 does not invent a second promise table because the existing Responsibility root already carries objective, success criteria, status, policy envelopes, and append-only commitment/evidence events.

## 2. Business Responsibility shape

Step 3 adds one kind:

- `BUSINESS_PROMISE`

Every Step 3 Responsibility is server-owned as:

- context: `BUSINESS_TENANT`
- principal: exactly one `Organization`
- privacy: `BUSINESS_PRIVATE`
- authority: `GUIDANCE_ONLY`
- authority policy: `business-responsibility-guidance-v1`
- privacy policy: `business-private-v1`

The request may provide only the bounded work content: objective, promise, success criterion, idempotency key, and optional due date. It may never choose principal, context, authority, privacy, completion state, or evidence level.

## 3. Promise semantics

The promise is stored inside the Responsibility's structured `successCriteria` contract and is also represented by the existing append-only `COMMITMENT_RECORDED` event.

The minimum server-owned contract is:

```json
{
  "type": "BUSINESS_PROMISE_REPORTED_COMPLETION",
  "promise": "...",
  "criterion": "...",
  "requestKey": "uuid",
  "completionEvidence": "CURRENT_MANAGER_ATTESTATION"
}
```

This is not a hidden workflow or model reasoning payload. It is the exact plain-language contract a person should be able to inspect later and compare against what Aureus actually did.

## 4. Roles

All current organization members may read their tenant's Business Responsibilities.

Mutation authority is narrower:

- OWNER / ADMIN / MANAGER / OPERATOR: create, mark needs-you, resume.
- OWNER / ADMIN / MANAGER: confirm reported completion or cancel.
- VIEWER / MEMBER: read only.

Every authorization decision is derived from current `OrganizationMember` state at request time. No tenant id, role, or ownership claim from the request body is trusted.

## 5. State transitions

Step 3 uses only these transitions:

- create → `ACTIVE`
- `ACTIVE` → `WAITING_ON_USER` through needs-you
- `WAITING_ON_USER` → `ACTIVE` through resume
- `ACTIVE | WAITING_ON_USER` → `COMPLETED` through manager completion attestation
- non-terminal → `CANCELLED` through manager cancellation

Terminal states are idempotent. A terminal Responsibility cannot be silently reopened.

`WAITING_ON_AUREUS`, `WAITING_ON_THIRD_PARTY`, `BLOCKED`, and `RESPONSIBLY_EXHAUSTED` remain part of the canonical vocabulary but are intentionally not manufactured by this slice.

## 6. Evidence truth

Completion is deliberately **REPORTED**, not independently verified, in Step 3.

A current OWNER / ADMIN / MANAGER may attest that the declared success criterion has been met. The server then writes:

- `ACTION_EVIDENCED`
- `COMPLETED`

with:

- source system: `AUREUS_BUSINESS`
- source record type: `OrganizationMemberAttestation`
- source record id: the attesting caller's user id
- source state: `MANAGER_CONFIRMED`
- evidence level: `REPORTED`

The product must never label this as independently verified. Step 4 Communication & Evidence may add stronger evidence sources; Step 3 does not pretend they already exist.

A model message, generated summary, tool success string, or unstructured claim cannot complete a Business Responsibility.

## 7. Authority boundary

Creating or tracking a Responsibility does **not** grant Aureus external action authority.

Step 2 remains the only runtime authority source. Step 3 does not create grants, bypass a denial, restore a suspended capability, or infer permission from a promise. Any later executor must still pass the Step 2 authority gateway immediately before a consequential action.

## 8. API

Tenant-scoped routes:

- `POST /organizations/:organizationId/responsibilities`
- `GET /organizations/:organizationId/responsibilities`
- `GET /organizations/:organizationId/responsibilities/:id`
- `POST /organizations/:organizationId/responsibilities/:id/needs-you`
- `POST /organizations/:organizationId/responsibilities/:id/resume`
- `POST /organizations/:organizationId/responsibilities/:id/complete`
- `POST /organizations/:organizationId/responsibilities/:id/cancel`

Cross-tenant records return Not Found rather than leaking existence.

Creation is idempotent by `(organizationId, requestKey)`. The service serializes concurrent requests for the same key and returns the already accepted open or terminal Responsibility rather than making duplicate promises.

## 9. Sensitive-data rule

Objective, promise, criterion, and request key are bounded metadata only. Passwords, API keys, bearer tokens, private keys, or similar secret material are rejected before persistence. Raw transcripts and raw files are never copied into the Responsibility ledger.

## 10. Explicit non-goals

- no Step 4 communication/evidence transport work;
- no Owner Experience dashboard;
- no Employee Experience dashboard;
- no Customer Journey/Ward redesign;
- no Customer Job Room/delivery workflow;
- no external-system execution;
- no autonomous quote, booking, contract, deposit, payment, signature, or terms acceptance;
- no Business → Personal or Personal → Business data transfer;
- no second CRM/workflow/task system;
- no new model-selected authority;
- no Foundry dependency.

## 11. Required tests

The slice is not complete until tests prove:

1. unauthenticated access is rejected;
2. a member can read only their own tenant's Business Responsibilities;
3. cross-tenant reads and mutations return Not Found;
4. VIEWER/MEMBER cannot mutate;
5. operator can create / needs-you / resume but cannot complete/cancel;
6. owner/admin/manager can create and confirm completion/cancel;
7. request body cannot choose context/principal/authority/privacy/status/evidence;
8. creation is idempotent for the same request key, including concurrent calls;
9. ACCEPTED + COMMITMENT_RECORDED are atomic and append-only;
10. needs-you and resume are idempotent and event-correct;
11. completion is REPORTED and never overclaims VERIFIED evidence;
12. terminal completion/cancellation cannot be silently reopened;
13. secret-like metadata is rejected before persistence;
14. Personal Responsibility routes remain Personal-only;
15. Step 2 grants/suspensions are unchanged by every Step 3 operation;
16. all existing tests, migrations, production build, seed, and Docker verification remain green.

## 12. Done

Step 3 is done only when the exact PR head passes full CI and Docker verification and a fresh independent critic reviews that exact head with no blocking/high finding. The constructor may repair findings but may not self-certify its repair. Do not begin Step 4 in this PR.
