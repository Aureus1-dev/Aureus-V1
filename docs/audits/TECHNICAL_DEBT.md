# Aureus V1 — Technical Debt Register

| Field | Value |
|---|---|
| Audit Date | 2026-07-14 |
| Branch | `main` (commit `0d09bc1`) |
| Total Debt Items | 32 |

---

## Priority 1 — Critical Debt (Must Resolve Before First Real Release)

---

### TD-001 — Blob-as-Filename: Three files committed with content as filename

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Repository Health |
| **Description** | Three objects exist in the git tree whose "filename" is the entire document content — thousands of characters including newlines. Git accepted these as valid blob entries. They cannot be opened by any standard tool, cannot be linted, and pollute `git ls-files`. They are: (1) `OAS-COM-101 — Communications and Public Engagement Operations SOP`, (2) `IC-004 — Work Order Standard`, (3) `OAS-LEG-001 — Legal and Regulatory Governance Charter`. |
| **Affected Files** | Root of `docs/` and repo root |
| **Recommended Action** | `git rm` each blob, create proper files at canonical paths, rewrite git history or accept in a clean-up commit |
| **Estimated Effort** | 2 hours |

---

### TD-002 — `docs/docs/` double-nested directory: 27 misplaced files

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Documentation Structure |
| **Description** | 27 files exist under `docs/docs/` — a path that should not exist. This includes brand documents, constitution articles, communications SOPs, product architecture docs, and session records. These appear to be duplicates or misfiled versions of documents that should live directly under `docs/`. |
| **Affected Files** | `docs/docs/branding/` (16 files), `docs/docs/constitution/` (5 files), `docs/docs/communications/sops/` (3 files), `docs/docs/product-architecture/` (2 files), `docs/docs/sessions/` (1 file) |
| **Recommended Action** | Audit each file: if canonical version exists in correct location, delete the `docs/docs/` copy; if not, move it to the correct path |
| **Estimated Effort** | 4 hours |

---

### TD-003 — `docs/constitution/docs/constitution/` triple-nested path

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Documentation Structure |
| **Description** | Four constitution articles (OAS-003 through OAS-006) were committed under `docs/constitution/docs/constitution/` — a path created by an incorrect git commit that included the destination path in the source path. |
| **Affected Files** | `docs/constitution/docs/constitution/OAS-003-*`, `OAS-004-*`, `OAS-005-*`, `OAS-006-*` |
| **Recommended Action** | Delete the incorrectly nested copies; verify canonical versions exist at `docs/constitution/OAS-003-*` etc. |
| **Estimated Effort** | 1 hour |

---

### TD-004 — Zero tests on main branch

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Testing |
| **Description** | No test files, no test runner configuration, no CI pipeline. 25 unit tests with 100% coverage exist on `cursor/wo-003-user-module-336b` but are not merged. The codebase cannot be verified to function correctly. |
| **Affected Files** | All source files in `apps/api/` and `apps/web/` |
| **Recommended Action** | 1. Merge WO-003 branch to bring existing tests to main. 2. Add Jest + ts-jest to root workspace. 3. Create CI pipeline with GitHub Actions. |
| **Estimated Effort** | 8 hours |

---

### TD-005 — No CI/CD pipeline

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Deployment |
| **Description** | No `.github/workflows/` directory. No build, lint, type-check, or test automation. Any broken commit can land on main undetected. |
| **Affected Files** | None (directory does not exist) |
| **Recommended Action** | Create `.github/workflows/ci.yml` with: install → build → type-check → lint → test |
| **Estimated Effort** | 4 hours |

---

### TD-006 — No authentication or authorisation

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Security |
| **Description** | Zero authentication or authorisation exists anywhere in the codebase. When the API grows, all endpoints will be publicly accessible unless this is built first. JWT, guards, role-based access — none exist. |
| **Affected Files** | `apps/api/src/main.ts` (entire backend) |
| **Recommended Action** | Implement auth as a dedicated work order before any user-facing endpoint goes to production |
| **Estimated Effort** | 3–5 days |

---

