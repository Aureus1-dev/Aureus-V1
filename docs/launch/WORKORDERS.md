# Launch Work Orders — V2

**Source of truth for launch scope:** `docs/launch/LAUNCH-001-First-Members.md` — read, never edited by implementation work. Every work order below traces to a specific line in that document. Gates are strictly sequential and blocking, per LAUNCH-001's own instruction: *"The Gates — order of execution, each blocking the next."* No work order in a later Gate should begin before every work order in the Gate before it is Done, except where explicitly marked as able to proceed in parallel.

**Revision:** This is **V2** of this document, superseding the V1 Gate B/Gate C structure per an explicit, approved Founder Decision (Gate B/Gate C Reconciliation). What changed, why, and the superseded V1 content are preserved in full at the bottom of this document under **Revision History** — nothing about the prior work is deleted, only superseded as the operative structure.

---

## Experience Architecture vs. Execution Architecture

Two different things live in this repository and must not be conflated:

- **Experience Architecture** — the Canon. The Gate, the Question, the Bench, the Greeting, the Watchkeeper, the Clearing, Memory rights, the Leaving, the Quiet Day, the Homecoming, and any other named "room" are experience-design concepts. They describe how a member should *feel* moving through Aureus. They live in `LAUNCH-001-First-Members.md` and the Experience Canon — not here.
- **Execution Architecture** — this document. Work orders here are organized by **engineering Gate** (A–F, a sequencing/readiness concept) and describe **observable behavior, member outcomes, accessibility, resilience, and production readiness** — never by which Experience Canon room they happen to touch.

A single work order may (and usually will) implement pieces of several Canon rooms at once. That is expected and correct. Do not create a work order titled "Build the Greeting" or "Build the Bench" — describe instead what a member can observably do, safely and accessibly, and to what production standard.

---

## Pre-Gate — Founder Decisions Required

LAUNCH-001 closed with four explicit open questions that blocked downstream work. **All four have now been decided by the Founder.** Pre-Gate is complete; Gate A may begin.

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| P1 | Confirm the launch metro | Select the one city/metro area where the first 25 members and the verified city sheet will live. | None | Founder | Critical | **Founder Approved — Complete** | A named metro area is recorded in this document and in Gate A's scope. |
| P2 | Confirm invitation path | Decide: partner-sourced invitations, direct Founder invitations, or a mix, for the first cohort. | None | Founder | Critical | **Founder Approved — Complete** | Invitation path is documented; Gate F's invitation tasks can reference it concretely. |
| P3 | Confirm steward staffing | Identify and commission the 1–2 human stewards named in LAUNCH-001's "Staffing the Promise" section. | None | Founder | Critical | **Founder Approved — Complete** | Named steward(s) are in place, under WO-025's capacity rules. |
| P4 | Confirm Gate F date ambition | Set a target date (or date range) for the Founding Review and first invitation. | None | Founder | High | **Founder Approved — Complete** | A target date is recorded here and reflected in the Scoreboard. |

### Decision Record

**P1 — Launch Metro**

Decision: Chester and Delaware County, Pennsylvania, within the greater Philadelphia region.

Operating interpretation: The verified city sheet and launch operations begin with resources that directly serve Chester and Delaware County. Greater Philadelphia resources may be included only when they genuinely accept and serve members from the launch area. This is not a general Philadelphia or national launch, and Gate A's scope (A3 in particular) must not silently expand beyond it.

**P2 — Invitation Path**

Decision: Direct invitations first.

Operating interpretation: The first members are personally invited and welcomed by Aureus. Launch readiness does not depend on securing an outside institutional partner. Potential partners may assist with referrals later, but no partner relationship is a prerequisite for Member #1 (see F3).

**P3 — Steward Staffing**

Decision: Founder plus one trusted human steward at initial launch.

Operating interpretation: The Founder provides oversight, review, and surge capacity. The trusted human steward participates in the daily Tending Run and member support. A second commissioned steward must be added before actual active-member volume or case complexity would cause the existing team to violate the quality, response, crisis, or capacity promises in LAUNCH-001. Twenty-five members is a ceiling, not a staffing target — staffing scales with demonstrated volume and complexity, not the stated maximum.

**P4 — Gate F Date Ambition**

Decision: Gate F is readiness-gated, with an internal target date rather than a forced launch deadline.

