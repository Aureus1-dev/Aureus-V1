/**
 * C2 — V1 Scope Lockdown. Single source of truth for which member-facing
 * domains are reachable in the five-member pilot. Mirrors (does not
 * import — apps/web and apps/api are separate deployables with no wired
 * shared package) apps/api/src/config/v1-feature-scope.ts — keep both in
 * sync by hand.
 *
 * Every flag defaults to false: the feature is fully built and stays in
 * the tree, but is unreachable until a Founder decision flips it back on.
 */
export const V1_FEATURE_FLAGS = {
  voice: false,
  academy: false,
  pods: false,
} as const;

export type V1FeatureKey = keyof typeof V1_FEATURE_FLAGS;
