import type { DocumentDto } from '../../../lib/api/documents';
import { formatBytes, formatEnumLabel } from './connected-experiences-format';
import styles from './DocumentSummaryHeader.module.css';

export interface DocumentSummaryHeaderProps {
  document: DocumentDto;
}

function formatAddedDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

/**
 * The category/title/ref/meta/summary block shared by `DocumentCard`
 * (Document Review room) and `DocumentViewer` (the inline-conversation and
 * expanded full-text presentations of the same document) — factored out
 * so both render identical metadata rather than drifting apart.
 */
export function DocumentSummaryHeader({ document }: DocumentSummaryHeaderProps) {
  const addedDate = formatAddedDate(document.uploadedAt);
  return (
    <>
      <div className={styles.header}>
        <div>
          <span className={styles.category}>{formatEnumLabel(document.category)}</span>
          <h2 className={styles.title}>{document.title}</h2>
        </div>
        {document.documentRef ? <span className={styles.ref}>{document.documentRef}</span> : null}
      </div>

      <p className={styles.meta}>
        {document.originalFilename} · {formatBytes(document.sizeBytes)}
        {addedDate ? ` · Added ${addedDate}` : null}
      </p>

      <ul className={styles.trustLine} aria-label="Document status">
        <li>Member provided</li>
        <li>
          {document.aiSummary ? 'AI summary — review against the original' : 'Original document'}
        </li>
        <li>No external action taken</li>
      </ul>

      {document.aiSummary ? (
        <div className={styles.summary}>
          <p className={styles.summaryLabel}>Steward summary · not independently verified</p>
          <p>{document.aiSummary}</p>
        </div>
      ) : document.extractedText ? (
        <p className={styles.noSummary}>
          No summary yet — your Steward can summarize this document when you&apos;re ready.
        </p>
      ) : (
        <p className={styles.noSummary}>
          No text content yet — add document text to enable AI summarization.
        </p>
      )}
    </>
  );
}
