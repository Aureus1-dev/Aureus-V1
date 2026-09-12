# OR-004 — People Need → Responsibility → Resolution Plan

## Purpose

Turn an ordinary member-stated life need into one durable Personal Responsibility that Aureus can carry across conversations, routes, and human/AI handoffs without creating a second CRM, generic case-management system, or duplicate domain database.

Examples:
- “My electricity is getting shut off Friday.”
- “I’m behind on rent.”
- “I lost my job and need income.”
- “I need childcare so I can get back to work.”

The product promise is not “we found resources.” The promise is: once Aureus explicitly accepts the work, it preserves the Responsibility, determines a safe next route, carries as much as it responsibly can, asks the member only for necessary participation, records evidence truthfully, and continues after a failed/denied route when an authorized alternative exists.

## Base

Exact starting main: `e9cc3672269d37227f9dc35f509157f97460538f`

This is the post-merge main containing:
- OR-001 Responsibility Core;
- OR-002 People help-to-completion;
- OR-003 Kitchen & Bath Ready Project.

## Core product rule

**One need → one accepted Responsibility → one evolving resolution plan.**

Do not create separate user-visible cases for each resource/application attempted under the same underlying need.

A route is not the Responsibility.

Example:
- Responsibility: `Keep household electricity on / restore stable electric service.`
- Route 1: utility hardship program.
- Route 2: LIHEAP crisis assistance.
- Route 3: local emergency assistance.

If Route 1 fails, the Responsibility remains open. Responsible Continuation evaluates Route 2 under its own authority/policy boundary.

## First proof

`member states urgent utility shutoff need → Aureus clarifies only what is necessary → member explicitly accepts help → durable PERSONAL Responsibility → bounded Resolution Plan → current next action visible in Hall → route can become WAITING_ON_USER / BLOCKED / FAILED without deleting Responsibility → authorized alternative route may be activated → evidence is attached by reference → Responsibility closes only on truthful terminal evidence or RESPONSIBLY_EXHAUSTED`

## Reuse — mandatory

Reuse before adding anything new:
- `Responsibility` / `ResponsibilityEvent` from OR-001;
- OR-002 status transitions and Hall progress treatment;
- Conversations ownership/provenance;
- Goal / Journey / Milestone / Task only where they already correctly represent member goals — do not duplicate them as a case system;
- Opportunity Engine when a verified resource/opportunity is relevant;
- existing consent and authority infrastructure;
- existing Context Firewall / Completion Case rules;
- existing AI provider choke points and audit controls;
- existing Hall conversation UI.

## What OR-004 adds

### 1. Personal need intake contract

Introduce a narrow server-owned intake shape for a member-stated need. It may contain only information required to form the Responsibility and first plan.

Suggested contract:

```ts
export type PersonalNeedCategory =
  | 'HOUSING'
  | 'UTILITIES'
  | 'FOOD'
  | 'INCOME'
  | 'EMPLOYMENT'
  | 'CHILDCARE'
  | 'TRANSPORTATION'
  | 'BENEFITS'
  | 'HEALTH_ACCESS'
  | 'EDUCATION'
  | 'FINANCIAL_STABILITY'
  | 'OTHER';

export interface AcceptPersonalNeedInput {
  conversationId: string;
  category: PersonalNeedCategory;
  memberStatement: string;
  objective: string;
  urgency?: 'NORMAL' | 'TIME_SENSITIVE' | 'URGENT';
  dueAt?: string;
}
```

Do not store inferred diagnosis, trust score, vulnerability score, propensity score, or hidden classification.

### 2. One new Responsibility kind

Prefer one narrow new kind:

```prisma
enum ResponsibilityKind {
  OPPORTUNITY_DECISION
  OPPORTUNITY_APPLICATION_GUIDANCE
  PERSONAL_NEED_RESOLUTION
}
```

Do not add one enum per life domain in OR-004.

`PERSONAL_NEED_RESOLUTION` is the durable outcome container. Domain-specific work remains in the appropriate existing/future domain services.

### 3. Resolution Plan — thin orchestration, not a second CRM

Add the smallest structure necessary to represent current routes beneath a Responsibility.

Recommended shape:

