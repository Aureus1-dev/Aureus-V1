import styles from './VisuallyHidden.module.css';

/**
 * Renders content for assistive technology only. Used to give
 * icon-only controls and implicit context an accessible name without
 * adding redundant visible text (FPB-011 §4-5).
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className={styles.visuallyHidden}>{children}</span>;
}
