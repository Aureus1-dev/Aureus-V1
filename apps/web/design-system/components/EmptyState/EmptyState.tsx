import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /**
   * The element the title renders as. Defaults to `'p'` — what every
   * existing usage has always produced — so nothing changes anywhere
   * unless a surface opts in.
   *
   * Pass a heading level when this empty state *is* the page, rather
   * than one empty region within it. A surface whose only content is an
   * empty state otherwise renders with no heading at all, leaving the
   * document outline and screen-reader navigation with nothing to
   * announce it by. `/home` before a member's first goal was exactly
   * that case.
   */
  titleAs?: 'p' | 'h1' | 'h2';
}

/**
 * Feedback primitive (FPB-005 §3 "Feedback"). Used wherever a surface
 * has no content yet, including the routing scaffold placeholder pages.
 */
export function EmptyState({
  title,
  description,
  action,
  titleAs: TitleTag = 'p',
}: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <TitleTag className={styles.title}>{title}</TitleTag>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
