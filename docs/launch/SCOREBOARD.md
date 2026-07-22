# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-22

---

## Overall Progress

**16% (8 of 50 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete. Gate A's schema (A1), storage (A2), candidate list (A3), and the new Human Steward Verification Workflow tooling (A4-PREP) are all done. "Done" for A3 means the candidates are compiled and loaded, not verified, and A4-PREP means the tooling to verify them exists, not that any verification happened — A4's human phone/contact check is still entirely untouched. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (8/50 — Gate A grew from 6 to 7 work orders when A4-PREP was added), consistent with how this scoreboard has counted progress since the registry was established.

## Overall Launch Readiness

**Not ready. Gate A is in progress (4/7 work orders done).**

The Pre-Gate blocker is cleared; the city sheet's data schema (A1), storage/query layer (A2), initial candidate list (A3), and verification-workflow tooling (A4-PREP) are all done. Gates B–F remain sequentially gated behind Gate A's completion, per LAUNCH-001's "each blocking the next." **No candidate referral may be used by the Clearing or Search until a Human Steward actually verifies it via this tooling — building the workflow is not the same as using it, and this readiness note is not a claim that the city sheet is trustworthy yet.**

## Current Gate

**Gate A — The City Sheet.**

## Current Work Order

**A4 — Human-verify every referral.** A1, A2, A3, and A4-PREP are all done; A4's dependencies (A2, A3, A4-PREP) are fully satisfied. This is real-world phone/contact verification work for a Human Steward, not an engineering task — 8 candidates are waiting, one of which (Media Food Bank) is flagged lower-confidence and should be checked especially carefully. The full runbook is `docs/launch/A4-Verification-Guide.md`.

## Current Focus

Gate A: schema (A1), storage (A2), the initial candidate list (A3), and verification tooling (A4-PREP) are done. A4 (human phone verification of all 8 candidates, using the new checklist/call-script/verify/reject workflow) is next and is the last item standing before Gate A's remaining engineering work order (A5, QA spot-check) and sign-off (A6).

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

P1–P4, A1, A2, and A4-PREP no longer appear as blockers. A3 no longer blocks A4 (one of its three dependencies) — but A3's candidates themselves remain UNVERIFIED and must not be treated as trustworthy until A4 completes.

## Completed This Week

- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21).
- A1 — Defined the Launch City Sheet data schema: `CitySheetEntry` model (plus `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, `CitySheetEntryStatus` enums) added to `prisma/schema.prisma`, with migration `20260722140000_add_launch_city_sheet`. No organizations populated — structure only.
- A2 — Built the Launch City Sheet storage layer: `apps/api/src/city-sheet/` (repository interface + Prisma implementation, `CitySheetService`, `CitySheetController`, DTOs), wired into `app.module.ts` and the `city-sheet` Swagger tag. CRUD, archive, verify, and flag-for-review, all gated to Steward/Platform Administrator.
- A3 — Compiled and loaded the initial candidate referral list: 8 candidates (2 crisis lines, 2 food resources, 2 county assistance offices, 1 dual-county legal aid org, 1 statewide 211 line) via web research, each with a source citation, nothing fabricated. Loaded via an idempotent seed, all `verificationStatus: UNVERIFIED`, all `launchScope: CORE_LAUNCH_COUNTY`.
- A4-PREP — Built the Human Steward Verification Workflow (docs/launch/A4-Verification-Guide.md is the runbook), without performing any verification: a `REJECTED` verification status and `rejectionReason`/`verificationConfidence` fields; `sourceNotes` split out from `verificationNotes` so a steward's call notes can never overwrite the original A3 citation (a data migration moved existing citation text across automatically); a config-driven `CitySheetChecklistItem` table (20 default items seeded — 7 common + 13 category-specific — editable by Operations via API, no deploy needed); an append-only `CitySheetVerificationEvent` table so no verification event is ever lost; new `GET /city-sheet/:id/verification-guide` (current facts + applicable checklist + a generated call script), `GET /city-sheet/:id/verification-history` (full permanent log), and `POST /city-sheet/:id/reject` endpoints; `verify`/`flag-for-review` extended to record a HIGH/MEDIUM/LOW confidence and structured checklist responses. Governance unchanged — every mutating route still requires a real, JWT-authenticated Steward/Platform Administrator session; the AI actor that compiled A3's candidates has no access to any of it and cannot authenticate. Verified end-to-end against a live database (a real `verify()` call against a real seeded candidate, checklist combination confirmed for CRISIS_LINE = 9 items, `sourceNotes` provably untouched), 30 new unit tests, full `apps/api` suite (110/112 suites pass — same 2 pre-existing Voice Domain failures, confirmed unrelated), `tsc --noEmit`, `eslint`.

## Next Recommended Task

**Begin A4 — Human-verify every referral**, using the A4-PREP tooling: pull the queue (`GET /city-sheet?verificationStatus=UNVERIFIED`), fetch each candidate's `verification-guide` for a ready-to-read call script, make the call, then record the outcome via `verify`/`reject`/`flag-for-review` with a confidence level. Start with the two crisis lines given their Gate B/emergency importance, and treat "Media Food Bank" as needing extra care per its own `sourceNotes`.

## Repository Health

No regression. A4-PREP added one new migration (additive: new enum value, three new nullable/optional columns, two new tables — no existing column dropped or renamed at the schema level, though `verificationNotes`'s *meaning* narrowed to "steward call notes only" now that `sourceNotes` exists), new checklist and verification-event sub-modules, and extended the existing city-sheet service/controller/DTOs; no existing module was removed. `tsc --noEmit`, `eslint`, and the full Jest suite against a live database all pass clean, with the only failures (Voice Domain, 2 suites) confirmed pre-existing and unrelated.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | **In Progress** | 57% (4/7 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 (satisfied) |
| C | The spine | Not Started | 0% (0/10 work orders) | Engineering | Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column.
