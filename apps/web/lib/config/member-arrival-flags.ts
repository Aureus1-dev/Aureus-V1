/**
 * Member Arrival — Steward Experience migration. A flag-gated rollout,
 * following the same mechanism `V1_FEATURE_FLAGS`
 * (`./v1-feature-scope.ts`) already established — a plain mutable object,
 * defaulting to false, flipped by a direct code change or a test's own
 * override — but kept in a separate file rather than added to that one:
 * `V1_FEATURE_FLAGS` is specifically the V1 Scope Lockdown (LAUNCH-001,
 * "no Pods, no Academy... voice entirely" — domains cut from the pilot
 * outright), and this isn't that. The legacy arrival flow stays fully
 * reachable either way; this flag only chooses which experience renders.
 */
export const MEMBER_ARRIVAL_FLAGS = {
  stewardExperience: false,
};
