# OR-001 — Responsibility Core

**Status:** Implementation candidate  
**Repository:** Aureus-V1  
**Base:** `2c545de9e25b3c740db0fec6183f6ef9efbf541b`  
**Branch:** `feat/or-001-responsibility-core`  
**Architecture:** PA-021 + PA-022  
**Reuse evidence:** `docs/product-first/OR-001-RESPONSIBILITY-CORE-REUSE-ANALYSIS.md`  
**Cross-context gate:** `docs/product-first/OR-CCT-001-COMPLETION-CASE-TRANSITION-GATE.md`

## 1. Objective

Implement the smallest durable Responsibility Core that proves Aureus can accept one bounded piece of personal work, preserve it beyond the chat transcript, expose when the human is needed, attach domain evidence, and reach completion only through deterministic server-owned policy.

This slice must **not** become a generalized workflow engine, cross-context memory system, autonomous action framework, life-profile database, Business sales engine, or learning system.

## 2. First proof

The first bounded Responsibility is an **Opportunity Decision**.

A currently authenticated member may explicitly ask Aureus to carry the decision of what to do with a current VERIFIED + ACTIVE Opportunity from one of their existing AI conversations.

The server creates:

- one `Responsibility`;
- one append-only `ACCEPTED` event;
- one append-only `COMMITMENT_RECORDED` event.

The success criterion is deliberately narrow:

> a concrete member decision about the opportunity is recorded in the existing `SavedOpportunity.trackingStatus` domain.

The Responsibility is **not** claiming that the member received a benefit, won a job, got approved, or completed an external application. It only claims that the accepted decision Responsibility was completed.

## 3. Responsibility shape

### Context

OR-001 creates **PERSONAL** Responsibilities only.

The schema may represent future context classes, but no OR-001 API may create a Business or shared-transaction Responsibility.

Personal scope requires:

- Principal = current authenticated User;
- no Organization principal;
- privacy = PERSONAL_PRIVATE;
- authority = GUIDANCE_ONLY.

### Kind

OR-001 supports only:

- `OPPORTUNITY_DECISION`

No free-form kind may imply authority.

### Status

The root supports the PA-021 status vocabulary:

- ACTIVE
- WAITING_ON_AUREUS
- WAITING_ON_USER
- WAITING_ON_THIRD_PARTY
- BLOCKED
- COMPLETED
- RESPONSIBLY_EXHAUSTED
- CANCELLED

OR-001 itself uses ACTIVE, WAITING_ON_USER, and COMPLETED.

### Provenance

The Responsibility records the origin AI conversation and Opportunity as provenance identifiers.

The service validates both records at acceptance time.

The provenance pointers are not cross-context transfer authority.

## 4. Acceptance flow

### Accept

`POST /responsibilities`

Request:

- `conversationId`
- `opportunityId`

Server must:

1. authenticate the member;
2. prove the conversation belongs to that member;
3. prove the Opportunity is current, VERIFIED, ACTIVE, undeleted, and not past deadline;
4. create exactly one PERSONAL / GUIDANCE_ONLY / PERSONAL_PRIVATE Responsibility;
5. create ACCEPTED + COMMITMENT_RECORDED events atomically;
6. never accept Principal/context/authority/privacy fields from the request.

Duplicate acceptance of the same active Opportunity Decision by the same Principal must return the existing Responsibility rather than create parallel commitments.

### Read

- `GET /responsibilities`
- `GET /responsibilities/:id`

Personal routes are self-scoped from the JWT. The caller never supplies a user id.

A Responsibility outside the caller's PERSONAL scope returns Not Found.

### Reconcile

`POST /responsibilities/:id/reconcile`

The server reads the member's existing `SavedOpportunity` record for the Responsibility's Opportunity.

If no saved record exists, or its status remains `SAVED`:

- transition to WAITING_ON_USER if needed;
- append USER_INPUT_REQUIRED once for that waiting state;
- do not mark complete.

If tracking status is one of:

- APPLYING
- APPLIED
- RECEIVED
- NOT_INTERESTED

then the server may treat the SavedOpportunity record as evidence that the **decision** criterion was met:

- append ACTION_EVIDENCED with source = SavedOpportunity and evidence level = REPORTED;
- transition to COMPLETED;
- append COMPLETED with the same evidence reference;
- stamp `completedAt`.

The event must preserve the exact tracking status observed so the UI cannot later overstate what was proven.

RECEIVED is still recorded as member-reported tracking state; OR-001 does not convert it into independent proof of an external award.

## 5. Evidence rules

OR-001 distinguishes:

- REPORTED
- VERIFIED

This first Opportunity Decision completion uses REPORTED evidence because `SavedOpportunity.trackingStatus` is member-managed.

A later domain may provide VERIFIED evidence.

A model message, tool success string, or unstructured claim is never completion evidence.

## 6. Event rules

Events are append-only through the application repository.

No OR-001 method updates or deletes an event.

Required event types in this slice:

- ACCEPTED
- COMMITMENT_RECORDED
- USER_INPUT_REQUIRED
- ACTION_EVIDENCED
- COMPLETED

The schema keeps the broader PA-021 event vocabulary available without requiring the first service to produce every type.

## 7. Persistence / retention

OR-001 does **not** invent a new independent TTL for personal Responsibilities.

A personal Responsibility follows the owning User lifecycle and is deleted when that User is deleted.

Terminal Responsibilities are not automatically purged in OR-001. This avoids silently abandoning accepted work while FD-002 production retention/forgetting policy remains a separate Founder decision.

No raw chain-of-thought, secret, password, bank/card data, SSN, or screenshot content may be stored in Responsibility/Event fields.

## 8. Deny paths

Tests must prove:

1. unauthenticated caller cannot use Responsibility endpoints;
2. user A cannot read user B's Responsibility;
3. user A cannot reconcile user B's Responsibility;
4. caller cannot choose context/Principal/authority/privacy through the request DTO;
5. another user's conversation cannot be used as origin;
6. unverified/inactive/deleted/expired Opportunity cannot be accepted;
7. Business/shared Responsibility rows are invisible to personal routes;
8. unverified/unstructured evidence cannot transition to COMPLETED;
9. SAVED/no saved state does not complete;
10. reconciliation is idempotent and does not duplicate completion evidence/events;
11. conversation changes do not delete the Responsibility;
12. cross-context transfer is not implemented.

## 9. Explicit non-goals

- no Business Responsibility creation API;
- no Completion Case transition;
- no browser/computer use;
- no external submission;
- no generic executable workflow;
- no task marketplace;
- no model-selected authority;
- no personal memory/life-moment storage;
- no Outcome Graph/Value Ledger UI;
- no Economic Stewardship;
- no Excellence Transfer;
- no learning/policy mutation;
- no generic evidence ingestion API.

## 10. Done

OR-001 is ready for independent review only when:

- migration applies cleanly;
- generated Prisma types compile;
- API unit/integration/e2e tests cover the allow and deny paths above;
- existing tests stay green;
- Docker verification passes;
- exact candidate SHA is frozen;
- constructor does not self-certify;
- a fresh Independent Critic reviews the exact SHA;
- Founder separately decides merge.

