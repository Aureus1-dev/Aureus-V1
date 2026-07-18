'use client';

import { useEffect, useState } from 'react';
import { useMessages, useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import { ConversationRow } from './ConversationRow';
import { MessageThread } from './MessageThread';
import styles from './MessagesPage.module.css';

/**
 * The standing Messages surface (PR-002) — the Communication System's
 * Messaging sub-domain (WO-026) has supported conversations since its
 * original build; this is the first place a member actually sees them.
 * Scoped to existing conversations — see `lib/api/messages.ts` for why
 * starting a new one is a documented follow-up, not built here.
 */
export function MessagesPage() {
  const { session } = useSession();
  const { state, loadConversations } = useMessages();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  if (!session.isAuthenticated) {
    return <EmptyState title="Sign in to view your messages" description="Sign in to see your conversations." />;
  }

  const errorCopy = state.error ? domainErrorCopy(state.error.kind) : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Messages</h1>

      {selectedId ? (
        <MessageThread conversationId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          {state.isLoadingConversations && state.conversations.length === 0 ? (
            <LoadingState label="Loading conversations" />
          ) : null}

          {errorCopy && state.conversations.length === 0 && !state.isLoadingConversations ? (
            <ErrorState title={errorCopy.title} description={errorCopy.description} />
          ) : null}

          {!state.isLoadingConversations && !state.error && state.conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              description="Conversations appear here once one starts — with your Steward, or with another organization representative."
            />
          ) : null}

          {state.conversations.length > 0 ? (
            <ul className={styles.list}>
              {state.conversations.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} onOpen={() => setSelectedId(conversation.id)} />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
