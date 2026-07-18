'use client';

import { useEffect, useState } from 'react';
import { useMessages, useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import styles from './MessageThread.module.css';

export interface MessageThreadProps {
  conversationId: string;
  onBack: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** A conversation's messages, newest at the bottom, plus a composer to reply (PR-002). */
export function MessageThread({ conversationId, onBack }: MessageThreadProps) {
  const { session } = useSession();
  const { state, loadMessages, send, markRead } = useMessages();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void loadMessages(conversationId);
    void markRead(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const messages = state.messagesByConversationId[conversationId] ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await send(conversationId, body);
    setDraft('');
  }

  return (
    <div className={styles.thread}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← Back to conversations
      </button>

      {state.isLoadingMessages && messages.length === 0 ? <LoadingState label="Loading messages" /> : null}

      {!state.isLoadingMessages && messages.length === 0 ? (
        <EmptyState title="No messages yet" description="Send the first message below." />
      ) : null}

      <ul className={styles.messages}>
        {messages.map((message) => {
          const isMine = message.senderId === session.memberId;
          return (
            <li key={message.id} className={isMine ? styles.mine : styles.theirs}>
              <p className={styles.body}>{message.body}</p>
              <span className={styles.time}>{formatTime(message.createdAt)}</span>
            </li>
          );
        })}
      </ul>

      <form className={styles.composer} onSubmit={(event) => void submit(event)}>
        <label className={styles.composerField} htmlFor="message-draft">
          <VisuallyHidden>Write a message</VisuallyHidden>
          <textarea
            id="message-draft"
            className={styles.textarea}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Write a message..."
          />
        </label>
        <Button type="submit" disabled={state.isSending || !draft.trim()}>
          {state.isSending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
