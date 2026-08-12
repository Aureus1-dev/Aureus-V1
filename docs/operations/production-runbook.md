# Aureus Production Runbook

**This is a technical operations document, not a governance canon.** It names actual commands, actual environment variables, and actual failure procedures — the gap identified by PR-001 (Production Readiness Master Audit): every "deployment"/"incident" document under `docs/technology/sops/` and `docs/operations/` is governance/policy prose naming no real infrastructure. This document is deliberately outside that numbered series so it is never mistaken for institutional canon.

This is a living document — extend it as PR-003/PR-004 add real infrastructure (CI-driven deploys, monitoring, an unlock endpoint). Sections below are added as each piece lands; an empty section means that capability does not exist yet, not that it was forgotten.

---

## 1. First-time production setup — admin bootstrap

A fresh Aureus database has **no users and no way to create one through the API other than `POST /auth/register`, which always assigns the `MEMBER` role.** There is no seed data and no privileged-account creation endpoint. Bootstrapping the first administrator is a one-time, operator-run step:

1. Provision the database and run migrations:
   ```
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
2. Set the bootstrap credentials as environment variables (never commit these):
   ```
   export BOOTSTRAP_ADMIN_EMAIL="admin@yourdomain.example"
   export BOOTSTRAP_ADMIN_PASSWORD="<a strong, unique password, 12+ characters>"
   ```
3. Run the seed:
   ```
   npx prisma db seed
   ```
   This runs `apps/api/prisma/seed.ts` (tested logic lives in `apps/api/src/scripts/bootstrap-admin.ts`, see `bootstrap-admin.spec.ts`), which:
   - Does **nothing** if any user already holds `PLATFORM_ADMINISTRATOR` or `SYSTEM_ADMINISTRATOR` — safe to run again after the first successful bootstrap.
   - **Promotes** an existing user with that email in place (adds the role, doesn't touch their other roles) if they already registered normally.
   - Otherwise **creates** a new `SYSTEM_ADMINISTRATOR` account, hashed with the same bcrypt/12-rounds path as normal registration — no special-cased login flow.
4. Sign in at `/login` with the bootstrap credentials, then **immediately change the password** through the normal account-settings flow (there is no forced-rotation mechanism yet — this is a manual operator step).
5. Unset `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` from the environment after use. They are only read at seed time, never at application runtime.

If you lose access to every administrator account, re-run step 2–3 with a new email — the script will create a fresh administrator (it only skips if an admin *already exists*, so this is not itself a recovery mechanism for a locked-out admin; recovering a specific locked account still requires direct database access).

---

## 2. Environment variables reference

Required (app fails to boot without these — see `apps/api/src/app.module.ts` Joi schema):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:port/db?schema=public` |
| `JWT_ACCESS_SECRET` | Minimum 32 characters — Joi rejects a shorter value at boot |

**Required once `NODE_ENV=production` (PD-001)** — these are optional in development/test, but the app now refuses to boot without them once `NODE_ENV=production`, so a misconfigured production deploy fails loudly at startup instead of silently degrading:

| Variable | Dev/test behavior if unset | Production requirement |
|---|---|---|
| `CORS_ORIGIN` | Defaults to `*` | Must be an explicit origin (not `*`) — `*` disables credentialed CORS |
| `SMTP_HOST` | Falls back to local capture | Required — verification and password-recovery messages must deliver before Member One |
| `AI_PROVIDER` | Defaults to `stub` | Must be `openai` or `anthropic`; the placeholder provider is rejected |
| `OPENAI_API_KEY` | N/A unless `AI_PROVIDER=openai` | Required whenever `AI_PROVIDER=openai` (either environment) |
| `ANTHROPIC_API_KEY` | N/A unless `AI_PROVIDER=anthropic` | Required whenever `AI_PROVIDER=anthropic` (either environment) |

Recommended in production (defaulted, but the defaults are dev-shaped):