### TD-007 — WO-003 User Module stranded on unmerged branch

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Category** | Architecture |
| **Description** | `cursor/wo-003-user-module-336b` contains a complete, tested User Module (19 files, 25 tests, Swagger, ADR). It is not on `main`. Main's API is a 24-line stub. The work is done but inaccessible. |
| **Affected Files** | `cursor/wo-003-user-module-336b` |
| **Recommended Action** | Resolve merge conflicts (WO-003 was not rebased after WO-002 merged to main) and merge to main. |
| **Estimated Effort** | 2–4 hours |

---

## Priority 2 — High Debt (Resolve Before Scale)

---

### TD-008 — Prisma schema at repository root (wrong location)

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Architecture |
| **Description** | `prisma/`, `prisma.config.ts`, and all migrations live at the monorepo root. In a pnpm workspace, database concerns should live in the consuming package (`apps/api`) or a dedicated `packages/db` package. The current structure breaks the workspace boundaries and puts Prisma runtime deps (`@prisma/client`, `dotenv`) in the root `package.json`. |
| **Affected Files** | `prisma/`, `prisma.config.ts`, root `package.json` |
| **Recommended Action** | Move Prisma to `apps/api/` OR create `packages/db` with subpath exports |
| **Estimated Effort** | 4 hours |

---

### TD-009 — Committed build artifacts

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Repository Health |
| **Description** | Compiled TypeScript outputs and incremental build caches are tracked in git: `packages/shared/src/index.js`, `index.js.map`, `index.d.ts`, `apps/api/tsconfig.tsbuildinfo`, `packages/shared/tsconfig.tsbuildinfo`. These will cause false diffs and pollute the repository history. |
| **Affected Files** | 5 files listed above |
| **Recommended Action** | Add to `.gitignore`: `*.tsbuildinfo`, `packages/*/src/*.js`, `packages/*/src/*.js.map`, `packages/*/src/*.d.ts`. Then `git rm --cached` to untrack. |
| **Estimated Effort** | 1 hour |

---

