# Aureus People Step 1 — Universal Need → Resolution

**Status:** Frozen implementation contract  
**Repository:** Aureus-V1  
**Branch:** `people/step1-need-to-resolution-v2`  
**Exact starting base:** `67e175a8eb1b46ea33bbe15b801e281611ac7751`  
**Parent program:** Issue #122 — PEOPLE-000  
**Prior implementation evidence:** Draft PR #113 / `feat/or-004-people-need-resolution` — preserve as evidence, do not merge as-is  
**Depends on:** merged OR-001 Responsibility Core + merged OR-002 People help-to-completion + existing Needs / City Sheet / Human Steward primitives + current authority/trust foundations

## 1. Single job

Make the ordinary People-side promise real:

> A member tells Aureus what they need. Aureus accepts responsibility for carrying that need toward a truthful outcome, uses verified resources and human stewardship where appropriate, never abandons the work silently, and closes only when evidence supports the actual terminal state.

The proof is:

`member-stated need → owned StatedNeed → explicit Aureus acceptance → PERSONAL_NEED_RESOLUTION Responsibility → best currently permitted route → verified resource and/or explicit Human Steward path → Responsible Continuation → source-domain evidence → truthful COMPLETED or RESPONSIBLY_EXHAUSTED`

This step is the adult-core nucleus of Aureus People. It is not the whole People product.

## 2. Current-repository rule

Implement against current `main`, not against the historical base of PR #113.

PR #113 is useful implementation evidence but is currently dirty/non-mergeable and predates later shared Responsibility / authority work. Reuse only the parts that remain correct after reconciliation.

Do not preserve old code merely to preserve authorship or branch history. Preserve product intent, evidence discipline, tests worth keeping, and source-of-truth reuse.

## 3. Canonical reuse

Step 1 must reuse existing domain truth rather than introduce a People CRM or case-management island:

- `Responsibility` / `ResponsibilityEvent` remain the durable work root and append-only work ledger.
- `StatedNeed` remains the member-stated source need.
- existing verified City Sheet / resource matching remains the source of resource truth.
- existing `ResourceOffer` semantics remain authoritative for offered/accepted/declined resource state.
- existing `NeedEscalation` / Human Steward path remains the human escalation source.
- existing `UnresolvedNeed` / safe-failure semantics remain the honest no-route source where applicable.
- current authority / trust gateways remain authoritative for whether a later action may read, share, write, or act.

No `Case`, `Ticket`, `ResolutionPlan`, generic workflow engine, duplicate household profile, second evidence database, or shadow task system may be added unless repository evidence proves the canonical primitives cannot represent a required invariant.

## 4. Responsibility contract

Introduce or reconcile one Personal Responsibility kind for ordinary life-need resolution:

`PERSONAL_NEED_RESOLUTION`

It must be server- and database-constrained to the Personal context and member principal. It may not silently become Business/shared work.

At acceptance, persist the member-understandable objective Aureus has agreed to carry. The objective is not authority: it never grants Aureus permission to perform consequential actions.

Only one open `PERSONAL_NEED_RESOLUTION` Responsibility may exist for the same owned StatedNeed / canonical dedupe scope. Concurrent retries must not create parallel commitments.

## 5. Routing contract

The route is not the Responsibility.

A Responsibility may move through multiple routes over time while remaining one promise to the member.

Step 1 supports only routes that already have a canonical source domain:

1. **VERIFIED_RESOURCE** — a currently verified, eligible resource route surfaced from the existing resource system.
2. **HUMAN_STEWARD** — an explicit human-steward escalation using the existing Need escalation path.
3. **NO_CURRENT_ROUTE** — a truthful, evidence-backed state when no verified route and no reachable steward path currently exists.

Do not invent a resource, eligibility fact, timing promise, successful referral, or reachable human.

## 6. Member choice and agency

Aureus may recommend and explain. It may not coerce.

