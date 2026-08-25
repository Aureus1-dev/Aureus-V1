# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Aureus V1 is a TypeScript monorepo (Turborepo + pnpm workspaces) implementing the Aureus platform:

- `apps/api` — NestJS backend (the domain API).
- `apps/web` — Next.js 15 / React 19 app (member-facing frontend).
- `packages/shared` — TypeScript code shared across apps (currently minimal — `apps/web` and `apps/api` are separate deployables and mostly do **not** share runtime code; feature flags, for example, are deliberately mirrored by hand in both apps rather than imported from here).
- `prisma/schema.prisma` — the single Prisma schema (PostgreSQL, ~70 models) for the whole platform.
- `docs/` — an extensive governance and specification tree (see "Documentation hierarchy" below). Treat it as load-bearing, not background reading — implementation is expected to trace back to it.

## Commands

Install and prepare:
```bash
pnpm install              # also runs `prisma generate` via postinstall
npx prisma migrate dev    # apply migrations locally (needs DATABASE_URL)
```

Run everything (turbo, parallel):
```bash
pnpm dev
```

Per-package dev (faster iteration):
```bash
pnpm --filter @aureus-v1/api run dev     # nest start --watch
pnpm --filter @aureus-v1/web run dev     # next dev
```

Build / lint / type-check (all packages via turbo):
```bash
pnpm build
pnpm lint
pnpm check-types
pnpm format          # prettier --write .
pnpm format:check
```

Tests:
```bash
# API — unit, integration, and e2e tests all run together via Jest;
# requires a reachable PostgreSQL database (DATABASE_URL).
pnpm --filter @aureus-v1/api run test --coverage
pnpm --filter @aureus-v1/api run test:watch

# Run a single API test file or pattern:
pnpm --filter @aureus-v1/api exec jest path/to/file.spec.ts
pnpm --filter @aureus-v1/api exec jest -t "test name substring"

# Web
pnpm --filter @aureus-v1/web run test
pnpm --filter @aureus-v1/web run test:watch
```

Env verification (checks a candidate `.env`/environment against the same Joi schema used at boot, without actually starting the server):
```bash
pnpm verify:env
```

Copy `.env.example` to `.env` first; `DATABASE_URL` and `JWT_ACCESS_SECRET` (32+ chars) are required even in development. CI (`.github/workflows/ci.yml`) runs install → `prisma generate` → type-check → lint → `prisma migrate deploy` → API tests (`--coverage`) → web tests → build, plus a separate job that builds both Dockerfiles and smoke-tests the API image's `/health/live` and `/health/ready` against a real Postgres.

## Architecture

### API module pattern (`apps/api/src/<domain>/`)

Each domain (`users`, `auth`, `goals`, `journeys`, `opportunities`, `resources`, `stewardship`, `communication`, `knowledge`, `academy`, `pods`, `organizations`, `administration`, `ai`, `city-sheet`, `consent`, `needs`, `connected-experiences`, etc.) is a self-contained Nest module following the same internal shape, often with nested sub-modules (e.g. `users/profile/`, `users/interests/`):

- `*.module.ts`, `*.controller.ts`, `*.service.ts`
- `dto/` — request/response DTOs, validated via `class-validator`/`class-transformer` (global `ValidationPipe` with `whitelist`/`forbidNonWhitelisted`/`transform` set in `main.ts`).
- `repositories/` — a repository **interface** (`*.repository.interface.ts`) plus a Prisma implementation (`prisma-*.repository.ts`), so persistence is behind an interface rather than services calling Prisma directly.
- Test files sit next to the code they test: `*.spec.ts` for unit tests, `*.integration.spec.ts` for Prisma-backed integration tests, `*.e2e.spec.ts` for full HTTP tests through the Nest app. All three run in the same `pnpm --filter @aureus-v1/api run test` invocation (Jest `testRegex` matches any `*.spec.ts`).

Cross-cutting concerns live in `apps/api/src/common/` (filters, guards, interceptors, middleware) and `apps/api/src/config/` (env validation, feature scope — see below). `main.ts` wires global concerns: Helmet, CORS (origin from `CORS_ORIGIN`), a global `AllExceptionsFilter` (maps Prisma error codes to HTTP statuses), global `ValidationPipe`, conditional Swagger (`/api/docs`), and graceful shutdown.

### Environment validation (`apps/api/src/config/env.validation.ts`)

A single Joi schema validates `process.env` at boot. Several variables are optional in development/test but become **required, or reject unsafe defaults, once `NODE_ENV=production`** via `.when('NODE_ENV', ...)` rules — e.g. `CORS_ORIGIN` may not be `'*'`, `AI_PROVIDER` may not be `'stub'`, and whichever AI provider is selected needs its API key. This is intentional: a misconfigured production deploy should fail loudly at boot rather than silently degrade (e.g. serving the literal `"[stub AI response]"` placeholder to a member, or leaving CORS wide open). When touching this file, preserve that fail-loud-in-production pattern rather than relaxing it.

