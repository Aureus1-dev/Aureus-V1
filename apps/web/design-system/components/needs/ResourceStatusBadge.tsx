import styles from './ResourceStatusBadge.module.css';

export type ResourceStatusBadgeState = 'verified' | 'unverified' | 'test' | 'unavailable';

const LABELS: Record<ResourceStatusBadgeState, string> = {
  verified: 'Verified',
  unverified: 'Not yet verified',
  test: 'Test data',
  unavailable: 'Unavailable',
};

/**
 * Gate C (C5: Verified resource presentation). A member must never be able
 * to mistake an unverified or test-fixture resource for a verified one —
 * this is the one place that mapping happens, deterministic and pure, so
 * every surface that shows a resource renders the same, honest label.
 */
export function ResourceStatusBadge({ state }: { state: ResourceStatusBadgeState }) {
  return (
    <span className={[styles.badge, styles[state]].join(' ')} role="status">
      {LABELS[state]}
    </span>
  );
}
