'use client';

import { useEffect, useState } from 'react';
import { useConversation, useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VoiceSurface } from '../voice';
import { ConversationHistory } from './ConversationHistory';
import { ConversationTimeline } from './ConversationTimeline';
import { MessageComposer } from './MessageComposer';
import { conversationErrorCopy } from './conversation-error-copy';
import styles from './ConversationSurface.module.css';

export interface ConversationSurfaceProps {
  /** From `?mode=voice` — lets another surface (e.g. Home's voice shortcut) deep-link straight into voice mode without importing any Voice Domain internals itself. */
  initialMode?: 'text' | 'voice';
}

/**
 * The Conversation Core surface (FPB-015 Phase Two). Conversation
 * remains the primary interface (AFX-001 §3); this component composes
 * history, timeline, composer, and recovery presentation around the
 * existing `/ai/conversations` backend contract.
 */
export function ConversationSurface({ initialMode = 'text' }: ConversationSurfaceProps) {
  const { session } = useSession();
  const {
    state,
    timeline,
    loadConversations,
    selectConversation,
    startNewConversation,
    setDraft,
    sendMessage,
    clearError,
  } = useConversation();
  const [mode, setMode] = useState<'text' | 'voice'>(initialMode);

  useEffect(() => {
    if (session.isAuthenticated) {
      void loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to talk with your steward"
        description="Conversation is where your Aureus journey begins. Sign in to continue."
      />
    );
  }

  const errorCopy = state.error ? conversationErrorCopy(state.error.kind) : null;

  return (
    <div className={styles.surface}>
      <ConversationHistory
        conversations={state.conversations}
        activeConversationId={state.activeConversationId}
        onSelect={(id) => void selectConversation(id)}
        onStartNew={startNewConversation}
      />

      <div className={styles.modeToggle}>
        <Button
          type="button"
          variant={mode === 'text' ? 'primary' : 'secondary'}
          onClick={() => setMode('text')}
          aria-pressed={mode === 'text'}
        >
          Type
        </Button>
        <Button
          type="button"
          variant={mode === 'voice' ? 'primary' : 'secondary'}
          onClick={() => setMode('voice')}
          aria-pressed={mode === 'voice'}
        >
          Talk
        </Button>
      </div>

      {mode === 'voice' ? (
        <VoiceSurface conversationId={state.activeConversationId ?? undefined} onClose={() => setMode('text')} />
      ) : (
        <>
          {timeline.length === 0 && !state.pendingResponse ? (
            <EmptyState
              title="Share what's on your mind"
              description="Your steward is listening. There's no wrong way to begin."
            />
          ) : (
            <ConversationTimeline messages={timeline} pendingResponse={state.pendingResponse} />
          )}

          {errorCopy ? (
            <ErrorState
              title={errorCopy.title}
              description={errorCopy.description}
              action={
                state.error?.retryable && state.draft.trim().length > 0 ? (
                  <Button variant="secondary" onClick={() => void sendMessage()}>
                    Try again
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={clearError}>
                    Dismiss
                  </Button>
                )
              }
            />
          ) : null}

          <MessageComposer
            value={state.draft}
            onChange={setDraft}
            onSubmit={() => void sendMessage()}
            disabled={state.pendingResponse}
          />
        </>
      )}
    </div>
  );
}
