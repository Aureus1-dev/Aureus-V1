# UI-004 — Waiting

**Status:** BUILDING / production-impacting interaction-state slice  
**Register parent:** Item 04 — Steward interaction-state implementation  
**Predecessor:** AUREUS-016 / PR #168  
**Construction base:** `a3986c8290222794f35e8130bd5e6b5c63ac52ef` — merge of PR #168  
**Branch:** `feat/ui-004-waiting`  
**Successor:** UI-005 — Asking  
**Living Release Gate contracts:** `core-deployment`, `browser-first-session`, `accountable-steward-walkthrough`

> **Merge-stable status rule:** while this implementation exists only on the UI-004 review branch, UI-004 is the candidate under construction/verification. Once the independently accepted implementation and matching register transition are on `main`, UI-004 is complete and UI-005 — Asking becomes current. No status-only cleanup commit should be required.

## 1. Single job

Make **waiting truthful and visible inside the existing Active Work surface**.

When the canonical current Responsibility is waiting, the member should be able to see, whenever the underlying truth actually exists:

- what is being waited on;
- who currently holds the next move;
- the last real follow-up attempt;
- the next real follow-up attempt;
- the real due time and whether that date is reported or verified;
- whether the member needs to do anything now.

When nothing is required from the member, say exactly:

`Nothing you need to do.`

The slice must never fabricate a holder, chase date, ETA, due provenance, or member obligation merely to make waiting look active.

## 2. Governing canon

UI-004 implements the Waiting contract accepted in:

