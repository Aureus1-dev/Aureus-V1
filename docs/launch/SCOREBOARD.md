# Launch Scoreboard

Living dashboard for the First Members launch. Source of truth for scope and sequencing is `LAUNCH-001-First-Members.md`; the task breakdown is `WORKORDERS.md`. This file reflects status only — it does not decide anything.

**Last updated:** 2026-07-24

---

## Overall Progress

**22% (11 of 50 work orders complete).**

All four Pre-Gate Founder decisions (P1–P4) are complete. Gate A's schema (A1), storage (A2), candidate list (A3), and verification-workflow tooling (A4-PREP) are done — A4's human phone/contact check is still untouched. Gate B's B1–B4 (V1 Scope Lockdown; arrival screen; consent captured; accessibility/communication preferences captured and applied) are done. Progress is calculated as completed work orders ÷ total work orders across Pre-Gate and Gates A–F (11/50).

## Overall Launch Readiness

**Not ready. Gate A is in progress (4/7 work orders done); Gate B is in progress (4/9 work orders done).**

The Pre-Gate blocker is cleared; the city sheet's data schema (A1), storage/query layer (A2), initial candidate list (A3), and verification-workflow tooling (A4-PREP) are all done. B1 (V1 Scope Lockdown), B2 (arrival screen, three-second return, persistent Urgent-help affordance), B3 (consent and expectations captured, retrievable later), and B4 (accessibility/communication preferences captured and applied — reduced motion) are all done — voice, Academy, and Pods are closed to members; a member reaches a working arrival screen with an always-available Urgent-help affordance; a member cannot proceed past arrival without granting consent, and their preferences observably change their experience from that point on. Per a Founder Decision approved 2026-07-24 (see "Governance" below), Gate B and Gate C were substantially rescoped and renamed; Gate B now owns everything from first arrival through a working "How can we help?" hand-off, and does **not** depend on Gate A — B5–B9 are unblocked and may begin now. **No candidate referral may be used by the Clearing until a Human Steward actually verifies it via the A4-PREP tooling — building the workflow is not the same as using it, and this readiness note is not a claim that the city sheet is trustworthy yet.** The Urgent-help affordance added in B2 deliberately shows only static, universal safety information (911, 988, Crisis Text Line) — it does not imply Aureus can already detect urgency or discover verified resources; that is Gate C's C1–C7, not yet built.

## Governance

A Founder Decision approved 2026-07-24 reconciled a naming/scope conflict between LAUNCH-001's original Gate B ("The Clearing Drill") / Gate C ("The Spine") text and later Production Execution Order guidance that reused "Gate B" and "Gate C" for different content. The decision (now binding, recorded in full in `WORKORDERS.md`'s Revision History):

- **Gate A** is renamed "The Foundation" (content unchanged).
- **Gate B** is renamed "The Gate" — owns everything from first arrival until "How can we help?" Does not depend on Gate A.
- **Gate C** is renamed "The Clearing" — owns understanding, clarification, urgency assessment, resource discovery, verified resource presentation, steward escalation, safe failure. C1–C8 (build/fixture work) do not depend on Gate A; only C9 (real-member production verification) does.
- **Gates D–F are unchanged.**
- Work orders describe observable behavior and outcomes, never Experience Canon rooms (the Bench, Greeting, Shelf, Seal, Leaving, etc. remain Experience Canon, not engineering phases).

The old V1 Gate B/C work orders are preserved as a superseded historical record in `WORKORDERS.md`, not deleted.

## Current Gate

**Gate A — The Foundation** (in progress, human-verification-blocked) and **Gate B — The Gate** (in progress, unblocked, proceeding in parallel).

## Current Work Order

**A4 — Human-verify every referral** (blocking, human-owned) and **B5 — Authenticated and unauthenticated behavior is correct** (next engineering work). A1, A2, A3, and A4-PREP are all done; A4's dependencies are fully satisfied — this is real-world phone/contact verification work for a Human Steward, not an engineering task. 8 candidates are waiting, one of which (Media Food Bank) is flagged lower-confidence and should be checked especially carefully. The full runbook is `docs/launch/A4-Verification-Guide.md`. In parallel, B1–B4 are done and B5–B9 are unblocked; B5 (an unauthenticated visitor and an authenticated member each see the correct arrival behavior, with no leakage of one state into the other) is the next engineering work order.

