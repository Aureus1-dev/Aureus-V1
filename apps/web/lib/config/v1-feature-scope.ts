/**
 * C2 — V1 Scope Lockdown. Single source of truth for which member-facing
 * domains are reachable in the five-member pilot. Mirrors (does not
 * import — apps/web and apps/api are separate deployables with no wired
 * shared package) apps/api/src/config/v1-feature-scope.ts — keep both in
 * sync by hand.
 *
 * Academy and Pods stay off. Voice was reopened by Founder decision.
 * Parent + Child stays off until minor authorization, assent, privacy,
 * retention, safeguarding, and launch review are separately closed.
 */
export const V1_FEATURE_FLAGS = {
  voice: true,
  academy: false,
  pods: false,
  parentChild: false,
} as const;

export type V1FeatureKey = keyof typeof V1_FEATURE_FLAGS;