Target: complete Gates A–E and begin the Founding Review within 30 calendar days of the Founder approving these decisions (Founder approval recorded 2026-07-22; internal target date **2026-08-21**).

Operating interpretation: This is an internal ambition, not permission to bypass a gate. Gate F passes only when: the Founder completes the entire member journey truthfully; a person unfamiliar with Aureus completes the journey without being coached through it; no interface or message implies a capability Aureus does not actually possess; all prior gates have passed; and all release-blocking failures are resolved. If the thirty-day target is missed, the reason must be reported and the forecast revised — acceptance criteria are not to be weakened to hit the date.

---

## Gate A — The Foundation

*Founder Decision: Gate A is renamed "The Foundation," superseding the earlier "The City Sheet" label. This is a naming change only — the scope, content, and status of A1–A6 below are unchanged. LAUNCH-001's own text still reads "Gate A — The city sheet"; per LAUNCH-001's protected, read-only status, that text is not edited. This is a deliberate, Founder-authorized divergence between LAUNCH-001's original wording and this execution track's naming, not an unresolved conflict — unlike the Gate B/Gate C situation this revision exists to fix.*

*LAUNCH-001: "Every crisis and assistance referral for the launch metro verified by a human within 14 days of launch. Ownership: stewards + Founder."*

**Launch metro (P1):** Chester and Delaware County, Pennsylvania, within the greater Philadelphia region. Greater Philadelphia resources are in-scope only when they genuinely accept and serve members from the launch area — this gate does not expand into a general Philadelphia or national scope.

