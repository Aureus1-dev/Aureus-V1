# PR-002 — Production Foundation Remediation

**Baseline:** PR-001 (Production Readiness Master Audit). Per the Founder's standing rule, this work order was checked against PR-001's findings before starting, and every item below either resolves a PR-001 finding or explicitly defers it with a documented justification — no previously-resolved issue was reintroduced.

**Scope, as given by the Founder's Revised Priority instruction:**
1. Secure bootstrap process for the first administrator
2. Replace the 11 placeholder frontend surfaces by connecting them to their existing backends where applicable
3. Brute-force protection and rate limiting on authentication
4. AI spending limits, quotas, and emergency budget controls
5. Resolve the duplicated constitutional and governance documentation structure
6. Production infrastructure foundations (containerization, deployment configuration, operational runbooks)

**Acceptance criterion:** every critical finding from PR-001 is either resolved or explicitly deferred with a documented justification. This document is that mapping.

---

## 1. Admin bootstrap — RESOLVED

PR-001 finding: registration always assigns `MEMBER`; there was no path to a first administrator account other than direct database manipulation.

- `apps/api/prisma/seed.ts` + `apps/api/src/scripts/bootstrap-admin.ts` (tested in `bootstrap-admin.spec.ts`): idempotent `npx prisma db seed` — no-ops if an admin already exists, promotes an existing user in place if the bootstrap email is already registered, otherwise creates a new `SYSTEM_ADMINISTRATOR` through the same bcrypt/12-round path as normal registration.
- `prisma.config.ts` wires the seed command; `.env.example` documents `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`.
- Runbook: `docs/operations/production-runbook.md` §1.

## 2. Placeholder frontend surfaces — PARTIALLY RESOLVED (6 of 11), remainder explicitly deferred

PR-001 finding: 11 member-facing routes rendered `PlaceholderSurface` with no real content, some despite a complete backend already existing behind them.

**Resolved — backend existed, now connected:**

| Surface | Backend | What was built |
|---|---|---|
| Notifications | Communication System (WO-026) | Full list/filter/mark-read/mark-all-read page; extended `NotificationsContext` with a `total` count for "load more" |
| Profile | Users/Profile (existing) | Full view + create/edit form over the existing create/get/update contract; extended `lib/api/profile.ts` (previously read-only) with create/update |
| Tasks | Tasks domain (existing, per-milestone) | Standing "all my tasks" list with status editing; required a small, justified backend extension — `TasksService.findAll` now self-scopes to the caller's own tasks across every milestone when no `milestoneId` is given, instead of forbidding non-admins outright |
| Pods | Pods domain (WO-030, 11 controllers, previously zero frontend) | Discover (search/request-to-join/propose-new-pod) and My Pods (memberships, invitations, request status) tabs — scoped to the member-facing "Freedom of Belonging" journey; Steward/Admin-facing roster management, events, service projects, escalations, and Pod-internal messaging remain unwired (a reasonable, separate follow-up, not silently dropped) |
| Resources | Resource Directory (WO-020) | Search/Saved tabs mirroring the existing Opportunity Center pattern exactly, since the backend shape is identical |
| Messages | Communication System's Messaging sub-domain (WO-026) | Conversation list + thread view + composer, scoped to existing conversations; starting a new conversation is entry-pointed from the Stewardship relationship view or Organization representative directory, neither of which has a frontend surface itself — a documented follow-up, not an oversight |

**Explicitly deferred (no backend exists for any of these):** Community, Calendar, Settings, Search, Help. See `docs/work-orders/PR-002-Deferred-Surfaces-Justification.md` for the per-surface verification and reasoning — each would require inventing new backend scope inside a remediation order, which is a Founder-level product decision, not something to improvise while wiring existing plumbing.

## 3. Auth brute-force protection + rate limiting — RESOLVED

PR-001 finding: no lockout after repeated failed logins; no rate limiting on credential/token endpoints.

- `User.failedLoginAttempts`/`lockedUntil` (migration `20260718070000_add_login_lockout`): 5 failed attempts locks the account for 15 minutes; the lockout check runs after the existence/active-status checks but before password comparison, so a nonexistent email never reveals lockout state; counters reset on any successful login.
- `@Throttle` rate limiting added to `register`, `login`, `forgot-password`, `reset-password`, `verify-email` (5/min per IP) — these previously had no throttling at all, unlike every other rate-limited controller in the codebase.
- Tests: `auth.service.spec.ts` covers increment, lock-at-threshold, rejection-while-locked, and reset-after-expiry.

