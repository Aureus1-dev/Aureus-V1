# AUREUS V1 — TECHNICAL DEBT REGISTER

| Field | Value |
|---|---|
| Audit Designation | WO-001 Technical Debt Register |
| Audit Date | 2026-07-14 |
| Audited Branch | `origin/main` (commit `0d09bc1`) |
| Governing Standards | IC-002, IC-006, IC-007, IC-013 |
| Total Debt Items | 28 |

---

## Debt Classification

Each debt item is classified by:

- **Priority** P1 (resolve before production) → P4 (low-impact cleanup)
- **Type**: Structural · Missing Implementation · Documentation · Build · Security
- **Source**: How the debt was incurred

---

## P1 — Resolve Before Production

These items constitute blockers. The platform cannot responsibly serve real users while any P1 item remains open.

---

### TD-001

| Field | Value |
|---|---|
| **ID** | TD-001 |
| **Priority** | P1 |
| **Type** | Structural |
| **Title** | Four git blobs whose filename is the entire document content |
| **Source** | GitHub web editor committed documents by pasting content into the filename field |
| **Description** | Four objects in the git tree have filenames that are kilobytes long, containing full document prose including newlines and em-dashes. They cannot be opened by any filesystem tool. `IC-004-Work-Order-Standard.md` does not exist at its canonical path as a result. |
| **Evidence** | REPO-001 (PLATFORM_AUDIT.md) |
| **Affected Files** | 4 root-level blobs |
| **Compliance Impact** | IC-004 is inaccessible; all documents citing it as authority reference a non-file |
| **Recommended Action** | `git rm` all four blobs; recreate IC-004 at canonical path; if possible squash or note in commit history |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-002

| Field | Value |
|---|---|
| **ID** | TD-002 |
| **Priority** | P1 |
| **Type** | Structural |
| **Title** | 27 files in `docs/docs/` double-nested path |
| **Source** | Git commit used `docs/` as both the repository subdirectory and the content path |
| **Description** | 27 files including the full branding book (BRAND-002 through BRAND-016), constitution articles, communications SOPs, product-architecture maps, and a session record are at an invalid double-nested path. |
| **Evidence** | REPO-002 |
| **Affected Files** | `docs/docs/branding/` (16), `docs/docs/constitution/` (5), `docs/docs/communications/sops/` (3), `docs/docs/product-architecture/` (2), `docs/docs/sessions/` (1) |
| **Compliance Impact** | IC-013 repository organization standard is violated |
| **Recommended Action** | Determine canonical version for each file; move to correct path; delete invalid copies |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-003

| Field | Value |
|---|---|
| **ID** | TD-003 |
| **Priority** | P1 |
| **Type** | Structural |
| **Title** | 4 constitution articles at triple-nested `docs/constitution/docs/constitution/` path |
| **Source** | Git commit included the destination path string within the source path |
| **Description** | OAS-003 through OAS-006 are at an inaccessible triple-nested path |
| **Evidence** | REPO-003 |
| **Affected Files** | 4 files |
| **Compliance Impact** | Constitutional articles are inaccessible |
| **Recommended Action** | Remove the four files; verify canonical versions exist at correct path |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-004

| Field | Value |
|---|---|
| **ID** | TD-004 |
| **Priority** | P1 |
| **Type** | Missing Implementation |
| **Title** | Zero tests on main — IC-007 compliance is zero |
| **Source** | WO-001 and WO-002 merged without satisfying IC-007 (Testing Standard) |
| **Description** | No test files, test runner, or test configuration exist on main. The entire test infrastructure (25 unit tests, jest config) is on the unmerged WO-003 branch. |
| **Evidence** | TEST-001 |
| **Affected Files** | All source files |
| **Compliance Impact** | Material breach of IC-006 (DoD) and IC-007 (Testing Standard) |
| **Recommended Action** | 1. Merge WO-003. 2. Add `test` task to Turbo pipeline. 3. Enforce minimum coverage thresholds. |
| **Estimated Effort** | 1–4 hours (merge) |
| **Confidence** | Confirmed |

---

### TD-005