### TD-010 — ESLint declared but not installed

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Code Quality |
| **Description** | `apps/api/package.json` declares `"lint": "eslint . --ext .ts"` but ESLint and `@typescript-eslint/*` are not installed in any package. Running `pnpm lint` will fail with "command not found". |
| **Affected Files** | `apps/api/package.json` |
| **Recommended Action** | Install `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, and create a root `eslint.config.js` |
| **Estimated Effort** | 2 hours |

---

### TD-011 — `Profile` model has no payload fields

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Database |
| **Description** | The `Profile` model contains only `id`, `createdAt`, `updatedAt`, `deletedAt`, and `userId`. It has no actual profile data (display name, avatar URL, bio, location, etc.). The model is currently useless as a data store. |
| **Affected Files** | `prisma/schema.prisma` |
| **Recommended Action** | Add required profile fields in a new migration |
| **Estimated Effort** | 2 hours |

---

### TD-012 — Soft delete + unique email creates re-registration blocker

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Database |
| **Description** | `User.email` has a `@unique` constraint that covers all rows, including soft-deleted users. A user who is soft-deleted cannot re-register with the same email. This was documented in ADR-003 but not resolved. |
| **Affected Files** | `prisma/schema.prisma`, migration 20260711064539 |
| **Recommended Action** | Create a migration that drops the full unique index and adds a partial unique index: `CREATE UNIQUE INDEX "User_email_active_key" ON "User"("email") WHERE "deletedAt" IS NULL;` |
| **Estimated Effort** | 2 hours |

---

### TD-013 — `apps/api/tsconfig.json` rootDir points to monorepo root

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Build |
| **Description** | `"rootDir": "../.."` means TypeScript is told the source root is two levels above `apps/api/`. This produces unexpected output paths and will likely conflict with `nest build`. The `start` script references `dist/apps/api/src/main.js` suggesting awareness of this, but it is fragile and non-standard. |
| **Affected Files** | `apps/api/tsconfig.json` |
| **Recommended Action** | Set `rootDir: "src"` (or omit it) and update `outDir` and `start` script accordingly |
| **Estimated Effort** | 1 hour |

---

### TD-014 — `process.env.DATABASE_URL` never validated

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Reliability |
| **Description** | `prisma.config.ts` reads `process.env["DATABASE_URL"]` without any validation. If the variable is unset or malformed, the database connection will fail at runtime with a cryptic error. |
| **Affected Files** | `prisma.config.ts` |
| **Recommended Action** | Add startup validation (e.g., `@nestjs/config` with Joi schema, or `zod` for env parsing) |
| **Estimated Effort** | 2 hours |

---

### TD-015 — No CORS, Helmet, or rate limiting

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Security |
| **Description** | The API has no CORS policy, HTTP security headers (Helmet), or rate limiting. Combining these with zero auth makes the API completely open. |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | Add `app.enableCors()`, `app.use(helmet())`, and `@nestjs/throttler` before any routes go live |
| **Estimated Effort** | 2 hours |

---

### TD-016 — No error/exception filter

| Field | Detail |
|---|---|
| **Severity** | High |
| **Category** | Reliability |
| **Description** | No global exception filter. Unhandled exceptions will return raw stack traces to clients in development, or 500 errors with no structured response in production. |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | Add a global `HttpExceptionFilter` and logging interceptor |
| **Estimated Effort** | 2 hours |

---

## Priority 3 — Medium Debt (Resolve Within Next 3 Work Orders)

---

### TD-017 — Massive documentation duplication across OAS series

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Category** | Documentation |
| **Description** | Multiple OAS document series have 2-3 competing versions at the same document number: Finance (OAS-FIN-001 through 005, SOPs 101-104), Legal (OAS-LEG-001, SOPs 101-104), Operations (OAS-OPS-001 through 010, SOPs 101+). The correct canonical version is ambiguous. |
| **Affected Files** | ~50 files across `docs/finance/`, `docs/legal/`, `docs/operations/` |
| **Recommended Action** | Governance review: identify canonical versions, delete superseded files, enforce version control within each document |
| **Estimated Effort** | 8 hours (human-led) |

---

### TD-018 — No Prettier configuration

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Category** | Code Quality |
| **Description** | `prettier` is in root `devDependencies` but no `.prettierrc` or `prettier.config.js` exists. Code formatting is unenforced. |
| **Affected Files** | Root `package.json` |
| **Recommended Action** | Add `prettier.config.js` with project standards; add `format` script to package.json |
| **Estimated Effort** | 30 minutes |

---

### TD-019 — Domain models missing business-relevant fields

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Category** | Database |
| **Description** | `Goal`, `Journey`, `Milestone`, and `Task` are all missing fields that any real product would require: description, dueDate, completedAt, notes, assignedTo, etc. The schema is a structural skeleton with enums and relationships only. |
| **Affected Files** | `prisma/schema.prisma` |
| **Recommended Action** | Design field requirements in a product WO; implement via migrations |
| **Estimated Effort** | 4 hours per model |

---

### TD-020 — IC series has gaps (IC-004, IC-008, IC-010 missing)

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Category** | Documentation |
| **Description** | The Implementation Constitution (IC) series has numbered gaps: IC-004 exists only as a root blob with content-as-filename; IC-008 and IC-010 do not exist at all. The series jumps from IC-007 to IC-009, and from IC-009 to IC-011. |
| **Affected Files** | `docs/implementation/` |
| **Recommended Action** | Create IC-004 at canonical path; create IC-008 and IC-010 or document why they are intentionally skipped |
| **Estimated Effort** | 2 hours |

---

### TD-021 — `@aureus-v1/shared` has no real content

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Category** | Architecture |
| **Description** | `packages/shared` exports only `getSharedMessage()` returning a placeholder string. The shared package provides no real value: no types, no utilities, no constants, no domain primitives. |
| **Affected Files** | `packages/shared/src/index.ts` |
| **Recommended Action** | Populate with real shared types and utilities as WOs deliver domain features |
| **Estimated Effort** | Ongoing |

---

### TD-022 — Port hardcoded in API bootstrap

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Category** | Configuration |
| **Description** | `apps/api/src/main.ts` hardcodes `app.listen(3001)`. The port should come from `process.env.PORT` with a fallback. |
| **Affected Files** | `apps/api/src/main.ts` |
| **Recommended Action** | `await app.listen(process.env.PORT ?? 3001)` |
| **Estimated Effort** | 5 minutes |

---

### TD-023 — `moduleResolution` inconsistency between base and api tsconfig

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Category** | Build |
| **Description** | `tsconfig.base.json` sets `moduleResolution: "Bundler"` (for Next.js/Vite). `apps/api/tsconfig.json` overrides to `"node"` (for Node.js/CommonJS). This is technically correct but should be documented, and the base config should not include settings that must always be overridden. |
| **Affected Files** | `tsconfig.base.json`, `apps/api/tsconfig.json` |
| **Recommended Action** | Remove `moduleResolution` from base config; let each package declare its own |
| **Estimated Effort** | 30 minutes |

---

## Priority 4 — Low Debt / Future Items

---

### TD-024 — No Docker / containerisation

| Field | Detail |
|---|---|
| **Severity** | Low (for now) |
| **Category** | Deployment |
| **Description** | No `Dockerfile`, `docker-compose.yml`, or container image definition. Deployment is currently undefined. |
| **Recommended Action** | Add Docker files before any staging deployment |
| **Estimated Effort** | 4 hours |

---

### TD-025 — No database seeding

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Category** | Database |
| **Description** | No `prisma/seed.ts` or `db:seed` script. Development databases cannot be bootstrapped with consistent test data. |
| **Recommended Action** | Add seed file once Profile/User fields are expanded |
| **Estimated Effort** | 2 hours |

---

### TD-026 — No API versioning strategy

| Field | Detail |
|---|---|
| **Severity** | Low (now), High (later) |
| **Category** | API |
| **Description** | No URL versioning (`/v1/users`), header versioning, or version deprecation policy. Must be decided before public API is exposed. |
| **Recommended Action** | Decide strategy (URL path recommended for clarity); implement via NestJS `app.enableVersioning()` |
| **Estimated Effort** | 2 hours |

---

### TD-027 — No logging infrastructure

| Field | Detail |
|---|---|
| **Severity** | Low (now) |
| **Category** | Observability |
| **Description** | No structured logging (Pino, Winston). NestJS default logger only. No request/response logging middleware. |
| **Recommended Action** | Add `nestjs-pino` or Winston with structured JSON output |
| **Estimated Effort** | 3 hours |

---

### TD-028 — `next-env.d.ts` not gitignored

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Category** | Repository Health |
| **Description** | `apps/web/next-env.d.ts` is auto-generated by Next.js and committed to the repository. Next.js documentation states it should not be edited. It is safe but unnecessary to track. |
| **Affected Files** | `apps/web/next-env.d.ts` |
| **Recommended Action** | Add to `.gitignore`: `apps/web/next-env.d.ts` |
| **Estimated Effort** | 5 minutes |

---

## Debt Summary

| Priority | Items | Estimated Total Effort |
|---|---|---|
| Critical (P1) | 7 | ~22 hours + ongoing |
| High (P2) | 9 | ~18 hours |
| Medium (P3) | 7 | ~20 hours |
| Low (P4) | 5 | ~11 hours |
| **Total** | **28** | **~71 hours** |

---

## Debt Paydown Recommended Order

1. **TD-001, TD-002, TD-003** — Fix git repository corruption (blob filenames, nested paths)
2. **TD-007** — Merge WO-003 to main (immediate value, tested code)
3. **TD-005** — Set up CI/CD pipeline
4. **TD-004** — Ensure tests run in CI
5. **TD-008** — Move Prisma to correct location in monorepo
6. **TD-009** — Remove committed build artifacts
7. **TD-010** — Install and configure ESLint
8. **TD-006** — Begin authentication work order
9. **TD-011, TD-012** — Fix Profile model and email unique constraint
10. All remaining in priority order
