# PEOPLE-FOLLOW-001 — Obligation & Follow-through, proven through Housing

**Program:** PEOPLE-000 — Complete Aureus People from need to flourishing  
**Step:** 5 — Deadlines, Communication & Follow-through  
**Architecture:** PA-023 / AUREUS-RME-001  
**Frozen construction base:** `ff94fb532497a4e514222eb45b8a9109f6e4f1e8`  
**Branch:** `people-step5-obligation-follow-through`

## 1. Single job

Give one existing canonical `PERSONAL_NEED_RESOLUTION` Responsibility the durable ability to carry one **sourced must** through a due time, owner, attempts/retries, waiting, reminders, missed-due supervision, and evidence-backed satisfaction **without building a generic reminder/task engine and without falsely completing the member's underlying life need**.

The first proof is deliberately a real Housing Steward journey. A canonical housing/utilities `StatedNeed` may acquire one Step-5 Obligation such as a callback, appointment, document request, deadline, waiting condition, or retry. The same primitive is intended to be reused later by Housing, Financial, Legal, Benefits, Health, Business, and other stewardship domains only after this bounded proof survives independent review.

## 2. Why Housing is the first proof

Housing exercises the exact follow-through failure modes Step 5 exists to prevent:

- a landlord/property/provider callback that must happen;
- an application or document request with a due time;
- an appointment/tour;
- a third party that has not responded;
- a retry window;
- a member-owned step;
- a Human-Steward-owned step;
- a due time that was merely reported versus independently verified;
- a missed due time that requires responsible continuation rather than silent abandonment.

This PR does **not** build the complete Housing Steward. It builds the cross-domain follow-through substrate and proves it on one real housing Responsibility.

## 3. Mandatory reuse/non-duplication disposition

| Existing primitive | Decision | Reason |
|---|---|---|
| `Responsibility` | **REUSE / EXTEND BY PROJECTION** | It remains the accepted-work and no-abandonment root. `dueAt` is the current operational due projection for this one-obligation proof. |
| `Responsibility.successCriteria` | **REUSE** | OR-001 explicitly permits structured typed-first-domain JSON when a new table is not yet justified. Step 5 stores one bounded follow-through contract here. |
| `ResponsibilityEvent` | **REUSE** | `ACTION_EVIDENCED` records source-attributable reported/verified evidence. Obligation satisfaction never emits `COMPLETED`. |
| Generic `Task` | **DO NOT USE AS OBLIGATION TRUTH** | It lacks source basis, authority/privacy, evidence, Responsibility linkage, and the required truth semantics. |
| `StewardshipTask` | **DO NOT USE AS OBLIGATION TRUTH** | It is a human-relationship work aid with due date/status, not a sourced cross-domain must. It lacks source/evidence/Responsibility semantics. |
| `LegalMatterDeadline` | **PRESERVE / PROJECT LATER** | It remains legal-domain truth. A future Legal proof may project its verified/reported deadline into this contract rather than copying legal truth. |
| `NeedEscalation` | **PRESERVE** | Human Steward escalation remains member-chosen. A missed deadline must never fabricate a member request for human help. |
| `StewardshipEscalation` | **PRESERVE** | Existing rows require a real steward/admin raiser. The scheduler must not invent one. |
| `StewardshipRelationship` | **REUSE** | ACTIVE relationship remains the canonical current Human Steward assignment. |
| Communication / `NotificationsService` | **REUSE** | Dedupe-keyed reminders, retry notices, and review notices use the existing communication rail and preferences. |
| New generalized `Obligation` table | **DEFER** | PA-023 requires the first proof to prefer projection/reference. Repeated domain evidence must earn generalized persistence. |

## 4. First-proof contract

Exactly one `step5FollowThrough` contract may exist on this first-proof Responsibility. It preserves:

- stable obligation id and contract version;
- monotonic mutation revision so stale concurrent writers fail closed instead of overwriting newer truth;
- domain = `HOUSING`;
- source pointer to the canonical `StatedNeed`;
- kind: callback / appointment / document request / deadline / waiting / retry;
- current owner: Aureus / member / Human Steward / third party;
- required condition/action;
- current due time + time zone;
- due provenance: `REPORTED` or `VERIFIED`;
- due basis and source pointer when verified;
- consequence/dependency if missed;
- inherited Responsibility authority class;
- completion evidence requirement;
- state;
- attempt count / last attempt / next attempt;
- reported and verified satisfaction timestamps;
- review-required state/reason;
- append-style history entries with the time Aureus learned each correction/verification.

`Responsibility.dueAt` is the current operational due projection only because this proof permits one Obligation. It does not establish a multi-obligation schema.

## 5. Truth rules