## 4. AI spending limits, quotas, emergency budget controls — RESOLVED

PR-001 finding: no spend ceiling of any kind on AI usage; an unmapped model silently recorded `costUsd: 0` with no signal that cost tracking had a gap; `pod-insights` endpoints had no rate limiting unlike every sibling AI controller.

- `AiRequestsService.enforceSpendCeilings`: checked before every provider call. `AI_EMERGENCY_STOP=true` halts all AI features immediately (env-read, no rebuild — a container restart is sufficient). `AI_GLOBAL_DAILY_BUDGET_USD` (default $50) and `AI_USER_DAILY_BUDGET_USD` (default $2) are rolling-24h ceilings; over either one, the request is refused before it reaches the provider (no cost incurred) with 503/403 respectively.
- `ai-pricing.util.ts`: an unmapped model now logs a loud `WARN` naming the exact gap, instead of silently returning 0.
- `pod-insights.controller.ts`: added the same `@Throttle` pattern used by `insights.controller.ts`/`conversations.controller.ts`/`recommendations.controller.ts`.
- Tests: `ai-requests.service.spec.ts` covers the emergency stop, both ceilings, and the below-ceiling pass-through case.

## 5. Duplicated constitutional/governance documentation — NOT ADDRESSED (Founder's explicit instruction, standing)

PR-001 flagged this as needing resolution. When PR-002 began, resolving it unilaterally was correctly identified as outside delegated authority (ENG-003 reserves constitutional changes to Founder Responsibilities). The Founder's explicit response — **"Give me a side-by-side diff of every conflict first... Make no changes to the repository"** — produced `Constitutional-Conflict-Comparison.md` (published as an artifact, not committed) and remains the standing instruction: **no file under `docs/constitution/`, `docs/docs/constitution/`, `docs/constitutional/`, `docs/sessions/`, or `docs/drafts/` may be modified, merged, or deleted until the Founder reviews that comparison and designates canonical versions.** This item is intentionally untouched by PR-002 — not a gap in this work order, but a standing constraint that supersedes it.

## 6. Production infrastructure foundations — RESOLVED

PR-001 finding: no Dockerfile, no docker-compose, no deploy/rollback/incident-response documentation — only a governance-prose "operations" corpus naming no real infrastructure.

- `apps/api/Dockerfile`, `apps/web/Dockerfile` (Next.js `output: "standalone"`), `docker-compose.yml`, `.dockerignore` — built from the pnpm workspace root, correctness-over-size multi-stage builds.
- `docs/operations/production-runbook.md` §3–6 expanded from empty placeholders to real build/run commands, a manual deploy procedure (CI-green → build → migrate → verify → cut over), a rollback procedure keyed to the additive-first migration convention, and incident-response guidance specific to the AI budget and account-lockout controls this same work order added.
- **Caveat, stated plainly:** these images were authored without a live Docker daemon in this environment (confirmed unavailable) and so are structurally sound and follow standard pnpm-workspace/Turborepo/Next-standalone patterns, but have not been build-verified end-to-end. The runbook says so explicitly and recommends the first real build happen in CI or staging before a production cutover.

---

## Validation

- Backend: 675 unit tests passing (up from 662 at the PR-001 baseline — 13 new tests for lockout + AI budget + Tasks self-scope + repository filter).
- Frontend: 443 unit/component/accessibility tests passing (up from 371 — 72 new tests across the 6 wired surfaces).
- Full monorepo build (`turbo run build`): api, shared, and web all succeed; the 6 wired routes show real bundle sizes, the 5 deferred routes remain minimal placeholders.
- Lint and typecheck: clean across all three packages.
- e2e/integration suites: unchanged by this work order; require a live Postgres unavailable in this sandbox, consistent with every prior Domain Readiness Report in this repository's history.

## Recommendation for next work order

Per the Founder's own stated sequencing: PR-003 (Founder Operating System) once this foundation is solid, then PR-004 (Intelligence Gateway). Per the standing rule, whichever comes next must check this document and PR-001 first.