| Field | Value |
|---|---|
| **ID** | TD-005 |
| **Priority** | P1 |
| **Type** | Missing Implementation |
| **Title** | No CI/CD pipeline — merges land on main without automated verification |
| **Source** | Not yet implemented; two PRs merged with no automated checks |
| **Description** | No `.github/workflows/` directory exists. PR #1 (WO-001) and PR #3 (WO-002) were both merged without automated type-check, lint, test, or build verification. |
| **Evidence** | TEST-002 |
| **Affected Files** | Repository root |
| **Compliance Impact** | IC-011 (Release Standard), IC-009 (Change Control) require verified builds before merge |
| **Recommended Action** | Create `.github/workflows/ci.yml`: install → type-check → lint → test → build |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-006

| Field | Value |
|---|---|
| **ID** | TD-006 |
| **Priority** | P1 |
| **Type** | Missing Implementation |
| **Title** | No authentication exists — all future endpoints will be public |
| **Source** | Not yet implemented; scheduled for a future Work Order |
| **Description** | Zero authentication (JWT, session, OAuth, API key) is implemented or installed. Every endpoint added to the API will be publicly accessible. |
| **Evidence** | BE-001, SEC-001 |
| **Affected Files** | `apps/api/` |
| **Compliance Impact** | IC-015 (Security Engineering Standard) requires authentication |
| **Recommended Action** | Create and execute an authentication Work Order before any user-facing feature goes live |
| **Estimated Effort** | 2–3 days |
| **Confidence** | Confirmed |

---

### TD-007

| Field | Value |
|---|---|
| **ID** | TD-007 |
| **Priority** | P1 |
| **Type** | Missing Implementation |
| **Title** | Complete User Module (WO-003) stranded on unmerged branch |
| **Source** | WO-003 was completed but merge conflicts with main were not resolved before other merges landed |
| **Description** | `cursor/wo-003-user-module-336b` contains 16 source files, jest config, 25 unit tests, Swagger, and an ADR — the only substantive application code ever written. It is not on main. |
| **Evidence** | ARCH-003 |
| **Affected Files** | `cursor/wo-003-user-module-336b` |
| **Compliance Impact** | All code quality standards (IC-002, IC-006, IC-007) are satisfied by WO-003 but inaccessible |
| **Recommended Action** | Rebase onto current main; resolve tsconfig and package.json conflicts; merge |
| **Estimated Effort** | 1 day |
| **Confidence** | Confirmed |

---

### TD-008

| Field | Value |
|---|---|
| **ID** | TD-008 |
| **Priority** | P1 |
| **Type** | Security |
| **Title** | No CORS policy, no security headers (Helmet), no rate limiting |
| **Source** | Placeholder API stub; these were not added |
| **Description** | The API will accept cross-origin requests from any origin. HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options) are not set. No rate limiting protects against abuse. |
| **Evidence** | BE-004 |
| **Affected Files** | `apps/api/src/main.ts` |
| **Compliance Impact** | IC-015 Security Engineering Standard |
| **Recommended Action** | `app.enableCors({ origin: process.env.CORS_ORIGIN })`, `app.use(helmet())`, `@nestjs/throttler` |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-009

| Field | Value |
|---|---|
| **ID** | TD-009 |
| **Priority** | P1 |
| **Type** | Security |
| **Title** | Soft-delete + email unique constraint blocks re-registration |
| **Source** | WO-002 migration creates a full-table unique index without a WHERE clause |
| **Description** | `User.email` has an unconditional unique index. Soft-deleted users block re-registration with the same email. |
| **Evidence** | DB-001 |
| **Affected Files** | `prisma/migrations/20260711064539_add_user_email_status/migration.sql` |
| **Compliance Impact** | Data lifecycle integrity |
| **Recommended Action** | Migration to replace with partial unique index: `WHERE "deletedAt" IS NULL` |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

## P2 — Resolve Before Scale

These items do not block MVP launch but will cause significant problems as the team or user base grows.

---

### TD-010

