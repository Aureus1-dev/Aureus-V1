# Launch Work Orders

**Source of truth:** `docs/launch/LAUNCH-001-First-Members.md`. Every work order below traces to a specific line in that document. Gates are strictly sequential and blocking, per LAUNCH-001's own instruction: *"The Gates — order of execution, each blocking the next."* No work order in a later Gate should begin before every work order in the Gate before it is Done, except where explicitly marked as able to proceed in parallel.

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

## Gate A — The City Sheet

*LAUNCH-001: "Every crisis and assistance referral for the launch metro verified by a human within 14 days of launch. Ownership: stewards + Founder."*

**Launch metro (P1):** Chester and Delaware County, Pennsylvania, within the greater Philadelphia region. Greater Philadelphia resources are in-scope only when they genuinely accept and serve members from the launch area — this gate does not expand into a general Philadelphia or national scope.

**A1 implementation note:** The schema is defined in `prisma/schema.prisma` as the `CitySheetEntry` model (with `CitySheetCategory`, `LaunchAreaScope`, `CitySheetVerificationStatus`, and `CitySheetEntryStatus` enums), migration `prisma/migrations/20260722140000_add_launch_city_sheet`. It covers every field this work order lists (organization name, category, description, address, service area, phone, website, hours, eligibility, languages, accessibility notes, cost, required documents, referral-required, emergency-service, last-verified date, verified-by, verification notes, follow-up review date, active/inactive status), plus two fields added to enforce Founder decisions in the data itself rather than only in prose: `launchScope` (encodes P1's core-county-vs-supplemental boundary per entry) and `verificationStatus` (encodes the candidate → verified lifecycle A3/A4 depend on, distinct from active/inactive operating status). No organizations are populated — structure only, per this work order's scope.

**A3 implementation note:** Per Founder decision, the initial candidate list was compiled via web research (not fabricated from memory) and loaded into the A2 storage layer via an idempotent seed script (`apps/api/src/scripts/seed-city-sheet-candidates.ts`, data in `city-sheet-candidates.data.ts`, wired into `apps/api/prisma/seed.ts`; run via `npx prisma db seed`). 8 candidates were loaded, covering 5 of LAUNCH-001's named categories across both counties: 2 crisis lines (Chester County Crisis Services, Delaware County Crisis Connections Team), 2 food resources (Chester County Food Bank, Media Food Bank), 2 county assistance/benefits offices (Chester and Delaware County Assistance Offices), 1 legal aid organization serving both counties (Legal Aid of Southeastern PA), and 1 statewide information/referral line that directly serves both counties (PA 211). Every entry is inserted with `verificationStatus: UNVERIFIED` and `launchScope: CORE_LAUNCH_COUNTY`, and carries a `verificationNotes` citation recording exactly where each fact was sourced and on what date. Fields the source material did not state (most `eligibilityRequirements`, all `languagesSupported`/`accessibilityNotes`/`requiredDocuments`, several `hours` and `address` values) were left blank rather than guessed — several entries' `hours` fields explicitly say "not yet confirmed" instead of a fabricated time. One entry (Media Food Bank) is flagged in its own `verificationNotes` as lower-confidence, sourced from a third-party directory rather than the organization's own site, and should be checked especially carefully in A4. **None of these candidates may be relied upon by the Clearing (Gate B) or curated Search (Gate C) until a human steward completes A4's real phone/contact verification for each one** — this is candidate data only, exactly as A3 requires.

**A2 implementation note:** The storage/query layer lives at `apps/api/src/city-sheet/` — repository interface + Prisma implementation (`repositories/`), `CitySheetService` (create, list/search, get by ID or ref, update, archive, verify, flag-for-review), `CitySheetController` (all routes gated to Steward/Platform Administrator — city sheet entries have no per-entry owner; LAUNCH-001: "Ownership: stewards + Founder"), and DTOs. Wired into `app.module.ts` and the `city-sheet` Swagger tag in `main.ts`. The verification lifecycle from A1 is fully supported: `verify` moves UNVERIFIED/NEEDS_REVIEW → VERIFIED (recording verifier + timestamp, per A4's "100% of entries carry a human verification timestamp and verifier name" criterion); `flagForReview` moves VERIFIED → NEEDS_REVIEW; `archive`/`update({status})` moves ACTIVE ↔ INACTIVE. `launchScope` is a first-class filter and create/update field, so the P1 core-county-vs-Greater-Philadelphia boundary is enforced in queries, not just documentation. No organizations populated, no data scraped or imported, no UI built — infrastructure only, per this work order's scope.

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| A1 | Define city sheet schema | Design the data structure for the verified referral sheet (crisis lines, assistance programs, legal aid, food resources, categories, hours, eligibility, contact/verification metadata). | None | Engineering | Critical | **Done** | Schema reviewed and can represent every referral category LAUNCH-001 names. |
| A2 | Build city sheet storage | Implement the storage/query layer the schema needs, accessible to both the steward verification workflow and (later) the Search feature in Gate C. | A1 | Engineering | Critical | **Done** | Sheet entries can be created, verified, queried, and surfaced to the app. |
| A3 | Compile candidate referral list | Research and compile the initial candidate list of crisis/assistance resources for Chester and Delaware County, PA (P1). | P1 | Human Stewards | Critical | **Candidates loaded — pending A4** | A candidate list exists covering every category LAUNCH-001 names, scoped to the confirmed launch metro. |
| A4 | Human-verify every referral | Every candidate entry is confirmed by a human — phone/contact verification of hours, eligibility, and current operation — before it is marked verified, via `POST /city-sheet/:id/verify`. 8 candidates await this now; treat "Media Food Bank" as lowest-confidence (see its verificationNotes). | A2, A3 | Human Stewards | Critical | Not Started | 100% of entries carry a human verification timestamp and verifier name; zero unverified entries reach Gate B. |
| A5 | QA spot-check | Independent spot-check of a sample of verified entries for accuracy. | A4 | Founder + Human Stewards | High | Not Started | Sample check finds zero inaccuracies; any found are corrected and the whole batch is re-checked. |
| A6 | Gate A sign-off | Confirm the full city sheet is verified within the 14-day window LAUNCH-001 sets. | A1–A5 | Founder | Critical | Not Started | Founder signs off; Gate B may begin. |

---

## Gate B — The Clearing Drill

*LAUNCH-001: "Ten simulated crisis conversations end-to-end; every one reaches a real capability or an honest handoff. No member arrives before this passes."*

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| B1 | Verify crisis-language detection | Confirm the existing conversation domain correctly detects crisis language and triggers the Clearing flow. | None | Engineering | Critical | Not Started | Detection reliably triggers on a documented test set of crisis phrasings. |
| B2 | Wire Clearing UI to real backend | The Clearing UI ("built" per LAUNCH-001) is connected to real triggers, not a mock. | B1 | Engineering | Critical | Not Started | Clearing UI activates correctly from a live detected crisis conversation. |
| B3 | Connect Clearing to the verified city sheet | The Clearing surfaces referrals from Gate A's verified sheet, never unverified or live-crawled sources. | A6, B2 | Engineering | Critical | Blocked (needs Gate A) | Every referral shown in a Clearing session traces to a verified city sheet entry. |
| B4 | Build steward paging | Implement the mechanism that pages a human steward (Founder or the trusted human steward, per P3) when the Clearing activates. | B2, P3 | Engineering | Critical | Not Started | A test page reaches the on-duty steward within an agreed time bound. |
| B5 | Publish honest on-call hours | Write and surface the on-call hours copy for the two-person team (Founder + trusted human steward, per P3) — an accurate statement of when a person is reachable and what's available outside those hours. | P3 | Engineering + Human Stewards | High | Not Started | Copy matches the steward rotation exactly; no hours are overstated. |
| B6 | Draft the 10 drill scripts | Write ten distinct simulated crisis conversation scripts covering the referral categories on the city sheet. | A6 | Human Stewards | High | Blocked (needs Gate A) | Ten scripts exist, each mapped to a real capability or an honest handoff. |
| B7 | Run the 10 drills | Execute all ten drills end-to-end and log the outcome of each. | B3, B4, B5, B6 | Human Stewards + Founder | Critical | Not Started | All ten logged, pass/fail recorded per drill. |
| B8 | Fix and re-run failures | Address any drill that didn't reach a real capability or an honest handoff, then re-run until all ten pass. | B7 | Engineering + Human Stewards | Critical | Not Started | 10/10 drills pass. Gate B sign-off. |

---

## Gate C — The Spine

*LAUNCH-001: "Gate → Question → Bench (launch-five pieces) → Seal → Leaving, on the existing domains, with the stable accessibility skeleton, tested with at least three real people including one low-digital-confidence and one screen-reader user. Accessibility is release-blocking."*

| ID | Title | Description | Dependencies | Owner | Priority | Status | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| C1 | Port/verify the Gate | Confirm the first-arrival ceremony, three-second return, and persistent Urgent thread work end-to-end. LAUNCH-001: "Cut: nothing — the Gate is small and done." | None | Engineering | High | Not Started | Ceremony, return, and Urgent thread verified working. |
| C2 | Scope the Bench to the launch five | Limit the conversation/orchestration domain's working features to: Plan of stones, Plain Reading, Call Card, Knot, the Seal. Feature-flag off Spread, Binder, Pocket, Rehearsal, Company mode, Workshop, generative Mark, and voice. | None | Engineering | Critical | Not Started | Only the launch-five are reachable; all cut features are confirmed inaccessible in the launch build. |
| C3 | Implement curated Search | Search surfaces findings assembled by steward + AI from the verified city sheet only — never live crawling. | A6, C2 | Engineering | Critical | Blocked (needs Gate A) | Search results trace only to verified city sheet entries; no live-crawled content appears. |
| C4 | Implement the Greeting | Composed arrival: salutation, the Held spoken (capped at 3 concurrent held burdens), one thing in hands, Hearthline. | C2 | Engineering | High | Not Started | Greeting renders correctly with a real member's held-things state, cap enforced at 3. |
| C5 | Implement the Shelf | Single plain "everything we're holding" page — one tap, no atmosphere/decoration beyond what's needed for clarity. | C4 | Engineering | Medium | Not Started | Shelf page accurately reflects all currently-held items for a test member. |
| C6 | Wire the Seal + Leaving flow | Complete the Seal and Leaving steps, which LAUNCH-001 notes are "copy + state logic, nearly free to build." | C2 | Engineering | Medium | Not Started | A member can complete a session through Leaving with correct state transitions. |
| C7 | Accessibility audit | Full screen-reader and low-digital-confidence usability audit of the spine (Gate → Question → Bench → Seal → Leaving). | C1–C6 | Engineering | Critical | Not Started | No release-blocking accessibility defects remain, per Decision 23's release-blocking standard. |
| C8 | Recruit the three test members | Recruit three real testers from Chester/Delaware County (P1): one general user, one low-digital-confidence user, one screen-reader user. | P1 | Founder + Human Stewards | High | Not Started | Three named testers scheduled. |
| C9 | Run end-to-end test sessions | Each of the three testers completes a full spine session; issues are logged. | C7, C8 | Engineering + Human Stewards | Critical | Not Started | All three sessions completed; issue log produced. |
| C10 | Fix and re-test | Resolve issues found in C9 and re-test until the spine holds for all three testers. | C9 | Engineering | Critical | Not Started | All three testers complete the spine with no unresolved release-blocking issues. Gate C sign-off. |

---

## Gate D — The Tending Run

*LAUNCH-001: "Seven consecutive days of the daily run producing truthful absence reports for test accounts, with the Hearthline never lying once."*

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

*LAUNCH-001: "View, correct, forget, export — working, plain, two taps deep."*

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

*LAUNCH-001: "You walk the entire member journey yourself, as a member, start to finish. Then the first invitation goes out — one member. Then five. Then twenty-five. Each expansion gated on the previous cohort's experience holding the canon's tests."*

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
- Gate A: 6 work orders
- Gate B: 8 work orders
- Gate C: 10 work orders
- Gate D: 7 work orders
- Gate E: 6 work orders
- Gate F: 8 work orders
- **Total: 49 work orders**