## Current Focus

The Gate B/Gate C naming conflict previously flagged here has been resolved by Founder decision (see "Governance" above) and reflected in `WORKORDERS.md` V2. B2, B3, and B4 are now done. Engineering can continue on Gate B (B5–B9) without waiting on Gate A, and can build and test Gate C's C1–C8 against labeled fixtures ahead of A4 as well. Only Gate C's C9 (real-member production verification) remains gated on Gate A. In parallel, A4 (human phone verification of all 8 candidates) remains the last item standing before Gate A's remaining engineering work order (A5) and sign-off (A6).

## Blocked Items

| Item | Blocked By | Effect |
|---|---|---|
| C9 – Gate C production verification (real members) | Gate A (A6, not complete) | Cannot start |
| Gate D (all work orders) | Gate C | Not started |
| Gate E (all work orders) | Gate C | Not started |
| Gate F (all work orders) | Gates A–E | Not started |

P1–P4, A1, A2, A4-PREP, B1, B2, B3, and B4 no longer appear as blockers. A3 no longer blocks A4 (one of its three dependencies) — but A3's candidates themselves remain UNVERIFIED and must not be treated as trustworthy until A4 completes. Gate B (B5–B9) and Gate C's build/fixture work (C1–C8) are no longer blocked on Gate A, per the Founder's Gate B/Gate C Reconciliation decision.

## Completed This Week

