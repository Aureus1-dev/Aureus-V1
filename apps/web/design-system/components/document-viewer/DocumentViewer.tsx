import type { DocumentDto } from '../../../lib/api/documents';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { DocumentSummaryHeader } from '../connected-experiences/DocumentSummaryHeader';
import styles from './DocumentViewer.module.css';

export interface DocumentViewerProps {
  document: DocumentDto;
  /** Closes the expanded view without navigating away — the point of showing it inline. */
  onClose?: () => void;
}

/**
 * The full-text presentation of a document, shown as an inline expansion
 * (in the conversation timeline or the Document Review room) rather than a
 * separate page — `DocumentCard`'s metadata/summary (`DocumentSummaryHeader`)
 * stays identical, this only adds the previously-nowhere-rendered
 * `extractedText` in a scrollable region. No new API call: `extractedText`
 * is already fetched by `ConnectedExperiencesContext.loadDocuments()`.
 */
export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  return (
    <Card className={styles.card}>
      <DocumentSummaryHeader document={document} />
      {document.extractedText ? (
        <div className={styles.textRegion}>
          <p className={styles.textLabel}>Full text</p>
          <pre className={styles.text}>{document.extractedText}</pre>
        </div>
      ) : null}
      {onClose ? (
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </Card>
  );
}