| Variable | Default | Why to set it in production |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` — also gates the requirements above and disables Swagger (see `ENABLE_API_DOCS` below) |
| `SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM_EMAIL` | Provider-specific | Configure for the selected SMTP provider; verify both verification and reset messages before Member One |
| `ENABLE_API_DOCS` | `false` in production (on by default outside it) | Set to `true` only if this deployment wants `/api/docs` public — otherwise stays closed to avoid handing out a free endpoint/DTO schema dump |
| `FRONTEND_URL` | `http://localhost:3001` | Set to the real deployed frontend origin — used to build password-reset/email-verification links; left at the default, those links point at `localhost` for every recipient |
| `AI_EMERGENCY_STOP` | `false` | Set to `true` to immediately halt all AI features platform-wide — a kill switch, no restart required (PR-002) |
| `AI_GLOBAL_DAILY_BUDGET_USD` | `50` | Platform-wide AI spend ceiling, rolling 24h window; further requests are refused with 503 once reached (PR-002) |
| `AI_USER_DAILY_BUDGET_USD` | `2` | Per-member AI spend ceiling, rolling 24h window; further requests are refused with 403 once reached (PR-002) |
| `REDIS_URL` | unset → in-memory rate-limit storage | Set once running more than one API replica (PD-002) — see §3 |
| `DATABASE_POOL_MAX` / `DATABASE_POOL_MIN` | `10` / `0` (the `pg` driver's own defaults) | Size against your Postgres host's `max_connections` (or a pooler in front of it) once running more than one replica (PD-002) |
| `SENTRY_DSN` | unset → 5xx errors log to stdout only | Set to a real Sentry DSN to also report uncaught 5xx exceptions and fatal bootstrap failures there (Production Stability) |
| `VOICE_MODEL` / `VOICE_NAME` | `gpt-realtime` / `marin` | Reuses `OPENAI_API_KEY` above — no separate credential. This is a Realtime WebRTC session; text-to-speech-only models such as `gpt-4o-mini-tts` are not compatible here |

Optional, one-time only (see §1):

| Variable | Purpose |
|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | First-administrator creation via `npx prisma db seed` |

### Email delivery is a launch requirement

Production fails closed when `SMTP_HOST` is missing. That is intentional: login requires email verification, and password recovery is delivered by email. Before Member One, complete one real registration/verification cycle and one real forgot-password/reset cycle against the deployed domain. Development and test environments can still omit SMTP and use nodemailer's local `jsonTransport` capture.

### Verifying an environment before deploying (PD-002)

`pnpm verify:env [path-to-env-file]` runs the exact same Joi schema a real boot performs (`apps/api/src/config/env.validation.ts`), standalone — so a candidate `.env`/environment can be checked *before* a deploy, not discovered broken when the container crash-loops:

```
pnpm verify:env                    # validates the current shell's env vars
pnpm verify:env .env.production    # loads a file first, then validates it
```

### Account security (PD-001)

- **Multi-factor authentication (TOTP):** a member enrolls via `POST /auth/mfa/enroll` → `POST /auth/mfa/enable` (any authenticator app that speaks TOTP — Google Authenticator, 1Password, etc.). Once enabled, `POST /auth/login` returns `{ mfaRequired: true, mfaToken }` instead of tokens; the client completes with `POST /auth/mfa/verify-login`. 8 single-use recovery codes are issued once at enable-time (bcrypt-hashed at rest, shown to the user exactly once) for the lost-device case. There is no operator-side MFA reset endpoint yet — a locked-out member currently requires direct database access to clear `mfaEnabled`/`mfaSecret`/`mfaRecoveryCodes`, the same class of action as the account-lockout procedure in §6.
- **Logout everywhere:** `POST /auth/logout-everywhere` revokes every refresh token for the calling account — useful to advise a member to run after a suspected credential compromise, on top of a password reset.
- **Email verification is now enforced at login** (previously advisory only): an unverified account receives 403 on `POST /auth/login` until `POST /auth/verify-email` completes; `POST /auth/resend-verification` re-sends the token and — like `forgot-password` — always returns 204 regardless of whether the address exists or is already verified, so it cannot be used to enumerate accounts.

---

## 3. Containerization

Both apps build from the **repository root** as the Docker build context, so the pnpm workspace and the root-level Prisma schema (`prisma/schema.prisma`, `prisma.config.ts`) resolve normally:

```
docker build -f apps/api/Dockerfile -t aureus-api .
docker build -f apps/web/Dockerfile -t aureus-web .
```

Or bring up the full stack (Postgres + Redis + API + web) in one step:

```
cp .env.example .env    # fill in real secrets first
docker compose up --build
DATABASE_URL=... ./scripts/db-migrate-deploy.sh   # or: docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed   # first-admin bootstrap, see §1
```

Notes on the images:

- **API** (`apps/api/Dockerfile`): multi-stage Node 22 Alpine build. Installs the full pnpm workspace (needed for the Turborepo build graph — `apps/api` depends on `packages/shared`), runs `prisma generate`, builds with `turbo run build --filter=@aureus-v1/api...`, then copies `node_modules`, `dist`, and `prisma/` into the runtime layer. Listens on `PORT` (default `3000`); `HEALTHCHECK` hits `GET /health/live` (PD-002 — see below).
- **Web** (`apps/web/Dockerfile`): uses Next.js `output: "standalone"` (`apps/web/next.config.ts`) so the runtime layer needs only the traced server bundle plus `.next/static` and `public/`, not the full `node_modules` tree. `NEXT_PUBLIC_API_BASE_URL` is inlined into the client bundle at **build** time — pass it as a Docker build arg (`docker compose build.args` or `--build-arg`), not a runtime `-e`. Listens on `PORT` (default `3001`).
- Both images run as a non-root user and are optimized for **correctness over minimal size** — the API runtime keeps the full pnpm install (including devDependencies, so `npx prisma migrate deploy`/`db seed` work via `docker compose exec`) rather than a pruned production-only install. A `turbo prune`-based slimmer build remains a deliberate, named deferral (PD-002): it changes exactly the install step that needs live-daemon verification, still unavailable in the authoring sandbox — see the container hardening note below for what *did* ship instead.
- **Now build-verified in CI on every push** (PD-002, closing the prior "never build-verified against a live daemon" gap): a `docker` job in `.github/workflows/ci.yml` builds both images, runs `prisma migrate deploy` from the built API image against a real Postgres service container, boots it, and polls `/health/live` then `/health/ready` before the job passes. If this job is green on `main`, the images are known-good — not just structurally plausible.

### Liveness vs. readiness (PD-002)

`GET /health` (unchanged, DB-inclusive) is now joined by two more specific probes, both backed by `@nestjs/terminus`:

- **`GET /health/live`** — is the process up at all? No external dependency checks. This is what the Dockerfile's own `HEALTHCHECK` and `docker-compose.yml`'s `api`/`redis`/`postgres` healthchecks use — a slow/unreachable database shouldn't make an orchestrator kill and restart an otherwise-healthy container.
- **`GET /health/ready`** — can this instance actually serve traffic? Checks database connectivity. Point a load balancer's or Kubernetes' readiness probe here, not at `/health/live`.

### Rate limiting at scale — Redis (PD-002)

`@nestjs/throttler`'s default storage is an in-memory `Map` — correct for exactly one API replica, silently wrong the moment there's more than one (each replica counts hits independently, so the *effective* limit becomes `configured limit × replica count`). Setting `REDIS_URL` switches to `RedisThrottlerStorageService` (`apps/api/src/common/throttler/redis-throttler-storage.service.ts`), which shares hit counts across every replica via a single atomic Lua script per request. `docker-compose.yml` already wires this to its own `redis` service; a production deployment behind a real load balancer with more than one API instance should point `REDIS_URL` at a shared Redis instance the same way. Leaving it unset in production is not an error (a one-time boot warning is logged, not a failure) — only wrong once you actually scale past one replica.

### Render configuration

`render.yaml` (repo root) is the explicit build/deploy spec for Render, added after a 2026-07-28 incident where every route on a Render deployment of the API returned 404 despite Render reporting the deploy as successful. Root-cause investigation (record kept in §6 below) found no defect in the application — a clean build and boot of the exact repository code correctly registers every route, `POST /auth/register` included — and found instead that this repository had **no Render configuration anywhere**. In a pnpm monorepo with two Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`), auto-detection cannot reliably know which Dockerfile to build or that the build context must be the repository root (both Dockerfiles' own header comments require this, for the same pnpm-workspace/Prisma-schema-resolution reason).

`render.yaml` pins both deployable services: the API uses `apps/api/Dockerfile`, the web app uses `apps/web/Dockerfile`, and both use the repository root as `dockerContext` (do **not** set Render's Root Directory to an app subdirectory). The API health check is `/health/ready`; the web health check is `/`. Render injects `NEXT_PUBLIC_API_BASE_URL` as a Docker build argument. Pilot auto-deploys are disabled because CI cannot certify the human launch gates; trigger each pilot deploy manually, then switch `autoDeployTrigger` to `checksPass` only after Pilot-25 authorizes normal continuous delivery.

### Container hardening (PD-002)

`docker-compose.yml`'s `api`, `web`, and `redis` services all run with: a **read-only root filesystem** (only `/tmp` is writable, via `tmpfs` — neither app writes application data to disk at runtime; Document storage is metadata-only today, see PD-012 for real file handling), **every Linux capability dropped** (`cap_drop: [ALL]` — this process never needs raw sockets, `chown`, etc.), and **`no-new-privileges`** (blocks setuid/setgid privilege escalation even if a dependency tried it). Both Dockerfiles already ran as a non-root user before this. The one hardening item *not* done is pruning devDependencies from the runtime image (see above) — named and deferred, not overlooked.

---

## 4. Deploy procedure

There is no CD pipeline yet — this is a manual procedure until one is built. Render is the current hosting target for both the API and web application (see `render.yaml` and the "Render configuration" note above); the steps below still apply for anyone deploying by hand or to another host.

1. **CI must be green** on the commit being deployed — including the `docker` job (PD-002), which build-verifies both images and boots the API image against a real Postgres before anything downstream should trust them.
2. **Build the images** from that commit (CI or a deploy host with Docker):
   ```
   docker build -f apps/api/Dockerfile -t aureus-api:<git-sha> .
   docker build -f apps/web/Dockerfile -t aureus-web:<git-sha> \
     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.example .
   ```
3. **Back up, then run migrations before swapping traffic**, against the production database, from the new image (never from a developer machine with production credentials):
   ```
   DATABASE_URL="$PRODUCTION_DATABASE_URL" ./scripts/db-migrate-deploy.sh
   ```
   This (PD-002) takes a `pg_dump` backup first (see §7), then runs `prisma migrate deploy`, then `prisma migrate status` to confirm every migration actually applied. Prisma migrations here are additive-first by convention (see the migration history under `prisma/migrations/`) — a new nullable column or table is safe to apply before the new code is live; a destructive or renaming migration needs a reviewed two-step plan (expand, deploy, contract), not a one-shot `migrate deploy`.
4. **Start the new containers** alongside the old ones (blue/green or rolling, depending on the host), pointing at the same database.
5. **Verify before cutting over traffic**: `GET /health/ready` returns 200 on the new API container (database connectivity confirmed, not just process-up); a smoke-test login against the new web container succeeds.
6. **Cut traffic over** (load balancer / DNS / orchestrator-specific step) and **only then** stop the old containers.

---

## 5. Rollback procedure

1. Because migrations in step 3 above are additive-first, the previous image version can normally run unmodified against the post-migration schema — an old column/table is simply unused, not missing. **Redeploy the previous image tag** and cut traffic back:
   ```
   docker run ... aureus-api:<previous-git-sha>
   docker run ... aureus-web:<previous-git-sha>
   ```
2. If the migration genuinely was destructive (should not happen under the expand/contract convention above, but if it did): restore the pre-migration backup taken in deploy step 3 (PD-002):
   ```
   DATABASE_URL="$PRODUCTION_DATABASE_URL" ./scripts/db-restore.sh ./backups/aureus-<timestamp>.dump
   ```
   Treat this as an incident (§6), not a routine rollback — a destructive migration reaching production at all means the expand/contract convention above wasn't followed, and any writes made between the migration and the restore are lost.
3. After rolling back, confirm `GET /health/ready` is green on the restored version before considering the rollback complete.

---

## 6. Incident response

**Current operational signal:** `GET /health` (and the more specific `GET /health/live` / `GET /health/ready`, PD-002), backed by a Postgres connectivity check via `@nestjs/terminus`. Every request is now also logged once at completion — method, path, status, duration, and a request ID echoed back on the response as `X-Request-Id` (`RequestLoggingMiddleware`, PD-002) — and in production, every log line is a single parseable JSON object (`ConsoleLogger`'s `json: true` mode) rather than human-terminal text, so `docker logs`/a container platform's log viewer can be grepped or piped into a log aggregator without a scraping layer in between. There is still no APM/error-tracking SaaS integration (Sentry-class tooling) — that remains a named, Founder-decision-gated deferral (see the PD-002 readiness report §7), since it requires provisioning an external account this sandbox cannot make on anyone's behalf.

**AI budget-related incidents (PR-002):** a spike in AI costs or an unmapped-model pricing gap surfaces as a `WARN`-level log line (`AiPricingUtil`: "No pricing entry for model..." or `AiRequestsService`: "...budget reached"/"...quota reached") before it becomes a bill — grep container logs for these first.
- To halt AI spend immediately without a deploy: set `AI_EMERGENCY_STOP=true` in the running environment and restart the API container (env var is read at request time via `ConfigService`, so a container restart is sufficient — no rebuild).
- To raise or lower the ceilings: adjust `AI_GLOBAL_DAILY_BUDGET_USD` / `AI_USER_DAILY_BUDGET_USD` and restart.

**Account lockout incidents (PR-002):** a member locked out after 5 failed logins waits 15 minutes for `lockedUntil` to clear automatically (see `AuthService.registerFailedLoginAttempt`) — there is no manual unlock endpoint yet. To unlock a specific account sooner, an operator must clear `failedLoginAttempts`/`lockedUntil` directly via `npx prisma studio` or a direct `UPDATE "User" SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 WHERE email = '...'` against the production database — treat this as a privileged, logged, one-off action, not routine tooling.

**Database incidents:** see §7 (Disaster Recovery, PD-002) — automated ad hoc backup/restore tooling now exists (`scripts/db-backup.sh` / `scripts/db-restore.sh`), closing the prior "no automated backup/restore procedure is documented yet" gap. A *scheduled, provider-managed* snapshot policy (e.g. RDS automated backups) still depends on a hosting decision this sandbox cannot make — see the PD-002 readiness report §7 for that remaining piece.

**Incident record — "every route 404s" on Render (2026-07-28):** Reported symptom: `GET /`, `GET /auth/register`, and `GET /auth/health` each returned `{"statusCode":404,"message":"Cannot GET ..."}` on a Render deployment Render itself reported as successful. Investigation findings, each verified directly against this repository rather than assumed:

1. `GET /` 404s by design — there is no `AppController`/root route in `AppModule`; this is a REST API with no page to serve at `/`. Not a defect.
2. `GET /auth/register` 404s on a browser visit by design — `AuthController`'s `register` handler is `@Post('register')` only (`apps/api/src/auth/auth.controller.ts`); Nest/Express's default 404 for a GET against a POST-only path is exactly `"Cannot GET /auth/register"`. Not a defect. The correct request is `POST /auth/register` with a JSON body matching `RegisterDto` (`email`, `password`).
3. `GET /auth/health` has never existed — health lives at the top level (`/health`, `/health/live`, `/health/ready`, `apps/api/src/health/health.controller.ts`), not nested under `/auth`. Not a defect.
4. No `app.setGlobalPrefix()` or `app.enableVersioning()` is configured anywhere in `apps/api/src` — routes are exactly as each `@Controller()`/`@Get`/`@Post` decorator states, no hidden prefix.
5. A clean `tsc -p apps/api/tsconfig.json` build followed by directly running the resulting `dist/main.js` (dummy `DATABASE_URL`/`JWT_ACCESS_SECRET`, no other changes) produces Nest's own startup route log, including `Mapped {/auth/register, POST} route` and every other controller's routes, correctly and completely. This rules out the application code as the cause.
6. This repository had (until this incident) **no Render configuration at all**. The most likely real root cause was auto-detection ambiguity in a pnpm monorepo with two Dockerfiles, which requires an explicit `dockerfilePath` and a repository-root build context. A dashboard-only Root Directory or build configuration most plausibly did not match what `apps/api/Dockerfile` requires. This could not be confirmed directly at the time — the fix below closes the gap regardless of which specific misconfiguration it was.

**Fix applied:** added `render.yaml` (repo root) — see the "Render configuration" note in §3 above. No application code, `Dockerfile`, or `package.json` script was changed; none was found to be at fault.

**Verification after redeploying with `render.yaml` in place:** `GET /health/ready` should return `200`; `POST /auth/register` with a valid `RegisterDto` body should return a real registration response (not a 404). If either still fails after redeploying from this configuration, the next step is comparing the deployed commit SHA (visible in the Render dashboard) against `main`'s current SHA — a stale deployed commit predating a given route would be the next most likely cause, and is not something this repository's contents alone can rule out.

---

## 7. Disaster recovery (PD-002)

**What this covers:** total loss or corruption of the production database — the scenario where "redeploy the previous image" (§5) isn't enough because the *data* itself is gone or wrong, not just the code.

**Recovery tooling:**
- `scripts/db-backup.sh` — `pg_dump --format=custom` against `DATABASE_URL`, writes a timestamped, compressed, selectively-restorable dump.
- `scripts/db-restore.sh` — `pg_restore --clean --if-exists` against `DATABASE_URL`, from a dump produced by the script above. Destructive by design (it's a restore) — requires typing `yes` to confirm, or `CONFIRM=yes` for scripted/drill use.
- `scripts/db-migrate-deploy.sh` — runs a backup automatically before every migration deploy (see §4), so "the last deploy" is always a recovery point, not just whatever a separate schedule happened to catch.

**Recovery objectives (today, without a provisioned scheduled-backup service):**
- **RPO (Recovery Point Objective) — since the last deploy or manually-triggered backup.** There is no scheduled/automated backup cadence yet independent of deploys; an operator should run `scripts/db-backup.sh` on a cron (or via the eventual hosting provider's own scheduled-snapshot feature) rather than relying solely on deploy-time backups, especially for a low-deploy-frequency period with real user writes accumulating in between.
- **RTO (Recovery Time Objective) — dominated by restore time, which scales with database size.** No formal target is set here; the first real restore drill (below) should produce one, timed against real data volume.

**Restore drill procedure** (rehearse this before trusting it in a real incident):
1. Take a backup of a non-production (or disposable staging) database: `DATABASE_URL="$STAGING_DATABASE_URL" ./scripts/db-backup.sh ./backups`.
2. Make some verifiable change to that database (e.g. update a known row).
3. Restore the backup into a *different*, throwaway database: `DATABASE_URL="$SCRATCH_DATABASE_URL" CONFIRM=yes ./scripts/db-restore.sh ./backups/aureus-<timestamp>.dump`.
4. Confirm the verifiable change from step 2 is gone (i.e. the restore genuinely reverted to the pre-change state) and that the application boots successfully against the restored database (`GET /health/ready` returns 200).
5. Record how long steps 1 and 3 took — that timing, against real data volume, is the actual RTO, not a guess.

**Explicitly deferred (named, not overlooked):** a provider-managed *scheduled* snapshot policy (the mechanism depends on the eventual hosting choice — RDS automated backups, a managed Postgres provider's own snapshot feature, or a cron running `db-backup.sh` against a specific host) requires that hosting decision to exist first; this PD ships the tooling and the drill procedure that any of those choices would use, not the choice itself.
