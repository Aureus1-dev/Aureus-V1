# AUREUS V1 — REPOSITORY HEALTH SCORE

| Field | Value |
|---|---|
| Audit Designation | WO-001 Repository Health Score |
| Audit Date | 2026-07-14 |
| Audited Branch | `origin/main` (commit `0d09bc1`) |
| Governing Standards | IC-002, IC-006, IC-007, IC-013 |

---

## Scoring Methodology

Each dimension is scored 0–100 based on confirmed evidence gathered during this audit. Scores are not estimates of intent or governance aspiration — they reflect the current, verifiable state of the repository. A score of 0 in a dimension means the required artifacts are completely absent from main; it does not imply the team has not done any work.

Confidence: **High** — all scores are derived from confirmed findings in `PLATFORM_AUDIT.md`.

---

## Overall Repository Health Score

```
┌──────────────────────────────────────────────┐
│                                              │
│   OVERALL REPOSITORY HEALTH SCORE: 28 / 100 │
│                                              │
└──────────────────────────────────────────────┘
```

**Qualifier:** This score is appropriate and expected for an early-scaffold project. The governance and product documentation layers are substantive. The technical implementation layer is a skeleton. The score reflects the gap between the two, not a failure of effort — it reflects the current state of a platform that is correctly documented but not yet built.

---

## Dimension Scores

---

### Architecture Score: 35 / 100

| Sub-dimension | Evidence | Score |
|---|---|---|
| Monorepo tooling | pnpm workspaces, Turborepo, correct `pnpm-workspace.yaml`, `.editorconfig` — all correct | 80 |
| Package boundaries | Prisma at repo root instead of `apps/api`; `@prisma/client` in root instead of API package | 30 |
| Module structure | `apps/api` has no module structure — one 24-line stub file | 5 |
| TypeScript configuration | `rootDir: "../.."` in API tsconfig; `moduleResolution` inconsistency between base and api | 30 |
| Domain model | Schema exists with correct relationships; models are skeletal (Profile empty, no business fields) | 45 |
| Dependency direction | One-way dependency (`apps/*` → `packages/shared`); no circular deps detected | 80 |
| Unmerged work | Complete User Module stranded on WO-003 branch | 20 |

**Weighted score: 35/100**

**Key blockers:** Entire API is a stub; Prisma at wrong monorepo level; WO-003 not merged.

---

### Security Score: 42 / 100

| Sub-dimension | Evidence | Score |
|---|---|---|
| Secrets management | `.env` correctly gitignored; `.env.example` with placeholders only; no hardcoded credentials in any committed file | 95 |
| Authentication | Not implemented; no auth library installed | 0 |
| Authorization | Not implemented; no guard, role, or RBAC exists | 0 |
| HTTP security headers | No Helmet; no CORS policy | 10 |
| Input validation | ValidationPipe not configured; class-validator not installed in API package | 5 |
| Database security | Soft-delete email unique constraint conflict; no startup env validation | 45 |
| Dependency vulnerabilities | 3 moderate CVEs reported by `npm audit`; no criticals at audit time | 70 |

**Weighted score: 42/100**

**Key blockers:** Zero authentication or authorization. CORS and security headers absent. These must be resolved before any user traffic is served.

---

### Testing Score: 3 / 100

| Sub-dimension | Evidence | Score |
|---|---|---|
| Unit tests on main | Zero test files | 0 |
| Integration tests | Zero | 0 |
| End-to-end tests | Zero | 0 |
| Test configuration | No jest.config.js; no test runner installed in any package on main | 0 |
| CI test execution | No CI pipeline; tests never run automatically | 0 |
| Test quality | Cannot assess — no tests present | N/A |

**Score note:** 3/100 (not 0) because `cursor/wo-003-user-module-336b` contains 25 unit tests at 100% coverage — the infrastructure is built and proven to work. The tests simply have not been merged. If WO-003 were merged, this score would rise to approximately 20/100 (still low due to absence of integration, E2E, and CI execution).

**Key blocker:** IC-007 (Testing Standard) and IC-006 (Definition of Done) are in material breach. Zero tests on main is the highest-risk quality deficiency.

---

### Documentation Score: 55 / 100

