import type { DocumentDto } from '../../../lib/api/documents';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { DocumentSummaryHeader } from './DocumentSummaryHeader';
import styles from './DocumentCard.module.css';

export interface DocumentCardProps {
  document: DocumentDto;
  isSummarizing: boolean;
  onSummarize: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document, isSummarizing, onSummarize, onDelete }: DocumentCardProps) {
  return (
    <Card className={styles.card}>
      <DocumentSummaryHeader document={document} />

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => onSummarize(document.id)}
          disabled={isSummarizing || !document.extractedText}
        >
          {isSummarizing ? 'Summarizing…' : document.aiSummary ? 'Re-summarize' : 'Summarize'}
        </Button>
        <Button variant="secondary" onClick={() => onDelete(document.id)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
