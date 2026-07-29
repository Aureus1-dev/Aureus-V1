import type { DocumentDto } from '../../../lib/api/documents';
import { formatBytes, formatEnumLabel } from './connected-experiences-format';
import styles from './DocumentSummaryHeader.module.css';

export interface DocumentSummaryHeaderProps {
  document: DocumentDto;
}

/**
 * The category/title/ref/meta/summary block shared by `DocumentCard`
 * (Document Review room) and `DocumentViewer` (the inline-conversation and
 * expanded full-text presentations of the same document) — factored out
 * so both render identical metadata rather than drifting apart.
 */
export function DocumentSummaryHeader({ document }: DocumentSummaryHeaderProps) {
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
    </>
  );
}