| Field | Value |
|---|---|
| **ID** | TD-010 |
| **Priority** | P2 |
| **Type** | Structural |
| **Title** | Prisma schema at repository root instead of `apps/api/` |
| **Source** | WO-002 was built before WO-001 monorepo existed; merge conflict resolution landed files at root |
| **Description** | `prisma/`, `prisma.config.ts`, and all migrations are at the monorepo root. `@prisma/client` is in the root `package.json` rather than `apps/api/package.json`. |
| **Evidence** | REPO-006, DEP-002 |
| **Affected Files** | `prisma/`, `prisma.config.ts`, root `package.json` |
| **Recommended Action** | Move to `apps/api/`; update `package.json` dependency placement |
| **Estimated Effort** | 1 day |
| **Confidence** | Confirmed |

---

### TD-011

| Field | Value |
|---|---|
| **ID** | TD-011 |
| **Priority** | P2 |
| **Type** | Build |
| **Title** | 5 build artifacts committed; `*.tsbuildinfo` not gitignored |
| **Source** | `.gitignore` excludes `/dist` but not in-package compiled outputs or `.tsbuildinfo` |
| **Description** | `packages/shared/src/index.js`, `index.js.map`, `index.d.ts`, `apps/api/tsconfig.tsbuildinfo`, `packages/shared/tsconfig.tsbuildinfo` are tracked in git. |
| **Evidence** | REPO-004, PERF-001 |
| **Affected Files** | 5 files listed |
| **Recommended Action** | Update `.gitignore`; `git rm --cached` the 5 files |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

### TD-012

| Field | Value |
|---|---|
| **ID** | TD-012 |
| **Priority** | P2 |
| **Type** | Build |
| **Title** | ESLint declared in `apps/api` scripts but not installed anywhere |
| **Source** | WO-001 added a `lint` script; ESLint was never installed |
| **Description** | `"lint": "eslint . --ext .ts"` will always fail. `turbo run lint` fails. IC-002 Article IV (linting rules) is unenforceable. |
| **Evidence** | DEP-001 |
| **Affected Files** | `apps/api/package.json` |
| **Recommended Action** | Install eslint + @typescript-eslint; create eslint config |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-013

| Field | Value |
|---|---|
| **ID** | TD-013 |
| **Priority** | P2 |
| **Type** | Structural |
| **Title** | `apps/api/tsconfig.json` rootDir points to monorepo root — non-standard build output |
| **Source** | Deliberate but non-standard approach to include `packages/shared/src` directly |
| **Description** | `"rootDir": "../.."` causes TypeScript to output to `dist/apps/api/src/main.js` instead of `dist/main.js`. `nest build` will not work correctly with this configuration. |
| **Evidence** | ARCH-002 |
| **Affected Files** | `apps/api/tsconfig.json` |
| **Recommended Action** | Set `rootDir: "src"`; handle shared via pnpm workspace resolution |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-014

| Field | Value |
|---|---|
| **ID** | TD-014 |
| **Priority** | P2 |
| **Type** | Missing Implementation |
| **Title** | No global exception filter; Prisma errors surface as unhandled 500s |
| **Source** | Placeholder API never had error handling added |
| **Description** | Prisma error codes (P2002: unique constraint, P2025: not found) are not mapped to HTTP status codes. Error detail may leak to clients. |
| **Evidence** | BE-005 |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | Implement global `HttpExceptionFilter` with Prisma error code mapping |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-015

| Field | Value |
|---|---|
| **ID** | TD-015 |
| **Priority** | P2 |
| **Type** | Missing Implementation |
| **Title** | `ValidationPipe` not configured; request bodies pass through unvalidated |
| **Source** | Placeholder API; `class-validator` not even installed in `apps/api` |
| **Description** | No input validation pipe is active. Any future endpoint will receive raw, unvalidated input. |
| **Evidence** | BE-006 |
| **Affected Files** | `apps/api/src/main.ts`, `apps/api/package.json` |
| **Recommended Action** | Install `class-validator`, `class-transformer`; add global ValidationPipe |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-016

