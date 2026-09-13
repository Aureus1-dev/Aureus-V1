# OR-004 — People Need → Responsibility → Resolution

## Purpose

Turn an ordinary member-stated life need into one durable Personal Responsibility that Aureus can carry across conversations, resources, and human/AI handoffs without creating a second CRM, generic case-management system, or duplicate domain database.

Examples:
- “My electricity is getting shut off Friday.”
- “I’m behind on rent.”
- “I lost my job and need income.”
- “I need childcare so I can get back to work.”

The product promise is not “we found resources.” Once Aureus explicitly accepts the work, it preserves the Responsibility, determines the next safe route, carries as much as it responsibly can, asks the member only for necessary participation, records evidence truthfully, and continues after a failed/declined route when an authorized alternative exists.

## Base

Exact starting main: `e9cc3672269d37227f9dc35f509157f97460538f`

This is the post-merge main containing:
- OR-001 Responsibility Core;
- OR-002 People help-to-completion;
- OR-003 Kitchen & Bath Ready Project.

## Frozen constructor decision

Repository inspection found that the People side already contains the source-domain records OR-004 needs:

- `StatedNeed` — the member’s own words and conversation provenance;
- verified `CitySheetEntry` matching — safe candidate resources;
- `ResourceOffer` — every offered route plus ACCEPTED / DECLINED / PENDING response;
- `NeedEscalation` — explicit member-requested human help and its human outcome;
- `UnresolvedNeed` — durable evidence that no verified resource and no reachable steward currently exists.

Therefore OR-004 **must not add a ResolutionPlan, ResolutionRoute, Case, Ticket, or parallel need database**.

The resolution plan is a member-safe projection over those existing source records. `Responsibility` owns the durable promise, status and evidence ledger; the Needs domain continues to own need/resource/escalation facts.

This is the smallest architecture that satisfies the product promise and the no-second-CRM rule.

## Core product rule

**One need → one accepted Responsibility → one evolving resolution path.**

A resource or human handoff is not the Responsibility.

Example:
- Responsibility: `Keep household electricity on / restore stable electric service.`
- Route 1: verified utility-hardship resource.
- Route 2: another verified assistance resource.
- Route 3: member explicitly requests a Human Steward.

If Route 1 is declined or cannot resolve the need, the Responsibility stays open. Responsible Continuation evaluates another safe route. A denied authority/privacy boundary is never bypassed.

## First proof

`member states utility shutoff need in Hall → existing StatedNeed exists → member explicitly accepts Aureus help → durable PERSONAL Responsibility → verified resource route is offered → member may accept/decline → decline can continue to another verified route → acceptance waits truthfully rather than claiming success → member may explicitly request a Human Steward → human resolution remains source-domain evidence → no safe route produces recorded UnresolvedNeed → Responsibility never disappears and only becomes COMPLETED on truthful evidence or RESPONSIBLY_EXHAUSTED on recorded safe failure`

## Reuse — mandatory

Reuse:
- OR-001 `Responsibility` / `ResponsibilityEvent`;
- OR-002 status transitions and Hall progress treatment;
- owned AI conversation provenance;
- existing `StatedNeed` rather than accepting/storing a second copy of the member’s statement;
- `NeedsService.findMatchingResources()` and the existing human-verification boundary;
- `ResourceOffer` history and member responses;
- `NeedEscalation` and existing explicit member-choice rule;
- `UnresolvedNeed` safe-failure evidence;
- Goal / Journey / Milestone / Task only where they already represent member goals — never as a replacement case system;
- existing consent, Context Firewall and Completion Case rules;
- existing Hall conversation UI and Responsibility progress component.

## What OR-004 adds

### 1. One new Responsibility kind

```prisma
enum ResponsibilityKind {
  OPPORTUNITY_DECISION
  OPPORTUNITY_APPLICATION_GUIDANCE
  PERSONAL_NEED_RESOLUTION
}
```

Do not add one kind per life domain.

### 2. Explicit acceptance contract

The client identifies an **existing owned StatedNeed** and the outcome the member is explicitly asking Aureus to carry.

Suggested shape:

```ts
interface AcceptPersonalResolutionDto {
  statedNeedId: string;
  objective: string;
  dueAt?: string;
}
```

Do not accept principal, context, privacy, authority, evidence level, completion status, source payloads, hidden risk scores, or a duplicate `memberStatement` from the client.

The server resolves the stated need’s owned conversation and creates the Responsibility with:
- PERSONAL context;
- PERSONAL_PRIVATE privacy;
- GUIDANCE_ONLY authority in this slice;
- the member as Principal;
- the StatedNeed conversation as provenance;
- bounded success criteria that explicitly state that offer/acceptance alone is not completion.

### 3. Computed resolution path — no new plan persistence

Member-safe route state is derived from existing source-domain records:

- unmatched/ambiguous need → `WAITING_ON_USER` for the minimum necessary clarification;
- verified resource available and not previously exhausted → create/reuse a `ResourceOffer`, `WAITING_ON_USER` for the member’s choice;
- resource accepted → `WAITING_ON_THIRD_PARTY`; do **not** claim outcome success;
- resource declined → consider another independently verified resource;
- Human Steward requested by member → existing `NeedEscalation`, then `WAITING_ON_THIRD_PARTY`;
- resolved human escalation may be referenced as **REPORTED** evidence; UI must not upgrade it to third-party verification;
- no verified resource + no reachable steward → existing `UnresolvedNeed` backs `RESPONSIBLY_EXHAUSTED`;
- a terminal Responsibility is never reopened by GET/retry.

### 4. Responsible Continuation

