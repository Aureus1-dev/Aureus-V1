import type { ResourceDto } from '../../../lib/api/resources';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import styles from './ResourceCard.module.css';

export interface ResourceCardProps {
  resource: ResourceDto;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
}

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

export function ResourceCard({ resource, saved, onToggleSave, onOpen }: ResourceCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.category}>{formatCategory(resource.category)}</span>
        {resource.isRemote ? <span className={styles.remote}>Remote</span> : null}
      </div>
      <h3 className={styles.title}>{resource.title}</h3>
      <p className={styles.description}>{resource.shortDescription}</p>
      <p className={styles.organization}>{resource.organizationName}</p>
      <div className={styles.actions}>
        <Button onClick={onOpen}>Visit resource</Button>
        <Button variant="secondary" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
