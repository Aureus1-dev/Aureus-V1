# UI-006 — Bad News / Recovering

**Status:** BUILDING / production-impacting interaction-state slice  
**Register parent:** Item 04 — Steward interaction-state implementation  
**Predecessor:** UI-005 — Asking / PR #170  
**Construction base:** `180da9bbc4b7d9ae00aa3f77ed8176a378179d4b` — merge of PR #170  
**Branch:** `feat/ui-006-bad-news-recovering`  
**Successor:** UI-007 — Choosing  
**Living Release Gate contracts:** `core-deployment`, `browser-first-session`, `accountable-steward-walkthrough`

> **Merge-stable status rule:** UI-005 is accepted on `main`, so UI-006 is the current construction slice. While this implementation exists only on the UI-006 review branch, it is a candidate under construction/verification. Once the independently accepted implementation and matching register transition are on `main`, UI-006 is complete as code and UI-007 — Choosing becomes current. Exact deployment and the Accountable Steward walkthrough remain separately evidenced release facts.

## 1. Single job

Make **bad news arrive with truthful recovery context inside the existing Active Work surface**.

When canonical work truth proves a setback, the member should be able to understand as much of the following as is actually known:

- what failed or changed;
- what remains true;
- what Aureus has already done;
- the next safe route or repair action when one exists;
- who holds the next move when current ownership is actually known;
- a real checkpoint when one exists.

The slice must never invent a cause, recovery path, holder, human involvement, retry date, or reassurance simply because work looks unsuccessful.

## 2. Governing canon

UI-006 implements the Bad News / Recovering contract in:

- `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md` §10;
- `docs/100-experience/AUREUS-004 — THE STEWARD CANON`;
- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md` Item 04;
- the accepted UI-003 Active Work surface, UI-004 Waiting truth, and UI-005 Asking truth.

The governing rule is:

> **Bad news never arrives naked.**

A real `no`, failure, missed deadline, conflict, or blocker is stated plainly. A recovery route is attached only when the current canonical truth supports one.

## 3. Reuse / non-duplication

UI-006 creates **no Recovery table, case system, incident model, retry engine, new Responsibility kind, or second work-state universe**.

It reuses:

- the existing one `ActiveWorkSurface`;
- conversation-scoped Responsibility truth and UI-003 selection precedence;
- `Responsibility.status` for bounded `BLOCKED` and `RESPONSIBLY_EXHAUSTED` truth;
- the existing People Step-5 `successCriteria.step5FollowThrough` contract;
- Step-5 `state`, `reviewRequired`, `reviewReason`, `nextAttemptAt`, due provenance, and satisfaction truth;
- the existing Step-5 behavior that keeps the underlying housing need open after a missed/blocked/disputed follow-through;
- existing authority, privacy, session, and conversation boundaries;
- the permanent Living Release Gate.

UI-006 does **not** create:

- new persistence or schema;
- a generic error-event store;
- a new API route;
- a new scheduler or notification rail;
- a second Active Work card;
- a new Human Steward assignment path;
- a new SAI/prompt system;
- a new release workflow.

## 4. Canonical recovery sources in this slice

### 4.1 Step-5 follow-through setback

A structured recovery may be projected for a `PERSONAL_NEED_RESOLUTION` only when an unsatisfied Step-5 contract is in one of these bounded setback states:

- `BLOCKED`;
- `MISSED`;
- `DISPUTED`;
- or `reviewRequired` is true with a canonical review reason.

The current Step-5 contract already preserves the strongest source-backed explanation in `reviewReason`. UI-006 reads it; it does not synthesize a different causal story from conversation text.

For these first-proof states:

- **What changed:** use the canonical `reviewReason` when present; otherwise use only a bounded state description.
- **Still true:** the underlying need remains open and this follow-through is not treated as completed.
- **What Aureus has done:** state only a server-backed preservation/review action that is true for that state.
- **Next:** describe the safe review/reassessment required before the follow-through can be treated as resolved.
- **Holder:** do not treat the original obligation owner as the recovery-review owner. Omit recovery holder unless current work truth independently proves it.
- **Checkpoint:** `nextAttemptAt` may be shown as a real next check. `dueAt` is not relabeled as a recovery checkpoint.

### 4.2 Responsibility `BLOCKED`

A Responsibility-level `BLOCKED` status may project a bounded recovery even when no Step-5 contract explains a more specific setback.

The surface may truthfully say:

- the current path is blocked;
- the goal remains open and is not marked done;
- Aureus kept the work visible instead of dropping it;
- Aureus is reassessing how to responsibly continue;
- Aureus holds that current reassessment.

It must not invent the cause of the blocker or a retry date.

### 4.3 `RESPONSIBLY_EXHAUSTED`

`RESPONSIBLY_EXHAUSTED` is a real negative outcome and must not be softened into vague optimism.

The surface may state:

- Aureus could not find a responsible way to continue the current path;
- the requested goal is not being claimed as achieved;
- no responsible next route is recorded right now.

It must not fabricate an alternate merely to make the message feel better. If a later canonical route exists, that later truth can replace the exhausted presentation.

### 4.4 States that do not automatically become recovery

UI-006 does not infer structured recovery solely from:

- `WAITING_ON_USER`, `WAITING_ON_AUREUS`, or `WAITING_ON_THIRD_PARTY`;
- `CANCELLED` without an explicit failure/recovery source;
- a due date existing or passing in the browser clock;
- generic activity, transcript prose, tool output, or `updatedAt`;
- a satisfied Step-5 contract;
- stale Step-5 truth after a later transition.

## 5. One setback, one presentation

When a structured recovery exists for the current condition:

- render it inside the existing Active Work surface;
- do not simultaneously present the same Step-5 condition as Waiting;
- do not present the same condition as a structured Asking block;
- do not repeat the same repair as a separate `Next action` row;
- keep the high-level status/carrying context, `Done means`, evidence, authority notes, and real controls available.

This is presentation deduplication only. No canonical work truth is deleted or rewritten.

## 6. Recovery presentation contract

A recovery projection contains:

- `changed` — what failed or changed, from canonical truth;
- `remainsTrue` — what is still true despite the setback;
- `alreadyDone` — optional; a real action Aureus/system already took;
- `next` — optional; the next safe repair/review route when one is supported;
- `holder` — optional; the current recovery holder only when independently proved;
- `checkpointAt` — optional; a real recovery checkpoint such as `nextAttemptAt`.

The member-facing block uses plain language such as:

- `Here’s what changed`
- `Still true`
- `What I’ve done`
- `Next`
- `Held by`
- `Next check`

`RECOVERING`, `MISSED`, `DISPUTED`, and other internal enum names are never displayed as product jargon.

## 7. Fail closed

UI-006 must prefer omission over false comfort.

It must not:

- infer a causal explanation from status alone when the cause is unknown;
- claim a Human Steward is reviewing something unless canonical ownership/assignment truth proves it;
- use the original Step-5 obligation owner as the recovery holder by default;
- convert `dueAt` into a retry/checkpoint;
- turn `updatedAt`, a message timestamp, or generic activity into `Next check`;
- claim a resource, appeal, workaround, or alternate exists without canonical support;
- say the underlying need is resolved merely because one obligation changed state;
- say Aureus already took a recovery action when the server truth only says review is required.

## 8. Authority and continuity

Recovery does not expand Aureus authority. A blocked or failed path does not authorize submission, attestation, spending, messaging, legal representation, account access, or other bounded actions that were not already permitted.

The member must not be forced to restate the objective merely because the work entered recovery. Voice and text continue from the same canonical Responsibility.

## 9. Accessibility and language

- Recovery remains inside the existing `Active work` region.
- It has a named region: `Recovery plan`.
- The setback, remaining truth, next route, holder, and checkpoint are textual; color is never the only signal.
- Mobile collapses recovery facts to one column.
- No recovery capability is voice-only.
- Internal enum names are not member-facing.
- The surface remains keyboard and screen-reader usable.

## 10. Explicit non-goals

UI-006 does not:

- build a generalized appeal/resource-discovery engine;
- add message-to-recovery mutation automation;
- create a retry scheduler;
- change Step-5 server semantics;
- implement UI-007 Choosing;
- implement UI-008 Done + Quiet;
- build the Truth / Service Ledger;
- create Mission/Carry/Room structures;
- claim production acceptance before exact-deployment evidence.

## 11. Required adversarial proof

Tests/review must try to falsify at least:

1. a generic wait is mislabeled as recovery;
2. `BLOCKED` invents a blocker cause;
3. `RESPONSIBLY_EXHAUSTED` invents a recovery route;
4. a Step-5 `MISSED` state hides the fact that the underlying need remains open;
5. a `DISPUTED` Step-5 condition becomes a member ask instead of recovery;
6. a review-required Step-5 condition also appears as Waiting or `Next action`;
7. the original Step-5 obligation owner is falsely shown as the recovery-review holder;
8. a due date is relabeled as `Next check`;
9. a real `nextAttemptAt` checkpoint is omitted or replaced by an invented date;
10. a satisfied Step-5 obligation still shows recovery;
11. a Human Steward is claimed without canonical holder truth;
12. internal enum names leak into member-facing copy;
13. mobile/screen-reader users lose the setback or recovery truth;
14. the slice creates new persistence or a parallel work system.

## 12. Definition of done

UI-006 is ready for independent review when:

- [x] branch starts from exact UI-005 merge `180da9bbc4b7d9ae00aa3f77ed8176a378179d4b`;
- [x] existing Active Work / Responsibility / Step-5 truth is reused;
- [ ] bounded recovery projection is implemented;
- [ ] canonical Step-5 `reviewReason` is exposed without inventing cause;
- [ ] `BLOCKED`, `MISSED`, `DISPUTED`, and `RESPONSIBLY_EXHAUSTED` have fail-closed presentation behavior;
- [ ] recovery suppresses duplicate Waiting / Asking / Next-action presentation of the same condition;
- [ ] no new persistence/schema/API/scheduler is added;
- [ ] focused adversarial projection/component tests exist;
- [ ] UI-006 is registered against the permanent Living Release Gate contracts;
- [ ] the register transition is included or explicitly proven merge-stable;
- [ ] full web/API mechanical CI is green on the exact head;
- [ ] Docker Build Verification is green on the exact head;
- [ ] independent exact-head review returns no BLOCKER/HIGH;
- [ ] Founder authorizes merge after independent verification;
- [ ] exact merged SHA is deployed and Living Release Gate contracts pass;
- [ ] Accountable Steward mobile + desktop walkthrough passes on that same deployed SHA.

## 13. Successor

Once the independently accepted UI-006 implementation and register transition are on `main`, the next canonical construction slice is:

**UI-007 — Choosing**

That slice owns real options, tradeoffs, uncertainty, authority, and next action while preserving the member’s decision authority.