```ts
export type ResolutionRouteStatus =
  | 'PROPOSED'
  | 'ACTIVE'
  | 'WAITING_ON_USER'
  | 'WAITING_ON_EXTERNAL'
  | 'BLOCKED'
  | 'FAILED'
  | 'SUCCEEDED'
  | 'NOT_APPLICABLE';

export type ResolutionRouteType =
  | 'EXISTING_AUREUS_CAPABILITY'
  | 'VERIFIED_OPPORTUNITY'
  | 'EXTERNAL_INSTITUTION'
  | 'HUMAN_STEWARD'
  | 'MEMBER_ACTION';
```

If persistence is required, persist only orchestration facts:
- responsibilityId;
- route type;
- bounded label/purpose;
- status;
- authority/policy reference;
- source-domain reference IDs;
- timestamps;
- evidence references.

Do **not** copy raw application payloads, institution records, documents, transcripts, or source-domain facts into the plan.

### 4. Deterministic lifecycle

Required states use the existing Responsibility state machine where possible.

Expected behavior:

- accept need → Responsibility `ACTIVE`;
- no safe route can proceed without member input → `WAITING_ON_USER`;
- external system pending does not falsely complete the Responsibility;
- route failure does not automatically fail the Responsibility;
- if another authorized route exists → keep Responsibility open and continue;
- complete only with evidence satisfying success criteria;
- use `RESPONSIBLY_EXHAUSTED` only when all currently authorized/reasonable routes are exhausted and the system can explain why.

### 5. Success criteria

Success criteria must be specific to the accepted objective, not “application submitted.”

Examples:

Utility shutoff:
```json
{
  "type": "UTILITY_SERVICE_STABILIZED",
  "acceptableEvidence": [
    "provider-confirmed hold",
    "provider-confirmed payment arrangement",
    "provider-confirmed restored/continued service",
    "member-reported service continuity when no stronger evidence is available"
  ]
}
```

Employment:
```json
{
  "type": "INCOME_PATH_ESTABLISHED",
  "acceptableEvidence": [
    "verified offer",
    "verified start",
    "member-reported start pending stronger evidence"
  ]
}
```

The service must preserve evidence-level truth. `REPORTED` must never render as verified by a third party.

### 6. Responsible Continuation

Implement the first reusable continuation policy.

Pseudo-code:

```ts
async function continueResponsibility(responsibilityId: string) {
  const responsibility = await loadOwnedResponsibility(responsibilityId);
  if (responsibility.isTerminal()) return responsibility;

  const currentRoute = await plan.currentRoute();

  if (currentRoute?.canProceed()) {
    return executeOrPresentNextAuthorizedStep(currentRoute);
  }

  if (currentRoute?.failedOrDenied()) {
    await recordRouteOutcomeByReference(currentRoute);
  }

  const alternatives = await routeResolver.findAuthorizedAlternatives({
    responsibility,
    exclude: plan.exhaustedRoutes,
  });

  const next = alternatives.find((route) => route.policyDecision === 'ALLOW');

  if (next) {
    await plan.activate(next);
    return presentNextMeaningfulStep(next);
  }

  if (alternatives.some((route) => route.policyDecision === 'NEEDS_MEMBER')) {
    return responsibility.waitingOnUser();
  }

  return responsibility.responsiblyExhausted();
}
```

Critical rule: Responsible Continuation must never bypass a denied authority or privacy boundary. Every new route receives its own policy/authority decision.

### 7. Human Steward / Navigator route

A human route may be selected only where human judgment, authority, relationship, physical action, advocacy, or verification is materially required.

OR-004 should define the interface, not build a workforce-management product.

Suggested boundary:

```ts
interface HumanStewardEscalation {
  responsibilityId: string;
  reason:
    | 'JUDGMENT_REQUIRED'
    | 'AUTHORITY_REQUIRED'
    | 'ADVOCACY_REQUIRED'
    | 'PHYSICAL_ACTION_REQUIRED'
    | 'VERIFICATION_REQUIRED';
  requestedAt: Date;
}
```

No employee scheduling, payroll, panel management, or CRM is in OR-004.

### 8. Hall experience

The member should see the outcome, not machinery.

Display:
- what Aureus is carrying;
- current status;
- next meaningful step;
- what Aureus is doing now, if any;
- exactly what the member needs to do, if anything;
- truthful evidence language;
- a clear explanation when Aureus cannot proceed.

Do not expose:
- route scoring internals;
- policy engine internals;
- model reasoning;
- a giant task checklist;
- failed backend attempts that do not materially help the member understand what is happening.