| Field | Value |
|---|---|
| **ID** | TD-016 |
| **Priority** | P2 |
| **Type** | Security |
| **Title** | `DATABASE_URL` not validated at startup; app starts silently misconfigured |
| **Source** | No startup validation added to `prisma.config.ts` or `main.ts` |
| **Description** | Missing `DATABASE_URL` causes failure only at the first database operation, not at startup. |
| **Evidence** | SEC-001, DB-004 |
| **Affected Files** | `prisma.config.ts`, `apps/api/src/main.ts` |
| **Recommended Action** | Add early env validation; fail-fast on missing `DATABASE_URL` |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

### TD-017

| Field | Value |
|---|---|
| **ID** | TD-017 |
| **Priority** | P2 |
| **Type** | Structural |
| **Title** | Port hardcoded to 3001 in API bootstrap |
| **Source** | Placeholder implementation; environment-driven configuration not added |
| **Description** | `await app.listen(3001)` — port is not driven by `process.env.PORT` |
| **Evidence** | BE-003 |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | `await app.listen(parseInt(process.env.PORT ?? '3001', 10))` |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

### TD-018

| Field | Value |
|---|---|
| **ID** | TD-018 |
| **Priority** | P2 |
| **Type** | Documentation |
| **Title** | 109 governance documents share duplicate designation numbers across 47 groups |
| **Source** | Multiple generations of document creation sessions without version control discipline |
| **Description** | Finance, Legal, Operations, and Technology OAS series each have 2–3 competing files per designation number. No canonical version is determinable without external context. |
| **Evidence** | DOC-001 |
| **Affected Files** | ~109 files across four OAS series |
| **Recommended Action** | Governance review; identify canonical versions; delete superseded copies; enforce one-file-per-designation |
| **Estimated Effort** | More than 1 week |
| **Confidence** | Confirmed |

---

## P3 — Resolve Within Next 5 Work Orders

These items cause friction but do not block launches or create security risk at current scale.

---

### TD-019

| Field | Value |
|---|---|
| **ID** | TD-019 |
| **Priority** | P3 |
| **Type** | Documentation |
| **Title** | No ADRs on main — architectural decisions are undocumented |
| **Source** | ADR for WO-003 exists on unmerged branch; no others exist |
| **Description** | IC-013 specifies `/docs` shall contain ADRs. None exist on main. ORM choice, monorepo tooling, database schema decisions are undocumented. |
| **Evidence** | DOC-003 |
| **Affected Files** | `docs/` |
| **Recommended Action** | Create `docs/architecture/` directory; backfill ADRs for existing decisions |
| **Estimated Effort** | 1 day |
| **Confidence** | Confirmed |

---

### TD-020

| Field | Value |
|---|---|
| **ID** | TD-020 |
| **Priority** | P3 |
| **Type** | Documentation |
| **Title** | `README.md` insufficient for developer onboarding |
| **Source** | WO-001 created minimal README; subsequent WOs did not expand it |
| **Description** | 12 lines covering only `pnpm install && pnpm dev`. No DATABASE_URL setup, migration instructions, test commands, or architecture explanation. |
| **Evidence** | DOC-004 |
| **Affected Files** | `README.md` |
| **Recommended Action** | Expand README with setup, env config, migrations, testing, and build instructions |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-021

| Field | Value |
|---|---|
| **ID** | TD-021 |
| **Priority** | P3 |
| **Type** | Structural |
| **Title** | IC-013 mandatory directories (`infrastructure/`, `scripts/`) absent |
| **Source** | Not yet created; no Work Order has addressed repository structure post-WO-001 |
| **Description** | IC-013 Article II lists required top-level directories; `infrastructure/`, `scripts/` are absent and applicable |
| **Evidence** | REPO-005 |
| **Affected Files** | Repository root |
| **Recommended Action** | Create canonical directories; move Prisma out of root as part of this work |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-022

| Field | Value |
|---|---|
| **ID** | TD-022 |
| **Priority** | P3 |
| **Type** | Missing Implementation |
| **Title** | No API versioning configured |
| **Source** | Not yet implemented |
| **Description** | NestJS versioning not enabled. Once any endpoint is stabilized and used by a client, breaking changes will have no migration path. |
| **Evidence** | API-002 |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

