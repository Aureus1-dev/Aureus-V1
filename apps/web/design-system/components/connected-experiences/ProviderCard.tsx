import type { ConnectedProviderType, ConnectionAttemptDto, ProviderCatalogItemDto } from '../../../lib/api/connected-accounts';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { formatEnumLabel } from './connected-experiences-format';
import styles from './ProviderCard.module.css';

export interface ProviderCardProps {
  item: ProviderCatalogItemDto;
  isBusy: boolean;
  lastAttempt?: ConnectionAttemptDto;
  onConnect: (providerType: ConnectedProviderType) => void;
  onRevoke: (providerType: ConnectedProviderType) => void;
}

/**
 * One Connected Experiences provider card — answers the four questions a
 * member needs before granting access (DOMAIN-008 Founder Decision 4):
 * what Aureus can access, why it's needed, what the AI Steward can do
 * with it, and whether it's actually available. Never claims a connection
 * succeeded that didn't (Founder Decision 1) — a Coming Soon state renders
 * honestly, with no Connected badge and no fabricated account details.
 */
export function ProviderCard({ item, isBusy, lastAttempt, onConnect, onRevoke }: ProviderCardProps) {
  const isConnected = item.connectionState === 'CONNECTED';
  const isComingSoon = item.connectionState === 'COMING_SOON';

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.category}>{formatEnumLabel(item.category)}</span>
          <h2 className={styles.title}>{item.displayName}</h2>
        </div>
        <span className={isConnected ? styles.badgeConnected : isComingSoon ? styles.badgeComingSoon : styles.badgeNotConnected}>
          {isConnected ? 'Connected' : isComingSoon ? 'Coming Soon' : 'Not Connected'}
        </span>
      </div>

      <dl className={styles.answers}>
        <dt>What Aureus can access</dt>
        <dd>{item.whatAureusCanAccess}</dd>
        <dt>Why it&apos;s needed</dt>
        <dd>{item.whyItsNeeded}</dd>
        <dt>What your AI Steward can do with it</dt>
        <dd>{item.whatTheAiStewardCanDo}</dd>
      </dl>

      {lastAttempt?.status === 'COMING_SOON' ? <p className={styles.attemptMessage}>{lastAttempt.message}</p> : null}

      <div className={styles.actions}>
        {isConnected ? (
          <Button variant="secondary" onClick={() => onRevoke(item.providerType)} disabled={isBusy}>
            {isBusy ? 'Revoking…' : 'Revoke access'}
          </Button>
        ) : (
          <Button onClick={() => onConnect(item.providerType)} disabled={isBusy}>
            {isBusy ? 'Connecting…' : 'Connect'}
          </Button>
        )}
      </div>
    </Card>
  );
}
