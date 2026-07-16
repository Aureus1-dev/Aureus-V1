import styles from './SkipLink.module.css';

/**
 * Allows keyboard and screen-reader members to bypass repeated navigation
 * and reach primary content directly (FPB-011 §5, §10).
 */
export function SkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a className={styles.skipLink} href={`#${targetId}`}>
      Skip to main content
    </a>
  );
}
