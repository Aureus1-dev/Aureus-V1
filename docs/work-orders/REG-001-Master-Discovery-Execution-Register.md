# REG-001 — Master Discovery & Execution Register

**Status:** READY FOR INDEPENDENT REVIEW / docs-only governance slice  
**Parent register item:** 02 — REG-001  
**Predecessor:** UI-003 Active Work Surface / PR #162  
**Post-UI-003 base:** `b1485f279aff07ebaefc1a409e01bd46c02d5e47`  
**Release impact:** docs-only; no deployed product behavior changes and no new Living Release Gate contract is created.

## Purpose

Replace overlapping execution queues with one canonical, ordered Discovery & Execution Register while preserving every still-valid requirement, historical decision, governance boundary, and implementation proof.

This slice does **not** implement later product capabilities. It only reconciles sequencing truth and prepares the next work in the agreed order.

## Canonical sources reconciled

- `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md`
- GitHub Issue #122 / `PEOPLE-000`
- `release-gates/manifest.json` and LRG-001
- merged SAI-001 and its SAI-002…SAI-006 successors
- GitHub Issue #143 and the closed-unmerged PA-024 governed-skills packet
- `docs/steward-voice-interface-standard`
- founder walkthrough issues #95 and #145
- stale/maintenance issues including #136 and #99
- `CLAUDE.md` and `docs/ai/REPOSITORY_STEWARD.md`
- the stale Founder Control Center snapshot
- Founder discoveries captured in `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md`

## Reconciliation completed

1. Re-anchored the register to exact post-UI-003 `main`.
2. Marked UI-003 merged and recorded exact automated release-gate evidence without claiming the separate human Accountable Steward walkthrough.
3. Refreshed PR/issue state: no open PRs existed before this REG-001 PR; only #122, #143, and #99 remain intentionally open after cleanup.
4. Demoted `PRODUCT-V1-EXECUTION-ORDER.md` from active registry to historical requirements/execution record with an explicit pointer to the Master Register.
5. Updated PEOPLE-000: Steps 1–6 are complete; it remains the People-domain requirements ladder, not the cross-program queue.
6. Closed #136 as COMPLETED with PR #137 preserved as the accepted implementation record.
7. Closed #95 and #145 as SUPERSEDED SEQUENCING mechanisms while preserving their still-valid historical requirements and acceptance evidence.
8. Kept #99 open only as DEFERRED external-trigger maintenance.
9. Kept #143 open only as DOCUMENTED / UNIMPLEMENTED governed-skills architecture, with Housing still the first bounded runtime proof; old PR #144 is not to be resurrected unchanged.
10. Archived `FOUNDER-CONTROL-CENTER.md` as a historical September 2 snapshot so its old SHAs and OR-003/OR-004 NOW/NEXT labels cannot become current truth.
11. Updated `CLAUDE.md` and `docs/ai/REPOSITORY_STEWARD.md` so future construction/review sessions begin from the Master Register, current work order, live Git state, Living Release Gate, and separate human acceptance rather than stale queues.
12. Reconciled SAI-001 successor guidance to Master Register item 09 rather than the historical Product V1 execution order.
13. Preserved the agreed successor order: Voice & Interface canon -> interaction-state slices -> Truth/Service Ledger -> Life Map/Mission -> Carry Board/Card -> Mission Rooms -> SAI-002…006 -> Artifact Factory -> Housing proof -> governed skills proof -> Flourishing Model -> Resource Marshal -> Community OS -> foundational domains -> Flourishing Economy / Business / institutional scale.

## Non-duplication and governance invariants

- one canonical next item;
- constructor and verifier remain separate;
- any head movement invalidates exact-head review evidence;
- reuse accepted Responsibility, Authority, Household, Human Steward, Obligation, Evidence, Matter, Communication, Opportunity, Pods, Library, Business and Foundry primitives before adding new truth containers;
- no second case/CRM/profile/evidence/workflow reality;
- Living Release Gate remains the permanent release framework;
- production acceptance remains exact-deployment acceptance plus the separate human walkthrough where required;
- historical branches/PRs/issues remain evidence even when superseded.

## Definition of done

REG-001 is ready for independent review when:

- [x] the master register is reconciled to current post-UI-003 `main` and contains no stale claim that PR #162 is open;
- [x] PR/issue state is refreshed from GitHub;
- [x] every competing execution source touched by this slice is explicitly classified as current sequencing authority, requirements source, historical evidence, superseded candidate, or deferred maintenance;
- [x] current repository-agent instructions point to the Master Register rather than Product V1 / Issue #95;
- [x] future work orders are required to name their register parent/predecessor and update the register on acceptance;
- [x] stale walkthrough issues are reconciled so there is one release/acceptance path;
- [x] no later feature implementation is included;
- [ ] exact-head CI is green;
- [ ] an independent reviewer confirms no lost requirement, silent supersession, duplicate truth system, or governance weakening.

## Independent review attack surface

The reviewer should specifically test whether REG-001 accidentally:

1. deletes a still-valid requirement rather than preserving/reclassifying it;
2. gives a lower-level execution document power to override higher canon/governance;
3. confuses sequencing authority with Living Release Gate release authority;
4. falsely marks human Accountable Steward acceptance complete;
5. lets Product V1, PEOPLE-000, Founder walkthrough issues, the old Control Center, or SAI independently reorder the queue;
6. authorizes a later feature merely by documenting it;
7. weakens constructor/reviewer separation or exact-head evidence rules;
8. creates a second truth universe instead of pointing future work to accepted primitives.

## Successor

After REG-001 is independently accepted and merged, the next construction candidate is the **AUREUS-016 Steward Voice & Interface canon reconciliation** on fresh current `main`.