# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-22

---

## Overall Progress

**0% implemented.**

No launch feature work has begun. The only work completed to date is the creation of this command center itself (`README.md`, `WORKORDERS.md`, `SCOREBOARD.md`) — the system for managing the launch, not the launch.

## Overall Launch Readiness

**Not ready. Blocked before Gate A can open.**

Four Founder decisions (P1–P4) sit ahead of every Gate. Until they're resolved, no work order in Gates A–F can be picked up, because each Gate's scope depends on at least one of them (the metro determines Gate A's city sheet; the invitation path shapes Gate F's outreach; steward staffing determines what Gate B/D can actually run; Gate F's date affects sequencing pressure across all gates).

## Current Gate

**Pre-Gate — Founder Decisions Required.** None of Gates A–F are open yet.

## Current Work Order

**P1 — Confirm the launch metro.** First of four blocking Pre-Gate decisions; the others (P2, P3, P4) are also open and unblocked by each other, but P1 is listed first because Gate A's entire scope (the city sheet) is meaningless without a named city.

## Current Focus

Awaiting Founder resolution of the Pre-Gate decisions. No engineering or stewardship work is in flight.

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| P1 – Launch metro | Founder decision | Gate A cannot start |
| P2 – Invitation path (partner vs. direct) | Founder decision | Gate F outreach cannot be planned |
| P3 – Steward staffing | Founder decision | Gate B, D cannot be resourced |
| P4 – Gate F date ambition | Founder decision | No launch timeline exists |
| Gate A (all work orders) | P1 | Not started |
| Gate B (all work orders) | Gate A, P3 | Not started |
| Gate C (all work orders) | Gate A | Not started |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E, P2, P4 | Not started |

## Completed This Week

- Created the Launch Command Center (`README.md`, `WORKORDERS.md`, `SCOREBOARD.md`) per Work Order 002, converting `LAUNCH-001-First-Members.md`'s Gates and open questions into a tracked, ordered work-order registry with a live status dashboard.

## Next Recommended Task

**Founder resolves P1–P4** (the four questions LAUNCH-001 itself is awaiting: launch metro, invitation path, steward staffing, Gate F date ambition). These are the only items with no engineering dependency and no other blocker — they are pure Founder decisions, and resolving them unblocks Gate A immediately.

## Repository Health

No change to repository health from this work order. This was a documentation-only addition under `docs/launch/`; no existing file was modified, renamed, or moved, and no production code was touched.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | Not Started | 0% (0/6 work orders) | Stewards + Founder | P1 |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 |
| C | The spine | Not Started | 0% (0/10 work orders) | Engineering | Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2, P4 |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column.
