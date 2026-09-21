# AUREUS-STEWARD-VOICE-INTERFACE-001

**Status:** BUILDING / docs-only governance slice  
**Register parent:** Item 03 — AUREUS-016 Steward Voice & Interface canon reconciliation  
**Predecessor:** REG-001 / PR #166  
**Fresh-main base:** `ad684a72db1ccc784a3507ad41f234fa3eca371a`  
**Branch:** `docs/aureus-016-steward-voice-interface-reconciliation`  
**Historical source branch:** `docs/steward-voice-interface-standard`  
**Release impact:** docs-only; no production behavior or release contract changes  
**Successor after accepted merge:** UI-004 — Waiting

## 1. Purpose

Reconcile the Founder-authored Steward Voice & Interface doctrine onto fresh current `main` without reviving stale branch assumptions or overriding accepted Hall, UI-003, Answer Intelligence, Authority, or Living Release Gate truth.

The governing thesis is:

> **The interface is the Steward's body.**

Voice and visual are two channels of one Steward. The screen should express what Aureus is truthfully carrying, asking, waiting on, recovering, choosing with the person, or finishing.

## 2. Why this is a reconciliation rather than a branch merge

The historical branch was created before later accepted product work. It is useful evidence, but it is not safe to merge as-is.

Material drift that must be reconciled:

1. The historical draft made name pronunciation the mandatory first interaction and proposed replacing `How can we help?` as the first meaningful prompt.
2. PR #163 and UI-003 now explicitly preserve exactly one Hall heading `How can we help?` plus exactly one supporting line `Tell me what you want to accomplish.`
3. The live Member Steward prompt now governs brevity, one necessary question at a time, continuity, truthful action claims, and text/voice consistency.
4. SAI-001 now separates internal Prompt Compiler work from member-facing Presentation Composer output and requires confidence to stay bounded by evidence.
5. LRG-001 is now the permanent release framework; a docs canon does not create a new release workflow.
6. REG-001 now makes this the canonical current construction item and requires its successor transition to be reflected in the register.

Therefore, this slice transplants the valid doctrine, repairs stale assumptions, and produces a fresh-main canon candidate.

## 3. Scope

This slice MAY:

- add the reconciled `AUREUS-016 — STEWARD VOICE & INTERFACE CANON`;
- explicitly reconcile same-level Arrival Canon clauses;
- preserve current Hall opening invariants;
- define voice/interface state semantics for future implementation;
- define forward contracts for Waiting, Asking, Recovering, Choosing, Done/Quiet, Carry Board/Card, Mission Rooms, and testimony without implementing them;
- update the Master Discovery & Execution Register so this slice is merge-stable.

This slice MUST NOT:

- change runtime code;
- change database schema;
- change current system prompts;
- change current Hall copy or mobile behavior;
- change Authority or consent rules;
- create a new release workflow;
- add Mission Rooms, Carry Board/Card, Ledger, or state-machine runtime implementation;
- claim production already satisfies the full canon;
- self-certify or merge itself.

## 4. Canon sources reconciled

The constructor must reconcile against:

- `docs/100-experience/AUREUS-004 — THE STEWARD CANON`;
- `docs/100-experience/AUREA-002 — ARRIVAL CANON`;
- Work Surface portfolio / review addendum;
- `docs/work-orders/UI-003-Active-Work-Surface.md`;
- `apps/api/src/ai/prompts/member-steward-system-prompt.ts` as accepted live behavior evidence, not higher canon;
- `docs/foundry/STEWARD-ANSWER-INTELLIGENCE-STANDARD.md`;
- `docs/work-orders/LRG-001-Living-Release-Gate.md`;
- `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md`;
- historical AUREUS-016 branch documents as evidence.

## 5. Required doctrine

The reconciled canon must preserve at minimum:

1. The interface is the Steward's body.
2. One Steward across voice, text, and screen.
3. Short, first-person, concrete speech by default.
4. Truthful action claims only when evidence exists.
5. One necessary question at a time.
6. Every ask includes its reason when not obvious.
7. Waiting shows holder / last chase / next chase / expectation-or-unknown / member duty.
8. Bad news carries a real recovery path or owned checkpoint.
9. Known context is not re-asked without explicit re-verification reason.
10. Account/access requests occur only at real Carry Boundaries.
11. Repeated access asks require newly delivered value since the prior ask unless safety/law requires renewed confirmation.
12. Delegation remains bounded by accepted Authority, visible, and reversible where supported.
13. Internal architecture vocabulary does not become required member vocabulary.
14. Voice/text route changes preserve the same objective and conversation.
15. The screen never invents progress, execution, holder, evidence, or completion.
16. Quiet is a valid state; the product does not manufacture engagement.
17. Carry Board/Card, Mission Rooms, and testimony remain forward contracts owned by later register items rather than implementation authorized here.