### TD-023

| Field | Value |
|---|---|
| **ID** | TD-023 |
| **Priority** | P3 |
| **Type** | Missing Implementation |
| **Title** | No health check endpoint |
| **Source** | Not yet implemented |
| **Description** | No `GET /health` or readiness probe. Containerized deployments will not be able to verify the API is alive. |
| **Evidence** | API-003 |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | Add `@nestjs/terminus` health check with DB connectivity status |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-024

| Field | Value |
|---|---|
| **ID** | TD-024 |
| **Priority** | P3 |
| **Type** | Missing Implementation |
| **Title** | `Profile` model has no payload fields |
| **Source** | WO-002 created model structure without business-required fields |
| **Description** | Profile stores only timestamps and userId FK. No profile data. Unusable for any product feature. |
| **Evidence** | DB-002 |
| **Affected Files** | `prisma/schema.prisma` |
| **Recommended Action** | Design and add required profile fields in a dedicated Work Order migration |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-025

| Field | Value |
|---|---|
| **ID** | TD-025 |
| **Priority** | P3 |
| **Type** | Build |
| **Title** | No Prettier configuration despite `prettier` in dependencies |
| **Source** | WO-001 added prettier; configuration file never created |
| **Description** | `prettier` with no config runs with all defaults. Formatting is unenforced. IC-002 Article IV requires formatting rules be followed. |
| **Evidence** | DEP-003 |
| **Affected Files** | Root `package.json` |
| **Recommended Action** | Add `prettier.config.js`; add `format` script |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

## P4 — Low Priority / Cleanup

---

### TD-026

| Field | Value |
|---|---|
| **ID** | TD-026 |
| **Priority** | P4 |
| **Type** | Structural |
| **Title** | OAS constitution articles split across three directory trees |
| **Source** | Multiple commit sessions created articles in different locations |
| **Description** | `docs/constitution/`, `docs/docs/constitution/`, and `docs/constitution/docs/constitution/` each contain constitution articles with no single complete sequential set. OAS-001 exists only as a draft. |
| **Evidence** | DOC-005 |
| **Recommended Action** | Consolidate into `docs/constitution/`; canonize OAS-001 |
| **Estimated Effort** | 1–4 hours |
| **Confidence** | Confirmed |

---

### TD-027

| Field | Value |
|---|---|
| **ID** | TD-027 |
| **Priority** | P4 |
| **Type** | Build |
| **Title** | `tsconfig.base.json` includes `moduleResolution: "Bundler"` which `apps/api` must always override |
| **Source** | Base config was written for Next.js (Bundler) without accounting for NestJS (node) |
| **Description** | Every Node.js package added to the workspace must override `moduleResolution` or compilation will silently fail. |
| **Evidence** | ARCH-004 |
| **Affected Files** | `tsconfig.base.json` |
| **Recommended Action** | Remove `moduleResolution` from base config; each package declares its own |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

### TD-028

| Field | Value |
|---|---|
| **ID** | TD-028 |
| **Priority** | P4 |
| **Type** | Structural |
| **Title** | `apps/web/next-env.d.ts` and `apps/web/app/page.tsx` inline style committed |
| **Source** | Auto-generated by Next.js; inline style from placeholder page |
| **Description** | `next-env.d.ts` is auto-generated and should be gitignored. `page.tsx` uses `style={{ padding: '2rem', fontFamily: 'sans-serif' }}` inline — inconsistent with the `globals.css` approach. |
| **Evidence** | REPO-007, FE-002 |
| **Affected Files** | `apps/web/next-env.d.ts`, `apps/web/app/page.tsx` |
| **Recommended Action** | Add `next-env.d.ts` to gitignore; move inline styles to CSS |
| **Estimated Effort** | Less than 1 hour |
| **Confidence** | Confirmed |

---

## Recommended Paydown Order

Execute in this sequence for maximum risk reduction:

