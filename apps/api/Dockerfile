# syntax=docker/dockerfile:1
#
# Production image for the Aureus API (NestJS). Built from the repository
# root so the pnpm workspace (apps/*, packages/*) and the root-level Prisma
# schema (prisma/schema.prisma, prisma.config.ts) resolve normally:
#
#   docker build -f apps/api/Dockerfile -t aureus-api .
#
# This is a foundational image (PR-002), optimized for correctness over
# byte-for-byte minimal size: it keeps the full pnpm install (including
# devDependencies) in the runtime layer rather than pruning to a
# production-only install — deliberately deferred rather than attempted
# here (PD-002): a `turbo prune`-based rewrite changes exactly the install
# step a live Docker daemon would need to verify, and none is available in
# this sandbox (see docs/operations/production-runbook.md §3). Everything
# else in PD-002's container-hardening scope (non-root user below,
# read-only root filesystem, dropped capabilities, no-new-privileges) does
# not touch this install step and is verifiable from the Dockerfile/compose
# source alone, so it shipped; this one did not.

FROM node:22-alpine AS base
RUN corepack enable
# openssl: required by Prisma's engine tooling at generate-time on alpine;
# libc6-compat: required for native addons (bcryptjs, pg) to run on musl.
RUN apk add --no-cache openssl libc6-compat

# ---- Install workspace dependencies (all apps, for the turbo build graph) ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN pnpm turbo run build --filter=@aureus-v1/api...

# ---- Runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
# pnpm gives apps/api its own node_modules/@aureus-v1/shared symlink
# (relative, ../../../../packages/shared) rather than hoisting it to the
# workspace root — must be copied alongside the root node_modules above or
# `require('@aureus-v1/shared')` fails to resolve at runtime.
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

USER nestjs
EXPOSE 3000
# Liveness (PD-002): no external dependency check, so Docker doesn't
# restart an otherwise-healthy container over a slow/unreachable
# database — a load balancer or orchestrator readiness probe should hit
# /health/ready (DB-inclusive) instead, separately from this HEALTHCHECK.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
