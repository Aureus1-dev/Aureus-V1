/**
 * Gate C (C7: Safe failure). Pure, reviewable copy for the one honest thing
 * Aureus can say when a stated need has no verified City Sheet resource and
 * no steward is reachable to page directly: the truth, plus a real next
 * step that doesn't depend on this system's own capacity. The universal
 * safety numbers are reused word-for-word from `CRISIS_REDIRECT_MESSAGE`
 * (C3) / `UrgentHelpAffordance` (B2) so this messaging never drifts from
 * what's already established elsewhere in the product.
 */
export const NO_VERIFIED_RESOURCE_NO_STEWARD_REASON = 'NO_VERIFIED_RESOURCE_NO_STEWARD';

export const SAFE_FAILURE_MESSAGE =
  "I don't have a verified resource for this yet, and there's no steward currently reachable to help directly. " +
  "I've recorded what you shared so a human steward can follow up as soon as one is available — this is never silently dropped.";

export const SAFE_FAILURE_NEXT_STEP =
  'If you need help right now, call 911, or reach the 988 Suicide & Crisis Lifeline (call or text 988) or the Crisis Text Line ' +
  '(text HOME to 741741) — all available 24/7, independent of Aureus. You can also check back here; a steward will see what you shared.';
