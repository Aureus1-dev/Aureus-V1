# UI-007 — Choosing

**Status:** VERIFYING / production-impacting interaction-state slice  
**Register parent:** Item 04 — Steward interaction-state implementation  
**Predecessor:** UI-006 — Bad News / Recovering / PR #171  
**Construction base:** `ed23c3ad7a0b5b9fe446814d32cbf7e2ee6e1c91` — merge of PR #171  
**Branch:** `feat/ui-007-choosing`  
**Successor:** UI-008 — Done + Quiet  
**Living Release Gate contracts:** `core-deployment`, `browser-first-session`, `accountable-steward-walkthrough`

> **Merge-stable status rule:** UI-006 is accepted on `main`, so UI-007 is the current construction slice. While this implementation exists only on the UI-007 review branch, it is a candidate under construction/verification. Once the independently accepted implementation and matching register transition are on `main`, UI-007 is complete as code and UI-008 — Done + Quiet becomes current. Exact deployment and the Accountable Steward walkthrough remain separately evidenced release facts.

## 1. Single job

Make **a real member decision understandable and explicit without Aureus silently deciding for the person**.

When current canonical product truth presents a decision the member actually owns, the experience should show only what is truthfully supported:

- the real route or action being considered;
- the important known tradeoffs;
- meaningful uncertainty or verification limitations;
- known cost, timing, eligibility, document, referral, accessibility, or service constraints when the canonical source carries them;
- what Aureus recommends only to the strength supported by existing evidence/rationale;
- what Aureus is and is not authorized to do;
- the member’s real decision action;
- what Aureus will do after that decision when current workflow truth proves it.

UI-007 must not invent a ranking, confidence score, comparative advantage, urgency, risk, cost, timing, eligibility, or recommendation merely to make a choice feel complete.

## 2. Governing canon

UI-007 implements the Choosing contract in:

- `docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md` §11;
- `docs/100-experience/AUREUS-004 — THE STEWARD CANON`;
- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md` Item 04;
- the accepted UI-003 Active Work surface and UI-004/UI-005/UI-006 truth-preserving interaction slices.

The governing rules are:

> **Aureus helps the person choose; it does not silently choose for them.**

> **Present only the options that are genuinely relevant.**

Recommendation strength must remain proportionate to evidence and consequence. The member’s preferences and authority stay visible.

## 3. Bounded first proof

UI-007 does **not** create a new generic decision engine in this slice.

The first proof reuses existing real member-decision mechanisms already present in the coordinated plan flow:

- `CoordinatedPlanDto.primary` and `supporting` plan items;
- `RecommendationDto` with real `PENDING / ACCEPTED / DISMISSED` state and the existing approve/dismiss actions;
- `ResourceOfferDto` with real `PENDING / ACCEPTED / DECLINED` state and the existing respond action;
- `MatchedResourceDto` source-backed resource facts;
- existing recommendation-subject resolution and plan-item decision handlers;
- the current conversation/plan surface rather than a second persisted choice record.

A plan item is eligible for the Choosing presentation only when its real decision mechanism is still pending and the current conversation owns the plan being shown.

### Important semantic boundary

`primary` and `supporting` are plan roles, **not proof that the items are mutually exclusive alternatives**.

UI-007 must not relabel supporting steps as competing options, claim one plan item beats another, or produce a winner unless a later canonical contract explicitly proves that relationship. In this first proof, the member is choosing whether to proceed with a real route/item already offered by Aureus.

## 4. Canonical truth that may be shown

### 4.1 Recommendation-backed item

For an existing `RecommendationDto`, UI-007 may show:

- the resolved recommendation subject already used elsewhere in the product;
- the existing canonical rationale;
- the fact that the recommendation is pending the member’s decision;
- the real approve/dismiss actions;
- any subject facts independently supplied by the existing subject API/view model.

It must not invent:

- a confidence percentage;
- a hidden fit score;
- a probability of success;
- a cost, deadline, risk, or eligibility claim absent from the canonical subject;
- a claim that approval executes a third-party action when the existing contract only changes recommendation status.

Because `CoordinatedPlanDto` embeds a point-in-time `RecommendationDto`, the UI may retain the **confirmed result of the existing approve/dismiss mutation** for the life of that rendered plan item so stale `PENDING` controls do not reappear. That is presentation continuity only, not a second durable decision record; failed mutations leave the choice unchanged.

### 4.2 City-resource-backed item

For an existing `MatchedResourceDto`, UI-007 may show the source-backed fields that materially affect the decision, including when present:

- organization/resource identity and description;
- verification status;
- service area and hours;
- cost;
- eligibility requirements;
- required documents;
- referral requirement;
- phone/contact detail when already present;
- accessibility notes;
- languages supported;
- emergency-service status;
- existing offer response state.

Unknown or absent values are omitted or identified as unknown. They are never filled with inference.

### 4.3 Recommendation strength

The first proof may surface the existing plan/recommendation rationale, but it must not manufacture a new recommendation-strength scale.

If the current canonical data does not prove why one route is preferable, Aureus may explain the known facts without declaring a winner.

## 5. Choice presentation contract

A structured Choosing projection should be presentation-only and may contain:

- `title` — the real route/item under consideration;
- `whyRelevant` — canonical rationale when one exists;
- `knownTradeoffs` — only material source-backed facts that affect the decision;
- `uncertainty` — verification gaps or missing material facts when the current source proves them;
- `authority` — who owns the decision and what approval does or does not authorize;
- `decisionState` — pending/accepted/declined/dismissed from the existing mechanism;
- `nextAfterAccept` — only when the current workflow proves what Aureus can do next;
- `nextAfterDecline` — only when the current workflow proves a truthful alternative/continuation;
- real controls wired to the existing approve/dismiss or offer/respond mechanisms.

The projection itself is not persisted.

## 6. One decision, one presentation

When a structured Choosing state is active for a pending plan item:

- do not duplicate the same member decision as a generic `Needs you` sentence;
- do not repeat the same decision as a separate `Next action` row;
- do not create a second approval control elsewhere on the same plan item;
- do not erase the existing canonical plan/timeline artifact or its decision history.

This is presentation deduplication only. No decision truth is rewritten.

Recovery and terminal Responsibility truth remain authoritative over stale decision presentation. The plan is scoped to the conversation that produced it; switching conversations cannot silently preserve an actionable decision from another room. A real blocking/recovery or terminal condition makes the historical plan item non-actionable until current canonical workflow truth again supports a decision.

## 7. Authority and consent

Choosing must make authority visible.

- Aureus may recommend, explain, prepare, and carry work within existing authority.
- A recommendation approval remains the existing status transition; it does not silently submit an application, spend money, attest, sign, message a third party, or expand authority.
- A resource-offer acceptance remains the existing member response unless a separate accepted workflow explicitly authorizes more.
- Declining/dismissing an item must not be described as abandoning the underlying member goal unless canonical work truth says so.
- The member may ask for another route without being punished by a hidden score or loss of access.

## 8. Tradeoffs and uncertainty

UI-007 should emphasize decision-relevant facts rather than feature lists.

Examples of valid tradeoff facts when canonical data carries them:

- no-cost vs known cost;
- verified vs unverified/needs-review source;
- referral required vs not required;
- documents required;
- service-area limitation;
- accessibility/language fit;
- hours/timing constraints;
- emergency-service scope.

The surface must not convert missing information into a negative score. `Unknown` is different from `bad`.

## 9. Accessibility and language

- Choosing remains part of the same Steward conversation/work experience.
- Use a named region such as `Choice` or `Choose what happens next`.
- Choice facts and uncertainty are textual; color/icons are not the only signal.
- Controls are keyboard and screen-reader usable.
- Mobile presents decision facts in one readable column.
- Internal enums such as `PENDING`, `ACCEPTED`, or `DISMISSED` are not exposed as product jargon.
- Voice and text refer to the same underlying decision truth.

## 10. Explicit non-goals

UI-007 does not:

- create a new Choice/Decision database table;
- create a hidden scoring/ranking system;
- build a new recommendation model or SAI successor;
- claim primary/supporting plan items are mutually exclusive alternatives;
- add new third-party execution authority;
- implement UI-008 Done + Quiet;
- build the Truth / Service Ledger;
- build Mission/Carry/Room structures;
- generalize every possible future decision type;
- claim production acceptance before exact-deployment evidence.

## 11. Required adversarial proof

Tests/review must try to falsify at least:

1. Aureus silently approves/accepts an item without member action;
2. supporting plan items are falsely described as competing alternatives;
3. a recommendation rationale is turned into an invented confidence score;
4. an unverified resource is presented as verified;
5. missing cost/eligibility/timing data is fabricated;
6. approval is falsely described as third-party submission/execution;
7. declining one route is falsely described as cancelling the underlying goal;
8. a stale pending decision survives after accepted/declined/dismissed truth changes;
9. recovery/blocker/terminal truth and Choosing contradict each other;
10. a plan from another conversation remains actionable;
11. a failed recommendation mutation is displayed as a successful decision;
12. internal enum names leak into member-facing copy;
13. keyboard/screen-reader/mobile users lose material tradeoff or uncertainty information;
14. the slice creates a new persistence or decision-authority universe.

## 12. Definition of done

UI-007 is ready for independent review when:

- [x] branch starts from exact UI-006 merge `ed23c3ad7a0b5b9fe446814d32cbf7e2ee6e1c91`;
- [x] this work order defines the bounded Choosing contract before implementation;
- [x] existing plan/recommendation/resource-offer decision truth is reused rather than duplicated;
- [x] pending decisions project source-backed relevance, tradeoffs, uncertainty, and authority;
- [x] existing real decision controls remain the only mutation path;
- [x] primary/supporting roles are not mislabeled as mutually exclusive options;
- [x] no second Choosing control or parallel decision presentation is introduced for the plan item;
- [x] recovery/terminal truth and cross-conversation staleness cannot leave a historical plan actionable;
- [x] no new persistence/schema/API is added;
- [x] focused adversarial projection/component tests exist;
- [x] UI-007 is registered against the permanent Living Release Gate contracts;
- [ ] the merge-stable register transition is included;
- [ ] full web/API mechanical CI is green on the exact head;
- [ ] Docker Build Verification is green on the exact head;
- [ ] independent exact-head review returns no BLOCKER/HIGH;
- [ ] Founder authorizes merge after independent verification;
- [ ] exact merged SHA is deployed and Living Release Gate contracts pass;
- [ ] Accountable Steward mobile + desktop walkthrough passes on that same deployed SHA.

## 13. Successor

Once the independently accepted UI-007 implementation and register transition are on `main`, the next canonical construction slice is:

**UI-008 — Done + Quiet**

That slice owns evidence-backed visible completion/testimony and a quiet state that does not manufacture engagement.
