'use client';

import { useEffect, useState } from 'react';
import { getMyProfile } from '../../../lib/api/profile';
import { useSession } from '../../../state';

/**
 * A narrow, read-only profile lookup for the greeting only — not a
 * `ProfileContext` (DOMAIN-003 §6: Profile editing remains out of
 * scope). Degrades gracefully through three tiers since not every
 * member has a Profile record yet, and `displayName` is optional even
 * when one exists: displayName -> email-derived name -> null (the
 * caller falls back to generic copy).
 */
export function useGreetingName(): string | null {
  const { session } = useSession();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!session.accessToken || !session.memberId) {
      return;
    }
    let cancelled = false;

    void getMyProfile(session.accessToken, session.memberId).then((profile) => {
      if (cancelled) return;
      const displayName = profile?.displayName?.trim();
      if (displayName) {
        setName(displayName);
      } else if (session.email) {
        setName(session.email.split('@')[0]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session.accessToken, session.memberId, session.email]);

  return name;
}
