import type { ReactNode } from 'react';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import styles from './JourneyTimeline.module.css';

export interface JourneyTimelineProps {
  loading?: boolean;
  loadingLabel?: string;
  error?: { title: string; description?: string; action?: ReactNode } | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Already-built `JourneyCard`s — this only supplies the connecting-line timeline layout and loading/error/empty framing, never the fetch itself. */
  children?: ReactNode;
}

/**
 * A vertical timeline treatment for the member's Goal → Journey threads —
 * `JourneyCard`/`ProgressIndicator` are reused verbatim; this only
 * replaces the plain grid layout with a connecting line, reading as one
 * continuous journey rather than a list of unrelated tiles.
 */
export function JourneyTimeline({
  loading = false,
  loadingLabel = 'Loading your journey',
  error = null,
  isEmpty = false,
  emptyTitle = 'No journeys yet',
  emptyDescription,
  children,
}: JourneyTimelineProps) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState title={error.title} description={error.description} action={error.action} />;
  if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return <div className={styles.timeline}>{children}</div>;
}
