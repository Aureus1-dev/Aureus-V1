# REG-001 — Master Discovery & Execution Register

**Status:** BUILDING / docs-only governance slice  
**Parent register item:** 02 — REG-001  
**Predecessor:** UI-003 Active Work Surface / PR #162  
**Post-UI-003 base:** `b1485f279aff07ebaefc1a409e01bd46c02d5e47`  
**Release impact:** docs-only; no deployed product behavior changes and no new Living Release Gate contract is created.

## Purpose

Replace overlapping execution queues with one canonical, ordered Discovery & Execution Register while preserving every still-valid requirement, historical decision, governance boundary, and implementation proof.

This slice does **not** implement later product capabilities. It only reconciles sequencing truth and prepares the next work in the agreed order.

## Canonical sources to reconcile

- `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md`
- GitHub Issue #122 / `PEOPLE-000`
- `release-gates/manifest.json` and LRG-001
- merged SAI-001 and its SAI-002…SAI-006 successors
- GitHub Issue #143 and the closed-unmerged PA-024 governed-skills packet
- `docs/steward-voice-interface-standard`
- founder walkthrough issues #95 and #145
- stale/maintenance issues including #136 and #99
- Founder discoveries already captured in `docs/founder/AUREUS-DISCOVERY-EXECUTION-REGISTER.md`

## Required reconciliation work

1. Re-anchor the register to exact post-UI-003 `main`.
2. Mark UI-003 merged and record exact release-gate evidence; do not claim the separate Accountable Steward walkthrough unless actually performed.
3. Refresh the open-PR and open-issue snapshot.
4. Make the register the single sequencing authority after acceptance.
5. Convert older Product V1 / People / walkthrough queues into requirements and historical evidence unless an item remains genuinely active.
6. Reconcile #145 and #95 so resolved defects do not remain as false current blockers.
7. Confirm #136 is superseded by merged People Step 3 / PR #137 and disposition it appropriately.
8. Keep #99 deferred until its external dependency changes.
9. Keep #143 as the governed-skills anchor, but preserve Housing as the first runtime proof and do not resurrect old PR #144 unchanged.
10. Preserve the agreed successor order: Voice & Interface canon -> interaction-state slices -> Truth/Service Ledger -> Life Map/Mission -> Carry Board/Card -> Mission Rooms -> SAI-002…006 -> Artifact Factory -> Housing proof -> governed skills proof -> Flourishing Model -> Resource Marshal -> Community OS -> foundational domains -> Flourishing Economy / Business / institutional scale.

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

REG-001 is ready for independent review only when:

- the master register is reconciled to current `main` and contains no stale claim that PR #162 is still open;
- open PR/issue state is refreshed from GitHub;
- every competing execution source is explicitly classified as sequencing authority, requirements source, historical evidence, superseded candidate, or deferred maintenance;
- future work orders are required to name their register parent/predecessor and update the register on acceptance;
- stale walkthrough issues are reconciled so there is one release/acceptance path;
- no later feature implementation is included;
- docs-only CI is green;
- an independent reviewer confirms no lost requirement, silent supersession, duplicate truth system, or governance weakening.

## Successor

After REG-001 is independently accepted and merged, the next construction candidate is the **Steward Voice & Interface canon reconciliation** on fresh current `main`.
