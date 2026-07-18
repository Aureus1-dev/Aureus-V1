import type { PodDto } from '../../../lib/api/pods';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import styles from './PodCard.module.css';

export interface PodCardProps {
  pod: PodDto;
  alreadyRequested: boolean;
  isSubmitting: boolean;
  onRequestToJoin: () => void;
}

const TYPE_LABEL: Record<PodDto['type'], string> = { HOME: 'Home Pod', INTEREST: 'Interest Pod' };

export function PodCard({ pod, alreadyRequested, isSubmitting, onRequestToJoin }: PodCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <p className={styles.name}>{pod.name}</p>
        <span className={styles.type}>{TYPE_LABEL[pod.type]}</span>
      </div>
      <p className={styles.description}>{pod.shortDescription}</p>
      {pod.city || pod.country ? (
        <p className={styles.location}>{[pod.city, pod.country].filter(Boolean).join(', ')}</p>
      ) : null}
      <Button variant="secondary" onClick={onRequestToJoin} disabled={isSubmitting || alreadyRequested}>
        {alreadyRequested ? 'Request sent' : isSubmitting ? 'Sending…' : 'Request to join'}
      </Button>
    </Card>
  );
}
