import type { ReactNode } from 'react';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import styles from './OpportunityStack.module.css';

export interface OpportunityStackProps {
  loading?: boolean;
  loadingLabel?: string;
  error?: { title: string; description?: string; action?: ReactNode } | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Already-built `OpportunityCard`s (or any card sharing the same shape) — this only supplies the vertical stack layout and loading/error/empty framing, never the fetch itself. */
  children?: ReactNode;
}

/**
 * A calm vertical stack of Opportunity cards, replacing the grid-of-tiles
 * layout with something that reads naturally inline in a conversation or
 * inside a Room — `OpportunityCard` itself (highlight-registry
 * registration included) is reused verbatim.
 */
export function OpportunityStack({
  loading = false,
  loadingLabel = 'Finding opportunities',
  error = null,
  isEmpty = false,
  emptyTitle = 'No opportunities yet',
  emptyDescription,
  children,
}: OpportunityStackProps) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState title={error.title} description={error.description} action={error.action} />;
  if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return <div className={styles.stack}>{children}</div>;
}