### V1 feature scope

`apps/api/src/config/v1-feature-scope.ts` is the source of truth for which member-facing domains are reachable in the current pilot (`voice`, `academy`, `pods`). It is **mirrored by hand** in `apps/web/lib/config/v1-feature-scope.ts` — there is no shared runtime import between the two apps, so both must be updated together. `V1ScopeMiddleware` enforces the API-side gating; Academy/Pods e2e suites deliberately flip their own flag on for the duration of their run to prove the underlying domain still works even while gated off by default.

### Frontend (`apps/web`)

Next.js App Router under `apps/web/app/`, with most member-facing routes grouped under `app/(member)/` (one directory per feature area — `journey`, `opportunities`, `resources`, `stewardship` UI, `academy`, `pods`, `city-sheet`, `steward` conversation UI, etc.). `apps/web/design-system/` holds the shared UI/design-system layer; `apps/web/state/` holds client state. Tests are Jest + Testing Library (`jest-axe` is available for accessibility assertions), colocated as `*.test.tsx`.

### Database

One Prisma schema at `prisma/schema.prisma` for the whole platform (not per-app). Use `npx prisma generate` after pulling schema changes and `npx prisma migrate dev` to create/apply migrations locally; CI uses `prisma migrate deploy`. `apps/api/prisma/seed.ts` seeds data. `scripts/` at the repo root has `db-backup.sh`, `db-migrate-deploy.sh`, `db-restore.sh` for operational use.

## Documentation hierarchy — read before making non-trivial changes

This repository governs itself through a layered document hierarchy, defined in `docs/00-foundation/FOUNDATION-003 — Canon Hierarchy.md`: Foundation → Constitution → Governance → Member Experience → Product Architecture (`docs/product-architecture/`, PA-001–020) → Engineering (ADRs in `docs/architecture/`, Implementation Constitution IC-001–020 in `docs/implementation/`) → Operations → Execution (Work Orders, PRs). **Lower levels may expand on higher levels but must never contradict them**; if two documents conflict, the higher one governs, and unresolved conflicts should be escalated rather than guessed at.

For current cross-repository product work, use this execution chain:

- `docs/founder/FOUNDER-CONTROL-CENTER.md` — current repository baselines, active work order, AI role separation, and Founder decision lane. Verify its SHAs and status claims before relying on them; update it when the active work order or accepted baseline changes.
- `docs/product-first/PRODUCT-V1-EXECUTION-ORDER.md` — the active product-first three-repository execution registry.
- GitHub Issue #95 — the ordered Founder-walkthrough blocker ledger and current acceptance checklist until it is explicitly superseded.
- The relevant work-order branch, complete diff against current `main`, exact head SHA, and CI evidence — repository documents never replace live Git evidence.

The First Members track remains preserved in `docs/launch/`, but it is not the active cross-repository product queue:

- `LAUNCH-001-First-Members.md` — the Founder-approved First Members launch blueprint.
- `WORKORDERS.md` — that track's execution registry.
- `SCOREBOARD.md` — a preserved First Members status dashboard whose header explicitly warns that it is not current cross-repository product status.
- `EXECUTION-AUTHORITY.md` — precedence within the First Members launch track and the historical reconciliation record.
- `docs/releases/version-1-readiness.md` — frozen historical evidence, never a live status source.

`docs/ai/REPOSITORY_STEWARD.md` defines explicit operating rules for any AI session acting on this repository. Before making a change, verify current Git state, identify the applicable track and work order, read the relevant architecture and acceptance criteria, and inspect existing implementation before proposing anything. Never expand scope, duplicate existing work, fabricate evidence, or infer merge/deploy/Founder authority from a draft PR or model conclusion.

Role separation is mandatory. A Constructor may implement and prepare evidence but may not self-certify. An independent Reviewer must form its own view from the requirement, full diff, tests, and exact SHA; it must not silently become a co-author of the change it is reviewing. CI is mechanical evidence, not production or UX acceptance. Merge, deploy, credentials, financial commitments, and other consequential external actions remain explicitly human-gated.

Domain-level design decisions are recorded as ADRs in `docs/architecture/` (`ADR-003` through `ADR-017`, one per major domain — Users, Opportunity Engine, Auth, Resource Directory, Stewardship, Communication, Knowledge, Academy, AI Intelligence Engine, Pods, Voice, etc.). Check for an existing ADR before introducing a new architectural pattern in a domain that already has one.

The root `README.md`'s "Implemented Domains" table is explicitly stale (frozen early in the project) — do not treat it as current status; use the product-first chain, live Git evidence, and the applicable work order instead.
