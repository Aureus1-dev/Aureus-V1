# UI-005 — Asking

**Status:** BUILDING / production-impacting interaction-state slice  
**Register parent:** Item 04 — Steward interaction-state implementation  
**Predecessor:** UI-004 — Waiting / PR #169  
**Construction base:** `f60df8d0f8ce0600b2449a77fa0051b8d3659753` — merge of PR #169  
**Branch:** `feat/ui-005-asking`  
**Successor:** UI-006 — Bad News / Recovering  
**Living Release Gate contracts:** `core-deployment`, `browser-first-session`, `accountable-steward-walkthrough`

> **Merge-stable status rule:** while this implementation exists only on the UI-005 review branch, UI-005 is the candidate under construction/verification. Once the independently accepted implementation and matching register transition are on `main`, UI-005 is complete as code and UI-006 — Bad News / Recovering becomes current. Exact deployment and the Accountable Steward walkthrough remain separately evidenced release facts.

## 1. Single job

Make **one truthful ask explicit inside the existing Active Work surface**.

When Aureus genuinely needs one thing from the member and canonical work truth identifies what that thing is, the surface should tell the person:

- the one thing Aureus needs;
- why it is needed now;
- what Aureus will do after receiving it;
- expected effort when canonical truth supports a useful statement;
- another route when a truthful alternate exists.

The slice must never fabricate a question, requested fact, reason, effort estimate, or alternate route merely because a coarse Responsibility status says `WAITING_ON_USER`.

## 2. Governing canon

UI-005 implements the Asking contract accepted in:

- `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md` §8;
- `docs/100-experience/AUREUS-004 — THE STEWARD CANON`;
- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md` Item 04;
- the accepted UI-003 single Active Work surface and UI-004 Waiting truth model.

The governing rule is:

> **Every ask must carry its reason.**

Continuity remains equally binding: Aureus must not re-ask an established fact merely because a new turn, channel, session, or screen began. Re-verification is separate from Asking and requires a real stale/conflict/consequence/operational reason.

## 3. Reuse / non-duplication

UI-005 creates **no Ask table, questionnaire engine, intake workflow, profile-memory store, or second work model**.

It reuses:

- the existing one `ActiveWorkSurface`;
- conversation-scoped Responsibility truth and UI-003 selection precedence;
- `Responsibility.status` only as coarse holder truth;
- the existing People Step-5 `successCriteria.step5FollowThrough` contract as the first bounded source of a specific member-held `requiredAction`;
- Step-5 `owner`, `state`, `reviewRequired`, and satisfaction timestamps so a stale/satisfied/disputed obligation is not turned into a new ask;
- accepted application-guidance Responsibility/session behavior for the bounded resume ask;
- the existing application authority boundary: Aureus may guide, but the member enters private information, attests, and submits;
- UI-004 post-satisfaction provenance so a later broader wait never inherits the old satisfied Step-5 request.

UI-005 does **not** create:

- a generic question schema;
- a question queue;
- a new Responsibility kind;
- a new persistence table;
- a new API route;
- a new scheduler or notification rail;
- a second work/status card;
- a prompt library or SAI replacement;
- a new release workflow.

## 4. Canonical ask sources in this slice

### 4.1 Member-owned Step-5 follow-through

A full UI-005 ask may be projected only when all are true:

- the Responsibility is `PERSONAL_NEED_RESOLUTION`;
- current coarse status is `WAITING_ON_USER`;
- a Step-5 contract exists;
- Step-5 owner is `MEMBER`;
- Step-5 state is `PENDING` or `WAITING`;
- `reviewRequired` is false;
- the obligation is not satisfied.

The one requested thing is the canonical Step-5 `requiredAction`.

For this bounded source:

- **Why:** that member-held follow-through must happen before Aureus can continue that part of the work;
- **Then:** after the member reports what happened, Aureus continues carrying the underlying need and keeps the next step visible;
- **If you cannot:** Aureus reassesses the route rather than treating the obligation as completed.

A Step-5 due date is not converted into an effort estimate.

### 4.2 Application-guidance resume boundary

When an accepted `OPPORTUNITY_APPLICATION_GUIDANCE` Responsibility exists but no guide session is currently active, the bounded ask may be:

`Resume the application when you are ready.`

The reason must explicitly preserve the authority boundary: only the member may enter private information, attest, and submit. Aureus can guide the current application but cannot perform those member-required steps.

The alternate route is truthful: if the member already submitted or is not continuing, they may say so instead; Aureus can record that as the member-reported outcome without claiming third-party approval or submission evidence it does not have.

### 4.3 Coarse `WAITING_ON_USER` without a specific source

`WAITING_ON_USER` by itself proves only that the member holds the next move. It does **not** prove:

- what information Aureus needs;
- why it needs it;
- what exact question should be asked;
- how much effort is required;
- whether an alternate route exists.

Therefore UI-005 does not manufacture a structured ask from status alone. The existing coarse `Needs you` / Waiting truth may remain visible until a canonical source can support a specific ask.

## 5. One ask, not duplicate presentations

When a structured UI-005 ask exists:

- render that one ask inside the existing Active Work surface;
- do not simultaneously render the same member-held Step-5 condition as a Waiting block;
- do not repeat the same request again as a separate `Next action` row;
- keep `Done means`, evidence, authority notes, and any real continuation control available.

This is presentation deduplication only. It does not delete or mutate Responsibility/Step-5 truth.

## 6. Asking copy contract

A structured ask contains:

- `request` — the one sourced thing Aureus needs;
- `reason` — why it is necessary now;
- `after` — what Aureus will do after receiving it;
- `effort` — optional and omitted unless truthfully supported;
- `alternateRoute` — optional and omitted unless truthful.

The member-facing surface uses natural language such as:

- `I need one thing from you`
- `Why I need it`
- `Then I’ll`
- `What it takes` only when effort is known
- `If you can’t` only when an alternate route exists

`ASKING` remains an internal state name and is not displayed as product jargon.

## 7. Never re-ask / fail closed

UI-005 must fail closed rather than invent specificity.

A structured ask must not be sourced from:

- conversation prose alone;
- a generic `USER_INPUT_REQUIRED` event with no requested-item payload;
- `Responsibility.updatedAt`;
- a message timestamp;
- tool activity;
- a satisfied Step-5 obligation;
- old Step-5 data after a later broader wait begins;
- a disputed/review-required Step-5 contract.

When the relevant fact is already established, this slice does not create a second request for it. Future generalized asking/intake work must preserve the same continuity rule and use canonical context rather than forcing repetition.

## 8. Access / authority boundary

UI-005 does not weaken the Founder-approved AUREUS-016 Carry Boundary rule.

A new access/account/connection/authority dependency may be requested before further delivery only when the member's requested outcome genuinely cannot responsibly proceed without the smallest necessary dependency. Convenience or broader data collection is not enough.

This slice does not add a new access-request flow. Existing bounded application-guidance consent/authority behavior remains unchanged.

## 9. Accessibility and language

- The structured ask remains inside the existing `Active work` region.
- It has a named region: `What Aureus needs from you`.
- Request, reason, continuation, effort, and alternate route are text, not color-only signals.
- Mobile collapses ask facts to one column.
- The ask remains reachable by keyboard/screen reader.
- Buttons appear only when a real existing action is wired (for example application resume).
- Internal enum/state names are never member-facing copy.

## 10. Explicit non-goals

UI-005 does not:

- build a general intake/questionnaire engine;
- create profile/memory truth;
- implement Prompt Compiler / SAI-002+;
- infer missing asks from transcript text;
- implement UI-006 recovery;
- implement UI-007 choosing;
- implement UI-008 done/quiet;
- build the Truth / Service Ledger;
- create Mission/Carry/Room structures;
- alter application submission authority;
- add account/access asks;
- claim production acceptance before exact-deployment evidence.

## 11. Required adversarial proof

Tests/review must try to falsify at least:

1. coarse `WAITING_ON_USER` alone can fabricate a full ask;
2. a member Step-5 request appears without its reason;
3. a structured ask duplicates itself as Waiting and/or `Next action`;
4. a satisfied Step-5 obligation can be re-asked;
5. a later post-satisfaction generic member wait inherits the old Step-5 `requiredAction`;
6. a disputed/review-required Step-5 contract is presented as a UI-005 member ask;
7. application resume omits the member-only entry/attestation/submission authority reason;
8. application resume is still asked while a guide session is already active;
9. the surface fabricates an effort estimate from a due date;
10. the slice creates new ask/question persistence or a parallel work system;
11. voice/text or conversation changes cause established context to be re-asked by this presentation layer;
12. keyboard/screen-reader users lose request/reason/continuation truth;
13. mobile layout makes the reason/continuation unreadable.

## 12. Definition of done

UI-005 is ready for independent review when:

- [x] branch starts from exact UI-004 merge `f60df8d0f8ce0600b2449a77fa0051b8d3659753`;
- [x] existing Active Work / Responsibility truth is reused;
- [x] member-owned active Step-5 follow-through can project one structured ask;
- [x] application-guidance resume can project one structured ask with authority reason;
- [x] coarse `WAITING_ON_USER` cannot fabricate a structured ask;
- [x] satisfied/disputed/review-required Step-5 truth cannot become a structured ask;
- [x] a structured ask suppresses duplicate Waiting / Next-action presentation;
- [x] no new persistence/schema/API/scheduler is added;
- [x] focused adversarial component/projection tests exist;
- [ ] full web/API mechanical CI is green on the exact head;
- [ ] Docker Build Verification is green on the exact head;
- [ ] independent exact-head review returns no BLOCKER/HIGH;
- [ ] Founder authorizes merge after independent verification;
- [ ] exact merged SHA is deployed and Living Release Gate contracts pass;
- [ ] Accountable Steward mobile + desktop walkthrough passes on that same deployed SHA.

## 13. Successor

Once the independently accepted UI-005 implementation and register transition are on `main`, the next canonical construction slice is:

**UI-006 — Bad News / Recovering**

That slice owns what failed or changed, what remains true, the next safe route, holder, repair action, and a real checkpoint when one exists.
