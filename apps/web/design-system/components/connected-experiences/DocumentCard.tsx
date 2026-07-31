import type { DocumentDto } from '../../../lib/api/documents';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { formatBytes, formatEnumLabel } from './connected-experiences-format';
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
      <div className={styles.header}>
        <div>
          <span className={styles.category}>{formatEnumLabel(document.category)}</span>
          <h2 className={styles.title}>{document.title}</h2>
        </div>
        {document.documentRef ? <span className={styles.ref}>{document.documentRef}</span> : null}
      </div>

      <p className={styles.meta}>
        {document.originalFilename} · {formatBytes(document.sizeBytes)}
      </p>

      {document.aiSummary ? (
        <div className={styles.summary}>
          <p className={styles.summaryLabel}>Steward summary</p>
          <p>{document.aiSummary}</p>
        </div>
      ) : document.extractedText ? (
        <p className={styles.noSummary}>No summary yet — your Steward can summarize this document when you&apos;re ready.</p>
      ) : (
        <p className={styles.noSummary}>No text content yet — add document text to enable AI summarization.</p>
      )}

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
