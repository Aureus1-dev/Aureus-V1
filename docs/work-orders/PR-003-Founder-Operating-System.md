# PR-003 — Founder Operating System

**Baseline:** PR-001 (Production Readiness Master Audit) and PR-002 (Production Foundation Remediation). Per the Founder's standing rule, this work order was checked against both before starting. PR-002's six finding categories are: (1) admin bootstrap, (2) placeholder frontend surfaces, (3) auth brute-force/rate limiting, (4) AI spend controls, (5) duplicated constitutional documentation, (6) production infrastructure. PR-003 touches only (4) — extending it, not weakening it — and (5), where it adds a strictly read-only surface that respects the standing constraint rather than acting on it. Findings (1), (2), (3), and (6) are untouched by this work order; no previously-resolved issue was reintroduced.

**Scope, as given by the Founder:** the operational tools the Founder, as first steward, uses to manage Aureus as a living institution — Founder dashboard, institutional health metrics, stewardship oversight, AI operational controls, audit and review tools, global announcements, governance/constitutional monitoring, and system health.

---

## 1. Institutional health metrics — NEW

`GET /administration/metrics` (Platform/System Administrator only): total members, breakdown by role and by status, pending-verification counts across Resources/Organizations/Opportunities/Knowledge/Academy, open Stewardship escalations (platform-wide, via a new `IStewardshipEscalationRepository.countByStatus`), the AI spend summary, and a database-reachability check. A pure aggregator — every count is computed by a domain's own existing repository (`findAll({ limit: 1, ... }).total`, or a dedicated count method where one already existed); this endpoint owns no data of its own.

## 2. AI operational controls — NEW (live-editable successor to PR-002's env-var-only controls)

- **Schema:** `AiOperationalConfig`, a single-row table (`id: 'singleton'`). Env vars (`AI_EMERGENCY_STOP`, `AI_GLOBAL_DAILY_BUDGET_USD`, `AI_USER_DAILY_BUDGET_USD`) now only seed the row the first time it's ever read; every read/write after that is DB-authoritative.
- **`AiRequestsService.enforceSpendCeilings`** now reads `AiOperationalConfigService.getEffective()` instead of `ConfigService` directly — an Administrator can flip the emergency stop or adjust a budget ceiling and it takes effect on the very next AI request, no restart required. The enforcement logic itself (emergency stop → refuse; global ceiling → refuse; per-user ceiling → refuse) is unchanged from PR-002.
- **`GET/PATCH /ai/operational-config`**, **`GET /ai/requests`** (platform-wide audit log, previously self-scoped only), **`GET /ai/requests/summary`** (rolling-24h spend/request/failure counts) — all Platform/System Administrator only.

## 3. Review Queue — NEW frontend surface over five existing backend workflows

Resources, Organizations, Opportunities, Knowledge, and Academy each already had an independent DRAFT → PENDING_REVIEW → VERIFIED/REJECTED workflow with no unified frontend. `lib/api/review-queue.ts` projects all five down to one shape (`id`, `domain`, `title`, `createdAt`) and calls each domain's own `/verify` and `/reject` endpoints directly — no new backend surface, except Opportunities' pre-existing `reviewedById`-in-body asymmetry, which the client accommodates rather than papers over.

## 4. Stewardship Oversight — NEW frontend surface

The platform-wide steward roster (every user holding `STEWARD`, via the existing `GET /users?role=STEWARD`), each steward's own metrics (`StewardMetricsService`, reused verbatim from PA-012), and the unscoped relationship list an Administrator already sees from `StewardshipRelationshipsService.findAll` — no new backend authorization was needed for any of this.

## 5. User & Role Management — NEW frontend surface

Lists members with role/status filters; grants and revokes roles and edits status directly against `UserRolesService`/`UsersService` (WO-021) — no new backend surface.

## 6. Announcements composer — NEW frontend surface

The full create → publish → archive lifecycle `AnnouncementsService` has supported since PR-002, with no prior frontend. An Administrator sees every announcement regardless of status; everyone else only ever sees PUBLISHED ones addressed to them (both already enforced server-side).

## 7. Governance monitoring — NEW, strictly read-only

Per the standing constraint (**"Give me a side-by-side diff of every conflict first... Make no changes to the repository"**), this panel does not read, edit, merge, or delete anything under `docs/constitution/`, `docs/docs/constitution/`, `docs/constitutional/`, `docs/sessions/`, or `docs/drafts/`. It is a static, hardcoded presentation of what the repository's file structure already shows — the file list under each protected path, and the document-number collisions visible from filenames alone (e.g., `OAS-004`, `OAS-005`, and `OAS-006` each name unrelated subjects depending on which of the two constitution directories is read). `Constitutional-Conflict-Comparison.md`, the full side-by-side diff, was delivered to the Founder as an artifact and was never committed to this repository, so it cannot be rendered here — the panel says so explicitly. No edit, merge, or delete control exists anywhere on this page.

## 8. Founder Dashboard + routing

`/founder` (route group nested under the member layout, so it inherits `AppShell`/auth) is gated by a new `FounderGate` — role check only (`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`), since authentication is already guaranteed by the parent `AuthGate`. The dashboard tiles institutional health and link into `/founder/ai`, `/founder/review`, `/founder/stewardship`, `/founder/users`, `/founder/announcements`, `/founder/governance`. `AppShell`'s primary navigation gained one conditional entry — Founder is deliberately not one of the 20 primary surfaces (FPB-002 §3), so it's appended only for a Founder-role session rather than added to that closed list.

---

## Validation

- **Backend:** 686 unit tests passing (up from 662 at the PR-002 baseline), covering the new `AiOperationalConfigService`/repository, the extended `AiRequestsService`, the new `AdministrationMetricsService`, and the new `countByStatus` escalation method. `npx prisma validate`, `tsc --noEmit`, `eslint`, and `tsc -p tsconfig.json` (build) all clean.
- **Frontend:** 510 unit/component/accessibility tests passing (up from 443 at the PR-002 baseline) — every new context and panel has its own test file, each panel's fully-loaded state passes a `jest-axe` accessibility check, and `AppShell`'s modified navigation is covered for both the Founder and non-Founder cases. `tsc --noEmit`, `eslint`, and `next build` (full production build, all 7 `/founder` routes statically generated) all clean.
- e2e/integration suites: unchanged by this work order; require a live Postgres unavailable in this sandbox, consistent with every prior Domain Readiness Report in this repository's history.

## Recommendation for next work order

Per the Founder's own stated sequencing: PR-004 (Intelligence Gateway / AI orchestration). Per the standing rule, PR-004 must check this document, PR-002, and PR-001 first.
