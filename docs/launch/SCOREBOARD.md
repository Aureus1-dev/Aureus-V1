# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-23

---

## Overall Progress

**18% (9 of 50 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete. Gate A's schema (A1), storage (A2), candidate list (A3), and verification-workflow tooling (A4-PREP) are done — A4's human phone/contact check is still untouched. Gate C's C2 (V1 Scope Lockdown) is now also done, ahead of the rest of Gate C, per the Founder's explicit authorization for engineering work that does not depend on A4's human verification to proceed in parallel. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (9/50).

## Overall Launch Readiness

**Not ready. Gate A is in progress (4/7 work orders done); Gate C has begun in parallel (1/10 work orders done).**

The Pre-Gate blocker is cleared; the city sheet's data schema (A1), storage/query layer (A2), initial candidate list (A3), and verification-workflow tooling (A4-PREP) are all done. C2 (V1 Scope Lockdown) is also done — voice, Academy, and Pods are now closed to members at the nav, direct-route, API, and AI-tool-navigation levels, recoverable by a single flag. This is not Gate C beginning ahead of Gate A in sequence: C2 was explicitly authorized to proceed in parallel because it does not depend on verified city-sheet data, while C3 (curated Search) remains blocked on Gate A exactly as before. **No candidate referral may be used by the Clearing or Search until a Human Steward actually verifies it via the A4-PREP tooling — building the workflow is not the same as using it, and this readiness note is not a claim that the city sheet is trustworthy yet.**

## Current Gate

**Gate A — The City Sheet** (primary sequence). **Gate C — C2 done in parallel**, per explicit Founder authorization; the rest of Gate C remains gated behind Gate A as WORKORDERS.md's Dependencies column specifies.

## Current Work Order

**A4 — Human-verify every referral** (blocking, human-owned) and **Gate B decomposition** (next engineering work, per the execution sequence: C2 → Gate B → Gate C). A1, A2, A3, and A4-PREP are all done; A4's dependencies are fully satisfied — this is real-world phone/contact verification work for a Human Steward, not an engineering task. 8 candidates are waiting, one of which (Media Food Bank) is flagged lower-confidence and should be checked especially carefully. The full runbook is `docs/launch/A4-Verification-Guide.md`.

## Current Focus

C2 (V1 Scope Lockdown) is done. Per the execution sequence, the next engineering work is decomposing Gate B into implementation-sized work orders — but WORKORDERS.md's existing Gate B ("The Clearing Drill") / Gate C ("The Spine") breakdown does not match the Founder's newer "Gate B — The Gate" / "Gate C — The Clearing" naming, and that conflict must be reconciled as part of the decomposition, not silently picked one way (see the naming note added to WORKORDERS.md under Gate C). In parallel, A4 (human phone verification of all 8 candidates) remains the last item standing before Gate A's remaining engineering work order (A5) and sign-off (A6).

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| B3 – Connect Clearing to verified city sheet | Gate A (not complete) | Cannot start |
| B6 – Draft the 10 drill scripts | Gate A (not complete) | Cannot start |
| C3 – Implement curated Search | Gate A (not complete) | Cannot start |
| Gate B (remaining work orders) | Gate A | Not started |
| Gate C (remaining work orders, C1/C3–C10) | Gate A | Not started |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E | Not started |

P1–P4, A1, A2, A4-PREP, and C2 no longer appear as blockers. A3 no longer blocks A4 (one of its three dependencies) — but A3's candidates themselves remain UNVERIFIED and must not be treated as trustworthy until A4 completes.

## Completed This Week

- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21).
- A1 — Defined the Launch City Sheet data schema: `CitySheetEntry` model (plus `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, `CitySheetEntryStatus` enums) added to `prisma/schema.prisma`, with migration `20260722140000_add_launch_city_sheet`. No organizations populated — structure only.
- A2 — Built the Launch City Sheet storage layer: `apps/api/src/city-sheet/` (repository interface + Prisma implementation, `CitySheetService`, `CitySheetController`, DTOs), wired into `app.module.ts` and the `city-sheet` Swagger tag. CRUD, archive, verify, and flag-for-review, all gated to Steward/Platform Administrator.
- A3 — Compiled and loaded the initial candidate referral list: 8 candidates (2 crisis lines, 2 food resources, 2 county assistance offices, 1 dual-county legal aid org, 1 statewide 211 line) via web research, each with a source citation, nothing fabricated. Loaded via an idempotent seed, all `verificationStatus: UNVERIFIED`, all `launchScope: CORE_LAUNCH_COUNTY`.
- A4-PREP — Built the Human Steward Verification Workflow (docs/launch/A4-Verification-Guide.md is the runbook), without performing any verification: a `REJECTED` verification status and `rejectionReason`/`verificationConfidence` fields; `sourceNotes` split out from `verificationNotes` so a steward's call notes can never overwrite the original A3 citation (a data migration moved existing citation text across automatically); a config-driven `CitySheetChecklistItem` table (20 default items seeded — 7 common + 13 category-specific — editable by Operations via API, no deploy needed); an append-only `CitySheetVerificationEvent` table so no verification event is ever lost; new `GET /city-sheet/:id/verification-guide`, `GET /city-sheet/:id/verification-history`, and `POST /city-sheet/:id/reject` endpoints; `verify`/`flag-for-review` extended to record confidence and structured checklist responses. Governance unchanged. Verified end-to-end against a live database, 30 new unit tests, full `apps/api` suite (110/112 suites pass — same 2 pre-existing Voice Domain failures, confirmed unrelated), `tsc --noEmit`, `eslint`.
- **C2 — V1 Scope Lockdown**: voice, Academy, and Pods (LAUNCH-001's fully-built, explicitly-refused member domains — "No Pods, no Academy... voice entirely") are now unreachable by a V1 member, recoverable by a single flag. One central config (`apps/api/src/config/v1-feature-scope.ts`, mirrored at `apps/web/lib/config/v1-feature-scope.ts`), all three flags default off. Backend: `V1ScopeMiddleware` registered once ahead of every guard/controller, 404s `/ai/voice`, `/academy`, `/pods` for everyone while their flag is off — closes every current and future sub-controller in those trees by construction, not per-controller annotation; the AI Steward's `navigate_to_route` tool allow-list drops `academy` too, closing a client-side-state bypass a plain nav audit would have missed. Frontend: the single nav/routing-scaffold source of truth (`primarySurfaces`) filters out Academy/Pods; their routes redirect to `/home` directly, closing the stale-link/direct-route bypass; `VoiceOrchestrator` only mounts when its flag is on; `StewardWorkspace`'s voice UI is flag-gated as defense in depth. Nothing was deleted — every gated feature stays fully built and recoverable. A real bug was caught during verification: the middleware initially read `req.path`, which Express 5 resolves to `/` for a `forRoutes('*')` mount, making it a silent no-op; fixed to `req.originalUrl`, proven via a new end-to-end test against the real HTTP/guard stack. Full validation: `tsc --noEmit`/`eslint` clean both apps; `apps/api` 113/115 suites passing (same pre-existing Voice Domain/Recommendations flakiness and one pre-existing AI-summarize 503, both reproduced identically on an unmodified baseline); `apps/web` 100/100 suites, 518/518 tests passing.

## Next Recommended Task

**Two independent tracks, per the Production Execution Order:**
1. **A4 — Human-verify every referral** (Human Stewards): pull the queue (`GET /city-sheet?verificationStatus=UNVERIFIED`), fetch each candidate's `verification-guide`, make the call, record the outcome via `verify`/`reject`/`flag-for-review` with a confidence level. Start with the two crisis lines; treat "Media Food Bank" as needing extra care.
2. **Gate B decomposition** (Engineering): convert "the Gate" (first arrival, welcome, consent, accessibility preferences, authenticated/unauthenticated behavior, steward visibility, failure/recovery) into implementation-sized work orders, first reconciling the naming conflict flagged in WORKORDERS.md. Build it as a new build, not a port — the same standard set for Gate C ("the Clearing") after it.

## Repository Health

No regression. C2 added one new backend middleware + config module (both new files, nothing existing removed), a small filter added to the existing `primarySurfaces` array and `INTERFACE_ALLOWED_ROUTES` list, two route-level redirects, and one defensive flag-check inside `StewardWorkspace` — no schema or migration change. `tsc --noEmit`, `eslint`, and the full Jest suite against a live database all pass clean on both apps, with the only failures (Voice Domain/Recommendations flakiness in `ai.e2e.spec.ts`, one AI-summarize 503 in `connected-experiences.e2e.spec.ts`) confirmed pre-existing by reproducing them identically against an unmodified baseline.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The city sheet | **In Progress** | 57% (4/7 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Clearing drill | Not Started | 0% (0/8 work orders) | Stewards + Founder | Gate A, P3 (satisfied) |
| C | The spine | **In Progress** | 10% (1/10 work orders) | Engineering | Gate A (C2 authorized to proceed in parallel; C1, C3–C10 remain gated) |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column, except C2 — explicitly authorized by the Founder to proceed in parallel with A4 because it does not depend on verified city-sheet data.
