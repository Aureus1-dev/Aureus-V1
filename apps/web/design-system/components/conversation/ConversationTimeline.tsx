import type { MessageDto } from '../../../lib/api/conversations';
import { MemberMessage } from './MemberMessage';
import { StewardMessage } from './StewardMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import styles from './ConversationTimeline.module.css';

export interface ConversationTimelineProps {
  messages: MessageDto[];
  pendingResponse: boolean;
}

/**
 * Ordered conversation transcript (FPB-005 §3 "Conversation Timeline").
 * `role="log"` announces new messages to assistive technology as they
 * arrive without re-announcing the whole history (FPB-011 §9).
 */
export function ConversationTimeline({ messages, pendingResponse }: ConversationTimelineProps) {
  return (
    <div className={styles.timeline} role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((message) =>
        message.role === 'USER' ? (
          <MemberMessage key={message.id} content={message.content} />
        ) : (
          <StewardMessage key={message.id} content={message.content} />
        ),
      )}
      {pendingResponse ? <ThinkingIndicator /> : null}
    </div>
  );
}