- An offered resource is not accepted until the member chooses it.
- A declined resource remains declined for the current decision context and should not be immediately re-presented as if nothing happened.
- Human Steward escalation is not automatic merely because the model prefers it; use the existing explicit escalation semantics.
- Member cancellation/decline must be preserved truthfully.
- A later explicit member request may create a new responsibility when the prior one is terminal; GET/retry must never reopen terminal work.

## 7. Responsible Continuation

When a route does not finish the promised outcome, Aureus must reconcile what actually happened and continue responsibly.

Responsible Continuation means:

- read canonical route/evidence state;
- preserve the current Responsibility;
- determine only among permitted, currently reachable next routes;
- never bypass authority, privacy, consent, member decline, verification, or a denied transition;
- never erase prior route history;
- never turn tool/model text into evidence;
- stop honestly when there is no currently responsible next route.

Responsible Continuation is not an excuse for infinite looping. Repeatedly re-offering the same unchanged route is a defect.

## 8. Human Steward boundary

Human Steward is a real accountable route, not decorative copy.

Step 1 must:

- reuse the existing human escalation domain;
- create/resolve no duplicate steward queue;
- expose whether a steward route was requested/reachable/recorded based on source truth;
- treat a resolved human escalation as `REPORTED` unless an independent verification source actually proves the underlying life outcome;
- never claim that a human was contacted, assigned, or completed work when the source domain does not establish that fact.

Full caseload assignment, supervisor operations, queue prioritization, and steward workspace are People Step 4, not Step 1.

## 9. Evidence and terminal truth

The Responsibility may close only to a state supported by source-domain evidence.

### COMPLETED
Use only when the configured completion criterion is supported by canonical source evidence. If the evidence is member/human reported, the Responsibility may still be completed when the criterion is explicitly defined as a reported fact, but the evidence level must remain `REPORTED` and copy must say what is and is not independently verified.

### RESPONSIBLY_EXHAUSTED
Use when Aureus has no currently responsible permitted route after truthful reconciliation. This is not success. The member-facing state must explain that Aureus did not achieve the requested outcome and what is known about why continuation stopped.

### CANCELLED / member-ended
Preserve the existing canonical cancellation semantics where applicable. Do not relabel member withdrawal as success or exhausted system capacity.

A resource being offered, clicked, accepted, or contacted is not by itself proof that the member's requested life outcome occurred.

## 10. Privacy / context boundary

Step 1 remains Personal and private by default.

- no organization principal;
- no Business tenant ownership;
- no implicit sharing with a household member, institution, employer, resource provider, or Human Steward beyond the explicit source-domain/authority rules;
- no cross-context transfer unless an existing governed transition explicitly permits it;
- no raw secrets, credentials, identity numbers, unnecessary document contents, screenshots, or model reasoning in Responsibility metadata/events;
- use reference/provenance identifiers rather than copying sensitive source payloads into the Responsibility ledger.

## 11. API / member-safe state

Expose the smallest stable self-scoped interface necessary to:

- accept an owned StatedNeed into a durable Responsibility;
- read the current member-safe resolution state;
- respond to an offered verified resource;
- explicitly request Human Steward when the existing domain permits it;
- reconcile/continue after route state changes.

Every read/write must verify member ownership and Personal context server-side. Do not rely on client-supplied principal/context.

The state projection must make clear:

- what Aureus is carrying;
- current Responsibility status;
- current route, if any;
- what needs the member, if anything;
- evidence level/source meaning;
- whether the outcome is complete, still active/waiting, or responsibly exhausted.

## 12. Integration with current authority foundations

Current generalized authority/trust infrastructure landed after the original OR-004 base. Step 1 must reconcile with it rather than re-implementing consent.

Step 1 itself may remain guidance-only where no consequential action is being performed. If a route later requires reading a connected account, sending information, writing, submitting, or sharing, the relevant existing authority gateway must decide the action.

Creating a Responsibility never grants new authority.

## 13. Failure behavior

Required fail-closed behavior includes:

