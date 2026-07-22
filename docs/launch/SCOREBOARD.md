# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-22

---

## Overall Progress

**12% (6 of 49 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete, and Gate A's first two work orders (A1 — city sheet schema, A2 — city sheet storage) are done. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (6/49), consistent with how this scoreboard has counted progress since the registry was established.

## Overall Launch Readiness

**Not ready. Gate A is in progress (2/6 work orders done).**

The Pre-Gate blocker is cleared; the city sheet's data schema (A1) and storage/query layer (A2) are both done. Gates B–F remain sequentially gated behind Gate A's completion, per LAUNCH-001's "each blocking the next."

## Current Gate

**Gate A — The City Sheet.**

## Current Work Order

**A3 — Compile candidate referral list.** A1 and A2 are done. A3's only dependency, P1, is satisfied, so it is the next highest-priority (Critical) unblocked item; it does not depend on A1/A2. A4 (Human-verify every referral) depends on A3 and is not yet startable.

## Current Focus

Gate A: schema (A1) and storage (A2) are done; next is compiling the candidate referral list for Chester and Delaware County, PA (A3), which A4's human verification pass depends on.

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| A4 – Human-verify every referral | A3 (not yet done) | Awaiting candidate list |
| B3 – Connect Clearing to verified city sheet | Gate A (not complete) | Cannot start |
| B6 – Draft the 10 drill scripts | Gate A (not complete) | Cannot start |
| C3 – Implement curated Search | Gate A (not complete) | Cannot start |
| Gate B (remaining work orders) | Gate A | Not started |
| Gate C (remaining work orders) | Gate A | Not started |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E | Not started |

P1–P4 no longer appear as blockers — all four are Founder Approved / Complete. A1 and A2 no longer appear as blockers — both are Done.

## Completed This Week

- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21).
- A1 — Defined the Launch City Sheet data schema: `CitySheetEntry` model (plus `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, `CitySheetEntryStatus` enums) added to `prisma/schema.prisma`, with migration `20260722140000_add_launch_city_sheet`. Verified via `prisma validate`, a from-scratch `prisma migrate deploy` alongside all 23 prior migrations, `prisma migrate status` (zero drift), `prisma generate`, and a clean `apps/api` type-check. No organizations populated — structure only.
- A2 — Built the Launch City Sheet storage layer: `apps/api/src/city-sheet/` (repository interface + Prisma implementation, `CitySheetService`, `CitySheetController`, DTOs), wired into `app.module.ts` and the `city-sheet` Swagger tag. Supports create, list/search, get by ID or ref, update, archive, verify, and flag-for-review, all gated to Steward/Platform Administrator (no per-entry owner — LAUNCH-001: "Ownership: stewards + Founder"). `launchScope` and the full UNVERIFIED/VERIFIED/NEEDS_REVIEW lifecycle are enforced in the service and covered by 19 new unit tests. Verified via a from-scratch database: `prisma migrate deploy`, the full `apps/api` unit suite (106/108 suites pass — the 2 remaining failures are pre-existing Voice Domain realtime-session flakiness confirmed present on `HEAD~1`, unrelated to this work order), `tsc --noEmit`, and `eslint`. No organizations populated, no data scraped or imported, no UI built.

## Next Recommended Task

**Begin A3 — Compile candidate referral list** for Chester and Delaware County, PA (crisis lines, assistance programs, legal aid, food resources), using the `POST /city-sheet` endpoint A2 now provides. A4 (human verification) follows once A3 produces candidates.

## Repository Health

No regression. A2 added one new backend domain module (`apps/api/src/city-sheet/`, 13 files) and two Swagger/module-registration edits (`app.module.ts`, `main.ts`); no existing module, service, or migration was modified. `tsc --noEmit`, `eslint`, and the full Jest suite against a live database all pass clean, with the only failures (Voice Domain, 2 suites) confirmed pre-existing and unrelated by re-running them against the same database without this branch's changes.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | **In Progress** | 33% (2/6 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 (satisfied) |
| C | The spine | Not Started | 0% (0/10 work orders) | Engineering | Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column.
