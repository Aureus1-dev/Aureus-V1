# Aureus V1

Aureus Version 1 is a TypeScript monorepo using Turborepo, implementing the canonical Aureus platform architecture defined in `docs/product-architecture/` (PA-001–020) and governed by the Implementation Constitution (`docs/implementation/IC-001–020`).

## Architecture

- apps/web: Next.js application for the user-facing experience.
- apps/api: NestJS backend implementing the domain API — see below.
- packages/shared: reusable TypeScript code shared across apps.

## Implemented Domains

| Domain | Status | Architecture Decision Record |
|---|---|---|
| Member Core (Users, Profile) | Implemented | ADR-003 |
| Journey Engine (Goals, Journeys, Milestones, Tasks) | Implemented | — |
| Opportunity Engine | Implemented | ADR-004 |
| Authentication & Identity/Access Management | Implemented | ADR-005 |
| Resource Directory | Implemented | ADR-006 |
| Administration & Operations (Role Management) | Implemented | ADR-007 |

See `docs/releases/version-1-readiness.md` for the canonical, continuously-updated Version 1 readiness assessment, remaining Work Orders, and release blockers.

## Frontend Governance

Frontend implementation is governed by a dedicated canon and blueprint series, subordinate to the OAS Constitution and the Architecture/Backend/AI Canons:

- `docs/frontend/canon/` — Frontend Experience Canons (AFX-001–006): the constitutional principles governing every member interaction (conversation-first, voice and presence, visual design system, member flourishing).
- `docs/frontend/blueprints/` — Frontend Production Blueprints (FPB-000–016): the engineering specification for implementing the canon, starting from `FPB-000-Frontend-Blueprint-Index.md`.

Frontend Work Orders (FWO series) execute the blueprint one vertical slice at a time and will live in `docs/work-orders/` alongside the existing backend Work Orders once issued.

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
