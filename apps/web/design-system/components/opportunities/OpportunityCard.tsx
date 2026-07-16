import type { OpportunityDto } from '../../../lib/api/opportunities';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { useRegisterHighlightTarget } from '../../../state';
import styles from './OpportunityCard.module.css';
import highlightStyles from '../highlight/highlight.module.css';

export interface OpportunityCardProps {
  opportunity: OpportunityDto;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
}

/**
 * Opportunity Card (FPB-005 §3 "Information"). Opportunity Discovery is
 * a core value of the institution (AFX-001 §8) — every card explains
 * why the opportunity is relevant enough to show, never just a listing.
 * Registered as `Opportunity.Card.<id>` in the Global Highlight Registry
 * (DOMAIN-005 Founder Decision 4) so the voice steward can point one out
 * by id while talking, wherever it happens to be rendered.
 */
export function OpportunityCard({ opportunity, saved, onToggleSave, onOpen }: OpportunityCardProps) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLDivElement>(`Opportunity.Card.${opportunity.id}`, {
    label: opportunity.title,
    description: opportunity.shortDescription,
  });

  return (
    <div ref={ref} className={isActive ? highlightStyles.highlighted : undefined}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.category}>{formatCategory(opportunity.category)}</span>
          {opportunity.deadline ? (
            <span className={styles.deadline}>Deadline {formatDate(opportunity.deadline)}</span>
          ) : null}
        </div>
        <h3 className={styles.title}>{opportunity.title}</h3>
        <p className={styles.description}>{opportunity.shortDescription}</p>
        <p className={styles.provider}>{opportunity.provider}</p>
        <div className={styles.actions}>
          <Button onClick={onOpen}>View details</Button>
          <Button variant="secondary" onClick={onToggleSave} aria-pressed={saved}>
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
