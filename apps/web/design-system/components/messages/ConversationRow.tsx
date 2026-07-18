import type { ConversationDto } from '../../../lib/api/messages';
import { Card } from '../Card/Card';
import styles from './ConversationRow.module.css';

export interface ConversationRowProps {
  conversation: ConversationDto;
  onOpen: () => void;
}

const TYPE_LABEL: Record<ConversationDto['type'], string> = {
  STEWARDSHIP: 'Your Steward', ORGANIZATION: 'Organization', POD: 'Pod',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ConversationRow({ conversation, onOpen }: ConversationRowProps) {
  return (
    <li>
      <Card className={styles.row}>
        <button type="button" className={styles.button} onClick={onOpen}>
          <span className={styles.type}>{TYPE_LABEL[conversation.type]}</span>
          {conversation.lastMessageAt ? (
            <span className={styles.date}>{formatDate(conversation.lastMessageAt)}</span>
          ) : null}
        </button>
      </Card>
    </li>
  );
}
