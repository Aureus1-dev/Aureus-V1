import { VisuallyHidden } from '../../accessibility';
import styles from './Message.module.css';

export interface MemberMessageProps {
  content: string;
}

/**
 * A member's own message in the conversation (FPB-005 §3 "Conversation").
 */
export function MemberMessage({ content }: MemberMessageProps) {
  return (
    <div className={`${styles.message} ${styles.member}`}>
      <VisuallyHidden>You said</VisuallyHidden>
      <p className={styles.bubble}>{content}</p>
    </div>
  );
}