- **B4 — Accessibility and communication preferences are captured and applied**: `ThemeProvider` already had a fully built, already-effective reduced-motion mechanism (the `data-reduced-motion` DOM attribute, already zeroing motion-duration tokens) — the real gap was no member-facing way to set it. New `PreferencesStep` (second step of arrival, after consent) lets a member toggle "Reduce motion and animation," wired straight into that existing mechanism — no new backend, schema, or token work. A test confirms the DOM attribute actually flips on toggle and stays applied past the step that set it. Deliberately left `Profile.preferredLanguage` (already has its own Profile-page UI) and the dormant `PreferencesContext.notificationsEnabled` (would collide with the real Communication System `NotificationPreferences` domain) out of scope.
- **B3 — Consent and expectations are captured**: new append-only `ConsentRecord` model + migration, and a self-only `apps/api/src/consent/` module (`POST`/`GET /users/:userId/consent`) mirroring the `SavedOpportunities` auth pattern. `CURRENT_CONSENT_VERSION` mirrored between backend and frontend (not shared, matching B1's precedent). A new `ConsentStep` is now the first step of arrival for a genuine first-run member — states what Aureus remembers, who can see it, and how to reach real urgent help — and a member cannot advance without it; a returning member starting a new mission skips it. New `classify-arrival-error.ts` gives arrival steps that call the API directly the same error handling the Journey/Opportunities/Recommendations state modules use (reused by B4 and set up for B8).
- **B2 — First arrival is observable and safe**: the arrival screen (`/welcome` → `WelcomeFlow`) already distinguished new members (shown `FirstRunWelcome`) from returning members (redirected to `/home`); this work order closed the two real gaps. New persistent `UrgentHelpAffordance` (`apps/web/design-system/components/urgent-help/`), mounted once in the member layout so it is present on every member surface — fixed bottom-left, the one corner neither `StewardWorkspace` (bottom-right) nor `GlobalActionPalette` (top-right) occupies. It has no dependency on any API, so it cannot fail from backend downtime, and shows only static, universally true safety information (911, 988 Suicide & Crisis Lifeline, Crisis Text Line) — it honestly notes that Aureus's own local resource guide isn't verified yet, rather than implying a capability (crisis detection, resource discovery, steward paging) that doesn't exist — those remain Gate C's C1/C3/C4/C6, not yet built. Also added an automated test asserting the existing returning-member redirect fires within the 3-second budget LAUNCH-001 sets, closing a test gap (the redirect logic itself was already correct). No backend, schema, or migration change. Full `apps/web` suite 101/101 suites, 525/525 tests passing (net +1 suite, +7 tests, zero regressions); `tsc --noEmit`, `next lint`, and `next build` (all 36 routes) all clean.
- **Founder Decision — Gate B/Gate C Reconciliation:** resolved the naming and scope conflict between LAUNCH-001's original Gate B/Gate C text and the Production Execution Order's later reuse of those labels. Gate A renamed "The Foundation" (unchanged content); Gate B renamed "The Gate" and rescoped to own first arrival through "How can we help?" (not blocked on Gate A); Gate C renamed "The Clearing" and rescoped to own understanding through safe failure (build/fixture work C1–C8 not blocked on Gate A; only real-member production verification C9 is). `WORKORDERS.md` rewritten as V2 to reflect this; the superseded V1 Gate B/C content is preserved as a historical record, not deleted. Old C2 (V1 Scope Lockdown) is preserved and renumbered as new B1, still Done.
- Founder decided all four Pre-Gate items (P1–P4): launch metro (Chester and Delaware County, PA), invitation path (direct invitations first), steward staffing (Founder + one trusted human steward), and Gate F date ambition (readiness-gated, internal target 2026-08-21).
- A1 — Defined the Launch City Sheet data schema: `CitySheetEntry` model (plus `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, `CitySheetEntryStatus` enums) added to `prisma/schema.prisma`, with migration `20260722140000_add_launch_city_sheet`. No organizations populated — structure only.
- A2 — Built the Launch City Sheet storage layer: `apps/api/src/city-sheet/` (repository interface + Prisma implementation, `CitySheetService`, `CitySheetController`, DTOs), wired into `app.module.ts` and the `city-sheet` Swagger tag. CRUD, archive, verify, and flag-for-review, all gated to Steward/Platform Administrator.
- A3 — Compiled and loaded the initial candidate referral list: 8 candidates (2 crisis lines, 2 food resources, 2 county assistance offices, 1 dual-county legal aid org, 1 statewide 211 line) via web research, each with a source citation, nothing fabricated. Loaded via an idempotent seed, all `verificationStatus: UNVERIFIED`, all `launchScope: CORE_LAUNCH_COUNTY`.
- A4-PREP — Built the Human Steward Verification Workflow (docs/launch/A4-Verification-Guide.md is the runbook), without performing any verification: a `REJECTED` verification status and `rejectionReason`/`verificationConfidence` fields; `sourceNotes` split out from `verificationNotes` so a steward's call notes can never overwrite the original A3 citation (a data migration moved existing citation text across automatically); a config-driven `CitySheetChecklistItem` table (20 default items seeded — 7 common + 13 category-specific — editable by Operations via API, no deploy needed); an append-only `CitySheetVerificationEvent` table so no verification event is ever lost; new `GET /city-sheet/:id/verification-guide`, `GET /city-sheet/:id/verification-history`, and `POST /city-sheet/:id/reject` endpoints; `verify`/`flag-for-review` extended to record confidence and structured checklist responses. Governance unchanged. Verified end-to-end against a live database, 30 new unit tests, full `apps/api` suite (110/112 suites pass — same 2 pre-existing Voice Domain failures, confirmed unrelated), `tsc --noEmit`, `eslint`.
- **B1 (formerly C2) — V1 Scope Lockdown**: voice, Academy, and Pods (LAUNCH-001's fully-built, explicitly-refused member domains — "No Pods, no Academy... voice entirely") are now unreachable by a V1 member, recoverable by a single flag. One central config (`apps/api/src/config/v1-feature-scope.ts`, mirrored at `apps/web/lib/config/v1-feature-scope.ts`), all three flags default off. Backend: `V1ScopeMiddleware` registered once ahead of every guard/controller, 404s `/ai/voice`, `/academy`, `/pods` for everyone while their flag is off — closes every current and future sub-controller in those trees by construction, not per-controller annotation; the AI Steward's `navigate_to_route` tool allow-list drops `academy` too, closing a client-side-state bypass a plain nav audit would have missed. Frontend: the single nav/routing-scaffold source of truth (`primarySurfaces`) filters out Academy/Pods; their routes redirect to `/home` directly, closing the stale-link/direct-route bypass; `VoiceOrchestrator` only mounts when its flag is on; `StewardWorkspace`'s voice UI is flag-gated as defense in depth. Nothing was deleted — every gated feature stays fully built and recoverable. A real bug was caught during verification: the middleware initially read `req.path`, which Express 5 resolves to `/` for a `forRoutes('*')` mount, making it a silent no-op; fixed to `req.originalUrl`, proven via a new end-to-end test against the real HTTP/guard stack. Full validation: `tsc --noEmit`/`eslint` clean both apps; `apps/api` 113/115 suites passing (same pre-existing Voice Domain/Recommendations flakiness and one pre-existing AI-summarize 503, both reproduced identically on an unmodified baseline); `apps/web` 100/100 suites, 518/518 tests passing.

## Next Recommended Task

**Two independent tracks, unblocked in parallel:**
1. **A4 — Human-verify every referral** (Human Stewards): pull the queue (`GET /city-sheet?verificationStatus=UNVERIFIED`), fetch each candidate's `verification-guide`, make the call, record the outcome via `verify`/`reject`/`flag-for-review` with a confidence level. Start with the two crisis lines; treat "Media Food Bank" as needing extra care.
2. **B5 — Authenticated and unauthenticated behavior is correct** (Engineering): verify (and fix any gap found) that an unauthenticated visitor and an authenticated member each see the correct arrival behavior, with no leakage of one state into the other.

## Repository Health

No regression. B3 added a new backend module (`apps/api/src/consent/`, new migration `20260724061755_add_consent_records`) and a new frontend arrival step (`ConsentStep`); B4 added one new frontend arrival step (`PreferencesStep`) wired to an existing, already-tested mechanism (`ThemeProvider`'s motion preference) with no backend/schema change. `tsc --noEmit`, `next lint`, and `next build` (all 36 routes) are clean for `apps/web`; `tsc --noEmit` clean for `apps/api`. Full `apps/web` Jest suite: 101/101 suites, 527/527 tests passing. Full `apps/api` Jest suite (against a live database): 115/117 suites passing, with the only failures (Voice Domain/Recommendations flakiness in `ai.e2e.spec.ts`, one AI-summarize 503 in `connected-experiences.e2e.spec.ts`) confirmed pre-existing by reproducing them identically against an unmodified baseline — the new `consent` suites (unit + e2e) pass cleanly. B2 (prior work order) added one new frontend component directory (`UrgentHelpAffordance`) with no backend/schema change; B1 (prior, under its earlier "C2" label) added one new backend middleware + config module — both previously validated clean and unaffected by this week's changes.

---

## Gates A–F

| Gate | Title | Status | Progress | Owner | Dependencies |
|---|---|---|---|---|---|
| A | The Foundation | **In Progress** | 57% (4/7 work orders) | Stewards + Founder | P1 (satisfied) |
| B | The Gate | **In Progress** | 44% (4/9 work orders) | Engineering | None (proceeds in parallel with Gate A) |
| C | The Clearing | Not Started | 0% (0/9 work orders) | Engineering | Gate B (B9) functional; C1–C8 not blocked by Gate A, C9 requires Gate A |
| D | The Tending Run | Not Started | 0% (0/7 work orders) | Engineering + Stewards | Gate C |
| E | Memory rights live | Not Started | 0% (0/6 work orders) | Engineering | Gate C |
| F | The Founding Review | Not Started | 0% (0/8 work orders) | Founder | Gates A–E, P2 (satisfied), P4 (satisfied, target 2026-08-21) |

Nothing in Gates A–F may begin ahead of its listed dependency, per LAUNCH-001's execution order ("each blocking the next") and WORKORDERS.md's per-item Dependencies column, except where a Founder decision has explicitly authorized parallel work: B1–B4 (proceeded in parallel with A4), and now all of Gate B (B5–B9) and Gate C's fixture-based work (C1–C8), per the Gate B/Gate C Reconciliation decision.
