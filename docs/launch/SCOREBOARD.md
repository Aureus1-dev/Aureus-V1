# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-22

---

## Overall Progress

**14% (7 of 49 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete, and Gate A's first three work orders (A1 — city sheet schema, A2 — city sheet storage, A3 — candidate referral list) are done. "Done" for A3 means the candidates are compiled and loaded, not verified — A4's human phone/contact check is still required before any of them may be relied upon. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (7/49), consistent with how this scoreboard has counted progress since the registry was established.

## Overall Launch Readiness

**Not ready. Gate A is in progress (3/6 work orders done).**

The Pre-Gate blocker is cleared; the city sheet's data schema (A1), storage/query layer (A2), and initial candidate list (A3) are all done. Gates B–F remain sequentially gated behind Gate A's completion, per LAUNCH-001's "each blocking the next." **No candidate referral may be used by the Clearing or Search until A4 verifies it — this readiness note is not a claim that the city sheet is trustworthy yet.**

## Current Gate

**Gate A — The City Sheet.**

## Current Work Order

**A4 — Human-verify every referral.** A1–A3 are done; A4's dependencies (A2, A3) are both satisfied. This is real-world phone/contact verification work for a Human Steward, not an engineering task — 8 candidates are waiting, one of which (Media Food Bank) is flagged lower-confidence and should be checked especially carefully.

## Current Focus

Gate A: schema (A1), storage (A2), and the initial candidate list (A3) are done. A4 (human phone verification of all 8 candidates) is next and is the last item standing before Gate A's remaining engineering work order (A5, QA spot-check) and sign-off (A6).

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| B3 – Connect Clearing to verified city sheet | Gate A (not complete) | Cannot start |
| B6 – Draft the 10 drill scripts | Gate A (not complete) | Cannot start |
| C3 – Implement curated Search | Gate A (not complete) | Cannot start |
| Gate B (remaining work orders) | Gate A | Not started |
| Gate C (remaining work orders) | Gate A | Not started |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E | Not started |

P1–P4, A1, and A2 no longer appear as blockers. A3 no longer blocks A4 (its only dependent) — but A3's candidates themselves remain UNVERIFIED and must not be treated as trustworthy until A4 completes.

## Completed This Week

- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21).
- A1 — Defined the Launch City Sheet data schema: `CitySheetEntry` model (plus `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, `CitySheetEntryStatus` enums) added to `prisma/schema.prisma`, with migration `20260722140000_add_launch_city_sheet`. Verified via `prisma validate`, a from-scratch `prisma migrate deploy` alongside all 23 prior migrations, `prisma migrate status` (zero drift), `prisma generate`, and a clean `apps/api` type-check. No organizations populated — structure only.
- A2 — Built the Launch City Sheet storage layer: `apps/api/src/city-sheet/` (repository interface + Prisma implementation, `CitySheetService`, `CitySheetController`, DTOs), wired into `app.module.ts` and the `city-sheet` Swagger tag. Supports create, list/search, get by ID or ref, update, archive, verify, and flag-for-review, all gated to Steward/Platform Administrator. 19 new unit tests. Verified via a from-scratch database: `prisma migrate deploy`, the full `apps/api` unit suite (106/108 suites pass — the 2 remaining failures are pre-existing Voice Domain realtime-session flakiness), `tsc --noEmit`, and `eslint`.
- A3 — Compiled and loaded the initial candidate referral list: 8 candidates (2 crisis lines, 2 food resources, 2 county assistance offices, 1 dual-county legal aid org, 1 statewide 211 line) via web research, each with a source citation in `verificationNotes` and nothing fabricated — unconfirmed fields (most `eligibilityRequirements`, all `languagesSupported`/`accessibilityNotes`, several `hours`/`address`) were left blank or explicitly marked "not yet confirmed" rather than guessed. Loaded via a new idempotent seed (`apps/api/src/scripts/seed-city-sheet-candidates.ts` + `city-sheet-candidates.data.ts`, wired into `apps/api/prisma/seed.ts`), all `verificationStatus: UNVERIFIED`, all `launchScope: CORE_LAUNCH_COUNTY`. Verified end-to-end against a live database: seed run twice (8 created, then 0 created / 8 skipped — proving idempotency and zero duplicates), direct SQL confirms correct status/scope/no duplicate organization names, 9 new unit tests, full `apps/api` suite (107/109 suites pass — same 2 pre-existing Voice Domain failures, confirmed unrelated), `tsc --noEmit`, `eslint`.

## Next Recommended Task

**Begin A4 — Human-verify every referral.** A Human Steward should phone/contact-verify each of the 8 candidates via `POST /city-sheet/:id/verify` (or `flag-for-review` if something's wrong), starting with the two crisis lines given their Gate B/emergency importance, and treating "Media Food Bank" as needing extra care per its own verificationNotes.

## Repository Health

No regression. A3 added one new seed data file, one new seed function + its unit test, and a small extension to the existing `apps/api/prisma/seed.ts` entrypoint (restructured into two named functions, no change to existing admin-bootstrap behavior); no existing module, service, migration, or schema was modified. `tsc --noEmit`, `eslint`, and the full Jest suite against a live database all pass clean, with the only failures (Voice Domain, 2 suites) confirmed pre-existing and unrelated.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | **In Progress** | 50% (3/6 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 (satisfied) |
| C | The spine | Not Started | 0% (0/10 work orders) | Engineering | Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column.
