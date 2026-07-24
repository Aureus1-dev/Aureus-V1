# Aureus V1

Aureus Version 1 is a TypeScript monorepo using Turborepo, implementing the canonical Aureus platform architecture defined in `docs/product-architecture/` (PA-001–020) and governed by the Implementation Constitution (`docs/implementation/IC-001–020`).

## Architecture

- apps/web: Next.js application for the user-facing experience.
- apps/api: NestJS backend implementing the domain API — see below.
- packages/shared: reusable TypeScript code shared across apps.

## Implemented Domains

The table below is an early, partial snapshot (six of the platform's domains, recorded early in the project) and has not been kept current — see the Governance & Execution Authority section below for where to find the actual current state instead of trusting this table.

| Domain | Status | Architecture Decision Record |
|---|---|---|
| Member Core (Users, Profile) | Implemented | ADR-003 |
| Journey Engine (Goals, Journeys, Milestones, Tasks) | Implemented | — |
| Opportunity Engine | Implemented | ADR-004 |
| Authentication & Identity/Access Management | Implemented | ADR-005 |
| Resource Directory | Implemented | ADR-006 |
| Administration & Operations (Role Management) | Implemented | ADR-007 |

`docs/releases/version-1-readiness.md` is **historical technical evidence as of WO-030** (see the notice at the top of that file), not a continuously-updated document — its own maintenance instruction has not been followed since. See Governance & Execution Authority below for where current scope, registry, and status actually live.

## Governance & Execution Authority

The active execution track is `docs/launch/LAUNCH-001-First-Members.md` — the Founder-approved plan for Aureus's first 25 members, organized into sequential Gates (A–F). The full authority hierarchy for that track (what document governs scope vs. registry vs. current status vs. historical evidence) is recorded in `docs/launch/EXECUTION-AUTHORITY.md`. `docs/ai/REPOSITORY_STEWARD.md` defines the operating rules for any session acting as Repository Steward on this repository.

## Frontend Governance

Frontend implementation is governed by a dedicated canon and blueprint series, subordinate to the OAS Constitution and the Architecture/Backend/AI Canons:

- `docs/frontend/canon/` — Frontend Experience Canons (AFX-001–006): the constitutional principles governing every member interaction (conversation-first, voice and presence, visual design system, member flourishing).
- `docs/frontend/blueprints/` — Frontend Production Blueprints (FPB-000–016): the engineering specification for implementing the canon, starting from `FPB-000-Frontend-Blueprint-Index.md`.

Frontend Work Orders (FWO series) execute the blueprint one vertical slice at a time and live in `docs/work-orders/` alongside the backend Work Orders.

## Workspace Tooling

- pnpm workspaces for dependency management.
- Turbo for build orchestration and task execution.
- TypeScript configured at the repo root and package level.
- Prisma (PostgreSQL) for the database layer — see `prisma/schema.prisma`.

## Development

```bash
pnpm install
npx prisma generate
npx prisma migrate dev
pnpm dev
```

Copy `.env.example` to `.env` and provide `DATABASE_URL` and `JWT_ACCESS_SECRET` before starting the API.

## Testing

```bash
pnpm --filter @aureus-v1/api run test --coverage
```

Requires a reachable PostgreSQL database (`DATABASE_URL`) — the suite includes Prisma integration tests and full HTTP end-to-end tests alongside unit tests.
