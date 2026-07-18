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

Recommended in production (defaulted, but the defaults are dev-shaped):

| Variable | Default | Why to set it in production |
|---|---|---|
| `CORS_ORIGIN` | `*` | Set to your actual frontend origin(s); `*` disables credentialed CORS |
| `NODE_ENV` | `development` | Set to `production` |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` | unset → local jsonTransport capture, no real email sent | Required for password reset / email verification to actually deliver |
| `AI_PROVIDER` | `stub` → deterministic canned responses, no real AI | Set to `openai` or `anthropic` with the matching API key for a real AI Steward |
| `AI_EMERGENCY_STOP` | `false` | Set to `true` to immediately halt all AI features platform-wide — a kill switch, no restart required (PR-002) |
| `AI_GLOBAL_DAILY_BUDGET_USD` | `50` | Platform-wide AI spend ceiling, rolling 24h window; further requests are refused with 503 once reached (PR-002) |
| `AI_USER_DAILY_BUDGET_USD` | `2` | Per-member AI spend ceiling, rolling 24h window; further requests are refused with 403 once reached (PR-002) |

Optional, one-time only (see §1):

| Variable | Purpose |
|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | First-administrator creation via `npx prisma db seed` |

---

## 3. Containerization

Both apps build from the **repository root** as the Docker build context, so the pnpm workspace and the root-level Prisma schema (`prisma/schema.prisma`, `prisma.config.ts`) resolve normally:

```
docker build -f apps/api/Dockerfile -t aureus-api .
docker build -f apps/web/Dockerfile -t aureus-web .
```

Or bring up the full stack (Postgres + API + web) in one step:

```
cp .env.example .env    # fill in real secrets first
docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed   # first-admin bootstrap, see §1
```

Notes on the images:

- **API** (`apps/api/Dockerfile`): multi-stage Node 22 Alpine build. Installs the full pnpm workspace (needed for the Turborepo build graph — `apps/api` depends on `packages/shared`), runs `prisma generate`, builds with `turbo run build --filter=@aureus-v1/api...`, then copies `node_modules`, `dist`, and `prisma/` into the runtime layer. Listens on `PORT` (default `3000`); `HEALTHCHECK` hits `GET /health`.
- **Web** (`apps/web/Dockerfile`): uses Next.js `output: "standalone"` (`apps/web/next.config.ts`) so the runtime layer needs only the traced server bundle plus `.next/static` and `public/`, not the full `node_modules` tree. `NEXT_PUBLIC_API_BASE_URL` is inlined into the client bundle at **build** time — pass it as a Docker build arg (`docker compose build.args` or `--build-arg`), not a runtime `-e`. Listens on `PORT` (default `3001`).
- Both images run as a non-root user and are optimized for **correctness over minimal size** — the API runtime keeps the full pnpm install (including devDependencies, so `npx prisma migrate deploy`/`db seed` work via `docker compose exec`) rather than a pruned production-only install. A `turbo prune`-based slimmer build is a reasonable follow-up, not a requirement of this foundation.
- **Not yet build-verified against a live Docker daemon in this environment** (no daemon was available when these images were authored). Structurally sound and following the standard pnpm-workspace + Turborepo + Next.js-standalone patterns, but the first real build should happen in CI or staging before it's trusted for a production cutover — see the deploy procedure below, which builds in CI before anything reaches a server.

---

## 4. Deploy procedure

There is no CD pipeline yet — this is a manual procedure until one is built (a natural next step, not scoped into PR-002).

1. **CI must be green** on the commit being deployed (backend + frontend test suites, lint, type-check — see the repository's GitHub Actions workflow).
2. **Build the images** from that commit (CI or a deploy host with Docker):
   ```
   docker build -f apps/api/Dockerfile -t aureus-api:<git-sha> .
   docker build -f apps/web/Dockerfile -t aureus-web:<git-sha> \
     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.example .
   ```
3. **Run migrations before swapping traffic**, against the production database, from the new image (never from a developer machine with production credentials):
   ```
   docker run --rm -e DATABASE_URL="$PRODUCTION_DATABASE_URL" aureus-api:<git-sha> npx prisma migrate deploy
   ```
   Prisma migrations here are additive-first by convention (see the migration history under `prisma/migrations/`) — a new nullable column or table is safe to apply before the new code is live; a destructive or renaming migration needs a reviewed two-step plan (expand, deploy, contract), not a one-shot `migrate deploy`.
4. **Start the new containers** alongside the old ones (blue/green or rolling, depending on the host), pointing at the same database.
5. **Verify before cutting over traffic**: `GET /health` returns 200 on the new API container; a smoke-test login against the new web container succeeds.
6. **Cut traffic over** (load balancer / DNS / orchestrator-specific step) and **only then** stop the old containers.

---

## 5. Rollback procedure

1. Because migrations in step 3 above are additive-first, the previous image version can normally run unmodified against the post-migration schema — an old column/table is simply unused, not missing. **Redeploy the previous image tag** and cut traffic back:
   ```
   docker run ... aureus-api:<previous-git-sha>
   docker run ... aureus-web:<previous-git-sha>
   ```
2. If the migration genuinely was destructive (should not happen under the expand/contract convention above, but if it did): restoring service requires either a forward-fix migration or a database restore from backup — there is no automatic down-migration tooling in this repository. Treat this as an incident (§6), not a routine rollback.
3. After rolling back, confirm `GET /health` is green on the restored version before considering the rollback complete.

---

## 6. Incident response

**Current operational signal:** `GET /health`, backed by a Postgres connectivity check via `@nestjs/terminus`. There is no APM/error-tracking integration and no structured audit log beyond `StewardActivityLog` (Connected Experiences domain) and application logs — see PR-001 findings §5. Until real monitoring exists, application logs (`docker logs`/container platform log viewer) are the primary diagnostic source.

**AI budget-related incidents (PR-002):** a spike in AI costs or an unmapped-model pricing gap surfaces as a `WARN`-level log line (`AiPricingUtil`: "No pricing entry for model..." or `AiRequestsService`: "...budget reached"/"...quota reached") before it becomes a bill — grep container logs for these first.
- To halt AI spend immediately without a deploy: set `AI_EMERGENCY_STOP=true` in the running environment and restart the API container (env var is read at request time via `ConfigService`, so a container restart is sufficient — no rebuild).
- To raise or lower the ceilings: adjust `AI_GLOBAL_DAILY_BUDGET_USD` / `AI_USER_DAILY_BUDGET_USD` and restart.

**Account lockout incidents (PR-002):** a member locked out after 5 failed logins waits 15 minutes for `lockedUntil` to clear automatically (see `AuthService.registerFailedLoginAttempt`) — there is no manual unlock endpoint yet. To unlock a specific account sooner, an operator must clear `failedLoginAttempts`/`lockedUntil` directly via `npx prisma studio` or a direct `UPDATE "User" SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 WHERE email = '...'` against the production database — treat this as a privileged, logged, one-off action, not routine tooling.

**Database incidents:** no automated backup/restore procedure is documented yet — this is a gap, not a "nothing to do here." Provision automated backups (the specific mechanism depends on the eventual hosting choice) before this runbook can claim database-incident readiness; until then, treat any data-loss scenario as requiring immediate escalation to whoever provisioned the database.