- `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md`;
- `docs/100-experience/AUREUS-004 — THE STEWARD CANON`;
- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md` Item 04.

The key governing rule is that waiting is a first-class state, not an empty screen, while every displayed waiting fact must still be true.

## 3. Reuse / non-duplication

UI-004 creates **no new persistence model** and no second workflow/task truth.

It reuses:

- `Responsibility.status` for canonical holder-level wait state;
- the existing self-scoped `GET /responsibilities` API for current member-owned Responsibility truth;
- `Responsibility.originConversationId` for conversation scoping;
- the existing Step-5 `successCriteria.step5FollowThrough` contract for bounded Housing follow-through truth;
- Step-5 `owner`, `requiredAction`, `lastAttemptAt`, `nextAttemptAt`, `dueAt`, `dueProvenance`, `state`, and `reviewRequired` where present;
- the existing `ActiveWorkSurface` as the one work presentation;
- the existing application-help Responsibility as the narrower primary Responsibility when it is active;
- existing UI-003 conversation/session equality guards and application-guide continuity.

UI-004 does **not** create:

- a Wait table;
- a reminder/task model;
- a second Active Work card;
- a second Responsibility;
- a second follow-through contract;
- a new scheduler;
- a new communication rail;
- a new release workflow.

## 4. Primary Responsibility selection

The accepted UI-003 application-guidance behavior remains intact.

For the current conversation:

1. if the existing application-help Responsibility is present, it remains the Active Work surface's primary Responsibility;
2. otherwise, the newest `PERSONAL_NEED_RESOLUTION` Responsibility for that exact conversation may become the same Active Work surface;
3. conversation mismatch must fail closed to no durable Responsibility rather than briefly showing another conversation's work.

This is a presentation precedence rule only. It does not change Responsibility ownership or hierarchy.

## 5. Waiting projection

### 5.1 Holder

Canonical holder maps from existing truth:

- `WAITING_ON_USER` -> member;
- `WAITING_ON_AUREUS` -> Aureus;
- `WAITING_ON_THIRD_PARTY` -> outside party;
- Step-5 `owner = HUMAN_STEWARD` -> assigned Human Steward when the bounded Step-5 contract is in a waiting state.

A visual tone may never determine holder truth.

### 5.2 What is being waited on

When Step-5 follow-through exists, use its canonical sourced `requiredAction`.

Without a Step-5 contract, use only a bounded status-derived sentence. Do not manufacture a specific landlord, agency, document, callback, or appointment from conversation prose.

### 5.3 Last and next follow-up

- `lastAttemptAt` is the only Step-5 field that may be presented as the last follow-up time.
- `nextAttemptAt` is the only Step-5 field that may be presented as the next follow-up time.
- generic `Responsibility.updatedAt`, message timestamps, tool calls, or status transitions may **not** be relabeled as a chase/follow-up.
- if no real last/next attempt exists, omit that row entirely.

### 5.4 Due / expectation truth

Step-5 `dueAt` may be shown as a **Due** time, with `REPORTED` vs `VERIFIED` provenance when available.

UI-004 does not rename a due time into an expected third-party response range. A true expected range may be added later only when canonical source data exists.

### 5.5 Nothing the member needs to do

Show `Nothing you need to do.` only when canonical truth supports it.

For the Step-5 contract this requires:

- owner is not `MEMBER`;
- state is not `DISPUTED`;
- `reviewRequired` is false.

Without Step-5 data, a Responsibility explicitly waiting on Aureus or a third party may truthfully show the same statement; `WAITING_ON_USER` may not.

## 6. Authority / privacy boundary

- UI-004 is self-scoped through the existing authenticated `/responsibilities` endpoint.
- Only Responsibilities whose `originConversationId` exactly matches the active conversation may be projected.
- Waiting presentation does not grant action authority.
- Step-5 source pointers/history are not rendered merely because they exist in the JSON contract.
- The surface renders only the minimum waiting fields needed by the member.
- No cross-member, household, steward, business, or tenant inference is allowed.

## 7. Accessibility and language

- Waiting remains inside the existing `Active work` region and has its own named `Waiting` region.
- Dates use semantic `<time>` elements.
- Holder and action truth are expressed in words, not color alone.
- Mobile layout collapses wait facts to one column.
- Internal enum names are never shown.
- `Last follow-up` is used rather than `Last chase` because the canonical Step-5 attempt can represent callback/retry/follow-up activity more broadly than a literal chase.

## 8. Explicit non-goals

UI-004 does not:

- implement UI-005 Asking;
- implement UI-006 Recovering;
- implement UI-007 Choosing;
- implement UI-008 Done + Quiet;
- build the Truth/Service Ledger;
- create Mission/Carry/Room structures;
- generalize Step-5 beyond its accepted bounded contract;
- schedule new follow-ups;
- perform outbound calls/messages;
- claim a due date is an ETA;
- claim current production satisfies the slice before exact deployment acceptance.

## 9. Required adversarial proof

Tests/review must try to falsify at least:

1. another conversation's Personal Need Responsibility can appear after switching conversations;
2. a generic Responsibility `updatedAt` is mislabeled as a last follow-up;
3. a missing `nextAttemptAt` produces an invented next follow-up;
4. a member-owned wait says `Nothing you need to do.`;
5. a disputed/review-required Step-5 contract says `Nothing you need to do.`;
6. a Step-5 due date is presented as a verified date when it is merely reported;
7. a Step-5 due date is presented as a third-party response ETA;
8. application guidance is displaced when its narrower accepted Responsibility is active;
9. the slice creates a new task/wait persistence model;
10. the UI exposes internal source pointers/history unnecessarily;
11. keyboard/screen-reader users lose holder or timing truth;
12. mobile layout makes the wait facts unreadable.

## 10. Definition of done

UI-004 is ready for independent review when:

- [x] branch starts from exact post-AUREUS-016 `main`;
- [x] existing `/responsibilities` self-scoped API is reused;
- [x] current-conversation Personal Need Responsibility can feed the existing Active Work surface when no application-help Responsibility is primary;
- [x] canonical waiting holder is visible;
- [x] Step-5 last/next follow-up is displayed only from real attempt fields;
- [x] due provenance is visible when Step-5 provides it;
- [x] `Nothing you need to do.` is gated by real ownership/review truth;
- [x] no new persistence/schema/scheduler is added;
- [x] adversarial component/projection tests exist;
- [ ] full web/API mechanical CI is green on the exact head;
- [ ] Docker Build Verification is green on the exact head;
- [ ] independent exact-head review returns no BLOCKER/HIGH;
- [ ] exact merged SHA is deployed and Living Release Gate contracts pass;
- [ ] Accountable Steward mobile + desktop walkthrough passes on that same deployed SHA;
- [ ] Founder authorizes merge after independent verification.

## 11. Successor

Once the independently accepted UI-004 implementation and register transition are on `main`, the next canonical construction slice is:

**UI-005 — Asking**

That slice owns one clear ask, why it is needed, what Aureus will do after receiving it, and never re-asking established facts.
