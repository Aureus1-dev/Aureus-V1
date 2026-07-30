/**
 * C2 — V1 Scope Lockdown. Single source of truth for which member-facing
 * domains are reachable in the five-member pilot. Mirrors (does not
 * import — apps/web and apps/api are separate deployables with no wired
 * shared package) apps/api/src/config/v1-feature-scope.ts — keep both in
 * sync by hand.
 *
 * Academy and Pods stay off: fully built, but unreachable until a Founder
 * decision flips them back on. Voice was reopened by Founder decision —
 * the OpenAI Realtime provider (`OpenAiVoiceProvider`) is real and live
 * once `OPENAI_API_KEY` is configured in the deployment environment;
 * this flag only controls whether members can reach it.
 */
export const V1_FEATURE_FLAGS = {
  voice: true,
  academy: false,
  pods: false,
} as const;

export type V1FeatureKey = keyof typeof V1_FEATURE_FLAGS;
