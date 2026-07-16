'use client';

import { useState } from 'react';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import type { OpportunityDto } from '../../../lib/api/opportunities';
import type { SavedOpportunityDto, TrackingStatus } from '../../../lib/api/saved-opportunities';
import styles from './SavedOpportunityRow.module.css';

export interface SavedOpportunityUpdate {
  isFavorite?: boolean;
  trackingStatus?: TrackingStatus;
  notes?: string;
}

export interface SavedOpportunityRowProps {
  record: SavedOpportunityDto;
  opportunity: OpportunityDto | null;
  isLoadingDetail: boolean;
  onUpdate: (update: SavedOpportunityUpdate) => void;
  onRemove: () => void;
}

const STATUS_OPTIONS: { value: TrackingStatus; label: string }[] = [
  { value: 'SAVED', label: 'Saved' },
  { value: 'APPLYING', label: 'Applying' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
];

/**
 * A member's own, self-reported progress on a saved opportunity — never
 * automated or inferred (PA-007 "shall not apply on behalf of members").
 * Notes commit on blur rather than per keystroke, to avoid a request per
 * character typed.
 */
export function SavedOpportunityRow({ record, opportunity, isLoadingDetail, onUpdate, onRemove }: SavedOpportunityRowProps) {
  const [notes, setNotes] = useState(record.notes ?? '');
  const name = opportunity?.title ?? 'this opportunity';

  return (
    <Card className={styles.row}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{opportunity ? opportunity.title : isLoadingDetail ? 'Loading…' : 'Opportunity'}</p>
          {opportunity ? <p className={styles.provider}>{opportunity.provider}</p> : null}
        </div>
        <Button
          variant="secondary"
          onClick={() => onUpdate({ isFavorite: !record.isFavorite })}
          aria-pressed={record.isFavorite}
        >
          {record.isFavorite ? 'Favorited' : 'Favorite'}
          <VisuallyHidden>{` "${name}"`}</VisuallyHidden>
        </Button>
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <select
            className={styles.input}
            value={record.trackingStatus}
            onChange={(event) => onUpdate({ trackingStatus: event.target.value as TrackingStatus })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Notes</span>
          <input
            className={styles.input}
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== (record.notes ?? '')) onUpdate({ notes });
            }}
            placeholder="Add a note for yourself"
          />
        </label>
      </div>

      <div className={styles.actions}>
        {opportunity ? (
          <a
            className={styles.link}
            href={opportunity.applicationUrl ?? opportunity.officialSourceUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            View official source
          </a>
        ) : null}
        <Button variant="secondary" onClick={onRemove}>
          Remove
          <VisuallyHidden>{` "${name}"`}</VisuallyHidden>
        </Button>
      </div>
    </Card>
  );
}
