# AUREUS — Engineering Execution Audit v1.0

**Purpose:** An evidence-based implementation roadmap — what remains to be built, completed, verified, or improved before Aureus can responsibly launch. This audit does not create governance, rewrite existing plans, or invent architecture. Every item below either already has an owner (a Work Order, ADR, PD domain, or Canon) — cited instead of duplicated — or is a direct, verified finding from reading the actual repository state.

**Status:** Read-only audit. No repository file was modified except this one.

**Date:** 2026-07-25

**Method:** `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` (2026-07-21) already performed a rigorous, evidence-cited, 16-domain production/Intelligence-Layer audit of this exact repository. This audit does not re-derive that work — it verifies which of PD-000's 16 domains have since shipped (direct `grep`/file-existence checks against the current tree, not assumption), folds in everything built since PD-000 was written (the entire `docs/launch/` LAUNCH-001 track — Gates A/B/C — plus this session's `AUREUS-INSTITUTIONAL-BLUEPRINT.md` and `AUREUS-REPOSITORY-VALIDATION-REPORT.md`), and reorganizes the combined picture into the 15 sections requested. Every "still open" claim below was spot-verified against the current tree this pass (not merely carried over from PD-000's 2026-07-21 snapshot) — see the specific `grep`/file checks cited inline.

---

## 1. Executive Summary

**The backend is architecturally complete and production-hardened for its first two production domains; the frontend is substantially built; the LAUNCH-001 pilot track (25 members, one metro) is 24 of 50 work orders complete with a real, working engineering path to the rest.** The gaps that remain are concentrated in exactly four places, each already named, scoped, and effort-estimated by existing repository documents:

1. **Legal/privacy** (`PD-003`) — zero implementable Terms of Service, Privacy Policy, or consent-tracking text exists anywhere in the repository. This is the single largest gap between "engineering-complete" and "launchable to real people," and it is not an engineering task — it needs legal drafting before any code follows.
2. **AI safety** (`PD-007`, `PD-008`) — member text reaches the AI provider with zero moderation or prompt-injection defense, and Pod messages have no delete/report path. This is the largest *engineering* safety gap.
3. **Infrastructure completion** (`PD-005` remainder, `PD-002` Observability remainder) — no CD pipeline, no staging environment, no load testing anywhere in the repository (confirmed: no `load-tests/` directory, no `cd.yml` workflow), all blocked on a hosting-provider decision only the Founder can make.
4. **The human-only work remaining in the LAUNCH-001 track** — A4 (phone-verify 8 real candidates), A5, A6, and C9's real-member sign-off. This is not an engineering gap; the engineering side of every one of these was closed this session (see §3).

**Recommended first production milestone:** close `PD-003` (legal) and `PD-007` (AI safety) — both are independent of the hosting decision and of each other, both are Critical-risk, and together they are the two things standing between "engineering-complete" and "safe to let a real, unknown member talk to the AI Steward." See §13.

---

## 2. Current Production Readiness

| Area | Readiness | Basis |
|---|---|---|
| Backend domain completeness (PA-020's 12 named Version 1 systems) | **100%** | `docs/releases/version-1-readiness.md` — all 12 implemented, tested, live-verified as of WO-030; unchanged since |
| Frontend domain completeness | **~85%** | FWO-001–003, DOMAIN-001–008, PR-002/003/004 delivered; Community/Calendar/Settings/Search/Help remain undecided placeholders (`PD-014` Track A); Pods steward/admin UI and Messages new-conversation entry point unwired (`PD-014` Track B) |
| Security (auth, headers, rate limiting, input validation, dependency hygiene) | **~80%** | `PD-001` complete (see §6); MFA and `emailVerified`-at-login confirmed present in the running code this pass; OAuth/SSO and CAPTCHA explicitly deferred; AI-specific safety (`PD-007`) and platform-wide content moderation (`PD-008`) not started |
| Infrastructure (Docker, health checks, migrations, backup, logging, Redis, Postgres, container hardening, CI) | **85%** | `PD-002` complete (see §8); CD pipeline, staging environment, and load testing not started, blocked on a hosting decision |
| Legal/Privacy | **0%** | `PD-003` — confirmed this pass: no `/privacy` or `/terms` route exists anywhere in `apps/web/app` |
| AI safety/moderation | **0%** | `PD-007` — confirmed this pass: zero moderation calls in `AiRequestsService` |
| Testing (unit/integration/e2e) | **Strong unit/integration, zero e2e** | 122 backend `.spec.ts` files, 107 frontend test files (confirmed this pass); zero Playwright/Cypress files anywhere (`PD-013`) |
| Performance/Load | **0%** | Confirmed this pass: no `load-tests/` directory, no k6/Artillery reference in any `package.json` |
| Governance/documentation | **See `AUREUS-REPOSITORY-VALIDATION-REPORT.md`** | Out of this audit's scope — cited, not restated |
| LAUNCH-001 pilot track | **48% (24/50 work orders)** | `docs/launch/SCOREBOARD.md`, current as of this session |

---

## 3. Completed Systems

**Backend (PA-020's 12 named Version 1 systems — all delivered, per `docs/releases/version-1-readiness.md`):** Member Core, Journey Engine, Opportunity Engine, Resource Directory, Authentication/IAM (`WO-019`), Administration & Operations (`WO-021`), Business Portal (`WO-024`), Stewardship System (`WO-025`), Communication System (`WO-026`), Knowledge System (`WO-027`), Academy (`WO-028`), AI Intelligence Engine (`WO-029`), Pods (`WO-030`). Authorization retrofit across every domain (`WO-022`), real email delivery (`WO-023`).

**Frontend (delivered):** Design-system/token/theme/accessibility/routing/state foundation (`FWO-001`), Conversation Core (`FWO-002`), Auth/session (`FWO-003`), the Journey/Opportunities/Recommendations domain (`DOMAIN-001`), Voice (`DOMAIN-002`/`005`), Home dashboard (`DOMAIN-003`), Opportunity Center (`DOMAIN-004`), Stewardship/Academy (`DOMAIN-006`), AI Steward Workspace (`DOMAIN-007`), Connected Experiences (`DOMAIN-008`), Founder Operating System (`PR-003`), Intelligence Layer visibility extensions (`PR-004`), six of eleven placeholder surfaces wired to real backends — Notifications/Profile/Tasks/Pods/Resources/Messages (`PR-002`).

**Production hardening (delivered):** `PD-001` — production env config/secrets hygiene, security headers, MFA (confirmed present: `apps/api/src/auth/mfa/`), email-verification enforcement at login (confirmed present: `auth.service.ts:107`), logout-everywhere, a 4th authorization gap found and fixed (public read access to draft/pending content across 6 domains), rate-limit tightening, stored-content sanitization, dependency vulnerability remediation (0 known vulnerabilities). `PD-002` — Docker images build-verified in real CI, health/readiness/liveness endpoints, DB migration workflow, backup/restore + rehearsed restore drill, production logging, Redis-backed rate limiting, Postgres connection-pool config, container hardening, CI/CD verification (build+test+docker jobs), infra docs/runbooks/DR procedures. Backend Sentry error tracking wired (DSN-gated, safe no-op default — confirmed present: `apps/api/src/common/monitoring/sentry.ts`, `@sentry/node` in `package.json`).

**LAUNCH-001 pilot track (this session, since PD-000 was written):** Gate B (`B1`–`B9`) fully complete — V1 scope lockdown, arrival screen, consent, accessibility preferences, auth-state correctness, interruptible/resumable arrival, steward visibility, safe failure, full accessibility sign-off. Gate C's entire engineering scope (`C1`–`C8`) plus `C9`'s production-safety enforcement — understanding, clarification, urgency detection, resource discovery, verified-resource presentation, steward escalation, safe failure, fixture-based sign-off, and (this session) the fix ensuring a real member's session can only ever surface `VERIFIED` City Sheet data, never an unverified real candidate (`apps/api/src/needs/needs.service.ts`, `isSafeToSurface()`). Gate A's engineering side (`A1`, `A2`, `A3`, `A4-PREP` including its frontend addendum, the `/city-sheet` verification UI) — fully done; what remains in Gate A is human-only (see §4).

---

## 4. Partially Completed Systems

| System | What exists | What is missing | Owner |
|---|---|---|---|
| Gate A — City Sheet verification | Full schema, storage, candidate list (8 real candidates), verification workflow + UI | Actual human phone-verification of the 8 candidates (A4), QA spot-check (A5), Founder sign-off (A6) — **human work, not engineering** | `docs/launch/A4-Verification-Guide.md`, `WORKORDERS.md` |
| Gate C — production verification | The production-safety enforcement mechanism (this session's `C9` fix) — already merged and tested | Real members actually using it against real, human-verified data (requires A4/A6 first) | `WORKORDERS.md` C9 row |
| Infrastructure (`PD-002`/`PD-005`) | Docker, CI, backup, logging, Redis, Postgres pooling all real and build-verified | Real CD pipeline, live staging environment, k6/load testing against multi-replica infra — **all three blocked on a Founder hosting-target decision**, not effort | `PD-002-Production-Infrastructure-Deployment.md` §7 |
| Backup/DR (`PD-006`) | Backup/restore tooling + one rehearsed drill (absorbed into `PD-002`) | A recurring/automated schedule independent of manual or deploy-triggered backups — depends on the same hosting decision above | `PD-000` §PD-006 |
| Observability (`PD-002` remainder) | Backend Sentry wired (DSN-gated), health/readiness/liveness split, structured logging | Frontend error tracking/boundary (`PD-013`), proactive AI-budget-ceiling alerting (vs. today's hard-refusal-only) | `PD-000` §PD-002 remainder |
| Frontend domain completeness (`PD-014`) | Pods member-facing Discover/My-Pods tabs; Messages viewing of existing conversations | Pods steward/admin UI (roster/events/service-projects/escalations/messaging) — backend already supports all of it (`WO-030`); Messages "start a new conversation" entry point | `PD-014` Track B |
| Legal Canon (governance) | Governance-philosophy charters (`docs/legal/`) | Zero implementable Terms of Service/Privacy Policy/consent text — same finding as `PD-003`, cross-referenced in `MDR-017` and the Validation Report | `PD-003`, `MDR-017` |

---

## 5. Missing Systems

Not started at all, confirmed by direct file-existence/`grep` checks this pass:

- **`/privacy`, `/terms` routes; consent checkbox at registration; `User.termsAcceptedAt`/`privacyPolicyVersion`; self-service data export/delete; root `LICENSE` file** (`PD-003`). Confirmed: no privacy/terms route anywhere under `apps/web/app`.
- **AI moderation / prompt-injection defense** (`PD-007`). Confirmed: zero moderation calls in `apps/api/src/ai/requests/ai-requests.service.ts`.
- **Pod-message delete/report + platform-wide content sanitization** (`PD-008`). Confirmed: `PodMessagesController` exposes only `@Post()`, no delete/report route.
- **AI provider resilience** — retry/backoff, timeout, cross-provider fallback, per-capability spend ceilings (`PD-009`).
- **AI data retention/purge job, member-facing "delete my AI history," token-aware truncation for long conversations** (`PD-010`).
- **Intelligence Layer integration testing against a real provider + a golden-output prompt-regression harness** (`PD-011`).
- **Real document storage backend** — `DocumentsService` persists only metadata today, no actual file bytes, no virus scanning, no real size/MIME enforcement (`PD-012`).
- **Frontend polish** — no `error.tsx`/`global-error.tsx`, no favicon/manifest/robots/sitemap/OG tags, no Playwright/e2e suite anywhere in the repository, 7 named components still lack `jest-axe` coverage (`PD-013`).
- **A Founder/product decision on Community/Calendar/Settings/Search/Help** — currently visible placeholder routes with no backend (`PD-014` Track A).
- **Member-facing "Next Best Action" surface** — the Orchestrator's `NEXT_BEST_ACTION` goal (`PR-004`) has no frontend caller anywhere (`PD-015`).
- **A real CD pipeline, staging environment, and load-testing tooling** — confirmed this pass: only one workflow file (`ci.yml`, jobs `ci`+`docker`), no `cd.yml`, no `load-tests/` directory (`PD-005` remainder).
- **Gate D (The Tending Run), Gate E (Memory Rights Live), Gate F (The Founding Review)** — all 21 work orders across these three gates are **Not Started** (`docs/launch/WORKORDERS.md`), correctly blocked on Gate C's full completion (including the human-only C9 sign-off) per LAUNCH-001's own sequential-gate rule.

---

## 6. Security Readiness

**Delivered (`PD-001`, confirmed present in the running code this pass):**
- bcrypt password hashing (12 rounds), refresh-token rotation, 5-attempt/15-minute lockout, password-reset session invalidation, password complexity rules
- MFA/TOTP (`apps/api/src/auth/mfa/`) — enrollment, confirmation, disable, recovery codes
- `emailVerified` enforced at login (`auth.service.ts:107`)
- Security headers, rate-limit tightening on auth/AI/admin-mutation endpoints
- A 4th authorization gap found and fixed during `PD-001` itself (public read access to `DRAFT`/`PENDING_REVIEW`/`REJECTED` marketplace content across 6 domains)
- Stored-content sanitization (for the fields covered at the time), dependency vulnerability remediation (0 known vulnerabilities as of `PD-001`)

**Explicitly deferred, by product/infrastructure decision, not oversight:** OAuth/SSO, CAPTCHA on registration, Redis-backed distributed rate limiting at the time of `PD-001` (since delivered by `PD-002`), CSP tuning.

**Not started (real gaps, Critical/High risk):**
- **AI moderation and prompt-injection defense** (`PD-007`) — **Critical** for the Intelligence Layer specifically; member text reaches the provider with zero safety check today.
- **Platform-wide content moderation/trust-and-safety** (`PD-008`) — **High**; no removal path exists for abusive Pod content, and free-text fields (Pod messages, announcements, notes, knowledge articles) have no server-side HTML/rich-text sanitization (confirmed: zero hits for `sanitize-html`/`dompurify`/`xss` in either `package.json`).
- **Legal/privacy/consent** (`PD-003`) — **Critical** for any deployment with real (especially EU/CA) users; this is legal exposure, not hardening.
- **Document storage security** (`PD-012`) — no virus/malware scanning, no real size/MIME enforcement, since the backend doesn't yet store real file bytes at all.

---

## 7. Testing Readiness

- **122 backend `.spec.ts` files, 107 frontend test files** (confirmed by direct count this pass) — every domain listed in §3 carries unit + e2e (backend) or unit + component + accessibility (frontend) coverage, documented per-domain in that domain's own Readiness Report.
- **Known, pre-existing, unrelated flakiness:** the Voice Domain (`DOMAIN-002`) has carried 7 pre-existing test failures across essentially every full-suite validation run cited in this session's own work (most recently reconfirmed during this session's `C9` work: "121 passed, 1 failed" suite-wise, "1261 passed, 7 failed" test-wise, unchanged from every prior domain's validation note). This has never been root-caused or fixed in the repository's history to date — it is inherited technical debt, not new drift, and should be root-caused before Gate D (Tending Run) work begins, since Gate D's own acceptance criteria requires cron-job reliability.
- **Zero end-to-end/visual-regression tooling anywhere** — no Playwright, Cypress, or equivalent config exists in the repository (`PD-013`). Everything today is Jest + React Testing Library (frontend) or Jest + Supertest against a real NestJS app instance (backend) — strong for what it covers, but no cross-page-flow regression is caught automatically.
- **7 frontend components still lack `jest-axe` accessibility coverage**, named explicitly in `PD-013`: `SurfaceTracker`, `TextInterfaceOrchestrator`, `VoiceOrchestrator`, `FirstRunWelcome`, `WelcomeFlow`, `AuthGate`, `FounderGate`.
- **No Intelligence Layer integration/eval harness** (`PD-011`) — the Orchestrator's own unit test mocks every dependency; no test runs the full chain against a real (non-stub) provider, and prompt edits have no regression-detection mechanism.
- **No load/performance testing tooling exists anywhere** (`PD-005` remainder) — confirmed this pass via `grep` across the whole repo for `k6`/`artillery`/`autocannon`/`load-test`, matches only in documentation, none in code or CI config.

---

## 8. Operational Readiness

**Delivered (`PD-002`, confirmed present):** Both Dockerfiles build-verified against a real daemon in CI (`docker` job in `.github/workflows/ci.yml`); health/readiness/liveness endpoints split; DB migration deployment workflow documented and tested; backup/restore tooling with one rehearsed restore drill; production logging configuration; Redis-backed `@nestjs/throttler` storage (platform-wide rate limiting, not per-instance); Postgres connection-pool configuration; container hardening; infra docs, runbooks, and disaster-recovery procedures; backend Sentry error tracking (DSN-gated).

**Not started:**
- **Real CD pipeline** — only `ci.yml` exists; no `cd.yml`, no automated deploy-on-merge to any environment.
- **Live staging environment** — `docker-compose.yml` self-labels a "local/staging stack" but is not a real, separately-provisioned staging deployment.
- **Automated/scheduled backup cadence independent of manual or deploy-triggered runs** (`PD-006` remainder).
- **Proactive AI-budget-ceiling alerting** — today's cost governance (confirmed working: emergency stop, global + per-user daily ceilings) only refuses once a ceiling is already exceeded; no alert fires as spend approaches it.

**All four items above share one root blocker: a hosting-provider/target decision only the Founder can make** (`PD-000`/`PD-002` §7, restated consistently across both documents). This is not an engineering effort gap — the engineering to build a CD pipeline, staging environment, and load test suite is well-understood and estimated (see §11); it has no target environment to build against yet.

---

## 9. Performance & Scalability Readiness

**0% — confirmed, not assumed.** No load-testing tool (k6, Artillery, autocannon, or equivalent) exists anywhere in the repository; no `load-tests/` directory; no performance budget or benchmark exists in any CI job. This has been true since the repository's inception and is unchanged as of this pass. The one piece of scalability-relevant work that *has* shipped is the Redis-backed rate-limiter (`PD-002`) — without it, rate limits would silently be per-instance and incorrect the moment a second API replica existed; with it, the platform-wide rate-limiting behavior is at least *correct* under horizontal scaling, even though it has never been *load-tested* under horizontal scaling. This is precisely the gap `PD-005`'s remainder (§8) exists to close, and it cannot be closed before a real multi-replica target environment exists.

---

## 10. Technical Debt

| Item | Description | Severity |
|---|---|---|
| Voice Domain flaky tests | 7 pre-existing test failures, reproduced identically across every full-suite validation run cited in this session's work, never root-caused | Medium — doesn't block current work, but must be resolved before Gate D (Tending Run), which depends on cron-job reliability |
| Document storage is metadata-only | `DocumentsService`/`UploadDocumentDto` never read or write actual file bytes; a member "uploading" a document today stores nothing real | High — a shipped, member-facing feature (Connected Experiences, `DOMAIN-008`) does not do what its name implies |
| Messages has no new-conversation entry point | Confirmed via an explicit in-code comment in `MessagesPage.tsx` — conversations can only be viewed once they already exist via a Stewardship or Org-rep link | Medium — a built backend domain is not fully reachable from the frontend |
| Five placeholder frontend routes with no backend | Community, Calendar, Settings, Search, Help — visible in primary navigation with nothing behind them | Medium — reads as an unfinished product; needs an explicit Founder decision (build or formally remove from nav), not silent scope creep |
| No prompt-versioning/regression detection | `system-prompts.util.ts`'s hardcoded prompts have no golden-output test or regression gate | Medium — every future prompt edit ships blind |
| SMTP made fully optional for v1 (temporary) | `SMTP_HOST` was relaxed to optional in the Joi schema for the pilot's smaller scope (task history, this session) — a deliberate, documented, temporary decision, not drift, but should be revisited before scaling past the 25-member pilot | Low, tracked |

---

## 11. Recommended Execution Roadmap

Grouped by dependency, mirroring `PD-000`'s own recommended-order logic, updated for what has since shipped:

1. **Independent, no-dependency, ready now:** `PD-003` (legal/privacy — pacing item is legal drafting, not engineering availability), `PD-007` (AI moderation), `PD-008` (platform-wide content moderation), `PD-009` (AI provider resilience), `PD-010` (AI data retention), `PD-012` (real document storage), `PD-014` Track B (Pods steward UI + Messages entry point), `PD-013` items 1–3 (error boundary, metadata/favicon, remaining a11y coverage).
2. **A Founder/product decision needed before engineering starts:** `PD-014` Track A (Community/Calendar/Settings/Search/Help — build or remove from nav).
3. **A hosting-target decision needed before engineering starts:** `PD-005` remainder (CD + staging + load testing), `PD-006` remainder (automated backup cadence), `PD-002` remainder's proactive AI-budget alerting can proceed independently of hosting.
4. **Depends on item 1's `PD-009` landing first (reduces flakiness):** `PD-011` (Intelligence Layer integration/eval harness).
5. **Depends on `PD-007`/`PD-011` landing first (shouldn't be the first unmoderated/unverified AI surface):** `PD-015` (member-facing Next Best Action).
6. **Human-only, no further engineering required:** A4 (phone-verify 8 candidates), A5 (QA spot-check), A6 (Gate A sign-off) — unblocks C9's real-member sign-off.
7. **Blocked on Gate C's full completion (engineering + the human A4/A6 chain):** Gates D, E, F in full (21 work orders) — per LAUNCH-001's own sequential-gate rule, correctly not started yet.
8. **Independent, low-urgency, can run in parallel with anything above:** Voice Domain flaky-test root-cause (§10), `PD-013` item 4 (minimal Playwright suite).

---

## 12. Top 25 Engineering Priorities

Ranked by production risk, then by independence (fewest blockers first):

1. **`PD-003` — Legal, Privacy & Consent Foundation.** Critical. No dependency. Effort: Med-Large + legal drafting (not estimable).
2. **`PD-007` — AI Safety: Moderation & Prompt-Injection Defense.** Critical. No dependency. Effort: Medium (3-5d).
3. **A4 — Human phone-verification of the 8 real City Sheet candidates.** Critical for Gate A/C9. Human-only, no engineering dependency. Effort: Human time, not engineer-days.
4. **`PD-008` — Platform-Wide Content Moderation & Trust/Safety.** High. No dependency. Effort: Medium (3-5d).
5. **`PD-012` — Real Document Storage Backend.** High. Depends on hosting decision for the storage provider itself. Effort: Large (6-8d).
6. **Document-storage feature-integrity fix** — at minimum, stop presenting "upload" as functional until `PD-012` lands, or explicitly label it experimental. Effort: Small (annotation only), immediate.
7. **`PD-009` — AI Provider Resilience & Cost Governance Maturity.** High. No dependency. Effort: Medium (4-6d).
8. **`PD-005` remainder — CD pipeline + staging + load testing.** Critical, but blocked on a Founder hosting decision, not effort. Effort once unblocked: Large (5-6d).
9. **`PD-006` remainder — automated backup cadence.** Critical (unrecoverable-data-loss class), same hosting blocker as #8.
10. **`PD-002` remainder — proactive AI-budget-ceiling alerting.** High-adjacent (cost-governance completeness). No dependency. Effort: Small-Medium (2-3d).
11. **A5/A6 — QA spot-check + Founder Gate A sign-off.** Critical for unblocking C9. Human-only.
12. **`PD-010` — AI Data Retention & Conversation Memory Management.** Medium (privacy/compliance-adjacent to `PD-003`). Effort: Medium (3-5d).
13. **`PD-014` Track B — Pods steward/admin UI + Messages new-conversation entry point.** Medium. No dependency, backend already supports both. Effort: Medium (4-6d).
14. **Voice Domain flaky-test root cause.** Medium (blocks trustworthy Gate D validation later). No dependency. Effort: unestimated (root cause unknown).
15. **`PD-011` — Intelligence Layer Integration Testing & Prompt Eval Harness.** Medium. Best after `PD-009`. Effort: Medium-Large (5-7d).
16. **`PD-013` items 1-3 — error boundary, metadata/favicon/manifest, remaining a11y coverage.** Medium. No dependency. Effort: Medium (4-6d combined).
17. **`PD-014` Track A — Founder/product decision on Community/Calendar/Settings/Search/Help.** Medium (reads as unfinished otherwise). Decision, then Small-Medium-to-unknown engineering depending on scope chosen.
18. **`PD-015` — Member-facing Next Best Action surface.** Low (product-completeness, nothing breaks by deferring). Best after `PD-007`/`PD-011`. Effort: Medium (4-5d).
19. **`PD-013` item 4 — minimal Playwright e2e suite for 3-5 critical flows.** Medium (closes the only structural testing gap). No dependency. Effort: bundled in `PD-013`'s 4-6d estimate.
20. **Root-License file + repo hygiene item from `PD-003`.** Low effort, bundle with #1.
21. **Sentry frontend wiring** (backend already done) to complete `PD-002`'s observability scope. Low-Medium. No dependency.
22. **CAPTCHA/OAuth-SSO** — explicitly deferred product decisions from `PD-001`/`PD-004`; revisit once the pilot's real signup volume is known. Low urgency at 25-member scale.
23. **SMTP-optional temporary relaxation** — revisit before scaling past the pilot (§10). Low urgency now, tracked.
24. **Gate D (The Tending Run) — 7 work orders.** Future — correctly blocked on Gate C's full completion.
25. **Gates E (Memory Rights Live) and F (The Founding Review) — 6 + 8 work orders.** Future — correctly blocked on Gates C/D.

---

## 13. Recommended First Milestone to Reach Production

**"Safe to invite the first real member" milestone — not full public launch, but the specific 25-person, one-metro LAUNCH-001 pilot this repository is already built for:**

1. `PD-003` (legal/privacy) — cannot ethically onboard a real member without it.
2. `PD-007` (AI moderation) — cannot let a real, unknown member talk to the AI Steward without it.
3. A4/A5/A6 (human phone-verification, QA spot-check, Gate A sign-off) — the City Sheet cannot be trusted in production without it; this is the human work item, run in parallel with 1-2.
4. `PD-008` (Pod content moderation) — only needed if Pods are enabled for the pilot's V1 scope; per the already-shipped V1 Scope Lockdown (`B1`), Pods are currently gated off for the pilot (`voice`/`academy`/`pods` flags default `false`), so this can trail the first three if that scope decision holds.

**Everything else in this audit (§5-§9's remaining items, Gates D/E/F) is real, valuable, correctly-scoped follow-on work — not a blocker for the first 25-member cohort specifically**, per LAUNCH-001's own design ("we do not launch the Keeping. We launch a keeping"). The infrastructure-completion items (§8, hosting-dependent) matter more as the pilot scales past 25 than for the first cohort itself, since the current single-instance deployment shape is sufficient for that scale.

---

## 14. Risks That Could Delay Launch

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Legal text (`PD-003`) takes longer than engineering — legal drafting has no repository-estimable timeline | High | Blocks any real-member launch | Start legal drafting in parallel with everything else now; it is explicitly not gated on any other item |
| A4's human phone-verification stalls (steward capacity, candidate unreachable, etc.) | Medium | Blocks Gate A sign-off → blocks C9 → blocks Gate D start | `docs/launch/A4-Verification-Guide.md` already gives a concrete runbook; P3's steward-staffing decision (Founder + one trusted steward) is already made |
| Voice Domain flaky tests mask a real bug once Gate D's cron-reliability requirement depends on trustworthy test signal | Low-Medium today, rises before Gate D | Could cause a false-negative or false-positive Tending Run acceptance | Root-cause before Gate D work begins (§10, §11 item 8) |
| Hosting decision (blocking `PD-005`/`PD-006` remainder) continues to be deferred | Medium | Delays CD/staging/load-testing indefinitely, though not the 25-member pilot specifically (§13) | Raise explicitly as a standalone Founder decision, independent of the legal/AI-safety track |
| `PD-014` Track A (5 placeholder routes) ships to real members unresolved | Low if V1 Scope Lockdown already hides them from primary nav — **not independently verified this pass**; recommend confirming before launch | Reads as an unfinished product | One-time nav audit against the current `primarySurfaces` config |
| Document-storage feature gap (`PD-012`) is discovered by a real member trying to use it | Medium if Connected Experiences/Documents is in the pilot's V1 scope | Trust-damaging surprise | Confirm Documents is out of V1 pilot scope, or fast-track `PD-012`, before invitation |

---

## 15. Final Engineering Assessment

**Aureus's engineering foundation is real, tested, and substantially production-hardened — this is not a prototype.** All 12 named Version 1 backend systems are implemented and live-verified; the frontend covers every core member journey; production infrastructure (Docker, CI, health checks, backups, logging, rate limiting) is genuinely built and verified against real tooling, not assumed. The LAUNCH-001 pilot track's entire engineering scope through Gate C is done, including a genuine production-safety fix (this session's `C9` enforcement) that closes a real, previously-unenforced gap between "built and tested against fixtures" and "safe to use with real, still-unverified data."

**What stands between here and a responsible launch is four things, three of which are not primarily engineering work:** legal drafting (`PD-003`), AI safety engineering (`PD-007`/`PD-008` — genuinely engineering, and the most important item left in that category), a human phone-verification effort (A4/A5/A6), and a Founder decision on hosting (unblocking `PD-005`/`PD-006`'s remainder). None of these four require new architecture, new governance, or a rewrite of anything already built — every one of them has an existing owner, a scoped effort estimate, and a clear next action, cited throughout this audit rather than re-derived.

**Recommendation: proceed on `PD-003` and `PD-007` immediately (both independent, both Critical, neither blocked on anything), run A4 in parallel, and raise the hosting decision explicitly and separately** — that sequencing reaches the "safe to invite the first 25 real members" milestone (§13) fastest, without waiting on infrastructure work that matters more at a scale this pilot hasn't reached yet.
