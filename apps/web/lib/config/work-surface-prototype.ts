/**
 * Aureus Work Surface — Slice 0 prototype flag.
 *
 * This is deliberately **not** part of `V1_FEATURE_FLAGS`
 * (`v1-feature-scope.ts`). That file is the by-hand-mirrored, API-enforced
 * gate for which *production* member-facing domains are reachable in the
 * pilot, and touching it obligates a matching change in
 * `apps/api/src/config/v1-feature-scope.ts` plus `V1ScopeMiddleware`.
 *
 * Slice 0 is an isolated review surface, not the production front door. It is
 * available automatically in non-production environments, but production
 * fails closed unless an operator intentionally sets
 * `WORK_SURFACE_PROTOTYPE_ENABLED=true`. That keeps merging this prototype
 * from silently publishing `/work-surface` to real members.
 */
export const WORK_SURFACE_PROTOTYPE_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.WORK_SURFACE_PROTOTYPE_ENABLED === 'true';
