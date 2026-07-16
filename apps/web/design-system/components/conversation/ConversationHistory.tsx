import type { ConversationDto } from '../../../lib/api/conversations';
import styles from './ConversationHistory.module.css';

export interface ConversationHistoryProps {
  conversations: ConversationDto[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onStartNew: () => void;
}

/**
 * Conversation history (FPB-015 Phase Two "Conversation history").
 */
export function ConversationHistory({
  conversations,
  activeConversationId,
  onSelect,
  onStartNew,
}: ConversationHistoryProps) {
  return (
    <nav className={styles.history} aria-label="Conversation history">
      <button type="button" className={styles.newConversation} onClick={onStartNew}>
        New conversation
      </button>
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
      ) : null}
    </nav>
  );
}
