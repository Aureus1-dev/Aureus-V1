# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-22

---

## Overall Progress

**10% (5 of 49 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete, and Gate A's first work order (A1 — city sheet schema) is done. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (5/49), consistent with how this scoreboard has counted progress since the registry was established.

## Overall Launch Readiness

**Not ready. Gate A is in progress (1/6 work orders done).**

The Pre-Gate blocker is cleared and A1 (the city sheet data schema) is done. Gates B–F remain sequentially gated behind Gate A's completion, per LAUNCH-001's "each blocking the next."

## Current Gate

**Gate A — The City Sheet.**

## Current Work Order

**A3 — Compile candidate referral list.** A1 is done. A3's only dependency, P1, is satisfied, so it is the next highest-priority (Critical) unblocked item; it does not depend on A1. A2 (Build city sheet storage) is also unblocked now that A1 is done and may proceed in parallel with A3.

## Current Focus

Gate A: the city sheet schema is defined (A1); next is standing up storage (A2) and compiling the candidate referral list for Chester and Delaware County, PA (A3).

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| A4 – Human-verify every referral | A2, A3 (not yet done) | Awaiting storage + candidate list |
| B3 – Connect Clearing to verified city sheet | Gate A (not complete) | Cannot start |
| B6 – Draft the 10 drill scripts | Gate A (not complete) | Cannot start |
| C3 – Implement curated Search | Gate A (not complete) | Cannot start |
| Gate B (remaining work orders) | Gate A | Not started |
| Gate C (remaining work orders) | Gate A | Not started |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E | Not started |

P1–P4 no longer appear as blockers — all four are Founder Approved / Complete. A1 no longer appears as a blocker — it is Done.

## Completed This Week

- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21).
- A1 — Defined the Launch City Sheet data schema: `CitySheetEntry` model (plus `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, `CitySheetEntryStatus` enums) added to `prisma/schema.prisma`, with migration `20260722140000_add_launch_city_sheet`. Verified via `prisma validate`, a from-scratch `prisma migrate deploy` alongside all 23 prior migrations, `prisma migrate status` (zero drift), `prisma generate`, and a clean `apps/api` type-check. No organizations populated — structure only.

## Next Recommended Task

**Begin A3 — Compile candidate referral list** for Chester and Delaware County, PA (crisis lines, assistance programs, legal aid, food resources), in parallel with **A2 — Build city sheet storage**, which implements the query/storage layer against the new `CitySheetEntry` schema.

## Repository Health

No regression. This update added one new Prisma model, four new enums, and one migration under `prisma/`, plus documentation updates; no existing model, migration, or file was modified. `prisma validate`, a full migration replay, `prisma generate`, and `apps/api`'s `tsc --noEmit` all pass clean.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | **In Progress** | 17% (1/6 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 (satisfied) |
| C | The spine | Not Started | 0% (0/10 work orders) | Engineering | Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column.
