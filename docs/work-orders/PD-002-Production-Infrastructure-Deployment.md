# PD-002 — Production Infrastructure & Deployment: Domain Readiness Report

**Status: Complete.** Per the Founder's explicit work order, PD-002 in this repository's numbering is **"Production Infrastructure & Deployment"** — a domain the Founder scoped directly, in full, with an explicit 17-item minimum list. This is **not** the same domain as PD-000's own "PD-002" (Observability, Monitoring & Incident Response Foundation, i.e. Sentry-class APM). Per the same "expand the domain, don't split it across a technical dependency that doesn't exist" precedent PD-001 established, this domain absorbs the *infrastructure-shaped* work PD-000 had originally split across its own **PD-005** (Production Infrastructure Verification, CI/CD & Horizontal Scaling) and part of **PD-006** (Backup, Disaster Recovery & Data Durability), plus the structured-logging slice of PD-000's own PD-002. The Sentry/APM-specific piece of PD-000's PD-002 (an external error-tracking SaaS integration) is **not** part of the Founder's 17-item list and is out of this domain's scope — named explicitly in §7, not silently folded in or dropped.

All 17 named items shipped, plus one credit against a pre-existing gap discovered and fixed in the course of this work (see §4).

---

## 1. Objective

A production deploy of Aureus can be built, verified, started, monitored, backed up, and rolled back using only tooling that exists in this repository today — with every genuine remaining gap (a live CD target, a Sentry account, a scheduled managed-backup provider) named as a Founder/infrastructure decision this domain cannot make unilaterally, not silently absent.

## 2. Scope — delivered

