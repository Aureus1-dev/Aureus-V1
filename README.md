# Aureus V1

Aureus Version 1 is initialized as a modern TypeScript monorepo using Turborepo.

## Architecture

- apps/web: Next.js application for the user-facing experience.
- apps/api: NestJS application for backend services.
- packages/shared: reusable TypeScript code shared across apps.

## Workspace Tooling

- pnpm workspaces for dependency management.
- Turbo for build orchestration and task execution.
- TypeScript configured at the repo root and package level.

## Development

```bash
pnpm install
pnpm dev
```

This foundation intentionally contains no business logic yet; it focuses on a clean, production-ready structure for future feature development.
