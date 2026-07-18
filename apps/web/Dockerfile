# syntax=docker/dockerfile:1
#
# Production image for the Aureus web app (Next.js). Built from the
# repository root so the pnpm workspace resolves normally:
#
#   docker build -f apps/web/Dockerfile -t aureus-web .
#
# Uses Next.js `output: "standalone"` (apps/web/next.config.ts) so the
# runtime layer needs only the traced server bundle, not the full
# node_modules tree — see the Next.js self-hosting docs' monorepo caveat:
# the standalone output mirrors the monorepo path (.next/standalone/apps/web/server.js)
# and .next/static + public/ must be copied in alongside it manually.

FROM node:22-alpine AS base
RUN corepack enable
RUN apk add --no-cache libc6-compat

# ---- Install workspace dependencies (all apps, for the turbo build graph) ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are baked into the client bundle at build time — must
# be supplied as a build arg (docker build --build-arg or compose's
# build.args), not a runtime `docker run -e`.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN pnpm turbo run build --filter=@aureus-v1/web...

# ---- Runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
