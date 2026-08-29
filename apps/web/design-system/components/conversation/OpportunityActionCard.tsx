import type { OpportunityActionDto } from '../../../lib/api/conversations';
import styles from './OpportunityActionCard.module.css';

export interface OpportunityActionCardProps {
  action: OpportunityActionDto;
  onStartGuide?: (action: OpportunityActionDto) => void;
}

/**
 * A server-verified external action. The frontend never turns assistant prose
 * into a link and never accepts an arbitrary model URL. Defense in depth:
 * anything other than a verified registry action renders nothing actionable.
 */
export function OpportunityActionCard({ action, onStartGuide }: OpportunityActionCardProps) {
  if (action.status !== 'verified' || !action.url) return null;

  const verifiedLabel = formatVerifiedDate(action.lastVerifiedAt);

  return (
    <section className={styles.card} aria-label={`Verified action for ${action.title}`}>
      <h3 className={styles.heading}>{action.title}</h3>
      <p className={styles.provider}>{action.provider}</p>
      {verifiedLabel ? <p className={styles.meta}>Verified {verifiedLabel}</p> : null}
      {action.geography ? <p className={styles.detail}>Where: {action.geography}</p> : null}
      <p className={styles.detail}>Eligibility: {action.eligibility}</p>
      {action.payoutNotes ? <p className={styles.detail}>Payout: {action.payoutNotes}</p> : null}
      {action.timeToCashNotes ? <p className={styles.detail}>Timing: {action.timeToCashNotes}</p> : null}
      {action.affiliateDisclosure ? (
        <p className={styles.disclosure}>Disclosure: {action.affiliateDisclosure}</p>
      ) : null}
      <p className={styles.source}>Source: {action.sourceName}</p>
      <div className={styles.actions}>
        <a
          className={styles.actionLink}
          href={action.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open verified application
        </a>
        {onStartGuide ? (
          <button
            type="button"
            className={styles.guideButton}
            onClick={() => onStartGuide(action)}
          >
            Guide me through it
          </button>
        ) : null}
      </div>
    </section>
  );
}

function formatVerifiedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}
