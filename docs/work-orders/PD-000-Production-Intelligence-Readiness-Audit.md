# PD-000 — Production & Intelligence Readiness Audit

**Status:** Complete. No code was changed to produce this document — it is a read-only audit and execution plan. Authorization is required before PD-001 begins.

**Method:** Five parallel research passes across the repository (backend/security, frontend/accessibility, infrastructure/observability, Intelligence Layer maturity, governance/legal/compliance), each grounded in direct file reads and greps rather than assumption. Findings below are cited to file paths. Where something could not be verified (e.g., no live Docker daemon in this sandbox), that is stated plainly rather than guessed at.

**Baseline honesty note:** Every prior work order in this repo (PR-002 through PR-004) cites "PR-001 findings" as its baseline. This audit confirms **no PR-001 document exists anywhere in the repository** — it was apparently delivered outside the repo (consistent with how the constitutional-conflict comparison was also delivered as an artifact, never committed) and cannot be independently verified. This audit does not repeat that mistake: it is being committed to `docs/work-orders/` so that PD-001 onward has a real, citable baseline.

---

## How to read this document

Each Production Domain (PD) is scoped like a work order: a coherent, independently-schedulable body of work. All 16 are **real gaps found in this repository as it exists today** — nothing here is speculative hardening for its own sake. Each includes:

- **Objective** — what "done" means in one sentence.
- **Scope** — the concrete work.
- **Files affected** — where the work lands (existing files to change, new files/modules to add).
- **Dependencies** — what must exist first.
- **Estimated effort** — a rough engineer-day range, calibrated against the actual size of comparable past work orders in this repo (e.g., WO-023 Email Integration was ~2 days of scope; PR-004 was ~5-6 days of scope).
- **Acceptance criteria** — how PD-00X's own readiness report would prove it's done, in this repo's established style (test counts, validation pipeline, explicit claims).
- **Production risk** — Critical / High / Medium / Low, and why.
- **Intelligence Layer impact** — Direct (the domain IS part of the AI system), Indirect (the domain affects AI reliability/safety/compliance without being AI code itself), or None.

Domains are numbered in **recommended implementation order** — PD-001 is the suggested next work order, not necessarily the most complex.

---

## PD-001 — Email & Notification Delivery Production Configuration

**Objective:** Password reset, email verification, and all transactional email actually deliver in a real deployment instead of silently no-oping.

**Scope:** `NodemailerEmailService` falls back to `jsonTransport: true` ("captured locally, not delivered") whenever `SMTP_HOST` is unset (`apps/api/src/email/nodemailer-email.service.ts:45-48`). `docker-compose.yml` only passes through `${SMTP_HOST:-}` with an empty default, and `.env.example` has the SMTP block commented out — so as of today, a fresh production deploy following the runbook exactly would have **zero real email delivery** with no error, no crash, nothing visibly wrong. This PD: (1) selects and documents a concrete SMTP provider (or transactional-email API) for production, (2) makes the operational runbook's "recommended" SMTP vars effectively required in a production `NODE_ENV` (fail loudly, not silently degrade), (3) adds a startup warning/health-check signal when running in production with `jsonTransport` active, (4) verifies end-to-end delivery (register → verify email → forgot password → reset) against a real inbox in staging.

**Files affected:** `apps/api/src/email/nodemailer-email.service.ts`, `apps/api/src/app.module.ts` (Joi env validation — make SMTP conditionally required when `NODE_ENV=production`), `.env.example`, `docker-compose.yml`, `docs/operations/production-runbook.md`.

**Dependencies:** None. Fully independent, can start immediately.

**Estimated effort:** Small (1-2 engineer-days) — this is a configuration/validation fix, not new feature work; `EmailModule` itself (WO-023) is already complete and correct.

**Acceptance criteria:** A production-mode boot with `SMTP_HOST` unset fails fast with a clear error (not a silent warning); with `SMTP_HOST` set, register/verify/forgot-password/reset-password are manually verified end-to-end against a real mailbox; runbook updated to remove the "dev-shaped default" caveat for this variable specifically.

**Production risk:** **Critical.** Two of the auth module's core flows (email verification, password reset) are currently non-functional in any deployment that follows the existing docs exactly, with no error signal telling anyone this is broken.

**Intelligence Layer impact:** None directly, but Indirect: the AI budget-ceiling and account-lockout notification paths (`NotificationsService`) may also rely on email as a delivery channel in the future.

---

## PD-002 — Observability, Monitoring & Incident Response Foundation

**Objective:** A production incident can be detected, diagnosed, and alerted on without reading raw container logs.

