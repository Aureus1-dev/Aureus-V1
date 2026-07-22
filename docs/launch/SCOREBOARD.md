# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-22

---

## Overall Progress

**8% (4 of 49 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete. No Gate A–F work order has started. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (4/49), consistent with how this scoreboard has counted progress since the registry was established.

## Overall Launch Readiness

**Not ready. Gate A is open; nothing else has started.**

The Pre-Gate blocker is cleared: launch metro, invitation path, steward staffing, and Gate F's target date are all decided (see `WORKORDERS.md` → Pre-Gate → Decision Record). Gate A (the city sheet) may now begin. Gates B–F remain sequentially gated behind it, per LAUNCH-001's "each blocking the next."

## Current Gate

**Gate A — The City Sheet.**

## Current Work Order

**A1 — Define city sheet schema.** Highest-priority (Critical) Gate A item with no unmet dependency — it has none. A3 (Compile candidate referral list) is also unblocked, since its only dependency, P1, is now satisfied, and may run in parallel with A1; A2 and A4 remain sequenced behind A1/A3.

## Current Focus

Beginning Gate A: standing up the verified city sheet for Chester and Delaware County, PA.

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| A2 – Build city sheet storage | A1 (not yet done) | Awaiting schema |
| A4 – Human-verify every referral | A2, A3 (not yet done) | Awaiting storage + candidate list |
| B3 – Connect Clearing to verified city sheet | Gate A (not complete) | Cannot start |
| B6 – Draft the 10 drill scripts | Gate A (not complete) | Cannot start |
| C3 – Implement curated Search | Gate A (not complete) | Cannot start |
| Gate B (remaining work orders) | Gate A | Not started |
| Gate C (remaining work orders) | Gate A | Not started |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E | Not started |

P1–P4 no longer appear as blockers — all four are Founder Approved / Complete.

## Completed This Week

- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21). Recorded in `WORKORDERS.md`'s Pre-Gate Decision Record; Pre-Gate work orders and their dependents updated accordingly.

## Next Recommended Task

**Begin A1 — Define city sheet schema** for the Chester/Delaware County, PA referral sheet (crisis lines, assistance programs, legal aid, food resources). A3 (compiling the candidate referral list for the same metro) can proceed in parallel, since both are now dependency-clear.

## Repository Health

No change to repository health from this update. Only `WORKORDERS.md` and `SCOREBOARD.md` were edited to record Founder decisions and their downstream unblocking; `LAUNCH-001-First-Members.md` was not modified, and no production code was touched.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | **In Progress** | 0% (0/6 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 (satisfied) |
| C | The spine | Not Started | 0% (0/10 work orders) | Engineering | Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column. Gate A is marked In Progress because it is the open, current gate — no individual Gate A work order has been started yet.
