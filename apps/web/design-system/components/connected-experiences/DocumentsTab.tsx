'use client';

import { useEffect } from 'react';
import { useConnectedExperiences } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import { UploadDocumentForm } from './UploadDocumentForm';
import { DocumentCard } from './DocumentCard';
import styles from './DocumentsTab.module.css';

/**
 * Documents — fully real, no third party required (DOMAIN-008 Founder
 * Decision 2). Reuses the state module's optimistic upsert/removal so the
 * list reflects an upload, summary, or deletion immediately.
 */
export function DocumentsTab() {
  const connectedExperiences = useConnectedExperiences();
  const { state } = connectedExperiences;

  useEffect(() => {
    void connectedExperiences.loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedExperiences.loadDocuments]);

  return (
    <div className={styles.tab}>
      <UploadDocumentForm
        isSubmitting={false}
        onSubmit={(input) => void connectedExperiences.uploadDocument(input)}
      />

      {state.isLoadingDocuments && state.documents.length === 0 ? (
        <LoadingState label="Loading documents" />
      ) : null}

      {state.error && state.documents.length === 0 && !state.isLoadingDocuments ? (
        <ErrorState title={domainErrorCopy(state.error.kind).title} description={domainErrorCopy(state.error.kind).description} />
      ) : null}

      {!state.isLoadingDocuments && state.documents.length === 0 && !state.error ? (
        <EmptyState
          title="No documents yet"
          description="Upload a document above so your Steward can help you keep track of it."
        />
      ) : null}

      {state.documents.length > 0 ? (
        <div className={styles.list}>
          {state.documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              isSummarizing={state.summarizingDocumentId === document.id}
              onSummarize={(id) => void connectedExperiences.summarizeDocument(id)}
              onDelete={(id) => void connectedExperiences.deleteDocument(id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