**A1 implementation note:** The schema is defined in `prisma/schema.prisma` as the `CitySheetEntry` model (with `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, and `CitySheetEntryStatus` enums), migration `prisma/migrations/20260722140000_add_launch_city_sheet`. It covers every field this work order lists (organization name, category, description, address, service area, phone, website, hours, eligibility, languages, accessibility notes, cost, required documents, referral-required, emergency-service, last-verified date, verified-by, verification notes, follow-up review date, active/inactive status), plus two fields added to enforce Founder decisions in the data itself rather than only in prose: `launchScope` (encodes P1's core-county-vs-supplemental boundary per entry) and `verificationStatus` (encodes the candidate → verified lifecycle A3/A4 depend on, distinct from active/inactive operating status). No organizations are populated — structure only, per this work order's scope.

**A3 implementation note:** Per Founder decision, the initial candidate list was compiled via web research (not fabricated from memory) and loaded into the A2 storage layer via an idempotent seed script (`apps/api/src/scripts/seed-city-sheet-candidates.ts`, data in `city-sheet-candidates.data.ts`, wired into `apps/api/prisma/seed.ts`; run via `npx prisma db seed`). 8 candidates were loaded, covering 5 of LAUNCH-001's named categories across both counties: 2 crisis lines (Chester County Crisis Services, Delaware County Crisis Connections Team), 2 food resources (Chester County Food Bank, Media Food Bank), 2 county assistance/benefits offices (Chester and Delaware County Assistance Offices), 1 legal aid organization serving both counties (Legal Aid of Southeastern PA), and 1 statewide information/referral line that directly serves both counties (PA 211). Every entry is inserted with `verificationStatus: UNVERIFIED` and `launchScope: CORE_LAUNCH_COUNTY`, and carries a `sourceNotes` citation recording exactly where each fact was sourced and on what date (`sourceNotes` was split out from `verificationNotes` in A4-PREP — see below — so a later steward's call notes can never overwrite the original citation). Fields the source material did not state (most `eligibilityRequirements`, all `languagesSupported`/`accessibilityNotes`/`requiredDocuments`, several `hours` and `address` values) were left blank rather than guessed — several entries' `hours` fields explicitly say "not yet confirmed" instead of a fabricated time. One entry (Media Food Bank) is flagged in its own `sourceNotes` as lower-confidence, sourced from a third-party directory rather than the organization's own site, and should be checked especially carefully in A4. **None of these candidates may be relied upon by Gate C production verification until a human steward completes A4's real phone/contact verification for each one** — this is candidate data only, exactly as A3 requires.

**A2 implementation note:** The storage/query layer lives at `apps/api/src/city-sheet/` — repository interface + Prisma implementation (`repositories/`), `CitySheetService` (create, list/search, get by ID or ref, update, archive, verify, flag-for-review), `CitySheetController` (all routes gated to Steward/Platform Administrator — city sheet entries have no per-entry owner; LAUNCH-001: "Ownership: stewards + Founder"), and DTOs. Wired into `app.module.ts` and the `city-sheet` Swagger tag in `main.ts`. The verification lifecycle from A1 is fully supported: `verify` moves UNVERIFIED/NEEDS_REVIEW → VERIFIED (recording verifier + timestamp, per A4's "100% of entries carry a human verification timestamp and verifier name" criterion); `flagForReview` moves VERIFIED → NEEDS_REVIEW; `archive`/`update({status})` moves ACTIVE ↔ INACTIVE. `launchScope` is a first-class filter and create/update field, so the P1 core-county-vs-Greater-Philadelphia boundary is enforced in queries, not just documentation. No organizations populated, no data scraped or imported, no UI built — infrastructure only, per this work order's scope.

**A4-PREP implementation note (Human Steward Verification Workflow — tooling only, no verification performed):** Per Founder direction, this builds everything A4 needs without doing A4 itself. Full runbook: `docs/launch/A4-Verification-Guide.md`.
- **Schema** (migration `prisma/migrations/20260722163206_add_city_sheet_verification_workflow`): `CitySheetVerificationStatus` gains `REJECTED`; `CitySheetEntry` gains `verificationConfidence` (HIGH/MEDIUM/LOW — recorded for context, never gates whether an action succeeds), `rejectionReason`, and `sourceNotes` (the candidate's immutable provenance, split out of `verificationNotes` so a steward's call notes can never overwrite the original A3 citation — a data migration moved existing UNVERIFIED rows' citation text across automatically). Two new tables: `CitySheetChecklistItem` (the verification checklist, config-driven — Operations edits it via API, not a deploy) and `CitySheetVerificationEvent` (append-only — every verify/reject/flag-for-review call inserts a permanent row; nothing here is ever updated or deleted).
- **Checklist:** 20 default items seeded (7 common + 13 category-specific) via `apps/api/src/scripts/seed-city-sheet-checklist-items.ts`; managed going forward via `POST/GET/PATCH /city-sheet/checklist-items` (Platform Administrator only).
- **New/changed endpoints on `CitySheetController`:** `GET /city-sheet/:id/verification-guide` (current facts + applicable checklist + a generated call script — invents nothing, only restates stored fields); `GET /city-sheet/:id/verification-history` (the full permanent event log); `POST /city-sheet/:id/reject` (the missing "disapprove" half of the workflow — UNVERIFIED/NEEDS_REVIEW → REJECTED, also sets `status: INACTIVE`); `verify`/`flag-for-review` extended to accept `confidence` and `checklistResponses` and to append a verification event.
- **Governance unchanged:** every mutating route is still gated to `STEWARD`/`PLATFORM_ADMINISTRATOR` only — the same guard as before this work order. The AI actor that compiled A3's candidates has no access to any of these routes and cannot authenticate (null password). Verified end-to-end against a live database (seed twice for idempotency, a real verify() call against a real seeded candidate, checklist combination confirmed for CRISIS_LINE = 7 common + 2 category items = 9), 30 new unit tests, full `apps/api` suite (110/112 suites pass — same 2 pre-existing Voice Domain failures), `tsc --noEmit`, `eslint`.

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| A1 | Define city sheet schema | Design the data structure for the verified referral sheet (crisis lines, assistance programs, legal aid, food resources, categories, hours, eligibility, contact/verification metadata). | None | Engineering | Critical | **Done** | Schema reviewed and can represent every referral category LAUNCH-001 names. |
| A2 | Build city sheet storage | Implement the storage/query layer the schema needs, accessible to both the steward verification workflow and (later) Gate C's resource-discovery capability. | A1 | Engineering | Critical | **Done** | Sheet entries can be created, verified, queried, and surfaced to the app. |
| A3 | Compile candidate referral list | Research and compile the initial candidate list of crisis/assistance resources for Chester and Delaware County, PA (P1). | P1 | Human Stewards | Critical | **Candidates loaded — pending A4** | A candidate list exists covering every category LAUNCH-001 names, scoped to the confirmed launch metro. |
| A4-PREP | Build Human Steward Verification Workflow | Give A4 a checklist, call script, confidence rating, steward attribution, timestamps, and an append-only history, plus an approve/reject admin workflow — so A4 itself can be done fast and consistently. Does not perform any verification. | A2, A3 | Engineering | High | **Done** | A Human Steward can retrieve a checklist + call script for any candidate and record verify/reject/flag-for-review with confidence, notes, and structured checklist results, all permanently logged; only Steward/Founder accounts can do so. |
| A4 | Human-verify every referral | Every candidate entry is confirmed by a human — phone/contact verification of hours, eligibility, and current operation — before it is marked verified, via `POST /city-sheet/:id/verify` (see `docs/launch/A4-Verification-Guide.md`). 8 candidates await this now; treat "Media Food Bank" as lowest-confidence (see its `sourceNotes`). | A2, A3, A4-PREP | Human Stewards | Critical | Not Started | 100% of entries carry a human verification timestamp and verifier name; zero unverified entries reach Gate C production verification. |
| A5 | QA spot-check | Independent spot-check of a sample of verified entries for accuracy. | A4 | Founder + Human Stewards | High | Not Started | Sample check finds zero inaccuracies; any found are corrected and the whole batch is re-checked. |
| A6 | Gate A sign-off | Confirm the full city sheet is verified within the 14-day window LAUNCH-001 sets. | A1–A5 | Founder | Critical | Not Started | Founder signs off; Gate C production verification (C9) may begin. |

---

## Gate B — The Gate

*Founder Decision (Gate B/Gate C Reconciliation, approved): Gate B is renamed "The Gate," superseding the earlier "The Clearing Drill" label and its B1–B8 content, which is superseded in full — see Revision History. This is a scope change, not a rename only.*

**Scope, as decided by the Founder:** Gate B owns everything from a member's first arrival until they reach a working **"How can we help?"** hand-off. The Production Execution Order supersedes the earlier assumption (in `LAUNCH-001`'s original text) that this experience was "already built" — it is to be built to production standard. Work orders below describe observable behavior, member outcomes, accessibility, resilience, and production readiness; they are not organized by Experience Canon room (see "Experience Architecture vs. Execution Architecture" above) — several Canon rooms (the Gate, the Question, the Bench, the Greeting) are touched across these items without any one of them owning a dedicated line.

**Dependencies:** None on Gate A. Per the Founder's explicit authorization, Gate B does not depend on the city sheet or on A4 — it may proceed now, in parallel with Human Steward phone verification.

**B1 implementation note (V1 member-experience scope control):** Completed under the prior structure as "C2" (Gate C, V1 Scope Lockdown). Preserved here as B1 because its actual function — ensuring only the five-member pilot's approved surfaces are reachable — is a production-readiness prerequisite for arrival, not a "Bench" build. One central config (`apps/api/src/config/v1-feature-scope.ts`, mirrored at `apps/web/lib/config/v1-feature-scope.ts`) with `voice`/`academy`/`pods` flags, all default `false`. Backend: `V1ScopeMiddleware`, registered once in `AppModule.configure()` ahead of every guard/controller, 404s any request under `/ai/voice`, `/academy`, or `/pods` while its flag is off. `INTERFACE_ALLOWED_ROUTES` (the AI Steward's `navigate_to_route` tool allow-list) drops `academy` while its flag is off. Frontend: `primarySurfaces` filters out Academy/Pods; their routes redirect to `/home` directly; `VoiceOrchestrator` only mounts when its flag is on; `StewardWorkspace`'s voice UI is flag-gated as defense in depth. All gated code stays in the tree, fully recoverable by flipping one boolean. Verified end-to-end (unit + e2e against the real HTTP/guard stack); full `apps/api` suite 113/115 passing (2 pre-existing, unrelated failures), full `apps/web` suite 100/100 passing.

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| B1 | V1 member-experience scope control | Only the five-member pilot's approved surfaces are reachable by a member; voice, Academy, and Pods are inaccessible via nav, direct route, API, and AI-tool navigation, recoverable by a single flag. | None | Engineering | Critical | **Done** | Confirmed inaccessible at every access path; all gated code remains in the tree. |
| B2 | First arrival is observable and safe | A new or returning member reaches a working arrival screen; a repeat visit returns within three seconds; a persistent Urgent-help affordance is present on every surface. | B1 | Engineering | Critical | Not Started | Arrival screen renders correctly for new and returning members; three-second return verified; Urgent affordance present on every member surface. |
| B3 | Consent and expectations are captured | A member cannot proceed past arrival without giving required consent and seeing what to expect from Aureus; the record is retrievable later. | B2 | Engineering | Critical | Not Started | Consent cannot be bypassed; a granted consent record is retrievable for a real member. |
| B4 | Accessibility and communication preferences are captured and applied | A member can set accessibility/communication preferences during arrival, and those preferences observably affect their experience from that point forward — not merely stored. | B2 | Engineering | High | Not Started | A set preference measurably changes at least one downstream behavior for a real member. |
| B5 | Authenticated and unauthenticated behavior is correct | An unauthenticated visitor and an authenticated member each see the correct arrival behavior, with no leakage of one state into the other. | B2 | Engineering | Critical | Not Started | Both states verified independently; no cross-state leakage found. |
| B6 | Arrival is safely interruptible and resumable | A member who leaves mid-arrival and returns resumes without data loss, without repeating completed steps, and without being stuck. | B3, B4 | Engineering | High | Not Started | Interrupt-and-resume verified for at least consent and preference capture. |
| B7 | Human stewards have appropriate visibility into arrival state | A steward can see where a member is in arrival for the daily Tending Run and Founder oversight, without exposing anything a member hasn't consented to share. | B3 | Engineering | Medium | Not Started | Steward view reflects real arrival state; nothing beyond granted consent is exposed. |
| B8 | Arrival fails safely | Network, session, or service failures during arrival never imply a capability Aureus doesn't have, and never leave a member stuck with no path forward. | B2 | Engineering | Critical | Not Started | Simulated failure at each arrival step always leaves the member with an honest, actionable next step. |
| B9 | Gate B outcome sign-off | A member observably reaches a working "How can we help?" prompt at the end of arrival, on both first-time and returning visits, verified across accessibility conditions (screen reader, low digital confidence). Not satisfied merely by a route or static screen existing. | B1–B8 | Engineering | Critical | Not Started | Full arrival-to-handoff flow verified for a real test member under at least two accessibility conditions. Gate B sign-off. |

---

## Gate C — The Clearing

*Founder Decision (Gate B/Gate C Reconciliation, approved): Gate C is renamed "The Clearing," superseding the earlier "The Spine" label and its C1–C10 content (except C2, preserved as B1 above), which is superseded in full — see Revision History.*

**Scope, as decided by the Founder:** Gate C begins when Aureus starts understanding the member's need. It owns: **understanding, clarification, urgency assessment, resource discovery, verified resource presentation, steward escalation, and safe failure.** The Production Execution Order supersedes the earlier assumption that the Clearing was "already built" — it is to be built to production standard.

**Dependencies:** Gate B (B9) functional. Engineering may build interfaces, logic, fixtures, and tests before A4 is complete — **only production verification with real members (C9, below) requires verified City Sheet data (A6).** C1–C8 are not blocked by Gate A.

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| C1 | Understanding | Aureus can observably take in what a member says, via the existing conversation/orchestration domain, as the entry point from Gate B's "How can we help?" hand-off. | B9 | Engineering | Critical | Not Started | A stated need is correctly captured for a real test member without requiring menu navigation first. |
| C2 | Clarification | Aureus can ask a clarifying follow-up when the initial need is ambiguous or incomplete, and the member can answer without restarting. | C1 | Engineering | High | Not Started | An ambiguous test input reliably produces a relevant clarifying question; the answer is incorporated without restart. |
| C3 | Urgency assessment | Aureus distinguishes urgent/crisis language from non-urgent requests, without ever representing Aureus as an emergency-response service, and provides clear, honest emergency redirection when appropriate. | C1 | Engineering | Critical | Not Started | Detection reliably triggers on a documented test set of crisis phrasings; emergency redirection copy never implies emergency-response capability Aureus doesn't have. |
| C4 | Resource discovery | Aureus can retrieve candidate resources from the City Sheet for a stated need. Buildable and testable now against explicitly labeled seed fixtures, ahead of A4. | C1, A2 | Engineering | Critical | Not Started | Retrieval logic correctly matches fixture resources to a stated need in test conditions. |
| C5 | Verified resource presentation | Whatever is shown to a member visibly and unambiguously distinguishes verified, unverified, test, and unavailable resources. Unverified resources are never presented as verified. Every offer made, and the member's acceptance or refusal of it, is recorded. | C4 | Engineering | Critical | Not Started | All four resource states are visually distinguishable in a UI review; an offer-and-response is recorded and retrievable for a test member. |
| C6 | Steward escalation | When a member's need exceeds automated resolution, a human steward (Founder or the trusted steward, per P3) is reachably paged, with honest, published on-call hours. Every escalation and its outcome is recorded; escalation is never triggered without the member's choice. | C3, C5, P3 | Engineering | Critical | Not Started | A test page reaches the on-duty steward within an agreed time bound; published hours match the real rotation exactly; an escalation and its outcome are recorded. |
| C7 | Safe failure | When no verified resource is available and no steward is reachable, the member is told the truth, offered a real next step, and never left at a dead end. Unresolved need is recorded. | C5, C6 | Engineering | Critical | Not Started | Simulated no-resource/no-steward conditions always produce an honest message and a real next step; unresolved need is recorded and retrievable. |
| C8 | Gate C build/test sign-off (fixtures) | C1–C7 pass end-to-end against explicitly labeled seed fixtures, without requiring verified City Sheet data. | C1–C7 | Engineering | Critical | Not Started | Full understanding-through-safe-failure flow passes against fixtures for a real test member. |
| C9 | Gate C production verification (real members) | The entire Clearing flow passes with real members using only verified City Sheet data. This is the only Gate C item gated on Gate A. | C8, A6 | Engineering + Human Stewards | Critical | Blocked (needs Gate A) | Real-member session traces only to verified city sheet entries; no unverified or live-crawled content ever appears. Gate C sign-off. |

---

## Gate D — The Tending Run

*Unchanged by this revision, per Founder decision. LAUNCH-001: "Seven consecutive days of the daily run producing truthful absence reports for test accounts, with the Hearthline never lying once."*

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| D1 | Build the daily Tending Run scheduler | Implement the scheduled process that runs every morning. LAUNCH-001: "Knots are cron jobs — boring, reliable, done in days." | None | Engineering | High | Not Started | Scheduled job runs reliably at the configured daily time. |
| D2 | Build steward review interface | Interface for a human steward to review every member's held things each morning. | D1 | Engineering | High | Not Started | Steward can view and act on every held item for every member in one interface. |
| D3 | Wire "advance what can advance" logic | Implement the logic/actions that let a steward advance held items during the Tending Run. | D2 | Engineering | High | Not Started | Steward actions correctly update held-item state. |
| D4 | Implement absence-report generation | Generate a truthful absence report for each member as part of the daily run. | D1, D3 | Engineering | Critical | Not Started | Reports accurately reflect what did/did not happen that day for each member. |
| D5 | Wire honest Hearthline copy | Hearthline statements (e.g., "resting — next tended tomorrow morning") must always match real Tending Run state — never a false claim. | D4 | Engineering | Critical | Not Started | No Hearthline statement is ever contradicted by the underlying Tending Run state. |
| D6 | Run 7-day dry run on test accounts | Execute the Tending Run for seven consecutive days against test accounts. | D1–D5 | Engineering + Human Stewards | Critical | Not Started | Seven consecutive days completed without a missed run. |
| D7 | Audit Hearthline truthfulness | Review every day's Hearthline statements against actual Tending Run state for the full seven days. | D6 | Human Stewards + Founder | Critical | Not Started | Zero false Hearthline statements found across all seven days. Gate D sign-off. |

---

## Gate E — Memory Rights Live

*Unchanged by this revision, per Founder decision. LAUNCH-001: "View, correct, forget, export — working, plain, two taps deep."*

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| E1 | Build "everything remembered" view | Plain page listing everything remembered about a member, in sentences. | None | Engineering | High | Not Started | Page accurately lists all remembered items for a test member. |
| E2 | Build "correct" action | Let a member correct a remembered item. | E1 | Engineering | High | Not Started | Correction updates the underlying record and is reflected immediately. |
| E3 | Build "forget" action | Let a member delete a remembered item, with confirmation. | E1 | Engineering | High | Not Started | Forgotten items are actually removed and do not resurface. |
| E4 | Build export | Export everything remembered as a readable file. | E1 | Engineering | Medium | Not Started | Exported file is human-readable and complete. |
| E5 | Two-taps-deep UX pass | Verify view, correct, forget, and export are each reachable within two taps from the Shelf or equivalent entry point. | E1–E4 | Engineering | High | Not Started | All four actions verified at ≤2 taps deep. |
| E6 | QA verification | Independent verification that all four actions work correctly end-to-end. | E5 | Engineering | Critical | Not Started | All four actions pass QA. Gate E sign-off. |

---

## Gate F — The Founding Review

*Unchanged by this revision, per Founder decision. LAUNCH-001: "You walk the entire member journey yourself, as a member, start to finish. Then the first invitation goes out — one member. Then five. Then twenty-five. Each expansion gated on the previous cohort's experience holding the canon's tests."*

**Internal target (P4):** Gates A–E complete and the Founding Review begun within 30 calendar days of Founder approval (2026-07-22) — internal target date **2026-08-21**. This is an ambition, not a gate-bypass: F1's dependency ("Gates A–E complete") and every acceptance criterion below still governs. If the target date is missed, the reason must be reported and the forecast revised rather than any acceptance criteria weakened.

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| F1 | Founder full walkthrough | Founder completes the entire member journey, start to finish, as a member. | Gates A–E complete | Founder | Critical | Not Started | Walkthrough completed; issues logged. |
| F2 | Resolve walkthrough issues | Fix anything found in F1. | F1 | Engineering | Critical | Not Started | All logged issues resolved or explicitly accepted by the Founder. |
| F3 | Invite member one | Send the first invitation via direct Founder invitation (P2) — no partner relationship required. | F2, P2, P4 | Founder | Critical | Not Started | One member onboarded successfully. |
| F4 | Evaluate first-member experience | Assess member one's experience against LAUNCH-001's canon tests before expanding. | F3 | Founder + Human Stewards | Critical | Not Started | Experience holds the canon's tests; Founder approves expansion. |
| F5 | Invite members two through five | Expand the cohort to five. | F4 | Founder | Critical | Not Started | Four more members onboarded successfully. |
| F6 | Evaluate five-member cohort | Assess the five-member cohort's experience before expanding further. | F5 | Founder + Human Stewards | Critical | Not Started | Experience holds the canon's tests; Founder approves expansion. |
| F7 | Invite remaining members to reach 25 | Expand the cohort to the full 25. | F6 | Founder | Critical | Not Started | Full cohort of 25 onboarded. |
| F8 | Evaluate full cohort against Definition of Done | Confirm the cohort meets LAUNCH-001's Definition of Done — members describing Aureus in their own words as the thing that helped, that knows them, that doesn't forget. | F7 | Founder + Human Stewards | Critical | Not Started | Definition of Done confirmed met. Launch complete. |

---

## Summary counts

- Pre-Gate: 4 work orders (all Founder Approved — Complete)
- Gate A — The Foundation: 7 work orders (unchanged)
- Gate B — The Gate: 9 work orders (B1 Done, B2–B9 Not Started)
- Gate C — The Clearing: 9 work orders (all Not Started; C9 Blocked on Gate A)
- Gate D — The Tending Run: 7 work orders (unchanged)
- Gate E — Memory Rights Live: 6 work orders (unchanged)
- Gate F — The Founding Review: 8 work orders (unchanged)
- **Total: 50 work orders**

---

## Revision History

### V2 — Gate B / Gate C Reconciliation (this revision)

**What changed and why:** V1 of this document decomposed Gate B and Gate C directly from `LAUNCH-001`'s original text before a later, more detailed Founder instruction (the Production Execution Order) corrected two assumptions in that text: that "the Gate" (first arrival) and "the Clearing" (crisis resource retrieval) were already built. A repository code inspection found neither existed as a built member-facing surface. The Production Execution Order reused the letters "Gate B" and "Gate C" for different content than V1's structure, without formally revising this document — creating two unreconciled, disagreeing definitions. This was flagged (not resolved) in V1's own "Naming note," escalated to the Founder as a formal Decision Brief, and is resolved by this revision per the Founder's approved decision.

**What the Founder decided:**
1. Gate A is renamed "The Foundation" (content unchanged).
2. Gate B is renamed "The Gate," rescoped to own everything from first arrival until the member reaches "How can we help?"
3. Gate C is renamed "The Clearing," rescoped to own understanding, clarification, urgency assessment, resource discovery, verified resource presentation, steward escalation, and safe failure.
4. Gates D–F are unchanged.
5. Work orders must describe observable behavior, member outcomes, accessibility, resilience, and production readiness — not Experience Canon rooms.
6. Engineering may build interfaces, logic, fixtures, and tests before A4 completes. Only production verification with real members requires verified City Sheet data.

**Assumptions removed:** That "the Gate" and "the Clearing" were already built and merely needed porting or verification (both explicitly superseded — they are to be built to production standard). That Gate B/C work is blocked on Gate A (superseded for build/test work — only Gate C's final real-member production verification, C9, is Gate-A-blocked). That work orders should be organized by Experience Canon room (superseded — see "Experience Architecture vs. Execution Architecture" above).

### Superseded V1 content (historical record — do not implement against this)

**V1 Gate B — "The Clearing Drill"** (superseded in full):

*LAUNCH-001: "Ten simulated crisis conversations end-to-end; every one reaches a real capability or an honest handoff. No member arrives before this passes."*

| ID | Title | Description | Dependencies | Owner | Priority | Status |
|---|---|---|---|---|---|---|
| B1 | Verify crisis-language detection | Confirm the existing conversation domain correctly detects crisis language and triggers the Clearing flow. | None | Engineering | Critical | Superseded |
| B2 | Wire Clearing UI to real backend | The Clearing UI ("built" per LAUNCH-001) is connected to real triggers, not a mock. | B1 | Engineering | Critical | Superseded |
| B3 | Connect Clearing to the verified city sheet | The Clearing surfaces referrals from Gate A's verified sheet, never unverified or live-crawled sources. | A6, B2 | Engineering | Critical | Superseded |
| B4 | Build steward paging | Implement the mechanism that pages a human steward when the Clearing activates. | B2, P3 | Engineering | Critical | Superseded |
| B5 | Publish honest on-call hours | Write and surface the on-call hours copy for the two-person team. | P3 | Engineering + Human Stewards | High | Superseded |
| B6 | Draft the 10 drill scripts | Write ten distinct simulated crisis conversation scripts. | A6 | Human Stewards | High | Superseded |
| B7 | Run the 10 drills | Execute all ten drills end-to-end and log the outcome of each. | B3, B4, B5, B6 | Human Stewards + Founder | Critical | Superseded |
| B8 | Fix and re-run failures | Address any drill that didn't reach a real capability or an honest handoff. | B7 | Engineering + Human Stewards | Critical | Superseded |

**V1 Gate C — "The Spine"** (superseded in full, except C2 which is preserved as new-Gate-B's B1):

*LAUNCH-001: "Gate → Question → Bench (launch-five pieces) → Seal → Leaving, on the existing domains, with the stable accessibility skeleton, tested with at least three real people including one low-digital-confidence and one screen-reader user. Accessibility is release-blocking."*

| ID | Title | Description | Dependencies | Owner | Priority | Status |
|---|---|---|---|---|---|---|
| C1 | Port/verify the Gate | Confirm the first-arrival ceremony, three-second return, and persistent Urgent thread work end-to-end. LAUNCH-001: "Cut: nothing — the Gate is small and done." | None | Engineering | High | Superseded — see B2–B9 |
| C2 | Scope the Bench to the launch five | V1 Scope Lockdown (voice/Academy/Pods closed for the pilot). | None | Engineering | Critical | **Preserved as B1 — Done** |
| C3 | Implement curated Search | Search surfaces findings assembled by steward + AI from the verified city sheet only. | A6, C2 | Engineering | Critical | Superseded — see C4–C9 |
| C4 | Implement the Greeting | Composed arrival: salutation, the Held spoken, one thing in hands, Hearthline. | C2 | Engineering | High | Superseded — see B2–B9 |
| C5 | Implement the Shelf | Single plain "everything we're holding" page. | C4 | Engineering | Medium | Superseded |
| C6 | Wire the Seal + Leaving flow | Complete the Seal and Leaving steps. | C2 | Engineering | Medium | Superseded |
| C7 | Accessibility audit | Full screen-reader and low-digital-confidence usability audit of the spine. | C1–C6 | Engineering | Critical | Superseded — see B9, C8 |
| C8 | Recruit the three test members | Recruit three real testers from Chester/Delaware County. | P1 | Founder + Human Stewards | High | Superseded |
| C9 | Run end-to-end test sessions | Each of the three testers completes a full spine session. | C7, C8 | Engineering + Human Stewards | Critical | Superseded |
| C10 | Fix and re-test | Resolve issues found in C9 and re-test until the spine holds. | C9 | Engineering | Critical | Superseded |

The naming note originally recorded here (flagging this exact conflict, added during V1's C2 work order) is superseded by this Revision History section and the Founder decision it records.
