# Execution Authority — Launch Track

**Status:** Governance reconciliation record (RS-001 — Repository Truth Reconciliation).
**Scope:** Which document governs which question for the LAUNCH-001 "First Members" execution track. This does not replace or reorder `docs/00-foundation/FOUNDATION-003 — Canon Hierarchy.md` — it refines Level 7 ("Execution: Work Orders, Implementation plans, Tasks, Issues, Pull Requests") for this one track, the same way any lower document is permitted to expand on a higher one without contradicting it.

---

## The hierarchy

What `LAUNCH-001-First-Members.md`, `WORKORDERS.md`, and `SCOREBOARD.md` each govern is described once, in this folder's `README.md` ("The three documents") — not repeated here. This document adds the one thing that description doesn't cover: a fourth document outside this folder, and the precedence rule for when any of the four appear to disagree.

| Document | Role |
|---|---|
| `docs/launch/LAUNCH-001-First-Members.md` | Launch scope — see `README.md`. |
| `docs/launch/WORKORDERS.md` | Execution registry — see `README.md`. |
| `docs/launch/SCOREBOARD.md` | Current status — see `README.md`. |
| `docs/releases/version-1-readiness.md` | **Historical readiness and technical evidence.** A frozen snapshot (see the notice at the top of that document) — not a live status source. |

If any two of these documents appear to disagree, the row above wins over the row below it. If a conflict looks like it crosses into canon (mission, constitution, member-experience principles), stop and escalate per FOUNDATION-003's Conflict Rule — this table does not have authority over that document.

## Why this was needed

Before this reconciliation (RS-001), `docs/ai/REPOSITORY_STEWARD.md` instructed every session acting as Repository Steward to "Review WORKORDERS.md" and "Review SCOREBOARD.md" as unconditional first steps, without a path — and, as of this reconciliation, **no `WORKORDERS.md` or `SCOREBOARD.md` exists anywhere in `main`'s history**, at the repository root or under `docs/launch/`. `docs/releases/version-1-readiness.md` separately describes itself as "the canonical, continuously-updated Version 1 readiness assessment," a claim its own commit history contradicts (see the notice added to that file). Both were live, load-bearing contradictions a Repository Steward session would hit immediately, not cosmetic issues.

## Current state of the gap (as of this reconciliation)

`docs/launch/WORKORDERS.md` and `docs/launch/SCOREBOARD.md` **do exist and are actively maintained** — on the `docs/launch-command-center` branch, which also carries the actual engineering work executing LAUNCH-001's Gate A (City Sheet schema, storage, candidate compilation, the Human Steward Verification Workflow, and the V1 Scope Lockdown closing voice/Academy/Pods for the pilot). That branch had not been merged to `main` as of this reconciliation. RS-001 is a governance-documents-only change and deliberately does not merge that branch or import its files — doing so here would pull unreviewed application, schema, and test changes into a documentation-only change set. **The concrete next step this reconciliation recommends is merging `docs/launch-command-center` into `main`** (or a reviewed equivalent), which resolves this gap directly rather than by further documentation.

Until that merge happens, a Repository Steward session working from `main` alone has `LAUNCH-001` (scope) but no live registry or status for it — `docs/releases/version-1-readiness.md` remains the most current committed technical evidence on `main`, understood as historical (frozen at WO-030) rather than live.

**Resolved:** `docs/launch-command-center` merged to `main` first, bringing `WORKORDERS.md` and `SCOREBOARD.md` into this folder for real; this document (RS-001) merged immediately after. All four rows in the hierarchy above are now live on `main` simultaneously — the paragraphs above are preserved as the historical record of the gap between the two merges, not a description of the current state.
