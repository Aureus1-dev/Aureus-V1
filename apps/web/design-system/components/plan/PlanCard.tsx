import type { PlanItemDto } from '../../../lib/api/plan';
import type { ResourceOfferResponseValue } from '../../../lib/api/needs';
import { RecommendationCard, type RecommendationSubject } from '../recommendations';
import { MatchedResourceCard } from '../needs/MatchedResourceCard';
import styles from './PlanCard.module.css';

/**
 * A stable key for a plan item independent of its discriminated shape —
 * `PlanItemDto` has no single `id` field of its own since a RECOMMENDATION
 * item and a CITY_RESOURCE item point at two different real records
 * (`AiRecommendation` vs a City Sheet entry), each keeping its own real
 * approval mechanism.
 */
export function planItemKey(item: PlanItemDto): string {
  return item.source === 'RECOMMENDATION' ? `recommendation:${item.recommendation!.id}` : `city-resource:${item.cityResource!.id}`;
}

export interface PlanCardProps {
  item: PlanItemDto;
  /** "Primary" or "Supporting" — never rendered as a plain, unlabeled list. */
  role: 'Primary' | 'Supporting';
  /** Resolved display copy for a RECOMMENDATION item's target — ignored for a CITY_RESOURCE item, which already carries its own full detail. */
  subject: RecommendationSubject | null;
  /** The member's existing response to a CITY_RESOURCE item's offer — ignored for a RECOMMENDATION item. */
  offerResponse: ResourceOfferResponseValue | null;
  deciding: boolean;
  onApprove: () => void;
  onDismiss: () => void;
}

/**
 * Member Arrival — Steward Experience migration. One item of a
 * Coordinated Plan — never re-implements approval: a RECOMMENDATION item
 * composes the same `RecommendationCard` (approve/dismiss) Review &
 * Approval already used, a CITY_RESOURCE item composes the same
 * `MatchedResourceCard` (accept/decline) Gate C's resource presentation
 * already used. This component only adds the Primary/Supporting role
 * label and the category it was drawn from.
 */
export function PlanCard({ item, role, subject, offerResponse, deciding, onApprove, onDismiss }: PlanCardProps) {
  return (
    <div className={styles.item}>
      <div className={styles.roleRow}>
        <span className={role === 'Primary' ? styles.rolePrimary : styles.roleSupporting}>{role}</span>
        <span className={styles.categoryLabel}>{item.categoryLabel}</span>
      </div>
      {item.source === 'RECOMMENDATION' ? (
        <RecommendationCard
          rationale={item.recommendation!.rationale}
          subject={subject}
          deciding={deciding}
          onApprove={onApprove}
          onDismiss={onDismiss}
        />
      ) : (
        <MatchedResourceCard
          resource={item.cityResource!}
          response={offerResponse}
          deciding={deciding}
          onAccept={onApprove}
          onDecline={onDismiss}
        />
      )}
    </div>
  );
}
