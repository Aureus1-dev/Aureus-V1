'use client';

import { useState } from 'react';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import type { ResourceDto } from '../../../lib/api/resources';
import type { SavedResourceDto } from '../../../lib/api/saved-resources';
import styles from './SavedResourceRow.module.css';

export interface SavedResourceUpdate {
  isFavorite?: boolean;
  notes?: string;
}

export interface SavedResourceRowProps {
  record: SavedResourceDto;
  resource: ResourceDto | null;
  isLoadingDetail: boolean;
  onUpdate: (update: SavedResourceUpdate) => void;
  onRemove: () => void;
}

/**
 * A member's own saved-resource tracking — a favorite flag and a
 * private note, mirroring `SavedOpportunityRow` (PR-002). Notes commit
 * on blur rather than per keystroke, to avoid a request per character.
 */
export function SavedResourceRow({ record, resource, isLoadingDetail, onUpdate, onRemove }: SavedResourceRowProps) {
  const [notes, setNotes] = useState(record.notes ?? '');
  const name = resource?.title ?? 'this resource';

  return (
    <Card className={styles.row}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{resource ? resource.title : isLoadingDetail ? 'Loading…' : 'Resource'}</p>
          {resource ? <p className={styles.organization}>{resource.organizationName}</p> : null}
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

      <div className={styles.actions}>
        {resource ? (
          <a className={styles.link} href={resource.officialSourceUrl} target="_blank" rel="noreferrer noopener">
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