```
Sprint 0 — Immediate Fixes (< 1 day total)
  TD-001  Fix blob-as-filename commits
  TD-002  Fix docs/docs/ nested path
  TD-003  Fix docs/constitution/docs/constitution/ path
  TD-011  Untrack build artifacts; update .gitignore

Sprint 1 — Enable Development (2–3 days)
  TD-007  Merge WO-003 User Module to main
  TD-005  Create CI/CD pipeline
  TD-004  Ensure tests run in CI
  TD-012  Install and configure ESLint
  TD-025  Add Prettier config

Sprint 2 — Security Baseline (2–3 days)
  TD-006  Implement authentication Work Order
  TD-008  Add CORS, Helmet, rate limiting
  TD-009  Fix email unique constraint (partial index migration)
  TD-016  Add startup env validation

Sprint 3 — Architecture Cleanup (1–2 days)
  TD-010  Move Prisma to apps/api/
  TD-013  Fix apps/api/tsconfig.json rootDir
  TD-014  Add global exception filter
  TD-015  Install class-validator; add ValidationPipe
  TD-017  Drive port from process.env.PORT
  TD-022  Enable API versioning
  TD-023  Add health check endpoint

Sprint 4 — Quality and Documentation (1 week)
  TD-018  Governance review of duplicate OAS documents
  TD-019  Create ADR directory; backfill decisions
  TD-020  Expand README
  TD-021  Create infrastructure/, scripts/ directories
  TD-024  Add Profile model fields (migration)

Ongoing
  TD-026  Consolidate constitution tree
  TD-027  Fix tsconfig.base.json moduleResolution
  TD-028  Minor cleanup items
```

---

## Debt Summary Table

| ID | Priority | Type | Title | Effort |
|---|---|---|---|---|
| TD-001 | P1 | Structural | Blob-as-filename commits | 1–4 hours |
| TD-002 | P1 | Structural | docs/docs/ nested path | 1–4 hours |
| TD-003 | P1 | Structural | Triple-nested constitution path | 1–4 hours |
| TD-004 | P1 | Missing Impl | Zero tests on main | 1–4 hours |
| TD-005 | P1 | Missing Impl | No CI/CD pipeline | 1–4 hours |
| TD-006 | P1 | Missing Impl | No authentication | 2–3 days |
| TD-007 | P1 | Missing Impl | WO-003 stranded unmerged | 1 day |
| TD-008 | P1 | Security | No CORS / Helmet / rate limiting | 1–4 hours |
| TD-009 | P1 | Security | Email unique index covers deleted rows | 1–4 hours |
| TD-010 | P2 | Structural | Prisma at wrong monorepo level | 1 day |
| TD-011 | P2 | Build | Build artifacts committed | < 1 hour |
| TD-012 | P2 | Build | ESLint not installed | 1–4 hours |
| TD-013 | P2 | Structural | tsconfig rootDir points to monorepo root | 1–4 hours |
| TD-014 | P2 | Missing Impl | No global exception filter | 1–4 hours |
| TD-015 | P2 | Missing Impl | ValidationPipe not configured | 1–4 hours |
| TD-016 | P2 | Security | DATABASE_URL not validated at startup | < 1 hour |
| TD-017 | P2 | Structural | Port hardcoded to 3001 | < 1 hour |
| TD-018 | P2 | Documentation | 109 duplicate OAS documents (47 groups) | > 1 week |
| TD-019 | P3 | Documentation | No ADRs on main | 1 day |
| TD-020 | P3 | Documentation | README insufficient for onboarding | 1–4 hours |
| TD-021 | P3 | Structural | Missing IC-013 directories | 1–4 hours |
| TD-022 | P3 | Missing Impl | No API versioning | < 1 hour |
| TD-023 | P3 | Missing Impl | No health check endpoint | 1–4 hours |
| TD-024 | P3 | Missing Impl | Profile model has no payload fields | 1–4 hours |
| TD-025 | P3 | Build | No Prettier configuration | < 1 hour |
| TD-026 | P4 | Structural | Constitution split across three trees | 1–4 hours |
| TD-027 | P4 | Build | tsconfig.base moduleResolution mismatch | < 1 hour |
| TD-028 | P4 | Structural | Minor cleanup (next-env, inline style) | < 1 hour |