## 6. Arrival reconciliation

The new canon must explicitly preserve the accepted Hall opening:

- one `How can we help?` heading;
- one `Tell me what you want to accomplish.` supporting line;
- no duplicate promise paragraph;
- no forced account before help;
- no feature tour;
- no mandatory name/pronunciation question before the person can receive help.

It may supersede the older fixed ceremonial branded opening sequence insofar as that sequence delays help.

Name/pronunciation doctrine becomes: use it correctly once known, ask naturally when there is a reason, never make it a pre-help intake gate, and never re-ask without a real reason.

## 7. Internal interaction states

The canon must preserve one state grammar:

`LISTENING → UNDERSTANDING → AGREEMENT → WORKING → ASKING → WAITING → CHOOSING → RECOVERING → DONE → QUIET`

These labels are internal. They do not create runtime implementation in this slice.

The successor implementation order remains:

1. UI-004 — Waiting;
2. UI-005 — Asking;
3. UI-006 — Bad News / Recovering;
4. UI-007 — Choosing;
5. UI-008 — Done + Quiet.

LISTENING / UNDERSTANDING / AGREEMENT / WORKING remain part of the common grammar unless implementation evidence later proves a missing primitive.

## 8. Non-duplication and authority invariants

Future implementation must reuse accepted truth owners:

- Conversation/session scope for conversational continuity;
- Responsibility for accepted durable work;
- Authority for permission and action scope;
- Obligation/follow-through for waits and commitments where applicable;
- Evidence for observable proof;
- Communication for real external communication truth;
- existing guide/tool results for actual execution state.

The canon may describe a future member-facing projection. It does not authorize a second case, CRM, profile, evidence, workflow, or mission truth universe.

## 9. Merge-stable register semantics

This slice must not land on `main` claiming that AUREUS-016 is still unfinished.

The register update must encode both states without a cleanup commit:

- **on this review branch / PR:** AUREUS-016 is IN FLIGHT / VERIFYING and is not yet accepted canon;
- **once the accepted AUREUS-016 change exists on `main`:** AUREUS-016 is COMPLETED / ACCEPTED and **UI-004 — Waiting** is the current construction item.

No future merge SHA may be guessed or hard-coded before merge. Current `main` is always resolved from live Git.

## 10. Definition of done

AUREUS-016 is ready for independent review only when:

- [x] fresh branch created from exact `main` after REG-001 merge;
- [x] historical canon doctrine reconciled rather than merged unchanged;
- [x] current Hall opening preserved explicitly;
- [x] mandatory pre-help name collection removed;
- [x] current truth/action boundaries and SAI presentation model preserved;
- [x] LRG remains the sole durable release framework;
- [x] later features are described only as forward contracts, not implemented;
- [ ] canonical register updated with merge-stable AUREUS-016 → UI-004 transition;
- [ ] net diff remains docs/governance only;
- [ ] exact-head CI / Docker verification green;
- [ ] fresh independent reviewer verifies the requirement, governing docs, full diff, and exact SHA;
- [ ] zero unresolved BLOCKER/HIGH;
- [ ] separate Founder merge authorization.

## 11. Independent review attack surface

The reviewer should actively test whether this candidate:

1. accidentally weakens `AUREUS-004` trust, dignity, human-steward, or agency rules;
2. silently contradicts the accepted Hall opening from #163/UI-003;
3. turns name/pronunciation into an intake gate;
4. lets style language override truth/evidence/action boundaries;
5. conflates Voice canon with SAI internal prompt compilation;
6. authorizes future Carry Board, Mission Rooms, Ledger, or state runtime out of sequence;
7. creates a second truth store or workflow model;
8. weakens privacy, consent, Authority, or execution assurance;
9. creates a second release workflow or claims docs-only production acceptance;
10. leaves the Master Register stale immediately after merge.

## 12. Constructor / reviewer separation

The constructor may write and repair this branch. It may not issue the independent PASS.

Any head movement invalidates prior exact-head review evidence. A reviewer who edits the branch becomes a co-author and a different independent reviewer is required.

## 13. Successor

After independent acceptance and Founder-authorized merge, the Master Register must resolve the next construction item to:

**UI-004 — Waiting.**