- foreign/unknown StatedNeed → Not Found / deny without leakage;
- foreign Responsibility → Not Found / deny without leakage;
- terminal Responsibility + GET/retry → remains terminal;
- duplicate concurrent acceptance → one open canonical Responsibility;
- stale/unverified resource → not presented as currently verified;
- malformed/secret-like evidence metadata → rejected or stripped before persistence;
- missing source record → surface uncertainty / incomplete source rather than fabricate completion;
- Human Steward unavailable → do not claim reachability;
- all routes declined/unavailable → truthful `RESPONSIBLY_EXHAUSTED` only when continuation policy is genuinely exhausted;
- model/provider failure → cannot erase an accepted Responsibility.

## 14. Required tests

Step 1 is not complete until tests prove at minimum:

1. an owned StatedNeed can create exactly one open Personal Need Responsibility;
2. a foreign StatedNeed cannot be accepted or probed;
3. server/database enforce Personal context, member principal, Personal-private policy, and allowed authority mode;
4. concurrent/retried acceptance is idempotent;
5. the best verified resource can be surfaced without copying source truth into a second database;
6. stale/unverified/expired resources are not surfaced as verified;
7. resource OFFERED/ACCEPTED/DECLINED is not misrepresented as outcome completion;
8. member decline changes continuation behavior and is not immediately ignored;
9. explicit Human Steward request uses the existing escalation domain and does not create a duplicate queue;
10. unreachable Human Steward is not represented as reachable;
11. resolved human escalation remains `REPORTED` unless independent verification exists;
12. Responsible Continuation preserves one Responsibility while moving among valid routes;
13. Responsible Continuation cannot bypass authority/privacy/member decline;
14. repeated continuation is retry-safe and cannot endlessly duplicate route records/events;
15. source-domain completion evidence closes only the correct owned Responsibility;
16. `REPORTED` never becomes `VERIFIED` through model output, copy, notification, or API projection;
17. missing/deleted source evidence fails honestly;
18. no-route state becomes `RESPONSIBLY_EXHAUSTED` only under the defined exhausted condition;
19. terminal Responsibility is not reopened by GET/retry;
20. secret-like metadata cannot enter Responsibility evidence/events;
21. existing OR-001 / OR-002 behavior remains green;
22. current Business Responsibility behavior remains unchanged;
23. current authority/trust behavior remains unchanged;
24. migrations/typecheck/lint/unit/integration/e2e/web/build/seed/Docker verification all pass.

## 15. Explicit non-goals

Do not add in Step 1:

- household graph or family sharing;
- Parent + Child implementation;
- steward caseload dashboard or supervisor console;
- generalized deadlines/reminders system;
- document vault/redesign;
- institution billing/contracts;
- flourishing score/map;
- new member home redesign;
- broad communications system;
- hospital/school/employer workflows;
- generic workflow builder;
- autonomous external submission or consequential act;
- Foundry learning changes;
- Library institutional-memory redesign.

Those belong to later PEOPLE-000 steps.

## 16. Recovery from PR #113

Before implementation, inspect PR #113 file-by-file and classify each delta:

- **REUSE** — still correct on current main;
- **ADAPT** — valuable but must reconcile with current Responsibility/authority interfaces;
- **DROP** — duplicate, stale, unsafe, or superseded by later main;
- **REBUILD** — intent is correct but implementation conflicts with current architecture.

Do not merge/rebase PR #113 wholesale. Its historical base was `e9cc3672269d37227f9dc35f509157f97460538f`; current Step 1 starts from `67e175a8eb1b46ea33bbe15b801e281611ac7751`.

## 17. Done

People Step 1 is done only when:

1. implementation is complete on the fresh current-main branch;
2. all required constructor gates pass;
3. the exact candidate SHA is frozen;
4. CI + Docker verification are green on that exact head;
5. Claude independently reviews that exact head and returns no blocking/high finding;
6. any material repair receives a fresh independent exact-head review;
7. Founder separately authorizes merge.

Only after Step 1 merges do we begin People Step 2 — Personal Authority, Consent & Privacy as a People experience/domain completion step.