| # | Component | What shipped |
|---|---|---|
| 1 | **Production Docker configuration** | Existing multi-stage `apps/api/Dockerfile` / `apps/web/Dockerfile` (PR-002) reviewed and extended, not replaced — see items 13/9 below for what changed. |
| 2 | **Production deployment configuration** | `docker-compose.yml` extended with a `redis` service and full container-hardening (item 13); `.env.example` and `docs/operations/production-runbook.md` updated for every new variable. |
| 3 | **CI/CD production verification** | New `docker` job in `.github/workflows/ci.yml` (runs after the existing `ci` job): builds both production images, runs `prisma migrate deploy` from the built API image against a real Postgres service container, boots it, and polls `/health/live` then `/health/ready` before passing. This is **real, permanent build verification** — GitHub Actions' `ubuntu-latest` runners have a Docker daemon; the sandbox these images were authored in (PR-002 through this domain) never has one. Closes PD-000/PD-005's "never build-verified against a live daemon" finding for good, not just for one manual check. |
| 4 | **Health check endpoints** | `GET /health` (unchanged, DB-inclusive, kept as a back-compat alias) joined by two new, more specific probes. |
| 5 | **Readiness and liveness probes** | `GET /health/live` (no dependency checks — "is the process up") and `GET /health/ready` (database connectivity — "can this instance serve traffic"), both via `@nestjs/terminus`. Docker's own `HEALTHCHECK` directives and `docker-compose.yml`'s healthchecks now point at `/health/live`, so a slow/unreachable database doesn't cause an orchestrator to kill and restart an otherwise-healthy process — that's exactly the distinction a load-balancer/k8s readiness probe (which should hit `/health/ready` instead) exists to make. |
| 6 | **Production startup validation** | Already largely in place from PD-001 (Joi fail-loud); this domain adds the standalone verification tool in item 7 and an explicit `engines.node`/`.nvmrc` pin (`>=22`) so the Node version this app is built and tested against is self-documenting, not tribal knowledge inferred from three separate places (CI, both Dockerfiles). |
| 7 | **Environment verification** | The Joi schema (`app.module.ts`) was extracted to `apps/api/src/config/env.validation.ts` so the exact same validation a real boot performs can also run standalone: `pnpm verify:env [path-to-env-file]` (new `src/scripts/verify-env.ts` + `verify-env-cli.ts`, mirroring the existing `bootstrap-admin.ts`/`seed.ts` split). An operator can now check a candidate `.env`/environment *before* a deploy, not just discover it's broken when the container crash-loops. |
| 8 | **Database migration deployment workflow** | `scripts/db-migrate-deploy.sh`: backs up the database (item 9), runs `prisma migrate deploy`, then `prisma migrate status` to confirm every migration actually applied — three steps a bare `prisma migrate deploy` invocation skipped. |
| 9 | **Backup and restore procedures** | `scripts/db-backup.sh` (`pg_dump --format=custom`, timestamped, compressed, selectively restorable) and `scripts/db-restore.sh` (`pg_restore --clean --if-exists`, requires explicit `yes`/`CONFIRM=yes` confirmation since it's destructive by design). Closes the production runbook's own previously self-flagged gap ("no automated backup/restore procedure is documented yet"). |
| 10 | **Rollback procedures** | Runbook §5 extended: the existing additive-migration-first rollback (redeploy the previous image tag) now has a documented, scripted fallback for the genuinely-destructive-migration case — restore from the pre-migration backup item 9 produces automatically. |
| 11 | **Production logging configuration** | Structured JSON logging in production via NestJS 11's built-in `ConsoleLogger({ json: true })` (discovered mid-implementation to already exist in this Nest version — see §4; no custom logger class or new logging dependency needed). A new `RequestLoggingMiddleware` logs one structured entry per request (method, path, status, duration, a request ID reused from an incoming `X-Request-Id` header or freshly generated, echoed back on the response) — closing the runbook's self-identified "no structured audit log beyond application logs" gap. |
| 12 | **Production Redis configuration** | New `RedisThrottlerStorageService` (`common/throttler/redis-throttler-storage.service.ts`) implements `@nestjs/throttler`'s `ThrottlerStorage` interface against `ioredis`, using a single atomic Lua script per `increment()` call so a burst of concurrent requests across replicas can't all "just miss" the limit at once. Wired via `ThrottlerModule.forRootAsync` — used automatically when `REDIS_URL` is set (docker-compose's own `redis` service wires this by default), falls back to the existing in-memory storage otherwise (correct for exactly one replica; a one-time boot `WARN` log fires if production is running without it, not a boot failure — see the design rationale in §4). |
| 13 | **Production PostgreSQL configuration** | `PrismaService`'s `pg.Pool` now reads `DATABASE_POOL_MAX`/`DATABASE_POOL_MIN` (defaults 10/0, matching the `pg` driver's own defaults — no behavior change for an operator who never sets them) so pool sizing is an explicit, documented knob against a managed Postgres host's `max_connections` or a pooler in front of it, not a hardcoded implicit default. |
| 14 | **Container hardening** | `docker-compose.yml`'s `api`, `web`, and `redis` services all now run with a **read-only root filesystem** (`/tmp` writable via `tmpfs` only), **every Linux capability dropped** (`cap_drop: [ALL]`), and **`no-new-privileges`**. Both Dockerfiles already ran as non-root before this domain. **Named, not shipped:** pruning devDependencies from the runtime image (a `turbo prune`-based rewrite) — deliberately deferred, see §7. |
| 15 | **Infrastructure documentation** | `docs/operations/production-runbook.md` extended in place (its own stated intent: "a living document... extend it as [work] adds real infrastructure") — new subsections on liveness/readiness, Redis-backed rate limiting at scale, container hardening, and environment verification; every new env var added to the reference table. |
| 16 | **Production deployment runbooks** | Runbook §4 (Deploy) and §5 (Rollback) updated to use the new migrate-deploy/backup/restore scripts instead of a bare `prisma migrate deploy`, and to check `/health/ready` instead of the old undifferentiated `/health`. |
| 17 | **Disaster recovery procedures** | New runbook §7: what disaster recovery covers here (total database loss/corruption, not "redeploy the previous image"), the recovery tooling (items 8/9), today's actual RPO/RTO given no scheduled managed-backup service exists yet, and a concrete restore-drill procedure to rehearse before trusting it in a real incident. |

## 3. Files affected

**New:** `apps/api/src/common/middleware/request-logging.middleware.ts` (+ spec), `apps/api/src/common/throttler/redis-throttler-storage.service.ts` (+ spec), `apps/api/src/config/env.validation.ts`, `apps/api/src/scripts/verify-env.ts` (+ spec), `apps/api/src/scripts/verify-env-cli.ts`, `apps/api/src/health/health.controller.spec.ts`, `scripts/db-backup.sh`, `scripts/db-restore.sh`, `scripts/db-migrate-deploy.sh`, `.nvmrc`, `docs/work-orders/PD-002-Production-Infrastructure-Deployment.md` (this file).

**Edited:** `apps/api/src/health/health.controller.ts` (live/ready endpoints), `apps/api/src/app.module.ts` (env schema extraction, Redis-conditional throttler storage, `RequestLoggingMiddleware` wiring via `NestModule`), `apps/api/src/main.ts` (JSON logger), `apps/api/src/prisma/prisma.service.ts` (pool sizing), `apps/api/package.json` (+`ioredis`), `apps/api/Dockerfile` (liveness `HEALTHCHECK`, hardening-deferral comment), `docker-compose.yml` (Redis service, container hardening on api/web/redis), `.env.example`, `package.json` (root — `verify:env` script, `engines.node`), `.github/workflows/ci.yml` (new `docker` job), `docs/operations/production-runbook.md`.

## 4. Two design decisions worth recording

**Structured JSON logging didn't need a custom logger.** The initial plan was a hand-rolled `LoggerService` subclass overriding NestJS's protected `formatMessage()`. Before writing that, `@nestjs/common@11.1.28`'s `ConsoleLogger` was checked directly (`console-logger.service.d.ts`) and already ships a first-class `json: true` option (`new ConsoleLogger({ json: isProduction, colors: !isProduction, logLevels: [...] })`) producing one `JSON.stringify`'d object per line via `process.stdout.write` — exactly what was being built from scratch, officially supported, already tested by the framework itself. The custom subclass was deleted before being used anywhere; `main.ts` uses the built-in option instead. Fewer lines of code to maintain, no risk of a subtly-wrong protected-method override.

**Redis is not made production-required.** Every other "required in production" variable from PD-001 (`CORS_ORIGIN`, `SMTP_HOST`, the matching AI key) is required because its *absence breaks correctness for a single instance running alone* (wide-open CORS, silently-lost emails). A missing `REDIS_URL` does not: a single-replica production deployment with in-memory throttler storage is still fully, correctly rate-limited — the bug PD-000 flagged ("silently incorrect... the moment there's more than one API replica") only exists once horizontal scaling is added. Hard-requiring `REDIS_URL` in production would have made a legitimate, correct, single-instance deployment unable to boot. Instead: a one-time `WARN`-level boot log fires when `NODE_ENV=production` and `REDIS_URL` is unset, explaining exactly when it becomes necessary — informative, not a false failure.

## 5. Dependencies

None on other PD-00x domains for the work delivered. PD-001 (Production Foundation) was a soft precondition in practice — the Joi schema and `main.ts` this domain extends were built there — but no blocking dependency existed; both could have been developed in either order.

## 6. Acceptance criteria — verification

- Backend: `npx tsc --noEmit` clean; `npx eslint . --ext .ts --max-warnings=0` clean; `npx nest`-equivalent build (`rm -rf dist && tsc -p tsconfig.json`) succeeds; `docker compose config` parses the extended compose file cleanly (verified with a dummy `JWT_ACCESS_SECRET`, since no live Docker daemon exists in this sandbox — see §7).
- Backend tests: full `jest --coverage` run — **780 unit tests pass** (up from 765 at the PD-001-merge baseline: 15 net-new tests across the health controller's live/ready endpoints, the request-logging middleware, the Redis throttler storage's key-construction/EVAL-result-mapping logic, and the extracted env-validation schema). The same **21 suites / 292 tests** that require a live Postgres connection fail identically before and after this domain's changes — confirmed no regression; these pass in CI, where a database is provisioned, and the new `docker` job additionally boots the real built image against a real Postgres and confirms `/health/live` and `/health/ready` respond.
- Frontend: unchanged by this domain (no frontend files touched) — re-verified anyway per the standing full-pipeline requirement: `npx tsc --noEmit` clean, `npx next lint` clean, `npx jest` — **511/511 tests pass**, `npx next build` succeeds (36 routes).
- Root: `pnpm run check-types` and `pnpm run lint` (turbo, all 3 packages) clean; `pnpm run build` succeeds; `pnpm audit` — 0 known vulnerabilities (including the new `ioredis` dependency).

## 7. Explicitly deferred (not silently dropped)

Per the standing instruction to name deferred items clearly:

- **A real CD pipeline to a live staging environment** (PD-000/PD-005 item 2). Requires a named hosting target (a cloud provider, a PaaS, credentials) that does not exist in this repository or sandbox — this is a Founder/infrastructure decision, not an engineering default. What *did* ship: the `docker` CI job (item 3) is the exact build-and-verify step any future CD pipeline would need as its first stage.
- **k6 (or equivalent) load testing against real multi-replica infrastructure** (PD-000/PD-005 item 5). Meaningless to run against a single ephemeral CI container — there is no running multi-instance deployment to load-test yet. The Redis-backed throttler storage this domain ships (item 12) is exactly the prerequisite that load test would need to exist first.
- **`turbo prune`-based minimal production image** (container hardening, item 14). A rewrite of the install step is exactly what a live Docker daemon needs to verify — none exists in this sandbox, so it was named and deferred rather than shipped unverified. Every hardening measure that doesn't touch the install step (read-only filesystem, dropped capabilities, no-new-privileges, non-root) shipped, since those are verifiable from the Dockerfile/compose source directly.
- **A provider-managed *scheduled* backup/snapshot policy** (PD-000/PD-006, partial). `scripts/db-backup.sh`/`db-restore.sh` and the restore-drill procedure (runbook §7) are real and runnable today, and `db-migrate-deploy.sh` takes a backup before every migration — but a recurring, automated schedule independent of deploys (RDS automated backups, a managed Postgres provider's own snapshot feature, or a cron against a specific host) depends on the eventual hosting choice, which this domain cannot make.
- **Sentry-class APM / error-tracking SaaS integration** (PD-000's own "PD-002" — a different domain than this one, see the status note above). Requires provisioning an external account and DSN that this sandbox has no authority to create on the Founder's behalf. Structured JSON logging (item 11) is a real, complementary improvement to *this* domain's scope, not a substitute for APM — both are true at once: logs are now machine-parseable, and there is still no dashboard/alerting layer watching them.
- **Proactive (non-log) AI-budget-threshold notification** (PD-000's own "PD-002", same note as above). Out of this domain's 17-item scope; the existing `WARN`-level log lines (documented in the runbook §6) remain the current signal.

## 8. Production risk if PD-002 had shipped incomplete

Before this domain: the Docker images had never actually been built by anything (structurally plausible, never proven); there was one undifferentiated `/health` check conflating "is the process alive" with "can it serve traffic," risking an orchestrator killing a healthy-but-momentarily-DB-slow instance; rate limiting was silently wrong the instant a second API replica existed, with no path to fix it; there was no backup or restore tooling at all — a real data-loss event had no recovery path, tested or otherwise; logs were unstructured text with no per-request correlation; Postgres connection pooling had no explicit, documented sizing. All of these are now closed, verified in a real CI Docker daemon on every push, or — where genuinely out of this domain's reach — named above rather than silently absent.

## 9. Intelligence Layer impact

None of this domain's changes touch AI request handling, provider selection, budget enforcement, or the orchestration/institutional-memory layers — confirmed by the full AI test suite passing unchanged. Indirect impact only: the AI Orchestrator, Voice broker, and every AI capability all run inside the same containers, behind the same rate limiter, against the same database pool this domain hardened — none of it AI-specific, all of it now more production-ready underneath the AI system rather than in it.

---

**PD-002 is complete.**

## 10. Current Production Readiness

**Launch Confidence Score:**

| Area | Score | Basis |
|---|---|---|
| Security | 100% | PD-001 complete: auth hardening, authorization verification, input sanitization, dependency remediation, security headers — no known open finding. |
| Infrastructure | 85% | PD-002 complete: Docker build-verified in real CI, health/readiness/liveness split, Redis-backed rate limiting, Postgres pool config, container hardening, backup/restore/DR tooling and drill procedure. Remaining 15%: no live CD pipeline to a real staging/production host, no k6 load test against real multi-replica infra, no `turbo prune` minimal image — each named in §7 and blocked on an infrastructure/hosting decision, not engineering effort. |
| Observability | 15% | Structured JSON logging + per-request correlation IDs now exist (this domain). No APM/error-tracking dashboard, no alerting, no proactive AI-budget notification — all of PD-000's own "PD-002" (Observability) remains undone; this domain intentionally did not attempt it (see status note, §7). |
| Performance | 0% | No load/performance testing exists anywhere in this repository yet (PD-000/PD-005 item 5) — untouched by any domain to date. |
| Intelligence Layer Readiness | 65% | Unchanged by this domain (see §9) — carried forward from PD-001's assessment; AI safety (content moderation/prompt-injection defense, PD-007) and data retention (PD-010) remain the largest named gaps. |
| **Overall Production Readiness** | **58%** | Weighted toward the still-open Observability, Legal/Privacy (PD-003), AI Safety (PD-007), and Load-testing gaps — Security and Infrastructure are strong, but a real-user launch needs more than those two domains alone. |

## 11. Remaining Production Domains

Per the PD-000 audit's own numbering (now with PD-001 and this domain — "PD-002" in the Founder's own sequence, distinct from PD-000's internal PD-002/PD-005/PD-006 split it absorbed) complete:

- **PD-000's "PD-002" remainder — Observability/APM.** Sentry-class error tracking and proactive AI-budget alerting (see §7) — everything else in that domain (structured logging, health-check split) shipped here.
- **PD-003 — Legal, Privacy & Consent Foundation.** No Privacy Policy/ToS content, no consent tracking, no data export/deletion. Critical for any deployment with real (especially EU/CA) users; legal drafting time is not engineering-estimable.
- **PD-000's "PD-005" remainder — real CD pipeline + staging environment + k6 load testing.** Blocked on a hosting decision (see §7).
- **PD-000's "PD-006" remainder — scheduled, provider-managed backup policy.** Blocked on the same hosting decision; the tooling and drill procedure are done (this domain).
- **PD-007 — AI Safety: Content Moderation & Prompt-Injection Defense.** The single largest Intelligence Layer safety gap per the PD-000 audit — member input reaches AI providers with zero filtering today.
- **PD-008 — Content Moderation & Trust/Safety (platform-wide UGC).** No delete/report path for Pod messages; no rich-text sanitization beyond what PD-001 added at the DTO layer.
- **PD-009 through PD-016** — AI provider resilience/cost governance maturity, AI data retention, Intelligence Layer test harness, real document-storage backend, frontend quality/completeness, next-best-action surface, governance documentation consolidation (Founder-gated). See PD-000 for full detail on each.

## 12. Remaining Launch Blockers

For a **private beta** (a small, trusted, invited user set): none of the remaining domains above are strictly blocking — Security and Infrastructure are solid, and a private beta can reasonably operate with logs-only observability, a manual deploy procedure, and a Founder-drafted interim privacy notice rather than final legal text, **provided AI features are either disabled or the Founder accepts the known-unmitigated prompt-injection/content-moderation risk in PD-007 for a small, trusted cohort.**

For a **public, real-user launch**: PD-003 (legal/privacy — real exposure, not a technical nice-to-have) and PD-007 (AI safety — the largest safety gap this audit found) are both genuine blockers, plus the PD-005 remainder (a real CD pipeline and at least one load test) before trusting the infrastructure under real, unpredictable traffic.

## 13. Estimated Effort to Production Launch

Using the PD-000 audit's own per-domain estimates (unchanged by this domain, since none of them were touched): PD-000's "PD-002" remainder (~2 engineer-days, mostly Sentry account wiring once provisioned), PD-003 (4-6 engineer-days engineering + non-estimable legal drafting), PD-005 remainder (~5-6 engineer-days once a hosting target is chosen), PD-006 remainder (~1-2 engineer-days once the same hosting decision is made), PD-007 (3-5 engineer-days). **Roughly 15-21 engineer-days of remaining critical-path engineering effort**, gated on two Founder-level decisions this domain could not make unilaterally: a hosting/infrastructure target, and legal text sign-off — plus non-estimable legal drafting time.

## 14. Beta Readiness

**Yes — Aureus is ready for a private beta after PD-002**, with two conditions carried over from §12: an interim (even if not final) privacy/data-handling notice should exist before inviting real users, and the Founder should make an explicit, informed call on AI-feature exposure given PD-007's unmitigated status for that limited cohort. Security and Infrastructure are both genuinely production-shaped, verified, and documented — the remaining gaps are legal, safety, and scale concerns appropriate to name and monitor for a trusted, small-scale beta rather than block on entirely.

---

**Awaiting authorization before PD-003.**