### 9. Human Attention Budget — first instrumentation

Record only a minimal measurable burden signal for OR-004:
- number of times Aureus asks the member for information already supplied in the same Responsibility;
- number of explicit member-required actions;
- avoidable repeat request count must remain zero in automated tests.

Do not build a generalized analytics system in this slice.

## Suggested code placement

Prefer:

```text
apps/api/src/people-resolutions/
  people-resolutions.module.ts
  people-resolutions.controller.ts
  people-resolutions.service.ts
  people-resolutions.dto.ts
  route-resolver.ts
  repositories/
    resolution-plan.repository.interface.ts
    prisma-resolution-plan.repository.ts

apps/api/src/responsibilities/
  existing service/repository extended only where required

apps/web/design-system/components/conversation/
  existing ResponsibilityProgressCard extended rather than replaced

apps/web/lib/api/
  people-resolutions.ts
```

Naming may change after repository inspection, but responsibilities must remain separated:
- Responsibility owns accepted outcome/status/evidence ledger;
- People Resolution owns orchestration of routes;
- source domains own their facts.

## API sketch

```text
POST /people/resolutions
  explicit member acceptance of a personal need

GET /people/resolutions/:responsibilityId
  self-scoped current outcome + member-safe plan summary

POST /people/resolutions/:responsibilityId/continue
  deterministic continuation/reconciliation

POST /people/resolutions/:responsibilityId/member-input
  only for specifically requested bounded member input
```

Do not expose generic route creation or evidence-ingestion APIs to clients.

## Security / privacy invariants

1. PERSONAL only in OR-004.
2. Principal must be the authenticated member.
3. `PERSONAL_PRIVATE` privacy scope.
4. No Business/shared → Personal transfer without OR-CCT-001 transition.
5. Model output cannot widen authority.
6. Client cannot submit authority class, privacy scope, evidence level, route policy decision, principal, or completion status.
7. Cross-user Responsibility and route IDs return not-found style responses where appropriate.
8. Raw source-domain payloads are never copied into the Responsibility ledger.
9. No hidden permanent vulnerability/personality scoring.
10. Member may correct a misunderstood objective before consequential execution.

## Required deny-path tests

At minimum:
- cannot accept a need against another member’s conversation;
- cannot read/continue another member’s Responsibility;
- client cannot set principal/context/privacy/authority;
- duplicate retry of accept does not create duplicate open Responsibility;
- failed route does not falsely complete Responsibility;
- denied route cannot be bypassed by Responsible Continuation;
- continuation chooses only an independently authorized alternative;
- reported evidence is not rendered as verified;
- no evidence → no completion;
- terminal Responsibility is not reopened by GET/retry;
- repeated continuation is idempotent;
- malformed/unknown route source fails closed;
- no raw model reasoning or sensitive source payload persisted;
- same already-supplied member fact is not requested again within the Responsibility.

## Explicitly out of scope

- generic workflow builder;
- generalized social-services CRM;
- Navigator workforce/payroll scheduling;
- full institutional integrations;
- autonomous browser submission;
- money movement;
- legal/medical decision-making;
- full Flourishing score;
- Value Ledger;
- Monte Carlo/shadow causal learning;
- Academy curriculum;
- cross-context Business/Personal data sharing;
- automated creation of new external opportunities/resources from unverified model output.

## Builder instruction

Claude is the builder for this slice. ChatGPT is the independent reviewer/architectural critic.

Before editing code, Claude must:
1. inspect OR-001, OR-002, PA-021, PA-022, OR-CCT-001 and current main;
2. identify every existing abstraction that can be reused;
3. state where this work would accidentally create a second CRM/workflow engine;
4. propose the smallest implementation satisfying the first proof;
5. freeze that plan before coding.

Then Claude may implement on `feat/or-004-people-need-resolution`.

Claude must not merge, deploy, widen authority, configure secrets, or mark its own work independently verified.

## Completion gate

OR-004 is complete only when:
1. the first proof works end-to-end;
2. migrations/typecheck/lint/unit/integration/e2e/web/build/Docker are green on exact head;
3. deny-paths above pass;
4. constructor/builder findings are frozen;
5. ChatGPT independently reviews the exact candidate SHA and returns PASS/HOLD with P0/P1/P2 findings;
6. any material repair receives a fresh exact-SHA review;
7. Founder separately decides merge.

No deployment is authorized by this work order.
