'use client';

import Link from 'next/link';
import { useConversation } from '../../../state';
import { STEWARD_STATUS } from './steward-status-copy';
import styles from './RecentConversationPreview.module.css';

const RECENT_ENTRY_COUNT = 3;

/**
 * Context continuity, made visible (DOMAIN-007 Founder Decision — "See
 * recent conversational context" as part of the Domain Completion Rule;
 * FPB-008 §9 "the steward remembers where the member was"). Reuses
 * `ConversationContext.timeline` as-is — no new state, no new backend
 * call — so a member can see where a conversation left off without
 * leaving the screen they're on to open `/conversation`.
 */
export function RecentConversationPreview() {
  const conversation = useConversation();
  const recent = conversation.timeline.slice(-RECENT_ENTRY_COUNT);

  return (
    <div className={styles.section}>
      <p className={styles.status}>
        {conversation.state.pendingResponse ? STEWARD_STATUS.preparing : STEWARD_STATUS.listening}
      </p>

      {recent.length === 0 ? (
        <p className={styles.empty}>No conversation yet — ask your Steward anything.</p>
      ) : (
        recent.map((message) => (
          <p key={message.id} className={styles.entry}>
            <span className={styles.entryRole}>{message.role === 'USER' ? 'You' : 'Steward'}: </span>
            {message.content}
          </p>
        ))
      )}

      <Link href="/conversation" className={styles.link}>
        Open full conversation
      </Link>
    </div>
  );
}
