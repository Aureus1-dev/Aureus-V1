/**
 * C2 — V1 Scope Lockdown. Single source of truth for which member-facing
 * domains are reachable in the five-member pilot. Mirrored (not shared,
 * since apps/web and apps/api are separate deployables with no wired
 * shared package) by apps/web/lib/config/v1-feature-scope.ts — keep both
 * in sync by hand.
 *
 * Academy and Pods are cut for V1 entirely (LAUNCH-001: "No Pods, no
 * Academy"), with no bypass for any role — fully built, unreachable until
 * a Founder decision flips them back on. Voice was reopened by a later
 * Founder decision. Parent + Child is implemented behind a hard-off launch
 * gate until minor authorization, assent, privacy, retention, and safeguarding
 * gates are separately approved.
 */
export type V1FeatureKey = 'voice' | 'academy' | 'pods' | 'parentChild';

/**
 * A plain mutable object, not `as const` — gated-domain e2e suites may flip
 * their own flag on for the duration of a test and restore it afterwards.
 */
export const V1_FEATURE_FLAGS: Record<V1FeatureKey, boolean> = {
  voice: true,
  academy: false,
  pods: false,
  parentChild: false,
};

/** API path prefixes gated by each flag. Checked by V1ScopeMiddleware. */
export const V1_GATED_API_PREFIXES: ReadonlyArray<{ prefix: string; feature: V1FeatureKey }> = [
  { prefix: '/ai/voice', feature: 'voice' },
  { prefix: '/academy', feature: 'academy' },
  { prefix: '/pods', feature: 'pods' },
  { prefix: '/family', feature: 'parentChild' },
];