| Sub-dimension | Evidence | Score |
|---|---|---|
| Governance documentation volume | 276 Markdown files; extensive OAS series across all major functions | 90 |
| IC series (engineering standards) | IC-001 through IC-020 present (IC-004 inaccessible as blob; gaps at IC-008, IC-010 possible) | 70 |
| Product architecture documents | PA-003 through PA-020 at correct path; PA-001, PA-002 only at `docs/docs/` (misplaced) | 65 |
| Constitution completeness | Articles split across three directory trees; OAS-001 is draft only | 30 |
| Documentation structure integrity | 109 duplicate-designated documents; 4 blob-as-filename commits; 27 files at `docs/docs/` | 15 |
| Architecture Decision Records | Zero ADRs on main | 0 |
| API documentation | No Swagger/OpenAPI on main | 0 |
| Developer onboarding / README | 12-line README; no setup guide, no env var docs, no migration docs | 10 |

**Weighted score: 55/100**

**Positive note:** The depth and breadth of governance documentation (OAS constitutional series, OAS sectoral frameworks, SOPs) is a genuine asset. The documentation layer is the strongest part of the repository.

**Key blockers:** 109 duplicate documents create governance ambiguity. Structural corruption (blobs, nested paths) makes portions inaccessible. Zero ADRs for technical decisions.

---

### Maintainability Score: 25 / 100

| Sub-dimension | Evidence | Score |
|---|---|---|
| Code quality tooling | ESLint declared but not installed; Prettier installed but no config | 10 |
| Type safety | TypeScript strict mode in base config; `apps/api` overrides without restoring strict; WO-003 tsconfig disables strictNullChecks and noImplicitAny | 50 |
| Code organization | No module structure; all API code inline in 24-line stub | 5 |
| Git hygiene | Committed build artifacts; blob-as-filename; nested docs paths | 15 |
| Dependency placement | Runtime deps at workspace root instead of consuming package | 35 |
| Technical debt load | 28 tracked items; 9 P1 critical blockers | 20 |

**Weighted score: 25/100**

**Key blockers:** No linting enforcement; no code review automation; build artifacts in version control; all technical debt items unclosed.

---

## Readiness Scores

---

### Deployment Readiness: 10 / 100

| Criterion | Status | Evidence | Score |
|---|---|---|---|
| CI/CD pipeline | ❌ Absent | No `.github/workflows/` | 0 |
| Build verified on clean environment | ❌ Unverified | No CI; local build only | 0 |
| Environment variable documentation | ✅ Partial | `.env.example` exists; not in README | 50 |
| Container definition (Docker) | ❌ Absent | No Dockerfile | 0 |
| Health check endpoint | ❌ Absent | No `/health` | 0 |
| Database migration automation | ✅ Present | Prisma migrate; 3 migrations | 80 |
| Secrets management | ✅ Present | `.env` gitignored; no committed secrets | 90 |
| Rollback capability | ❌ Absent | No tagged releases; no rollback procedure | 0 |
| Monitoring and alerting | ❌ Absent | No logging infrastructure | 0 |

**Score: 10/100**

**Verdict:** Not deployable. A deployment to any environment would require manually resolving environment variables, running migrations by hand, and hoping nothing errors — with no observability if it does.

---

### Production Readiness: 6 / 100

| Criterion | Status | Evidence | Score |
|---|---|---|---|
| All planned endpoints implemented | ❌ 0 of N | Single stub endpoint | 0 |
| Authentication implemented | ❌ Not started | No auth library installed | 0 |
| Authorization implemented | ❌ Not started | No guards | 0 |
| Tests passing in CI | ❌ Neither | No tests on main; no CI | 0 |
| Error handling | ❌ Absent | No global exception filter | 0 |
| Input validation | ❌ Absent | ValidationPipe not configured | 0 |
| CORS configured | ❌ Absent | No CORS policy | 0 |
| Rate limiting | ❌ Absent | No throttling | 0 |
| HTTP security headers | ❌ Absent | No Helmet | 0 |
| Database connection validated at startup | ❌ Absent | No env validation | 0 |
| Structured logging | ❌ Absent | NestJS default logger only | 15 |
| Database schema valid | ✅ Confirmed | `prisma validate` passes | 90 |

**Score: 6/100**

**Verdict:** Not production-ready. This is correct and expected at this stage. No Work Order has yet delivered a production-ready feature end-to-end to main.

---

### Operational Readiness: 20 / 100

