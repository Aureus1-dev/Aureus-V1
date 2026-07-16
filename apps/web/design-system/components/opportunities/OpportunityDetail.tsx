import type { OpportunityDto } from '../../../lib/api/opportunities';
import { Button } from '../Button/Button';
import styles from './OpportunityDetail.module.css';

export interface OpportunityDetailProps {
  opportunity: OpportunityDto;
  saved: boolean;
  onToggleSave: () => void;
}

/**
 * Review Screen (FPB-005 §3 "Forms"). Presents everything a member
 * needs to decide, with the official source always visible (AFX-001 §8
 * — recommendations shall be "transparent, explainable, and grounded in
 * evidence").
 */
export function OpportunityDetail({ opportunity, saved, onToggleSave }: OpportunityDetailProps) {
  return (
    <article className={styles.detail}>
      <h2 className={styles.title}>{opportunity.title}</h2>
      <p className={styles.provider}>{opportunity.provider}</p>
      <p className={styles.description}>{opportunity.fullDescription}</p>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Eligibility</h3>
        <p>{opportunity.eligibilityRules}</p>
      </section>

      {opportunity.deadline ? (
        <p className={styles.deadline}>
          Deadline: {new Date(opportunity.deadline).toLocaleDateString(undefined, { dateStyle: 'long' })}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? 'Saved' : 'Save for later'}
        </Button>
        <a
          className={styles.sourceLink}
          href={opportunity.applicationUrl ?? opportunity.officialSourceUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          View official source
        </a>
      </div>
    </article>
  );
}