Continuation is deterministic and source-owned:

```ts
if (responsibility.isTerminal()) return currentState;

if (humanEscalation.isResolved()) {
  completeWithReportedSourceEvidence(humanEscalation);
}

if (humanEscalation.isOpen() || acceptedResourceExists()) {
  waitOnThirdParty();
}

if (pendingResourceOfferExists()) {
  waitOnMember();
}

const nextVerifiedResource = verifiedResources.find(notPreviouslyOffered);
if (nextVerifiedResource) {
  offer(nextVerifiedResource);
  waitOnMember();
}

if (recognizedNeed && safeFailureIsRecorded()) {
  responsiblyExhaustWithReferenceToUnresolvedNeed();
}

waitOnMemberForClarificationOrHumanChoice();
```

Critical rules:
- resource ranking/scoring is not invented here;
- only already-safe City Sheet results may become resource routes;
- a declined/failed route never completes the Responsibility;
- an accepted route never completes the Responsibility by itself;
- Responsible Continuation never bypasses denial, consent, privacy, or authority policy.

### 5. Human route

Preserve the existing stricter safety rule: **Aureus does not automatically page a human in OR-004.** The member explicitly chooses Human Steward help; OR-004 then reuses `NeedEscalationsService.escalate()`.

This slice does not build workforce scheduling, payroll, panel management, or a Navigator CRM.

### 6. API surface

```text
POST /people/resolutions
  accept an existing owned StatedNeed as one durable Responsibility

GET /people/resolutions/:responsibilityId
  current member-safe Responsibility + computed path summary

POST /people/resolutions/:responsibilityId/continue
  deterministic reconciliation / Responsible Continuation

POST /people/resolutions/:responsibilityId/human-steward
  explicit member choice to request existing NeedEscalation path
```

No generic route-creation API. No generic evidence-ingestion API.

### 7. Hall experience

Show:
- what Aureus is carrying;
- current truthful status;
- next meaningful step;
- what the member must do, if anything;
- current verified resource when relevant;
- whether the current evidence is reported versus independently verified.

Do not show:
- internal scoring;
- policy-engine internals;
- model reasoning;
- a giant checklist;
- irrelevant backend attempts.

## Security / privacy invariants

1. PERSONAL only.
2. Principal is always authenticated member.
3. `PERSONAL_PRIVATE` only.
4. `GUIDANCE_ONLY` authority only in OR-004.
5. No Business/shared → Personal transfer is introduced.
6. Client cannot set principal/context/privacy/authority/evidence/status.
7. Another member’s need or Responsibility is not usable as a side channel.
8. Raw source payloads/model reasoning are never copied into Responsibility events.
9. Only verified/test-fixture City Sheet resources accepted by the existing Needs safety boundary may be surfaced.
10. Human escalation remains explicit member choice.
11. Member may correct a misunderstood objective before consequential execution; OR-004 performs no consequential autonomous external action.

## Required tests

At minimum:
- another member’s StatedNeed cannot be accepted;
- another member’s Responsibility cannot be read/continued/escalated;
- retrying acceptance returns the same open Responsibility;
- client cannot widen authority/privacy/context;
- verified resource is offered through existing Needs path;
- unverified real City Sheet candidate cannot become a route;
- pending offer yields `WAITING_ON_USER`;
- accepted offer yields `WAITING_ON_THIRD_PARTY`, not COMPLETED;
- declined offer may advance to another verified route;
- Human Steward is never auto-paged;
- explicit Human Steward request creates/reuses existing escalation path;
- open escalation yields `WAITING_ON_THIRD_PARTY`;
- resolved escalation completion is `REPORTED`, never rendered as VERIFIED;
- no verified resource + no reachable steward uses real `UnresolvedNeed` evidence before `RESPONSIBLY_EXHAUSTED`;
- no evidence → no completion;
- terminal Responsibility is not reopened;
- repeated continuation is idempotent;
- no raw model reasoning or sensitive source payload enters the Responsibility ledger.

## Explicitly out of scope

- generic workflow builder;
- generalized social-services CRM;
- a new ResolutionPlan/Route database;
- Navigator workforce/payroll scheduling;
- autonomous browser submission;
- money movement;
- legal/medical decision-making;
- full Flourishing score;
- Value Ledger;
- Monte Carlo/shadow causal learning;
- Academy curriculum;
- cross-context Business/Personal data sharing;
- model-created unverified external resources.

## Builder / reviewer separation

**ChatGPT is the constructor/builder for OR-004. Claude is the independent critic/reviewer. Founder retains merge authority.**

Builder responsibilities:
1. implement only on `feat/or-004-people-need-resolution`;
2. reuse the frozen source domains above;
3. run/inspect exact-head CI and reconcile defects;
4. freeze the candidate SHA and a constructor findings packet;
5. never self-certify the build as independently reviewed;
6. never merge or deploy without Founder decision.

Claude should be used only after the candidate is frozen. Claude’s job is to reconstruct the intended product from repository evidence, attack the exact SHA independently, return P0/P1/P2 findings and PASS/HOLD, and avoid trusting the builder summary as proof.

If Claude changes code, Claude becomes a fixer for that candidate and cannot independently certify its own repair; a fresh verification pass is required.

## Completion gate

OR-004 is complete only when:
1. the first proof works end-to-end;
2. migration / Prisma generation / typecheck / lint / unit / integration / e2e / web / build / Docker checks are green on exact head;
3. deny paths above pass;
4. builder findings are frozen;
5. Claude independently reviews the exact frozen SHA;
6. any material repair receives fresh verification;
7. Founder separately decides merge.

No deployment is authorized by this work order.
