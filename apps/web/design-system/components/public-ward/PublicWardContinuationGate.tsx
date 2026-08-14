'use client';

import { useEffect, useState } from 'react';
import { redeemWardContinuation } from '../../../lib/api/telephony-continuity';
import { PublicWardExperience } from './PublicWardExperience';

interface Props {
  slug: string;
  continuationToken?: string;
}

const storageKey = (slug: string) => `aureus:ward:${slug}`;

export function PublicWardContinuationGate({ slug, continuationToken }: Props) {
  const [state, setState] = useState<'redeeming' | 'ready' | 'error'>(
    continuationToken ? 'redeeming' : 'ready',
  );

  useEffect(() => {
    if (!continuationToken) return;
    let active = true;
    void redeemWardContinuation(slug, continuationToken)
      .then((redeemed) => {
        if (!active) return;
        window.sessionStorage.setItem(
          storageKey(slug),
          JSON.stringify({
            conversationId: redeemed.conversationId,
            accessToken: redeemed.accessToken,
          }),
        );
        const url = new URL(window.location.href);
        url.searchParams.delete('continue');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        setState('ready');
      })
      .catch(() => {
        if (!active) return;
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [slug, continuationToken]);

  if (state === 'redeeming') {
    return <main aria-busy="true"><p>Opening your private continuation…</p></main>;
  }

  if (state === 'error') {
    return (
      <main role="alert">
        <h1>This continuation link is no longer available.</h1>
        <p>You can start a new private Ward conversation below.</p>
        <PublicWardExperience slug={slug} />
      </main>
    );
  }

  return <PublicWardExperience slug={slug} />;
}
