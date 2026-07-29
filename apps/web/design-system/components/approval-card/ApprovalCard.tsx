import type { ReactNode } from 'react';
import { StewardCard } from '../steward-card/StewardCard';

export interface ApprovalCardProps {
  children?: ReactNode;
}

/**
 * The inline-conversation frame for anything that still needs a member's
 * decision — an `ApprovalPanel`/`RecommendationCard` (a RECOMMENDATION plan
 * item) or a `MatchedResourceCard` (a CITY_RESOURCE offer). Never
 * reimplements approval — "Aureus prepares. The member approves." (AFX-001
 * §10) stays entirely with whichever of those two real mechanisms the
 * caller passes in as `children`; this only supplies the fixed `approval`
 * accent so a pending decision reads as a card in the dialogue.
 */
export function ApprovalCard({ children }: ApprovalCardProps) {
  return <StewardCard variant="approval">{children}</StewardCard>;
}