1. A member-created due time is always `REPORTED`.
2. The model, member, or scheduler may not silently promote a due time to `VERIFIED`.
3. Verification requires the currently assigned Human Steward or a platform/system administrator plus an explicit source pointer.
4. A later member date cannot overwrite an already verified date. It becomes `DISPUTED` / review-required until source review resolves it.
5. Due-date verification is append-evidenced; corrections preserve the previous known due date in history.
6. A callback/tool/human attempt is not proof that the required real-world condition occurred.
7. Member-reported satisfaction is `REPORTED`; independent source-backed satisfaction may become `VERIFIED`.
8. Satisfying this Obligation never auto-completes `PERSONAL_NEED_RESOLUTION`. Step 1's canonical underlying-need outcome evidence remains controlling.
9. A missed due time never auto-terminalizes the Responsibility.
10. A missed due time never fabricates `NeedEscalation` or `StewardshipEscalation` provenance.

## 6. Waiting and ownership behavior

- `MEMBER` owner may place the Responsibility in existing `WAITING_ON_USER`.
- `THIRD_PARTY` owner may place it in existing `WAITING_ON_THIRD_PARTY`.
- `AUREUS` stays Aureus-carried; an existing user-wait may resume through the canonical Responsibility path.
- `HUMAN_STEWARD` requires an already ACTIVE assigned `StewardshipRelationship`; Step 5 creates no relationship or case record.

Changing status never grants authority.

## 7. Follow-through sweep

The first-proof scheduler is intentionally bounded to the pilot scale and scans at most 500 open Personal Need Responsibilities per sweep. It:

- sends a dedupe-keyed notice when `nextAttemptAt` arrives;
- sends a dedupe-keyed notice inside the 24-hour due window;
- when the due time passes without satisfaction evidence, marks the Obligation `MISSED`, preserves the underlying Responsibility, and marks review required;
- re-reads persisted truth before every missed-notice attempt, including retries for an already-`MISSED` snapshot, so a concurrent satisfaction or reschedule suppresses stale missed/review notices;
- sends a generic member notification;
- if a current Human Steward is assigned, sends a minimum-necessary generic review notice;
- honors ordinary notification preferences;
- does not autonomously call, message a third party, file, submit, cancel, sign, share private data, or widen authority.

The sweep is an orchestration trigger, not evidence of real-world completion.

## 8. Privacy and staff view

Member routes are self-only through the existing Personal Responsibility ownership boundary.

The assigned Human Steward queue and both staff verification mutation responses expose only:

- member id;
- Responsibility id;
- Obligation id;
- mutation revision required for a bounded staff verification write;
- kind;
- owner;
- due / next-attempt time;
- state;
- review-required flag.

It deliberately does **not** expose `StatedNeed.content`, Responsibility objective, private conversation, documents, required-action text, or arbitrary household data.

## 9. Housing gate

The first proof accepts only a canonical Personal Need whose deterministic existing category matcher includes `HOUSING_UTILITIES`. It does not let a caller label an arbitrary need as Housing.

## 10. Explicit non-goals

This slice does not add:

- a generalized `Obligation` database/model;
- a reminder app or generic task manager;
- a second case/CRM/workflow system;
- full Housing search, property marketplace, application automation, subsidy engine, moving-money system, or landlord outreach engine;
- Financial Stewardship;
- outbound calls/browser execution;
- autonomous third-party communication;
- new authority classes;
- automatic Human Steward paging;
- automatic underlying-need completion;
- generalized Matter or Reality Graph persistence;
- Parent + Child scope.

## 11. Required adversarial proof

At minimum tests/review must try to falsify:

1. another member can read or mutate the Obligation;
2. a non-housing Personal Need can enter the first proof;
3. a caller can self-declare a reported due date `VERIFIED`;
4. a reported correction can silently overwrite a verified date;
5. a non-assigned Steward can verify another member's due/satisfaction;
6. Human-Steward ownership can exist without ACTIVE assignment;
7. satisfaction can falsely complete the underlying Responsibility;
8. a missed deadline can terminalize the Responsibility;
9. a scheduler can fabricate a human escalation;
10. reminders duplicate on every sweep;
11. the assigned queue leaks private request/action content;
12. concurrent mutations can silently overwrite each other;
13. a tool/attempt receipt can be treated as outcome evidence;
14. verified evidence loses its source pointer;
15. Step 5 creates a second task/case/workflow truth.

## 12. Merge gate

Do not merge based on implementation claims.

The exact final head must have:

1. complete changed-file set frozen;
2. Prisma generation/migrations/typecheck/lint/API tests/web tests/build green;
3. Docker build + production boot/readiness green;
4. focused Step-5 adversarial tests green;
5. independent adversarial review by a reviewer who did not author the candidate;
6. zero remaining BLOCKER/HIGH findings after any repair/re-review;
7. separate Founder merge authorization on the exact reviewed SHA.

A PASS on this slice proves the first sourced Obligation pattern. It does **not** yet authorize a universal Obligation schema or full Housing Steward deployment.
