import { VisuallyHidden } from '../../accessibility';
import styles from './Message.module.css';

export interface StewardMessageProps {
  content: string;
}

/**
 * The AI steward's reply in the conversation (FPB-005 §3 "Conversation",
 * AFX-002). The frontend renders the response as returned — it does not
 * fabricate or rewrite a separate "reflection" (Founder Decision, FWO-002).
 */
export function StewardMessage({ content }: StewardMessageProps) {
  return (
    <div className={`${styles.message} ${styles.steward}`}>
      <VisuallyHidden>Your steward said</VisuallyHidden>
      <p className={styles.bubble}>{content}</p>
    </div>
  );
}
