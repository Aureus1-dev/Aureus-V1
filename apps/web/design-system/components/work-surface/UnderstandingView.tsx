import styles from './UnderstandingView.module.css';

export interface UnderstandingViewProps {
  lastMessage: string;
}

/**
 * State B (portfolio §6): between the first message and real work
 * existing, Aureus is briefly "listening" rather than exploding into
 * cards. This does not expose chain-of-thought — it names no internal
 * step, just that the member's message was received and Aureus is
 * getting oriented.
 */
export function UnderstandingView({ lastMessage }: UnderstandingViewProps) {
  return (
    <div className={styles.wrap} role="status">
      <p className={styles.message}>&ldquo;{lastMessage}&rdquo;</p>
      <p className={styles.listening}>
        <span className={styles.dot} aria-hidden="true" />
        Aureus is getting oriented…
      </p>
    </div>
  );
}
