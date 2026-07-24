import type { MatchedResourceDto, ResourceOfferResponseValue } from '../../../lib/api/needs';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { ResourceStatusBadge, type ResourceStatusBadgeState } from './ResourceStatusBadge';
import styles from './MatchedResourceCard.module.css';

export interface MatchedResourceCardProps {
  resource: MatchedResourceDto;
  response: ResourceOfferResponseValue | null;
  deciding: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Gate C (C5: Verified resource presentation). Unverified resources are
 * never presented as verified — the badge state is derived directly from
 * the backend's own `verificationStatus`/`isTestFixture` facts, never
 * guessed or defaulted to "verified."
 */
function badgeStateFor(resource: MatchedResourceDto): ResourceStatusBadgeState {
  if (resource.isTestFixture) return 'test';
  return resource.verificationStatus === 'VERIFIED' ? 'verified' : 'unverified';
}

export function MatchedResourceCard({ resource, response, deciding, onAccept, onDecline }: MatchedResourceCardProps) {
  const decided = response === 'ACCEPTED' || response === 'DECLINED';

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{resource.organizationName}</h3>
        <ResourceStatusBadge state={badgeStateFor(resource)} />
      </div>
      <p className={styles.description}>{resource.description}</p>
      {resource.phone ? <p className={styles.detail}>Phone: {resource.phone}</p> : null}
      {resource.hours ? <p className={styles.detail}>Hours: {resource.hours}</p> : null}
      {decided ? (
        <p className={styles.decided}>{response === 'ACCEPTED' ? "You accepted this resource." : 'You declined this resource.'}</p>
      ) : (
        <div className={styles.actions}>
          <Button onClick={onAccept} disabled={deciding}>
            {deciding ? 'Saving…' : 'Accept'}
          </Button>
          <Button variant="secondary" onClick={onDecline} disabled={deciding}>
            Decline
          </Button>
        </div>
      )}
    </Card>
  );
}
