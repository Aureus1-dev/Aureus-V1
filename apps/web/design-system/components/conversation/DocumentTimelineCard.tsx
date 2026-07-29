'use client';

import { useState } from 'react';
import type { DocumentDto } from '../../../lib/api/documents';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { DocumentSummaryHeader } from '../connected-experiences/DocumentSummaryHeader';
import { DocumentViewer } from '../document-viewer/DocumentViewer';
import styles from './DocumentTimelineCard.module.css';

export interface DocumentTimelineCardProps {
  document: DocumentDto;
}

/**
 * A document upload shown inline in the conversation — collapsed to the
 * same metadata/summary `DocumentSummaryHeader` shows in the Document
 * Review room, expanding in place into the full `DocumentViewer` rather
 * than navigating away. Deliberately not `DocumentCard` itself: that
 * component's actions are Summarize/Delete, neither of which belongs
 * here — this only ever offers a read-only expand/collapse.
 */
export function DocumentTimelineCard({ document }: DocumentTimelineCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return <DocumentViewer document={document} onClose={() => setExpanded(false)} />;
  }

  return (
    <Card className={styles.card}>
      <DocumentSummaryHeader document={document} />
      <Button variant="secondary" onClick={() => setExpanded(true)}>
        View full text
      </Button>
    </Card>
  );
}
