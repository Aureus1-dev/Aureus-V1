import type { OpportunityActionDto } from '../../../lib/api/conversations';
import { VisuallyHidden } from '../../accessibility';
import { OpportunityActionCard } from './OpportunityActionCard';
import styles from './Message.module.css';

export interface StewardMessageProps {
  content: string;
  opportunityAction?: OpportunityActionDto;
  onStartApplicationGuide?: (action: OpportunityActionDto) => void;
}

/**
 * The AI steward's reply in the conversation (FPB-005 §3 "Conversation",
 * AFX-002). The frontend renders the response as returned — it does not
 * fabricate or rewrite a separate "reflection" (Founder Decision, FWO-002).
 * A verified Opportunity action is separate structured server data; prose is
 * never parsed or promoted into an external link.
 */
export function StewardMessage({
  content,
  opportunityAction,
  onStartApplicationGuide,
}: StewardMessageProps) {
  if (!opportunityAction) {
    return (
      <div className={`${styles.message} ${styles.steward}`}>
        <VisuallyHidden>Your steward said</VisuallyHidden>
        <p className={styles.bubble}>{content}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.message} ${styles.steward}`}>
      <div className={styles.actionStack}>
        <VisuallyHidden>Your steward said</VisuallyHidden>
        <p className={styles.bubble}>{content}</p>
        <OpportunityActionCard
          action={opportunityAction}
          onStartGuide={onStartApplicationGuide}
        />
      </div>
    </div>
  );
}
