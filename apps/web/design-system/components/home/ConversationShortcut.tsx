'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useConversation } from '../../../state';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import styles from './ConversationShortcut.module.css';

/**
 * Conversation and voice shortcuts, combined into one widget rather
 * than two near-identical cards. The voice entry point is a plain link
 * into `/conversation?mode=voice` — this widget imports nothing from
 * the Voice Domain itself (DOMAIN-003 Founder Decision 3).
 */
export function ConversationShortcut() {
  const { state, loadConversations } = useConversation();

  useEffect(() => {
    void loadConversations();
    // `loadConversations` is recreated (via useCallback) whenever the
    // session access token changes, so depending on it here re-fires the
    // load once a token becomes available after mount rather than
    // silently no-oping forever.
  }, [loadConversations]);

  const mostRecent = state.conversations[0] ?? null;

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Your steward is listening</h2>
      <p className={styles.body}>
        {mostRecent
          ? `Pick up where you left off${mostRecent.title ? `: "${mostRecent.title}"` : ''}.`
          : "There's no wrong way to begin a conversation."}
      </p>
      <div className={styles.actions}>
        <Link href="/conversation">
          <Button>Continue the conversation</Button>
        </Link>
        <Link href="/conversation?mode=voice">
          <Button variant="secondary">Talk out loud instead</Button>
        </Link>
      </div>
    </Card>
  );
}
