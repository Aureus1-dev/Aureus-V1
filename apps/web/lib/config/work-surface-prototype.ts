/**
 * Aureus Work Surface — Slice 0 prototype flag.
 *
 * This is deliberately **not** part of `V1_FEATURE_FLAGS`
 * (`v1-feature-scope.ts`). That file is the by-hand-mirrored, API-enforced
 * gate for which *production* member-facing domains are reachable in the
 * pilot, and touching it obligates a matching change in
 * `apps/api/src/config/v1-feature-scope.ts` plus `V1ScopeMiddleware`. The
 * Work Surface prototype is neither of those things: it is an isolated,
 * standalone route (`/work-surface`) that does not replace the production
 * front door, is not linked from any production navigation, and carries
 * its own local fixture state rather than talking to real orchestration.
 *
 * Per the design portfolio (PR #151) and its review addendum, Slice 0 is
 * "an isolated interactive Work Surface prototype... No production
 * replacement yet." This flag is the isolation boundary: flipping it off
 * makes `/work-surface` 404 without touching anything else in the app.
 */
export const WORK_SURFACE_PROTOTYPE_ENABLED = true;