**Scope:** Repo-wide grep confirms **zero** APM/error-tracking/structured-logging tooling exists (no Sentry, Datadog, New Relic, OpenTelemetry, Prometheus, Grafana, Winston, or Pino — only NestJS's built-in `Logger`). The production runbook self-admits this (`docs/operations/production-runbook.md:129`: "no APM/error-tracking integration and no structured audit log beyond `StewardActivityLog`"). This PD: (1) wires an error-tracking SaaS (Sentry is the natural fit for a Nest+Next stack) for both `apps/api` and `apps/web`, (2) adds structured JSON logging (replacing/wrapping NestJS `Logger`) so logs are machine-parseable, (3) extends the existing `GET /health` beyond DB-only (`apps/api/src/health/health.controller.ts`, `prisma-health.indicator.ts`) to report AI-provider reachability and email-transport mode, (4) adds a proactive notification (not just a `logger.warn`) when AI spend approaches (e.g. 80% of) a budget ceiling, reusing the existing `NotificationsService`.

**Files affected:** New `apps/api/src/observability/` module; `apps/api/src/health/*`; `apps/api/src/ai/requests/ai-requests.service.ts` (budget-threshold notification hook); `apps/web/app/layout.tsx` or a new `apps/web/instrumentation.ts` (Next.js error instrumentation); `package.json` (both apps, new deps); `docker-compose.yml`/Dockerfiles (env passthrough for DSNs).

**Dependencies:** None technically, but should land before PD-005 (infra/CD) so the very first real deploy already has eyes on it.

**Estimated effort:** Medium (3-4 engineer-days).

**Acceptance criteria:** A deliberately-thrown error in each app is visible in the error-tracking dashboard within seconds; `/health` reports provider/email status alongside DB; a simulated near-ceiling AI spend produces a Founder-visible notification (not just a log line); existing 715+511 test suites unaffected.

**Production risk:** **Critical.** Without this, every other domain below ships blind — any regression in PD-001 through PD-016 would be invisible until a member reports it.

**Intelligence Layer impact:** Direct — the AI-spend proactive-alert piece is Intelligence Layer observability maturity called out in PD-009's own findings; Indirect for the rest (general app health).

---

## PD-003 — Legal, Privacy & Consent Foundation

**Objective:** The platform has a real Privacy Policy and Terms of Service, members affirmatively consent to them at registration, and the platform can honor a data-subject's deletion/export request.

**Scope:** `docs/legal/` contains only governance-framework charters (OAS-LEG-001–008) — no drafted Privacy Policy or Terms of Service text exists anywhere in the repo. `apps/web` has no `/privacy`, `/terms`, or `/legal` route, and `RegisterForm.tsx` has no consent checkbox (grep for "terms|privacy|consent" returns nothing in either app). The `User` Prisma model has no consent-tracking field at all. Repo-wide, "GDPR"/"data export"/"data deletion"/"right to be forgotten" appear in **zero** documents or code paths — this is unaddressed at every layer, not just under-implemented. This PD: (1) drafts real Privacy Policy + ToS content (Founder/legal sign-off required — this PD cannot self-authorize legal text), (2) wires `/privacy` and `/terms` routes plus a footer, (3) adds a required consent checkbox to registration with a `termsAcceptedAt`/`privacyPolicyVersion` field on `User`, (4) adds a self-service "export my data" and "delete my account" endpoint + member-facing UI, (5) adds a root `LICENSE` file (repo has none today).

**Files affected:** `prisma/schema.prisma` (`User` model + migration), `apps/api/src/auth/*` (registration DTO/service), new `apps/api/src/users/data-rights/` module (export/delete), `apps/web/design-system/components/auth/RegisterForm.tsx`, new `apps/web/app/(public)/privacy`, `/terms` routes, new Profile-page "Manage my data" section, `LICENSE` (repo root).

**Dependencies:** None technically; the legal-text drafting is the pacing item and should start in parallel with everything else since it isn't engineering work.

**Estimated effort:** Medium-Large (4-6 engineer-days of engineering, **plus non-engineering legal drafting time that isn't estimable here**).

**Acceptance criteria:** Registration is blocked without checking the consent box; `User.termsAcceptedAt`/`privacyPolicyVersion` populated on every new account; a member can request account deletion and data export from their own Profile; `/privacy` and `/terms` render real content; `LICENSE` exists at repo root.

**Production risk:** **Critical** for any deployment that will have real (especially EU/CA) users — this is legal exposure, not a technical nice-to-have, and is the largest documentation-vs-reality gap this audit found (see PD-016 for the related governance-doc duplication problem, which is separate and Founder-gated).

**Intelligence Layer impact:** Direct overlap with PD-010 — AI conversation data (`AiConversation`/`AiMessage`/`AiRequest`) has no retention policy today and would need to be included in any "export/delete my data" implementation, since it's personal data too.

---

## PD-004 — Account Security & Auth Hardening

**Objective:** Authentication meets baseline expectations for a platform holding real financial/personal member data (per its own Resource Directory / Business Portal / Connected Experiences scope).

**Scope:** Confirmed present: bcrypt (12 rounds), refresh-token rotation, 5-attempt/15-minute lockout, password-reset session invalidation, password complexity rules. Confirmed absent: MFA/2FA/TOTP (zero references anywhere), OAuth/SSO, CAPTCHA on registration, and — most notably — **login does not require a verified email at all** (`apps/api/src/auth/auth.service.ts:79` only checks `status === ACTIVE`, never `emailVerified`), so PD-001's email-verification flow is currently cosmetic. Also absent: a self-service "log out everywhere" endpoint (the underlying `revokeAllRefreshTokensForUser` only fires internally on password reset today, `auth.service.ts:177`). Rate limiting is globally 100 req/min/IP with tighter throttles only on auth/AI controllers — admin-mutation and document-upload endpoints rely on the generous global default. This PD: (1) enforces `emailVerified` at login (with a clear "please verify your email" error state), (2) adds TOTP-based MFA (opt-in first, mandatory-for-admins later), (3) adds a `POST /auth/logout-everywhere` endpoint + UI, (4) tightens `@Throttle` on `administration/user-roles.controller.ts`, `ai-operational-config.controller.ts`, and `documents.controller.ts`. OAuth/SSO and CAPTCHA are flagged as valuable but lower-urgency and can be deferred to a follow-up if effort needs trimming.

**Files affected:** `apps/api/src/auth/auth.service.ts`, `auth.controller.ts`, new MFA sub-module (`apps/api/src/auth/mfa/`), `prisma/schema.prisma` (MFA secret field + migration), `administration/user-roles.controller.ts`, `ai/requests/ai-operational-config.controller.ts`, `connected-experiences/documents.controller.ts`, `apps/web` login/register/security-settings components.

**Dependencies:** PD-001 (email delivery must actually work before "require verified email" is enforced, or legitimate users get locked out).

**Estimated effort:** Large (6-9 engineer-days, MFA is the bulk of it; the `emailVerified` enforcement + throttle tightening + logout-everywhere is ~1-2 days on its own and could ship first as a fast follow to PD-001).

**Acceptance criteria:** An unverified account cannot log in and sees an actionable error; MFA can be enabled/enforced and is exercised in a new auth test suite; logout-everywhere revokes all refresh tokens and is covered by a test; the three tightened controllers have explicit `@Throttle` limits below the global default.

**Production risk:** **High** — unverified-login and missing MFA are real account-takeover surface for a platform that already handles financial/organizational data (Business Portal, Connected Experiences).

**Intelligence Layer impact:** None directly.

---

## PD-005 — Production Infrastructure Verification, CI/CD & Horizontal Scaling

**Objective:** The Docker images actually build and run, a real deploy pipeline exists, and the app is safe to run on more than one instance.

**Scope:** No live Docker daemon exists in this sandbox, so the Dockerfiles' "structurally sound but never build-verified" status from PR-002 remains **still unverified** as of this audit. `.github/workflows/ci.yml` is the **only** workflow file — there is no CD/deploy pipeline and no staging environment (the docker-compose.yml self-labels "local/staging stack" but is not a real staging deployment). `ThrottlerModule.forRoot(...)` (`apps/api/src/app.module.ts:69-75`) has no storage adapter, defaulting to in-memory — rate limits are per-instance, silently incorrect the moment there's more than one API replica. No connection-pool/pgbouncer configuration exists on the Prisma datasource. No load/performance testing tooling (k6/Artillery/etc.) exists anywhere. This PD: (1) actually builds both Dockerfiles against a real daemon and fixes whatever breaks, (2) stands up a real CD workflow (build → push image → deploy to a named staging environment) and a real staging environment, (3) adds Redis-backed `@nestjs/throttler` storage, (4) adds Prisma connection-pool settings appropriate for the target host, (5) adds a baseline k6 (or similar) load test for the top 3-5 endpoints by expected traffic.

**Files affected:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, new `.github/workflows/cd.yml`, `apps/api/src/app.module.ts` (throttler storage), `prisma/schema.prisma` datasource block, new `load-tests/` directory.

**Dependencies:** PD-002 (observability) should land first so the first real deploy isn't flying blind.

**Estimated effort:** Large (7-10 engineer-days — this is the widest-scope infra domain; standing up a real staging environment plus CD is the bulk of it).

**Acceptance criteria:** Both Docker images build clean and pass their `HEALTHCHECK`; a merge to `main` deploys to staging automatically; a k6 run against 2+ API replicas behind a load balancer shows rate limits enforced correctly platform-wide (not per-instance); a documented pool-size decision exists for the Prisma datasource.

**Production risk:** **Critical** — nothing in this repo has ever been deployed and verified against real infrastructure; every other PD assumes a working deploy target that doesn't yet exist.

**Intelligence Layer impact:** Indirect — the AI Orchestrator, Voice broker, and every AI capability all depend on this same infrastructure being real and scalable.

---

## PD-006 — Backup, Disaster Recovery & Data Durability

**Objective:** A real data-loss event (bad migration, accidental deletion, infra failure) has a tested recovery path.

**Scope:** The production runbook explicitly and honestly flags this as an open gap, not a "nothing to do here" ("no automated backup/restore procedure is documented yet," `docs/operations/production-runbook.md` §6). No backup script, restore tooling, or migration-rollback tooling exists anywhere beyond the idempotent seed/bootstrap-admin scripts. This PD: (1) stands up automated Postgres backups (provider-managed snapshots or `pg_dump` on a schedule) with a tested restore procedure, (2) documents and rehearses the additive-only-migration rollback convention this repo already follows in practice, (3) adds a periodic restore-drill runbook entry.

**Files affected:** `docs/operations/production-runbook.md`, new backup automation (likely infra-as-config rather than app code — a scheduled job/cron script, or provider-native snapshot config), no application code changes expected.

**Dependencies:** PD-005 (needs a real infrastructure target to back up).

**Estimated effort:** Medium (3-4 engineer-days, mostly infra config + a rehearsed restore drill rather than new code).

**Acceptance criteria:** A restore drill is performed once against a real backup and documented with timings; the runbook's §6 gap is closed and rewritten to describe real, existing tooling instead of flagging its absence.

**Production risk:** **Critical** — this is the one domain where getting it wrong is unrecoverable (permanent data loss) rather than merely degraded service.

**Intelligence Layer impact:** Indirect — `AiConversation`/`AiRequest`/`AiOrchestrationRun` history would be unrecoverable in a data-loss event without this.

---

## PD-007 — AI Safety: Content Moderation & Prompt-Injection Defense

**Objective:** Member-supplied text never reaches an AI provider (and provider output never reaches a member) without a safety check.

**Scope:** Confirmed: `ConversationsService.ask()` and `VoiceSessionService` push member input straight into provider prompts with **zero filtering** — no moderation-endpoint call, no profanity/PII scrub, no prompt-injection defense beyond the system prompt's own (unenforced) instructional boundaries (`system-prompts.util.ts`). This is the highest-severity Intelligence Layer finding in this audit: a consumer-facing AI surface with no safety layer at all. This PD: (1) adds a moderation-endpoint call (OpenAI's moderation API, or an equivalent for Anthropic) as a required pre-check before any member text is sent to a completion call, wired through the single `AiRequestsService.runCompletion()` choke point so every capability gets it automatically, (2) adds basic prompt-injection mitigation (e.g., wrapping member content in clearly-delimited untrusted-input blocks, stripping instruction-like patterns aimed at overriding the system prompt), (3) decides and documents a PII-handling policy for AI inputs (likely: don't attempt to strip PII pre-hoc, but ensure retention policy in PD-010 covers it).

**Files affected:** `apps/api/src/ai/requests/ai-requests.service.ts` (single choke point — moderation check added here benefits every capability at once), `apps/api/src/ai/providers/*.provider.ts` (moderation call if provider-native), `apps/api/src/ai/prompts/system-prompts.util.ts` (untrusted-input wrapping).

**Dependencies:** None — can start immediately, independent of other AI work.

**Estimated effort:** Medium (3-5 engineer-days — the moderation-endpoint integration itself is small, but wiring it through the choke point correctly and testing every capability's behavior when content is flagged takes care).

**Acceptance criteria:** A deliberately-flagged input (e.g. explicit self-harm language) is intercepted before reaching the provider and produces a safe, on-brand refusal response logged distinctly from a normal `AiRequest`; existing orchestrator/conversation/voice test suites extended to cover the moderation-block path.

**Production risk:** **Critical** for Intelligence Layer specifically — this is the single largest safety gap found in this entire audit.

**Intelligence Layer impact:** **Direct** — this is core AI system behavior, not adjacent hardening.

---

## PD-008 — Content Moderation & Trust/Safety (Platform-Wide User-Generated Content)

**Objective:** Abusive or harmful user-generated content (outside the AI system) can be removed, and stored free-text is not a stored-XSS vector.

**Scope:** Existing "moderation" is limited to steward/admin verification authority over Resources/Organizations/Knowledge/Academy content — a content-quality gate, not an abuse-response mechanism. `PodMessagesController` exposes only `@Post()` — **no delete or report endpoint exists for Pod messages at all**, so abusive content posted in a Pod cannot be removed via the API by anyone, member or admin. No HTML/rich-text sanitization exists anywhere in the backend (`sanitize-html`/`dompurify`/`xss` — zero hits in either `package.json`), so Pod messages, announcements, notes, and knowledge-article bodies are stored and returned as raw free text. This PD: (1) adds delete + report endpoints to `PodMessagesController` with appropriate authorization (own message, or steward/admin), (2) adds a lightweight admin moderation queue for reported content, (3) adds server-side sanitization for all free-text fields that are ever rendered as rich content on the frontend.

**Files affected:** `apps/api/src/pods/messages/pod-messages.controller.ts`, `pod-messages.service.ts`, new `stewardship-escalations`-style report/flag sub-resource or reuse existing escalation infrastructure, sanitization applied at the DTO/service layer across Pods/Communication/Knowledge modules.

**Dependencies:** None.

**Estimated effort:** Medium (3-5 engineer-days).

**Acceptance criteria:** A member can delete their own Pod message; a steward/admin can remove any Pod message and see a reported-content queue; an XSS-payload string submitted through any affected endpoint is stored/returned sanitized, verified by a new test per affected domain.

**Production risk:** **High** — no removal path for abusive content is a real trust-and-safety gap for any community feature (Pods) that goes live with real members.

**Intelligence Layer impact:** None directly, though it shares an authorization pattern with PD-007's content-safety work.

---

## PD-009 — AI Provider Resilience & Cost Governance Maturity

**Objective:** A transient provider outage degrades gracefully instead of hard-failing every AI request, and cost governance is proactive rather than purely reactive.

**Scope:** `OpenAiProvider`/`AnthropicProvider` are single bare `fetch()` calls with no retry/backoff, no timeout/`AbortController`, and no streaming support (`apps/api/src/ai/providers/openai.provider.ts`, `anthropic.provider.ts`). There is no cross-provider fallback despite two real providers already being wired — if the configured provider's call fails, `AiRequestsService` logs `FAILED` and throws `ServiceUnavailableException` with no attempt to retry or fail over. Cost governance (confirmed working from PR-002/PR-003: emergency stop, global + per-user daily ceilings) has two gaps: no proactive alert as spend approaches a ceiling (only a hard refusal once exceeded — the alerting half of this is delivered by PD-002), and no per-capability budget ceiling (`getSpendByCapability()` from PR-004 is visibility-only; `enforceSpendCeilings` never checks per-capability sums, so one runaway capability — e.g. Voice, which is typically far more expensive per-minute — cannot be capped independently). This PD: (1) adds retry-with-backoff and timeout handling to both providers, (2) adds a simple cross-provider fallback (configured provider fails → try the other, if both are configured), (3) adds per-capability budget ceilings, particularly for Voice given its cost profile.

**Files affected:** `apps/api/src/ai/providers/openai.provider.ts`, `anthropic.provider.ts`, `ai-provider.module.ts` (fallback wiring), `apps/api/src/ai/requests/ai-requests.service.ts` (`enforceSpendCeilings`), `apps/api/src/ai/requests/ai-operational-config.service.ts` (new per-capability ceiling config), schema migration for the new ceiling field.

**Dependencies:** None, but pairs naturally with PD-002's proactive-alerting piece.

**Estimated effort:** Medium (4-6 engineer-days).

**Acceptance criteria:** A simulated provider timeout is retried per a documented backoff policy before failing; a simulated total-provider-outage falls over to the secondary provider when both are configured; a per-capability ceiling (demonstrated on Voice) refuses further requests for that capability specifically while other capabilities continue to function.

**Production risk:** **High** — with real users, transient provider hiccups (which happen regularly with both OpenAI and Anthropic) currently surface as hard user-facing failures with no resilience.

**Intelligence Layer impact:** **Direct.**

---

## PD-010 — AI Data Retention & Conversation Memory Management

**Objective:** AI conversation data has a defined lifetime, members can delete their own AI history, and long conversations don't silently exceed the model's context window.

**Scope:** No retention/expiry policy exists for `AiRequest`/`AiMessage`/`AiConversation` rows — they persist indefinitely (confirmed by grep for retention/expire/purge/cron logic, zero hits). `ConversationsController`/`ConversationsService` has no delete method — a member cannot remove their own conversation history. `ConversationsService.ask()` caps history at a fixed most-recent-20-messages window (`RECENT_MESSAGE_HISTORY_LIMIT`) with no token-aware truncation or summarization, so a conversation of 20 unusually long messages could still exceed a model's context window with no fallback. `InstitutionalMemoryService` is correctly uncached/unpersisted per PR-004's own design, so it isn't part of this gap. This PD: (1) defines and implements a retention policy (e.g., N months) with a scheduled purge job, (2) adds a member-facing "delete my AI conversation history" capability, (3) adds token-aware truncation or summarization for long conversations before the provider call.

**Files affected:** `apps/api/src/ai/conversations/conversations.service.ts`, `conversations.controller.ts`, new scheduled-job module (NestJS `@nestjs/schedule` or an external cron trigger), `apps/web` Conversation UI (delete-history action).

**Dependencies:** PD-003 (this is the AI-specific instance of the same data-rights problem — should be designed together, even if implemented as separate PDs).

**Estimated effort:** Medium (3-5 engineer-days).

**Acceptance criteria:** A documented retention period is enforced by a scheduled purge job (tested against a seeded old row); a member can delete their own conversation history via API and UI; a conversation with unusually long messages is truncated/summarized before the provider call rather than silently overflowing, verified by a new test.

**Production risk:** **Medium** — this is a privacy/compliance completion item more than an availability risk, but ties directly into PD-003's legal exposure.

**Intelligence Layer impact:** **Direct.**

---

## PD-011 — Intelligence Layer Integration Testing & Prompt Evaluation Harness

**Objective:** The Orchestrator and its prompts are verified against real behavior, not only against mocks.

**Scope:** `ai-orchestrator.service.spec.ts` (PR-004) is a pure unit test with every dependency mocked — no test exercises the full `orchestrate()` → `RecommendationsService` → `AiRequestsService.runCompletion()` → a real (non-stub) provider chain end-to-end. `system-prompts.util.ts`'s hardcoded prompts have no versioning, golden-output testing, or regression-evaluation harness of any kind — a prompt edit today has no automated way to detect a quality regression. This PD: (1) adds a real (or realistically-staged) integration test that runs at least one full orchestration goal against a live provider in a controlled test environment (likely gated to a nightly/manual CI job given API cost, not every PR), (2) adds a small golden-output evaluation harness — a fixed set of representative inputs per prompt template with either exact-match or LLM-graded quality assertions — wired as a CI gate that fails loudly on prompt-quality regression.

**Files affected:** New `apps/api/src/ai/orchestrator/*.integration.spec.ts` or a dedicated `apps/api/test/ai-eval/` suite, `.github/workflows/ci.yml` (new gated job), `apps/api/src/ai/prompts/system-prompts.util.ts` (versioning comments/constants if needed).

**Dependencies:** PD-009 (resilience work should land first so integration tests aren't flaky on transient provider issues).

**Estimated effort:** Medium-Large (5-7 engineer-days — building a real eval harness from scratch is the bulk of this).

**Acceptance criteria:** A nightly/manual CI job runs at least one orchestration goal against a real provider and asserts a successful `AiOrchestrationRun`; a prompt-quality regression in a golden-output test is demonstrated to fail the eval job before being fixed.

**Production risk:** **Medium** — this is a quality/regression-prevention gap, not an active production incident risk today, but every future Intelligence Layer change (PD-013, PD-015, and beyond) ships blind without it.

**Intelligence Layer impact:** **Direct.**

---

## PD-012 — Document Storage Backend (Real File Handling)

**Objective:** The Documents feature (Connected Experiences, DOMAIN-008) actually stores and serves files, not just metadata rows.

**Scope:** `DocumentsService`/`UploadDocumentDto` only persist metadata (`title`, `originalFilename`, `mimeType`, `sizeBytes`, an opaque client-supplied `storageRef`) — the backend never reads or writes actual file bytes. There is no `Multer`/upload-interceptor, no cloud-storage SDK, no virus/malware scanning, and no real size-limit enforcement (`sizeBytes` is just a caller-supplied integer with `@Min(1)`, not validated against real content) or MIME-type allowlisting anywhere in the repo. This is a genuine feature gap, not a hardening item — as shipped, "Documents" cannot actually store a file. This PD: (1) integrates a real object-storage backend (S3-compatible is the natural choice given the existing multi-stage-Docker/cloud-native posture), (2) adds a real upload endpoint with server-enforced size limits and MIME allowlisting, (3) adds virus/malware scanning on upload, (4) serves files via signed, time-limited URLs rather than direct storage access.

**Files affected:** `apps/api/src/connected-experiences/documents/documents.service.ts`, `documents.controller.ts`, `dto/upload-document.dto.ts`, new storage-provider abstraction (mirroring the existing `AiProviderModule`/`ConnectedAccountProviderModule` swappable-provider pattern already established in this codebase), `apps/web` Documents UI (real upload flow instead of metadata-only form).

**Dependencies:** PD-005 (needs real infra to host storage/scanning), ideally PD-002 (observability) for upload-failure visibility.

**Estimated effort:** Large (6-8 engineer-days).

**Acceptance criteria:** A real file can be uploaded, stored, retrieved, and deleted end-to-end; an oversized or disallowed-MIME-type file is rejected server-side; a virus-scanning check is demonstrated against an EICAR test file; existing Documents tests extended to cover the real storage path (currently all mock `storageRef` as an opaque string).

**Production risk:** **High** — this is a shipped, member-facing feature that does not actually work as implied by its name; discovering this in production (a member "uploads" a document that is never actually stored) is a trust-damaging surprise.

**Intelligence Layer impact:** Indirect — `DOCUMENT_SUMMARY` (an existing `AiCapability`) currently operates only on member-supplied `extractedText` in the request body per its own design note, so it isn't blocked by this gap, but a real storage backend would let extraction happen server-side instead of relying on the client to supply text.

---

## PD-013 — Frontend Quality, Resilience & Cross-Platform Test Coverage

**Objective:** The frontend has baseline production polish (error recovery, discoverability, SEO) and is verified beyond Jest+RTL component tests.

**Scope:** No `error.tsx`/`global-error.tsx` exists anywhere under `apps/web/app` — an uncaught render error anywhere falls through to Next.js's generic default screen with no branded recovery UX or error-tracking hook (this should be wired to PD-002's error tracking when both land). `apps/web/public/` has no favicon, web manifest, robots.txt, or sitemap, and `layout.tsx` metadata is title+description only — no OpenGraph tags, no PWA installability. Accessibility coverage is good overall (59 of 97 test files include a `jest-axe` check, covering all major visual domains) with a handful of gaps (`SurfaceTracker`, `TextInterfaceOrchestrator`, `VoiceOrchestrator`, `FirstRunWelcome`, `WelcomeFlow`, `AuthGate`, `FounderGate` component tests lack an axe check). No Playwright/Cypress or any e2e/visual-regression tooling exists at all — everything is Jest+RTL, and only the Voice domain ever received a manual device/responsive validation plan (`docs/work-orders/DOMAIN-002-Voice-Frontend-Manual-Validation-Plan.md`) — no equivalent exists for any other domain. This PD: (1) adds a global error boundary wired to PD-002's error tracking, (2) adds favicon/manifest/robots/sitemap/OG metadata, (3) closes the remaining accessibility-test gaps, (4) stands up a minimal Playwright suite covering the 3-5 most critical cross-page flows (register→verify→login, create-a-goal→journey, a Founder panel), (5) writes a responsive/device validation plan template and applies it to at least Home, Opportunities, and Founder.

**Files affected:** New `apps/web/app/error.tsx`, `global-error.tsx`; `apps/web/app/layout.tsx`; new `apps/web/public/favicon.ico`, `manifest.json`, `robots.txt`, `sitemap.xml`; the 7 named component test files; new `apps/web/e2e/` Playwright suite + `playwright.config.ts`; new validation-plan docs.

**Dependencies:** PD-002 (error boundary should report to the same error tracker).

**Estimated effort:** Medium (4-6 engineer-days — mostly parallelizable, low-risk, high-value polish).

**Acceptance criteria:** A deliberately-thrown render error shows a branded recovery screen and appears in error tracking; Lighthouse/browser dev tools show a valid manifest and favicon; the 7 flagged component tests gain axe coverage; a Playwright run passes locally and in CI for the chosen critical flows.

**Production risk:** **Medium** — none of this is an active outage risk, but it's the difference between "looks like a finished product" and "looks unfinished," and the total absence of e2e coverage means cross-page regressions currently rely entirely on manual QA.

**Intelligence Layer impact:** None directly.

---

## PD-014 — Frontend Domain Completeness

**Objective:** Every route reachable from primary navigation either works or has been deliberately and visibly removed — no dead-end placeholders remain, and Pods/Messages reach functional parity with their backend.

**Scope:** Community, Calendar, Settings, Search, and Help remain `PlaceholderSurface` routes exactly as PR-002 left them (no backend exists for any of them, per that work order's own deferral). Pods still ships only member-facing Discover/My-Pods tabs — steward/admin-facing roster management, events, service projects, escalations, and Pod-internal messaging remain entirely unwired on the frontend despite backend support existing (WO-030). Messages still has no "start a new conversation" entry point at all (confirmed still-open via an explicit comment in `MessagesPage.tsx`) — conversations can only be viewed once they already exist via a Stewardship-relationship or Org-rep-directory link, neither of which itself has a frontend surface. This PD has two independent tracks: (Track A) a **product decision**, not engineering work, on whether Community/Calendar/Settings/Search/Help get real backend scope or are formally removed from primary navigation (leaving them as visible placeholders is the worst of both options); (Track B) build the Pods steward/admin UI and the Messages new-conversation entry point, both of which already have complete backend support and are pure frontend work.

**Files affected:** Track A: `apps/web/design-system/components/AppShell/*` navigation config, and either new backend modules (if scope is added) or route removal (if cut). Track B: new `apps/web/design-system/components/pods/StewardRosterPanel.tsx` (and siblings for events/service-projects/escalations/messaging), `apps/web/design-system/components/messages/NewConversationFlow.tsx`, `apps/web/state/pods/PodsContext.tsx` extensions.

**Dependencies:** Track A depends on a Founder/product decision, not engineering readiness — this should be raised explicitly rather than assumed. Track B has no dependencies and can start immediately.

**Estimated effort:** Track A: Small-Medium engineering (2-3 days) if cutting from nav; unknown/large if new backend scope is chosen (equivalent to a new WO). Track B: Medium (4-6 engineer-days).

**Acceptance criteria:** Track A: no placeholder route is reachable from primary navigation without an explicit "coming soon" affordance the Founder has approved, OR each has real content. Track B: a steward can manage their Pod's roster/events/service-projects/escalations from the frontend; a member can start a new conversation with a steward or org rep directly from the Messages surface.

**Production risk:** **Medium** — placeholder routes in primary nav read as an unfinished product to real users; the Pods/Messages gaps mean two already-built backend domains are not actually usable end-to-end.

**Intelligence Layer impact:** None directly.

---

## PD-015 — Member-Facing Next Best Action Surface

**Objective:** The Intelligence Layer's `NEXT_BEST_ACTION` orchestration goal — the one genuinely new capability PR-004 built — is reachable by a member, not backend-only.

**Scope:** Confirmed: no frontend code anywhere calls `POST /ai/orchestrate` (grep of `apps/web` for "orchestrat" only matches unrelated interface-navigation components and the Founder-metrics telemetry reader). This was a deliberate, documented scope decision in PR-004 ("no new panel, and no member-facing UI... in this work order") — this PD is the intentional follow-up, not a bug fix. Scope: a lightweight "What should I focus on next?" surface (likely on Home or as a persistent widget) that calls the Orchestrator, renders whichever result shape comes back (a Recommendation list or an Insight), and — critically — makes the human-readable `outcome`/rationale visible to the member, since "every recommendation must be explainable" is a standing product principle this repo has enforced everywhere else.

**Files affected:** New `apps/web/lib/api/orchestrator.ts`, new `apps/web/state/orchestrator/OrchestratorContext.tsx`, new `apps/web/design-system/components/orchestrator/NextBestActionWidget.tsx`, wired into `apps/web/design-system/components/home/*`.

**Dependencies:** PD-007 (AI safety) and PD-011 (integration testing) should land first — this is the first member-facing surface built directly on top of the Orchestrator, and it should not be the first thing to expose an un-moderated or unverified AI path to end users.

**Estimated effort:** Medium (4-5 engineer-days).

**Acceptance criteria:** A member sees a "next best action" suggestion sourced from a real `POST /ai/orchestrate` call, with its rationale visible; the widget handles all four `AiOrchestrationStatus` outcomes (`SUCCESS`/`PARTIAL`/`FAILED`/`NO_ACTION`) gracefully; accessibility-tested per this repo's established convention.

**Production risk:** **Low** — this is a product-completeness item, not a risk-mitigation item; nothing breaks by deferring it further.

**Intelligence Layer impact:** **Direct** — this is the Intelligence Layer's first true end-user-facing surface.

---

## PD-016 — Governance Documentation Consolidation (Founder-Gated)

**Objective:** A single canonical version of each governance/constitutional document exists, with no duplicate-numbered, conflicting-content files anywhere in `docs/`.

**Scope:** The known constitutional duplication (`docs/constitution/` vs `docs/docs/constitution/`, colliding OAS-004/005/006 etc.) is **not an isolated problem** — this audit found the identical pattern in `docs/operations/` (OAS-OPS-002 through OAS-OPS-010, roughly 15 duplicate/triplicate pairs), `docs/technology/` (OAS-TECH-001 through 006, heavy collisions), `docs/legal/` (OAS-LEG-001 duplicated), and `docs/finance/` (OAS-FIN-001/002/004/005 duplicated). `docs/security/`, `docs/risk/`, `docs/data/`, and several other directories are clean. This is **explicitly outside delegated engineering authority** per the Founder's own standing instruction from earlier in this program ("Give me a side-by-side diff of every conflict first... Make no changes to the repository") — that instruction has never been rescinded and this audit does not touch, resolve, or recommend a resolution for any file under the frozen paths. This PD exists in the dashboard purely for **visibility and completeness of the audit** — it cannot be scheduled or estimated as engineering work because it isn't engineering work, and it is blocked on a Founder decision, not on effort or dependencies.

**Files affected:** None by this audit. If/when authorized: every file under `docs/constitution/`, `docs/docs/constitution/`, `docs/constitutional/`, `docs/operations/`, `docs/technology/`, `docs/legal/`, `docs/finance/` would need canonical-version review.

**Dependencies:** A Founder decision on canonical versions — not resolvable by a work order in the normal sense.

**Estimated effort:** Not estimable as engineering work; the follow-on documentation-consolidation effort once a decision is made would likely be Medium (3-5 days of careful diffing/merging, similar in spirit to the original `Constitutional-Conflict-Comparison.md` exercise).

**Acceptance criteria:** N/A until a Founder decision authorizes specific action.

**Production risk:** **Low** operationally (nothing here breaks the running product), but **High** reputationally/governance-wise — no claim of "constitutional compliance" for anything built on this platform can currently be fully substantiated against a single canonical source.

**Intelligence Layer impact:** None directly, though the AI Steward's own system prompts reference platform values that ultimately trace back to these documents.

---

# Master Production Dashboard

| # | Domain | Risk | IL Impact | Effort | Depends On |
|---|---|---|---|---|---|
| PD-001 | Email & Notification Delivery Production Configuration | 🔴 Critical | None | Small (1-2d) | — |
| PD-002 | Observability, Monitoring & Incident Response Foundation | 🔴 Critical | Indirect | Medium (3-4d) | — |
| PD-003 | Legal, Privacy & Consent Foundation | 🔴 Critical | Indirect | Med-Large (4-6d + legal) | — |
| PD-004 | Account Security & Auth Hardening | 🟠 High | None | Large (6-9d) | PD-001 |
| PD-005 | Production Infrastructure Verification, CI/CD & Scaling | 🔴 Critical | Indirect | Large (7-10d) | PD-002 |
| PD-006 | Backup, Disaster Recovery & Data Durability | 🔴 Critical | Indirect | Medium (3-4d) | PD-005 |
| PD-007 | AI Safety: Content Moderation & Prompt-Injection Defense | 🔴 Critical (IL) | **Direct** | Medium (3-5d) | — |
| PD-008 | Content Moderation & Trust/Safety (Platform-Wide) | 🟠 High | None | Medium (3-5d) | — |
| PD-009 | AI Provider Resilience & Cost Governance Maturity | 🟠 High | **Direct** | Medium (4-6d) | — |
| PD-010 | AI Data Retention & Conversation Memory Management | 🟡 Medium | **Direct** | Medium (3-5d) | PD-003 |
| PD-011 | Intelligence Layer Integration Testing & Prompt Evaluation | 🟡 Medium | **Direct** | Med-Large (5-7d) | PD-009 |
| PD-012 | Document Storage Backend (Real File Handling) | 🟠 High | Indirect | Large (6-8d) | PD-005 |
| PD-013 | Frontend Quality, Resilience & Test Coverage | 🟡 Medium | None | Medium (4-6d) | PD-002 |
| PD-014 | Frontend Domain Completeness | 🟡 Medium | None | Small–Large (varies) | Founder decision (Track A) |
| PD-015 | Member-Facing Next Best Action Surface | 🟢 Low | **Direct** | Medium (4-5d) | PD-007, PD-011 |
| PD-016 | Governance Documentation Consolidation | 🟢 Low (ops) / 🟠 High (governance) | None | Not estimable | Founder decision |

**Total estimated engineering effort, PD-001 through PD-015 (excluding non-estimable legal drafting and PD-016):** approximately **62-84 engineer-days**, sequenced with real dependencies — not all parallelizable, but PD-001/002/003/007/008/009 have no dependencies on each other and could run concurrently with separate work streams if more than one engineer/session is available.

**Critical-path minimum before any real-user production launch:** PD-001 → PD-002 → PD-003 → PD-005 → PD-006, plus PD-007 if AI features remain enabled for real users at launch. PD-004, PD-008, PD-009 through PD-015 materially improve safety/quality/completeness but do not block a first launch to a limited/trusted user set the way the critical-path five (six, with AI safety) do.

---

## Standing constraints carried forward

- No file under `docs/constitution/`, `docs/docs/constitution/`, `docs/constitutional/`, `docs/sessions/`, or `docs/drafts/` may be modified, merged, or deleted until the Founder designates canonical versions (PD-016 is gated on this).
- Every future work order must check this document (PD-000) and PR-001 through PR-004 before starting, per the standing rule — with the caveat, disclosed above, that PR-001 itself is not independently verifiable since it was never committed to this repository.

---

**This audit implements no code. Awaiting authorization before PD-001 begins.**
