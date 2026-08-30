'use client';

import { useState } from 'react';
import type { ConversationDto, MessageDto } from '../../../lib/api/conversations';
import styles from './ConversationHistory.module.css';

export interface ConversationHistoryProps {
  conversations: ConversationDto[];
  activeConversationId: string | null;
  messages: MessageDto[];
  onSelect: (id: string) => void;
  onStartNew: () => void;
}

function speakerFor(message: MessageDto): string {
  if (message.role === 'USER') return 'You';
  if (message.role === 'ASSISTANT') return 'Aureus';
  return 'System';
}

export function ConversationHistory({
  conversations,
  activeConversationId,
  messages,
  onSelect,
  onStartNew,
}: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          onClick={() => {
            onStartNew();
            setOpen(false);
          }}
        >
          New
        </button>
        <button
          type="button"
          className={styles.control}
          aria-expanded={open}
          aria-controls="conversation-history-drawer"
          onClick={() => setOpen((value) => !value)}
        >
          History
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close conversation history"
            onClick={() => setOpen(false)}
          />
          <div
            id="conversation-history-drawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Conversation history"
          >
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>The conversation is still here</p>
                <h2>History</h2>
              </div>
              <button type="button" className={styles.close} onClick={() => setOpen(false)}>
                Close
              </button>
            </header>

            <section className={styles.threads} aria-labelledby="history-threads-heading">
              <h3 id="history-threads-heading">Conversations</h3>
              {conversations.length > 0 ? (
                <ul className={styles.list}>
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={styles.item}
                        aria-current={conversation.id === activeConversationId ? 'true' : undefined}
                        onClick={() => onSelect(conversation.id)}
                      >
                        {conversation.title ?? 'Untitled conversation'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>No saved conversations yet.</p>
              )}
            </section>

            <section className={styles.transcript} aria-labelledby="history-transcript-heading">
              <h3 id="history-transcript-heading">Full transcript</h3>
              {messages.length > 0 ? (
                <ol className={styles.turns}>
                  {messages.map((message) => (
                    <li key={message.id} className={styles.turn}>
                      <span className={styles.speaker}>{speakerFor(message)}</span>
                      <p>{message.content}</p>
                      {message.opportunityAction ? (
                        <span className={styles.savedAction}>
                          Verified action: {message.opportunityAction.title}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.empty}>Nothing has been said in this conversation yet.</p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
