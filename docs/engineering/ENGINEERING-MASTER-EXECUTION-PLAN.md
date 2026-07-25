# AUREUS — Engineering Master Execution Plan v1.0

**Role:** The canonical, day-to-day implementation roadmap for the Engineering Tribe until Aureus reaches its first production pilot (LAUNCH-001's 25-member, one-metro cohort). This document organizes — it does not invent. Every task below already has an owner: a Work Order, an ADR, a PD domain, a Canon, or a `docs/launch/` gate item. Where this plan groups or sequences those items differently than their source document does, that grouping is this plan's only original contribution.

**Sources this plan is built from (cited throughout, not restated):** `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md`, `docs/engineering/ENGINEERING-EXECUTION-AUDIT.md` (this session), `docs/launch/WORKORDERS.md` and `SCOREBOARD.md`, `docs/releases/version-1-readiness.md`, `docs/governance/AUREUS-INSTITUTIONAL-BLUEPRINT.md`, `docs/governance/AUREUS-REPOSITORY-VALIDATION-REPORT.md`.

**Status:** Living Draft — this is the primary engineering roadmap as of this writing. No existing repository file was modified in producing it.

**Date:** 2026-07-25

**A note on completion percentages:** per this plan's own instruction, no percentage is stated for any task unless a source document already states one with evidence. Where no such evidence exists, this plan uses the five-value status field only (Not Started / In Progress / Partially Complete / Complete / Blocked).

**A note on a real, unresolved disagreement between two accepted documents:** `docs/launch/README.md` states `LAUNCH-001-First-Members.md` is "Founder-approved"; `LAUNCH-001`'s own header reads "Execution Order · For Founder approval" (present tense). Both are cited here rather than one being chosen — this plan treats `LAUNCH-001` as the operative scope document regardless of which status line is current, since every Work Order already traces to it, but flags this for whoever resolves it (see `AUREUS-REPOSITORY-VALIDATION-REPORT.md` §4, finding A-4).

---

## How to read this plan

Each task carries: **Title · Description · References · Why it matters · Dependencies · Effort · Risk · Testing Required · Completion Criteria · Owner · Status.** Tasks are grouped into five milestones (§2). A dependency map (§3) shows what can run in parallel versus what blocks what. A dashboard (§4) cross-indexes every task by priority, Founder-decision-need, human-operational-need, and functional area, for daily standup use.

---

## 1. Milestone Overview

| Milestone | Objective | Gate this maps to |
|---|---|---|
| **1 — Pilot Safety** | Nothing a real, unknown member could be harmed by remains unaddressed | Precondition for Gate F (any invitation) |
| **2 — Pilot Readiness** | Every LAUNCH-001 Gate through the human-verification chain is engineering-complete and the remaining human-only steps are unblocked | Gates A (human half) → C (real-member sign-off) → D → E |
| **3 — Production Operations** | The platform can be operated, deployed, and observed reliably as the cohort grows 1 → 5 → 25 | Supports Gate F's staged expansion (F3–F7) |
| **4 — Public Launch** | Scope decisions and deferred surfaces are resolved before any expansion beyond the 25-member pilot's locked V1 scope | Beyond LAUNCH-001; gated on the Founder's own V1 Scope Lockdown (`B1`) being revisited |
| **5 — Scale Readiness** | Infrastructure and process are verified against real, multi-replica, real-traffic conditions | Beyond this repository's current evidence — see §2.5 for why this milestone stays deliberately thin |

---

## 2. Milestones, in full

### Milestone 1 — Pilot Safety

**Objective:** Close every gap that would let a real, unknown member be exposed to unmoderated AI output, unprotected personal data, or an unverified crisis referral.

**Entry criteria:** None — every task here is independent and can start immediately.

**Exit criteria:** `PD-003` and `PD-007` both Complete; A4/A5/A6 human-verification chain complete (or explicitly, Founder-accepted as still in progress with a bounded plan).

**Major risks:** Legal drafting has no repository-estimable timeline (see Dependency Map §3). AI moderation is genuinely new engineering, not configuration.

**Validation required:** A deliberately-flagged crisis/self-harm input is intercepted before reaching the provider (per `PD-007`'s own acceptance criterion); registration is blocked without consent; the City Sheet reflects only human-verified data before any real member sees it (`C9`'s enforcement, already merged — see Milestone 2).

---

#### Task 1.1 — Legal, Privacy & Consent Foundation

- **Description:** Draft real Terms of Service and Privacy Policy text, wire a required consent checkbox at registration, add `User.termsAcceptedAt`/`privacyPolicyVersion`, add self-service data export/delete, add a root `LICENSE` file.
- **References:** `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` §PD-003; cross-referenced in `docs/governance/AUREUS-REPOSITORY-VALIDATION-REPORT.md` §6 (Legal Canon row) and `MDR-017`.
- **Why it matters:** Zero implementable legal text exists anywhere in the repository today (confirmed: `docs/legal/` contains only governance-philosophy charters, no ToS/Privacy Policy/consent text). No real member should be onboarded without this.
- **Dependencies:** None technically. The pacing item is legal drafting itself, which this plan cannot estimate.
- **Effort:** Medium-Large (4-6 engineer-days) **plus** non-estimable legal drafting time.
- **Risk:** Critical if skipped for any real-user launch — this is legal exposure, not hardening.
- **Testing required:** Registration blocked without the consent checkbox; `termsAcceptedAt`/`privacyPolicyVersion` populated on every new account; export/delete flows covered by new tests.
- **Completion criteria:** `/privacy` and `/terms` render real, Founder/legal-approved content; `LICENSE` exists at repo root; a member can export or delete their own data from Profile.
- **Suggested owner:** Engineering (implementation) + Founder/legal counsel (text) — no existing repository owner for the legal text itself.
- **Status:** **Not Started.**

#### Task 1.2 — AI Safety: Moderation & Prompt-Injection Defense

- **Description:** Add a moderation-endpoint check (before any member text reaches a completion call), basic prompt-injection mitigation, and a documented PII-handling policy for AI inputs, wired through the single `AiRequestsService.runCompletion()` choke point so every capability inherits it.
- **References:** `PD-000` §PD-007.
- **Why it matters:** Confirmed this session (direct `grep` of `apps/api/src/ai/requests/ai-requests.service.ts`): zero moderation calls exist anywhere in the Intelligence Layer today. `ConversationsService.ask()` and `VoiceSessionService` push member input straight to the provider with no safety check. This is the single largest AI-safety gap in the repository.
- **Dependencies:** None — can start immediately, independent of every other task.
- **Effort:** Medium (3-5 engineer-days).
- **Risk:** Critical for the Intelligence Layer specifically.
- **Testing required:** A deliberately-flagged input (e.g. explicit self-harm language) is intercepted before reaching the provider and produces a safe, on-brand refusal, logged distinctly from a normal `AiRequest`; existing orchestrator/conversation/voice suites extended to cover the moderation-block path.
- **Completion criteria:** Per `PD-007`'s own acceptance criterion, verbatim.
- **Suggested owner:** Engineering — AI/Intelligence Layer domain (owns `apps/api/src/ai/`).
- **Status:** **Not Started.**

#### Task 1.3 — Platform-Wide Content Moderation & Trust/Safety

- **Description:** Add delete + report endpoints to `PodMessagesController`, a lightweight admin moderation queue, and server-side sanitization for free-text fields rendered as rich content (Pod messages, announcements, notes, knowledge articles).
- **References:** `PD-000` §PD-008.
- **Why it matters:** Confirmed this session: `PodMessagesController` exposes only `@Post()` — no member or steward can remove abusive Pod content today. Zero HTML/rich-text sanitization exists anywhere in the backend. Per the already-shipped V1 Scope Lockdown (`B1`, `docs/launch/WORKORDERS.md`), Pods are currently flag-gated **off** for the pilot — this narrows this task's urgency for Milestone 1 specifically to the sanitization half (which also covers Knowledge/Communication content, in-scope for the pilot), while the Pods-message half can trail into Milestone 4 unless Pods is re-enabled earlier.
- **Dependencies:** None.
- **Effort:** Medium (3-5 engineer-days).
- **Risk:** High if Pods is enabled for the pilot; Medium otherwise (sanitization still applies to in-scope content).
- **Testing required:** A member can delete their own Pod message; a steward/admin can remove any Pod message and see a reported-content queue; an XSS-payload string submitted through any affected endpoint is stored/returned sanitized, per-domain test added.
- **Completion criteria:** Per `PD-008`'s own acceptance criterion.
- **Suggested owner:** Engineering — Pods/Communication domains.
- **Status:** **Not Started.**

#### Task 1.4 — A4: Human Phone-Verification of the 8 Real City Sheet Candidates

- **Description:** A Human Steward calls each of the 8 real launch-metro candidates, confirms hours/eligibility/current operation, and records the outcome through the already-built `/city-sheet` verification UI.
- **References:** `docs/launch/WORKORDERS.md` (A4 row), `docs/launch/A4-Verification-Guide.md` (full runbook).
- **Why it matters:** This is the one item in the entire LAUNCH-001 track that is real-world, human-only work with a fully-built engineering path already waiting for it (A4-PREP, its frontend addendum, and this session's `C9` production-safety enforcement are all already merged).
- **Dependencies:** None on engineering. Depends on Human Steward capacity (`P3`, already decided: Founder + one trusted steward).
- **Effort:** Human time, not engineer-days. Treat "Media Food Bank" as needing extra care (flagged lowest-confidence in its own `sourceNotes`).
- **Risk:** Critical for Gate A/C9, but zero deployment risk (no code changes).
- **Testing required:** None — this is real-world verification, not a test.
- **Completion criteria:** All 8 candidates carry a human verification timestamp and verifier name; zero remain `UNVERIFIED` reaching production use.
- **Suggested owner:** Human Stewards (per `WORKORDERS.md`'s own Owner column).
- **Status:** **Not Started** (per `SCOREBOARD.md`, current as of this session).

#### Task 1.5 — A5/A6: QA Spot-Check and Gate A Sign-Off

- **Description:** Independent spot-check of a sample of A4's newly-verified entries; Founder confirms the full City Sheet is verified within LAUNCH-001's 14-day window.
- **References:** `docs/launch/WORKORDERS.md` (A5, A6 rows).
- **Why it matters:** This is what actually unblocks `C9` (Gate C's real-member production verification) — the engineering side of `C9` is already done (see Task 2.1).
- **Dependencies:** A4 (Task 1.4) must complete first.
- **Effort:** Human time (spot-check + Founder review).
- **Risk:** Critical for unblocking Gate C/D, zero deployment risk.
- **Testing required:** None.
- **Completion criteria:** Per `WORKORDERS.md`'s own acceptance criteria for A5/A6.
- **Suggested owner:** Founder + Human Stewards.
- **Status:** **Not Started.**

---

### Milestone 2 — Pilot Readiness

**Objective:** Every engineering task that must exist before the first real member can be safely invited (beyond Milestone 1's safety floor) is complete, and the platform behaves reliably enough to trust with the daily Tending Run and Memory Rights promises.

**Entry criteria:** Milestone 1 substantially underway (Tasks 1.1/1.2 do not need to be fully complete before Milestone 2 work starts — they are independent — but should land before real-member exposure).

**Exit criteria:** Gates D and E (`docs/launch/WORKORDERS.md`) both fully complete; AI resilience/retention gaps closed; Voice Domain flakiness root-caused.

**Major risks:** Gate D's daily-cron reliability requirement is directly undermined by unresolved test flakiness (see Task 2.6). Gate E's "two taps deep" UX requirement has not yet been engineering-scoped in any Work Order beyond its own six-item list.

**Validation required:** Seven consecutive days of the Tending Run producing truthful absence reports (Gate D's own acceptance criterion, `docs/launch/WORKORDERS.md` D6/D7); all four Memory Rights actions (view/correct/forget/export) verified at ≤2 taps deep (Gate E's E5/E6).

---

#### Task 2.1 — C9: Gate C Real-Member Production Verification (Sign-Off)

- **Description:** Once A4/A5/A6 (Milestone 1) complete, run the full Clearing flow with real members against the now-verified City Sheet and confirm the session traces only to verified data.
- **References:** `docs/launch/WORKORDERS.md` (C9 row: *"Engineering safeguard done — real-member sign-off still Blocked (needs Gate A)"*).
- **Why it matters:** The engineering mechanism this requires (`NeedsService.isSafeToSurface()`, enforced in both discovery and direct-offer paths) was built and merged this session — 6 new unit tests + 1 new e2e test proving a real member's session traces only to verified data. Nothing further needs to be built for this task; it is waiting entirely on Milestone 1's human-verification chain.
- **Dependencies:** Task 1.4/1.5 (A4/A5/A6).
- **Effort:** None remaining (engineering side complete). Verification-only once unblocked.
- **Risk:** Low (the safety mechanism is already proven by test).
- **Testing required:** Already done — see `apps/api/src/needs/needs.service.spec.ts` and `apps/api/src/ai/ai.e2e.spec.ts`'s C9 test block.
- **Completion criteria:** Per `WORKORDERS.md`'s C9 acceptance criteria, verbatim.
- **Suggested owner:** Engineering (Needs/City Sheet domains) + Human Stewards for the real-member session itself.
- **Status:** **Blocked** (on Task 1.4/1.5).

#### Task 2.2 — Gate D: The Tending Run (7 work orders)

- **Description:** Build the daily Tending Run scheduler, steward review interface, "advance what can advance" logic, absence-report generation, honest Hearthline copy, run a 7-day dry run on test accounts, and audit Hearthline truthfulness.
- **References:** `docs/launch/WORKORDERS.md` (D1–D7).
- **Why it matters:** LAUNCH-001's own text: *"Seven consecutive days of the daily run producing truthful absence reports for test accounts, with the Hearthline never lying once."* This is a full, un-started domain of new engineering.
- **Dependencies:** Gate C's full completion (including `C9`, Task 2.1). Also benefits from Task 2.6 (Voice Domain flaky-test root-cause) landing first, since D6/D7's dry-run and truthfulness audit depend on trustworthy automated-test signal for anything the scheduler touches.
- **Effort:** Not yet estimated in any repository document — this is a new domain, comparable in scope to a full `WO-0XX`-class Work Order (5+ sub-items across scheduler, UI, logic, reporting, and a 7-day real-time validation window that cannot be compressed).
- **Risk:** Critical (Gate D is a hard LAUNCH-001 requirement) but low deployment risk if built incrementally against test accounts first, per D6's own design.
- **Testing required:** Full new test suite for the scheduler/review/advance/report/Hearthline chain; the 7-day dry run itself is the acceptance test.
- **Completion criteria:** Per D1–D7's own acceptance criteria; D7 (*"Zero false Hearthline statements found across all seven days"*) is Gate D's sign-off.
- **Suggested owner:** Engineering — no existing sub-domain owns this yet; closest precedent is the Stewardship System (`WO-025`) and Communication System (`WO-026`), whose existing services (`NotificationsService`, `StewardshipRelationshipsService`) this domain will likely extend rather than duplicate.
- **Status:** **Not Started** (all 7 work orders, per `SCOREBOARD.md`).

#### Task 2.3 — Gate E: Memory Rights Live (6 work orders)

- **Description:** Build the "everything remembered" view, correct action, forget action, export, verify all four are reachable within two taps, and independent QA verification.
- **References:** `docs/launch/WORKORDERS.md` (E1–E6).
- **Why it matters:** LAUNCH-001's own text: *"View, correct, forget, export — working, plain, two taps deep."* Directly overlaps `PD-003`/`PD-010`'s data-export/delete scope (Task 1.1, Task 2.8) — should be designed together, not duplicated, per those tasks' own dependency notes.
- **Dependencies:** None on Gate D; can proceed in parallel. Should coordinate design with Task 1.1 (`PD-003`) and Task 2.8 (`PD-010`) so "forget"/"export" isn't built three separate times across Legal, AI-retention, and Memory Rights.
- **Effort:** Not yet estimated in any repository document; likely Medium-Large given it spans a new view plus three actions plus a UX-depth audit.
- **Risk:** Critical (hard LAUNCH-001 requirement); Medium deployment risk (touches real member data deletion, needs careful confirmation flows).
- **Testing required:** Per E6's own "independent verification that all four actions work correctly end-to-end."
- **Completion criteria:** Per E1–E6's own acceptance criteria.
- **Suggested owner:** Engineering — likely spans Users/Profile, AI (conversation history), and every domain holding member data; no single existing module owns "everything remembered" today.
- **Status:** **Not Started** (all 6 work orders).

#### Task 2.4 — AI Provider Resilience & Cost Governance Maturity

- **Description:** Add retry-with-backoff and timeout handling to both AI providers, a simple cross-provider fallback, and per-capability budget ceilings (particularly Voice, given its cost profile).
- **References:** `PD-000` §PD-009.
- **Why it matters:** Confirmed: `OpenAiProvider`/`AnthropicProvider` are single bare `fetch()` calls with no retry, timeout, or fallback. A transient provider hiccup — which happens regularly with both providers in real operation — currently surfaces as a hard user-facing failure.
- **Dependencies:** None. Should land before Task 2.9 (Intelligence Layer integration testing), which benefits from reduced flakiness.
- **Effort:** Medium (4-6 engineer-days).
- **Risk:** High once real members depend on AI availability.
- **Testing required:** A simulated provider timeout is retried per a documented backoff policy; a simulated total-provider-outage falls over to the secondary provider; a per-capability ceiling (demonstrated on Voice) refuses further requests for that capability specifically while others continue.
- **Completion criteria:** Per `PD-009`'s own acceptance criterion.
- **Suggested owner:** Engineering — AI provider abstraction layer (`apps/api/src/ai/providers/`).
- **Status:** **Not Started.**

#### Task 2.5 — AI Data Retention & Conversation Memory Management

- **Description:** Define and implement a retention policy for `AiRequest`/`AiMessage`/`AiConversation` with a scheduled purge job, add a member-facing "delete my AI history" action, and token-aware truncation/summarization for long conversations.
- **References:** `PD-000` §PD-010.
- **Why it matters:** No retention/expiry policy exists today; conversations persist indefinitely; a member cannot delete their own AI history; a conversation of unusually long messages could exceed a model's context window with no fallback.
- **Dependencies:** Should be designed together with Task 1.1 (`PD-003`) and Task 2.3 (Gate E) — same underlying "member controls their own data" concept, three separate owners today.
- **Effort:** Medium (3-5 engineer-days).
- **Risk:** Medium (privacy/compliance completion item, ties directly into `PD-003`'s legal exposure).
- **Testing required:** A documented retention period enforced by a scheduled purge job, tested against a seeded old row; delete-history verified via API and UI; long-conversation truncation/summarization verified by a new test.
- **Completion criteria:** Per `PD-010`'s own acceptance criterion.
- **Suggested owner:** Engineering — AI/Conversations domain.
- **Status:** **Not Started.**

#### Task 2.6 — Voice Domain Flaky-Test Root Cause

- **Description:** Root-cause the 7 pre-existing test failures that have appeared, unchanged, across every full-suite validation run cited in this session's own work (most recently reconfirmed during this session's `C9` validation: 121/122 suites, 1261/1268 tests, the same 7 Voice Domain failures).
- **References:** Cited consistently in every Domain Readiness Report from `DOMAIN-002` onward through this session's `C9` work; not previously root-caused in any repository document.
- **Why it matters:** Gate D's own acceptance criteria depend on trustworthy daily-cron test signal; unresolved flakiness anywhere in the suite undermines confidence in exactly the kind of reliability Gate D exists to prove.
- **Dependencies:** None technically, but should land before Gate D (Task 2.2) begins its 7-day dry run.
- **Effort:** Not estimable — root cause is currently unknown; this task is the investigation itself.
- **Risk:** Medium — doesn't block current work, but risks masking a real regression once Gate D depends on clean test signal.
- **Testing required:** N/A until root cause is found; then a regression test proving the fix.
- **Completion criteria:** The 7 Voice Domain failures either resolve to a known, accepted, and documented cause (e.g., an environment-specific limitation) or are fixed outright; either way, the finding is committed to the repository instead of silently re-appearing in every future validation note.
- **Suggested owner:** Engineering — Voice domain (`DOMAIN-002`/`005`).
- **Status:** **Not Started** (as an investigation; the symptom itself has existed since Voice was first built).

#### Task 2.7 — Real Document Storage Backend

- **Description:** Integrate a real object-storage backend, a real upload endpoint with server-enforced size/MIME limits, virus/malware scanning, and signed time-limited URLs for retrieval.
- **References:** `PD-000` §PD-012.
- **Why it matters:** Confirmed: `DocumentsService`/`UploadDocumentDto` only ever persist metadata — the backend never reads or writes actual file bytes. This is a shipped, member-facing feature (`DOMAIN-008`, Connected Experiences) that does not do what its name implies.
- **Dependencies:** A hosting-target decision (for the storage provider itself) — see Milestone 3. Until landed, recommend the Documents UI be explicitly labeled experimental or the feature scoped out of the pilot's V1 surface, rather than silently misrepresenting itself.
- **Effort:** Large (6-8 engineer-days).
- **Risk:** High — discovering this gap in production (a member "uploads" a document that is never actually stored) is a trust-damaging surprise.
- **Testing required:** A real file uploaded/stored/retrieved/deleted end-to-end; oversized/disallowed-MIME rejected server-side; a virus-scanning check demonstrated against an EICAR test file; existing Documents tests extended to cover the real storage path.
- **Completion criteria:** Per `PD-012`'s own acceptance criterion.
- **Suggested owner:** Engineering — Connected Experiences domain (`apps/api/src/connected-experiences/documents/`).
- **Status:** **Not Started** (interim mitigation — labeling/scoping — recommended as an immediate, near-zero-effort stopgap; see Milestone 1/2 boundary note).

#### Task 2.8 — Frontend Quality & Resilience Polish

- **Description:** Add a global error boundary wired to error tracking, favicon/manifest/robots/sitemap/OG metadata, close remaining `jest-axe` gaps in 7 named components, write a device/responsive validation-plan template applied to at least Home/Opportunities/Founder.
- **References:** `PD-000` §PD-013 (items 1–3; item 4, the Playwright suite, is deferred to Milestone 3 — see Task 3.5).
- **Why it matters:** No `error.tsx`/`global-error.tsx` exists anywhere under `apps/web/app` today — an uncaught render error falls through to Next.js's generic default screen. Backend Sentry is already wired (this session, DSN-gated); frontend has no equivalent.
- **Dependencies:** Backend error tracking (already complete) should be the pattern the frontend boundary reports into.
- **Effort:** Medium (4-6 engineer-days, mostly parallelizable, low-risk).
- **Risk:** Medium — not an outage risk, but the gap between "looks finished" and "looks unfinished."
- **Testing required:** A deliberately-thrown render error shows a branded recovery screen and appears in error tracking; the 7 flagged components gain axe coverage.
- **Completion criteria:** Per `PD-013`'s own acceptance criterion (items 1-3 portion).
- **Suggested owner:** Engineering — Frontend foundation (`FWO-001`'s design-system ownership).
- **Status:** **Not Started.**

#### Task 2.9 — Pods Steward/Admin UI + Messages New-Conversation Entry Point

- **Description:** Build the Pods steward/admin frontend (roster management, events, service projects, escalations, Pod-internal messaging) and a "start a new conversation" entry point for Messages.
- **References:** `PD-000` §PD-014 Track B.
- **Why it matters:** Both backends already fully support this (`WO-030` for Pods, existing Messaging infrastructure for Messages) — this is pure frontend work with no backend gap, and closes a real usability hole (`MessagesPage.tsx` has an explicit in-code comment confirming the gap is still open).
- **Dependencies:** None. Note: Pods is currently flag-gated off for the pilot (`B1`'s V1 Scope Lockdown) — this task's urgency depends on whether Pods is re-enabled before or after the pilot; Messages' gap applies regardless of Pods' flag state.
- **Effort:** Medium (4-6 engineer-days).
- **Risk:** Medium — two already-built backend domains are not actually usable end-to-end from the frontend.
- **Testing required:** A steward can manage their Pod's roster/events/service-projects/escalations from the frontend; a member can start a new conversation with a steward or org rep directly from Messages.
- **Completion criteria:** Per `PD-014` Track B's own acceptance criterion.
- **Suggested owner:** Engineering — Pods and Communication frontend domains.
- **Status:** **Not Started.**

---

### Milestone 3 — Production Operations

**Objective:** The platform can be deployed, observed, backed up, and load-verified reliably as the cohort scales from 1 to 25 members (LAUNCH-001's F3–F7 staged expansion).

**Entry criteria:** A Founder hosting-target decision (named explicitly as the blocker in `PD-000`/`PD-002` §7 for every task in this milestone except Task 3.1).

**Exit criteria:** A real CD pipeline deploys to a real staging environment on every merge; a k6 (or equivalent) run against 2+ replicas shows platform-wide rate limits enforced correctly; an automated backup schedule runs independent of manual/deploy-triggered backups.

**Major risks:** Every task here (except 3.1) is blocked on the same single Founder decision — if that decision is deferred indefinitely, this entire milestone stalls, though (per the Engineering Execution Audit's own finding) this does not block the first 25-member pilot specifically, since the current single-instance deployment shape is sufficient at that scale.

**Validation required:** `PD-005`'s own acceptance criteria — both Docker images build clean and pass `HEALTHCHECK`; a merge to `main` deploys to staging automatically; a k6 run against 2+ API replicas behind a load balancer shows rate limits enforced platform-wide.

---

#### Task 3.1 — Proactive AI-Budget-Ceiling Alerting

- **Description:** Add an alert as spend approaches (not just exceeds) a cost ceiling.
- **References:** `PD-000` §PD-002 remainder (the observability slice not absorbed into `PD-002-Production-Infrastructure-Deployment.md`).
- **Why it matters:** Today's cost governance (confirmed working: emergency stop, global + per-user daily ceilings) only refuses once a ceiling is already exceeded — no proactive signal exists.
- **Dependencies:** None — the one task in this milestone independent of the hosting decision.
- **Effort:** Small-Medium (2-3 engineer-days).
- **Risk:** High-adjacent (cost-governance completeness, not availability).
- **Testing required:** A simulated near-ceiling spend triggers an alert before the hard refusal fires.
- **Completion criteria:** An alert is observably raised (via the existing Sentry/notification channel) before a ceiling is hit, not only after.
- **Suggested owner:** Engineering — AI operational config (`apps/api/src/ai/requests/ai-operational-config.service.ts`).
- **Status:** **Not Started.**

#### Task 3.2 — Frontend Sentry Wiring

- **Description:** Wire the frontend error boundary (Task 2.8) into the same Sentry project already used by the backend.
- **References:** Not named as its own PD item; identified this session as the natural completion of backend Sentry (`apps/api/src/common/monitoring/sentry.ts`, DSN-gated, already shipped).
- **Why it matters:** Completes observability parity between backend and frontend.
- **Dependencies:** Task 2.8 (frontend error boundary must exist first).
- **Effort:** Low-Medium.
- **Risk:** Low.
- **Testing required:** A deliberately-thrown frontend error appears in the same Sentry project as backend errors.
- **Completion criteria:** Frontend errors are visible alongside backend errors in one observability view.
- **Suggested owner:** Engineering — Frontend foundation.
- **Status:** **Not Started.**

#### Task 3.3 — CD Pipeline + Staging Environment + Load Testing

- **Description:** Stand up a real CD workflow (build → push image → deploy to a named staging environment), a real staging environment, and a baseline k6 (or equivalent) load test for the top 3-5 endpoints by expected traffic.
- **References:** `PD-000` §PD-005 remainder; `docs/work-orders/PD-002-Production-Infrastructure-Deployment.md` §7 (names this explicitly as blocked on a hosting-target decision).
- **Why it matters:** Confirmed this session: only one workflow file (`ci.yml`) exists; no `cd.yml`; no `load-tests/` directory anywhere; no staging environment beyond the self-labeled-but-not-real `docker-compose.yml` "local/staging stack."
- **Dependencies:** **A Founder hosting-target decision** — the single named blocker for this entire task, restated consistently across `PD-000` and `PD-002`.
- **Effort:** Large (5-6 engineer-days once unblocked).
- **Risk:** Critical for anything beyond the current single-instance deployment shape; not a blocker for the 25-member pilot specifically.
- **Testing required:** Both Docker images build clean and pass `HEALTHCHECK`; a merge to `main` deploys to staging automatically; a k6 run against 2+ API replicas behind a load balancer shows rate limits enforced platform-wide.
- **Completion criteria:** Per `PD-005`'s own acceptance criterion, verbatim.
- **Suggested owner:** Engineering — Infrastructure (owner of `PD-002-Production-Infrastructure-Deployment.md`).
- **Status:** **Blocked** (on Founder hosting decision).

#### Task 3.4 — Automated Backup Schedule

- **Description:** Stand up a recurring/automated backup schedule independent of manual or deploy-triggered runs.
- **References:** `PD-000` §PD-006 remainder.
- **Why it matters:** Backup/restore tooling and one rehearsed restore drill already exist (`PD-002`); what's missing is the recurring schedule itself.
- **Dependencies:** Same hosting-target decision as Task 3.3.
- **Effort:** Small (part of a provider-managed snapshot policy once a host is chosen).
- **Risk:** Critical class (data-loss risk if never scheduled), but low effort once unblocked.
- **Testing required:** A scheduled backup is confirmed to run and produce a restorable artifact on its own cadence, not only on manual/deploy trigger.
- **Completion criteria:** A documented, running backup schedule exists independent of any manual action.
- **Suggested owner:** Engineering — Infrastructure.
- **Status:** **Blocked** (on Founder hosting decision).

#### Task 3.5 — Intelligence Layer Integration Testing & Prompt Evaluation Harness

- **Description:** Add a real (or realistically-staged) integration test running a full orchestration goal against a live provider, plus a golden-output evaluation harness for prompt-quality regression detection.
- **References:** `PD-000` §PD-011.
- **Why it matters:** The Orchestrator's own unit test mocks every dependency; no test exercises the full chain end-to-end; a prompt edit today has no automated way to detect a quality regression.
- **Dependencies:** Task 2.4 (AI provider resilience) should land first so integration tests aren't flaky on transient provider issues.
- **Effort:** Medium-Large (5-7 engineer-days).
- **Risk:** Medium — a quality/regression-prevention gap, not an active incident risk today, but every future Intelligence Layer change ships blind without it.
- **Testing required:** A nightly/manual CI job runs at least one orchestration goal against a real provider and asserts a successful `AiOrchestrationRun`; a demonstrated prompt-quality regression fails the eval job before being fixed.
- **Completion criteria:** Per `PD-011`'s own acceptance criterion.
- **Suggested owner:** Engineering — AI Orchestrator domain.
- **Status:** **Not Started.**

#### Task 3.6 — Minimal Playwright E2E Suite

- **Description:** Stand up a minimal Playwright suite covering the 3-5 most critical cross-page flows (register→verify→login, create-a-goal→journey, a Founder panel).
- **References:** `PD-000` §PD-013 item 4.
- **Why it matters:** Confirmed this session: zero Playwright/Cypress or any e2e/visual-regression tooling exists anywhere in the repository — everything today is Jest+RTL (frontend) or Jest+Supertest (backend), strong for what each covers, but no cross-page-flow regression is caught automatically.
- **Dependencies:** None technically, grouped here since it's the natural companion to Task 3.3's real staging environment (an e2e suite is most valuable once it can run against something real).
- **Effort:** Bundled within `PD-013`'s 4-6 engineer-day estimate (this is the largest single item within it).
- **Risk:** Medium — closes the only structural testing gap in an otherwise well-tested repository (122 backend + 107 frontend test files, confirmed this session).
- **Testing required:** N/A — this task *is* the testing infrastructure.
- **Completion criteria:** A Playwright run passes locally and in CI for the chosen critical flows.
- **Suggested owner:** Engineering — Frontend foundation.
- **Status:** **Not Started.**

---

### Milestone 4 — Public Launch

**Objective:** Resolve every scope decision and deferred surface that only matters once Aureus considers expanding beyond the 25-member pilot's currently locked V1 scope (`B1`'s V1 Scope Lockdown — voice/Academy/Pods default off).

**Entry criteria:** Milestones 1–3 substantially complete; a Founder decision to expand scope beyond the pilot.

**Exit criteria:** No placeholder route remains reachable from primary navigation without either real content or an explicit, Founder-approved "coming soon" affordance; the Orchestrator's `NEXT_BEST_ACTION` capability is member-reachable.

**Major risks:** Task 4.1 in particular is a product/scope decision, not an engineering-readiness question — treating it as "blocked on effort" would misstate the actual blocker.

**Validation required:** Per each task's own completion criteria below.

---

#### Task 4.1 — Community/Calendar/Settings/Search/Help: Build or Formally Remove

- **Description:** A Founder/product decision on whether these five placeholder surfaces receive real backend scope or are formally removed from primary navigation.
- **References:** `docs/work-orders/PR-002-Deferred-Surfaces-Justification.md` (the original, explicit deferral); `PD-000` §PD-014 Track A.
- **Why it matters:** `PR-002` already verified, per-surface, that none of the five has an existing backend to connect to (unlike the six surfaces PR-002 did wire) — each would require genuinely new backend scope, not a frontend-only connection. Leaving them as visible placeholders in primary navigation is, in `PR-002`'s own words, "the worst of both options."
- **Dependencies:** A Founder/product decision — not resolvable by engineering alone.
- **Effort:** Small-Medium (2-3 engineer-days) if cutting from navigation; unknown/large per-surface if new backend scope is chosen (each would be its own Work-Order-class effort, per `PR-002`'s own recommendation that Community and Settings in particular warrant their own Founder specification review, similar to `WO-030`'s Pods precedent).
- **Risk:** Medium — placeholder routes in primary nav read as an unfinished product to real users.
- **Testing required:** Depends on the decision — navigation-only test if removed; full domain test suite if built.
- **Completion criteria:** No placeholder route reachable from primary navigation without an explicit, Founder-approved affordance, OR each has real content.
- **Suggested owner:** Founder (decision) + Engineering (execution once decided).
- **Status:** **Blocked** (on Founder decision).

#### Task 4.2 — Member-Facing Next Best Action Surface

- **Description:** Build a lightweight "What should I focus on next?" surface (Home widget or persistent element) that calls the Orchestrator and renders its result with a visible, human-readable rationale.
- **References:** `PD-000` §PD-015.
- **Why it matters:** Confirmed: no frontend code anywhere calls `POST /ai/orchestrate`. This was a deliberate, documented scope decision in `PR-004` ("no new panel, and no member-facing UI... in this work order") — this task is the intentional follow-up, not a bug fix.
- **Dependencies:** Task 1.2 (AI moderation) and Task 3.5 (integration testing) should land first — this is the first member-facing surface built directly on the Orchestrator, and per this plan's own execution principles, should not be the first thing to expose an unmoderated/unverified AI path to end users.
- **Effort:** Medium (4-5 engineer-days).
- **Risk:** Low — a product-completeness item; nothing breaks by deferring it further.
- **Testing required:** The widget handles all four `AiOrchestrationStatus` outcomes (`SUCCESS`/`PARTIAL`/`FAILED`/`NO_ACTION`) gracefully; accessibility-tested per this repo's established convention.
- **Completion criteria:** A member sees a "next best action" suggestion sourced from a real `POST /ai/orchestrate` call, with its rationale visible.
- **Suggested owner:** Engineering — AI Orchestrator + Home dashboard domains.
- **Status:** **Not Started.**

#### Task 4.3 — OAuth/SSO and CAPTCHA

- **Description:** Add OAuth/SSO login options and CAPTCHA on registration.
- **References:** `PD-000` §PD-004 (explicitly deferred at the time `PD-001` absorbed the rest of that domain's scope), reconfirmed still deferred in `docs/work-orders/PD-001-Production-Foundation.md` §7.
- **Why it matters:** Named as "valuable but lower-urgency" in the original audit, appropriate for a 25-person, personally-invited pilot where registration volume/abuse risk is low; becomes more relevant at public scale.
- **Dependencies:** None technically; low urgency until registration volume grows.
- **Effort:** Not separately estimated in any repository document (was folded into `PD-001`'s original larger scope before being deferred out of it).
- **Risk:** Low at pilot scale; rises with public registration volume.
- **Testing required:** Standard OAuth/SSO flow tests; CAPTCHA-bypass-attempt test.
- **Completion criteria:** Not yet defined in any repository document — recommend scoping as its own Work Order if/when pursued, rather than assumed here.
- **Suggested owner:** Engineering — Auth domain.
- **Status:** **Not Started** (deferred by explicit, documented decision, not oversight).

---

### Milestone 5 — Scale Readiness

**Objective:** Verify the platform under real, multi-replica, real-traffic conditions once Aureus has operated at pilot scale.

**Entry criteria:** Milestone 3 complete (a real CD pipeline, staging environment, and at least one load test already exist).

**Exit criteria:** Not yet definable from repository evidence — see note below.

**A deliberate note on why this milestone stays thin:** Per this plan's own rule against inventing work, no repository document yet defines concrete scale-readiness tasks beyond "run the load test that Milestone 3 stands up, then react to what it shows." Inventing specific scale-engineering tasks (multi-region deployment, database sharding, CDN strategy, etc.) here would violate this plan's mandate — none of that is evidenced by any current repository document, PD domain, or Work Order. This milestone is deliberately left as a placeholder for whatever Milestone 3's own load-test results actually surface, plus the two known, already-flagged items below.

#### Task 5.1 — Revisit SMTP-Optional Relaxation

- **Description:** Reconsider the temporary decision (this session's history) to relax `SMTP_HOST` to fully optional in the Joi schema for the pilot's smaller scope.
- **References:** This session's own prior task history (SMTP-optional-for-v1 relaxation, `.env.example`/`production-runbook.md` updates, `verify-env.spec.ts` fix).
- **Why it matters:** A deliberate, documented, temporary decision appropriate at 25-member scale; should not remain the production default indefinitely.
- **Dependencies:** None; revisit once real member volume grows past the pilot.
- **Effort:** Small (config/validation change, same shape as the original relaxation).
- **Risk:** Low now, rising with scale (silent email non-delivery risk returns if never revisited).
- **Testing required:** Re-run `verify-env.spec.ts`-style production-required validation once reversed.
- **Completion criteria:** A documented decision on when SMTP becomes required-again, tied to a real volume/scale threshold.
- **Suggested owner:** Engineering — Email/Config domain.
- **Status:** **Not Started** (tracked, low urgency).

#### Task 5.2 — Load-Test-Driven Follow-Up (placeholder)

- **Description:** Whatever Task 3.3's k6 baseline load test actually reveals — connection-pool tuning, cache-layer needs, specific endpoint optimization — is the real scale-readiness backlog, and cannot be listed here without inventing it.
- **References:** `PD-000` §PD-005 (the load test itself is the discovery mechanism for this task's actual content).
- **Why it matters:** Real load-test results are the only honest source for this milestone's real content.
- **Dependencies:** Task 3.3.
- **Effort:** Not estimable until Task 3.3 produces results.
- **Risk:** Unknown until measured.
- **Testing required:** N/A — this task is defined by test results, not the other way around.
- **Completion criteria:** N/A until Task 3.3 lands.
- **Suggested owner:** Engineering — Infrastructure.
- **Status:** **Not Started** (cannot start before Task 3.3).

---

## 3. Dependency Map

```
Fully independent, start immediately (no dependency on anything):
  Task 1.1  Legal/Privacy/Consent
  Task 1.2  AI Moderation
  Task 1.4  A4 (human phone-verification)
  Task 2.4  AI Provider Resilience
  Task 2.5  AI Data Retention
  Task 2.6  Voice Domain flaky-test investigation
  Task 2.8  Frontend error boundary + polish (items 1-3)
  Task 2.9  Pods steward UI + Messages entry point
  Task 3.1  Proactive AI-budget alerting

Depends on Task 1.4 (A4):
  Task 1.5  A5/A6 (QA spot-check + Gate A sign-off)
       │
       └── Task 2.1  C9 real-member sign-off
              │
              └── Task 2.2  Gate D (Tending Run)
                     │  (also benefits from Task 2.6 landing first — trustworthy test signal)
                     └── Gate F (Founding Review) — out of this plan's scope, downstream of Gates D/E

Depends on Task 2.8:
  Task 3.2  Frontend Sentry wiring

Depends on Task 1.1 (design coordination, not a hard blocker):
  Task 2.3  Gate E (Memory Rights) — coordinate "forget"/"export" with Task 1.1 and Task 2.5
  Task 2.5  AI Data Retention — same coordination

Depends on Task 2.4:
  Task 3.5  Intelligence Layer integration/eval harness (reduced flakiness prerequisite)

Depends on Task 1.2 + Task 3.5:
  Task 4.2  Next Best Action surface (should not be the first unmoderated AI-facing surface)

Depends on a Founder hosting-target decision (all four, same single blocker):
  Task 3.3  CD pipeline + staging + load testing
  Task 3.4  Automated backup schedule
  Task 5.1's future relevance and Task 5.2 (both downstream of Task 3.3)

Depends on a Founder product/scope decision (not effort):
  Task 4.1  Community/Calendar/Settings/Search/Help

Gate D and Gate E may proceed in parallel with each other (no dependency between them),
  but both are blocked upstream on Task 2.1 → Task 1.5 → Task 1.4.

Milestone 4 (Public Launch) tasks may all proceed in parallel with Milestone 2/3 engineering,
  but should not be treated as prerequisites for the 25-member pilot itself.
```

---

## 4. Engineering Dashboard

| Category | Items |
|---|---|
| **Critical (blocks pilot)** | 1.1 Legal/Privacy · 1.2 AI Moderation · 1.4 A4 · 1.5 A5/A6 · 2.1 C9 sign-off · 2.2 Gate D · 2.3 Gate E |
| **High** | 1.3 Content Moderation (if Pods enabled) · 2.4 AI Resilience · 2.7 Document Storage · 3.3 CD/Staging/Load Test |
| **Medium** | 2.5 AI Retention · 2.6 Voice flaky-test · 2.8 Frontend Polish · 2.9 Pods/Messages UI · 3.1 Budget Alerting · 3.2 Frontend Sentry · 3.5 Integration Testing · 3.6 Playwright · 4.1 Deferred Surfaces decision |
| **Low** | 4.2 Next Best Action · 4.3 OAuth/CAPTCHA · 5.1 SMTP revisit |
| **Founder decisions required** | Task 3.3/3.4 hosting-target decision · Task 4.1 build-or-remove decision · (separately, out of this plan's scope: the constitutional-hierarchy and domain-canon-duplication decisions in `AUREUS-REPOSITORY-VALIDATION-REPORT.md` §10) |
| **Human operational tasks** | Task 1.4 (A4 phone-verification) · Task 1.5 (A5 spot-check, A6 sign-off) |
| **Documentation tasks** | None net-new identified — every task above already has a home in an existing Work Order/PD/Canon; this plan is itself the documentation task for organizing them |
| **Infrastructure tasks** | Task 3.1 · 3.2 · 3.3 · 3.4 · 5.2 |
| **Security tasks** | Task 1.2 · 1.3 · 2.7 (storage security) |
| **Testing tasks** | Task 2.6 (flaky-test root cause) · 3.5 (integration/eval harness) · 3.6 (Playwright) |

---

## 5. Execution Principles Applied

Per this plan's own mandate, every task above was checked against: **smallest safe implementation** (e.g., Task 1.3's sanitization-first framing, Task 2.7's labeling-as-interim-mitigation); **low deployment risk** (Task 2.1's already-tested, already-merged mechanism; Task 2.2/2.3's test-account-first design already built into Gate D/E's own acceptance criteria); **backward compatibility** (no task above proposes changing an existing endpoint's contract); **repository consistency** (every new module recommended above follows an existing pattern — e.g., Task 2.4's provider abstraction already exists, Task 2.7's suggested storage-provider abstraction mirrors the existing `AiProviderModule`/`ConnectedAccountProviderModule` pattern per `PD-012`'s own note); **measurable progress** (every task's Completion Criteria is a concrete, testable statement, not a vague aspiration); **simplicity and maintainability** (Milestone 5 was deliberately kept thin rather than padded with speculative scale-engineering work not yet evidenced by this repository).
