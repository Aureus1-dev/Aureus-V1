'use client';

import { useEffect } from 'react';
import { useConnectedExperiences } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import { ProviderCard } from './ProviderCard';
import styles from './ConnectedAccountsTab.module.css';

/**
 * Connected Accounts — one card per provider (DOMAIN-008 Founder
 * Decision 4). "Feel like memory, not surveillance": every connection is
 * opt-in and revocable, and no card ever claims a connection succeeded
 * that didn't (Founder Decision 1) — unconfigured providers render an
 * honest Coming Soon state, never a fake Connected badge.
 */
export function ConnectedAccountsTab() {
  const connectedExperiences = useConnectedExperiences();
  const { state } = connectedExperiences;

  useEffect(() => {
    void connectedExperiences.loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedExperiences.loadProviders]);

  if (state.isLoadingProviders && state.providers.length === 0) {
    return <LoadingState label="Loading connected experiences" />;
  }

  if (state.error && state.providers.length === 0) {
    const copy = domainErrorCopy(state.error.kind);
    return <ErrorState title={copy.title} description={copy.description} />;
  }

  return (
    <div className={styles.tab}>
      <p className={styles.intro}>
        Every connection here is optional and can be revoked at any time. Your Steward will never assume access —
        you decide what to connect, and why.
      </p>
      <div className={styles.grid}>
        {state.providers.map((item) => (
          <ProviderCard
            key={item.providerType}
            item={item}
            isBusy={state.connectingProviderType === item.providerType}
            lastAttempt={state.lastConnectionAttemptByProvider[item.providerType]}
            onConnect={(providerType) => void connectedExperiences.connectProvider(providerType)}
            onRevoke={(providerType) => void connectedExperiences.revokeProvider(providerType)}
          />
        ))}
      </div>
    </div>
  );
}