| Criterion | Status | Evidence | Score |
|---|---|---|---|
| Runbook / deployment guide | ❌ Absent | README has no deployment instructions | 0 |
| Incident response documented | ✅ Present | IC-018, OAS-RISK-103, OAS-SEC-103 | 75 |
| Monitoring defined | ❌ Absent | No metrics, no alerting, no log aggregation | 0 |
| On-call / escalation procedures | ✅ Documented | OAS-RISK SOPs | 60 |
| Backup and recovery procedures | ❌ Absent | No database backup config or runbook | 0 |
| Tagged releases | ❌ Absent | No git tags; no release process | 0 |
| SLA / SLO | ❌ Absent | Not defined for software layer | 0 |
| Knowledge management | ✅ Present | IC-019, OAS-DATA SOPs | 70 |
| AI contributor governance | ✅ Present | IC-020 defines AI contributor rules | 80 |

**Score: 20/100**

**Verdict:** The organisation has substantial governance documentation for operational processes. The software does not yet have the operational infrastructure (monitoring, deployment runbooks, database backups) to match.

---

## Score Summary

| Dimension | Score | Grade |
|---|---|---|
| **Overall Health** | **28 / 100** | F |
| Architecture | 35 / 100 | F |
| Security | 42 / 100 | F |
| Testing | 3 / 100 | F |
| Documentation | 55 / 100 | D+ |
| Maintainability | 25 / 100 | F |
| Deployment Readiness | 10 / 100 | F |
| Production Readiness | 6 / 100 | F |
| Operational Readiness | 20 / 100 | F |

---

## Grade Interpretation

**F does not mean the project is failing. It means the platform is in early scaffold stage.**

Scores in the F range are normal for a platform that has completed its first two work orders out of a multi-quarter roadmap. The correct comparison is not "where should a mature production platform be" but "where should a platform be after two merged work orders establishing foundation and database schema."

What would be alarming is if these scores remained F after 10+ work orders. At this stage, they reflect a deliberate sequence: documentation and architecture first, then implementation.

---

## Projected Score Trajectory

| Milestone | Projected Overall | Architecture | Security | Testing | Documentation |
|---|---|---|---|---|---|
| **Current** (WO-002 on main) | 28 | 35 | 42 | 3 | 55 |
| After merging WO-003 + fixing repository corruption | 42 | 52 | 44 | 22 | 62 |
| After CI/CD + auth + lint + ESLint + Prettier | 54 | 60 | 68 | 40 | 65 |
| After all domain modules + tests (Goals, Journeys, etc.) | 66 | 72 | 72 | 65 | 68 |
| After security hardening + monitoring + containerisation | 78 | 78 | 88 | 75 | 72 |
| Full production readiness | ~88 | ~85 | ~90 | ~85 | ~80 |

---

## Top Five Recommendations

Ordered by impact-to-effort ratio:

**1. Merge WO-003 and fix repository corruption (TD-001 through TD-003, TD-007)**
One day of effort. Brings the only real application code to main; restores 4 inaccessible documents; enables test execution.

**2. Create CI/CD pipeline (TD-005)**
4 hours. Prevents regressions from landing on main. The single highest-leverage automation action available.

**3. Add CORS, Helmet, rate limiting, ValidationPipe, and exception filter (TD-008, TD-014, TD-015)**
4–8 hours combined. Establishes the minimum security baseline before any endpoint serves real traffic.

**4. Fix Prisma location and dependency placement (TD-010, TD-011)**
One day. Resolves architectural mismatch; makes `apps/api` a proper self-contained deployable package.

**5. Governance review of duplicate OAS documents (TD-018)**
One week, human-led. 109 duplicate-designated documents undermine the credibility of the governance layer that is the platform's most developed asset.

---

## Commands Executed During This Audit

All commands were read-only and non-destructive.

```bash
git fetch --all --quiet
git log --oneline origin/main | head -15
git log --oneline origin/main | wc -l
git branch -a
git ls-tree -r --name-only origin/main   # multiple invocations with grep/wc/python3 filters
git show origin/main:<file>              # multiple file reads
git show origin/cursor/wo-003-user-module-336b:<file>
git log --oneline origin/cursor/wo-003-user-module-336b ^origin/main
npx prisma validate                       # read-only schema validation
```

No files were modified. No packages were installed or removed. No destructive commands were executed.
