'use client';

import { useState, type FormEvent } from 'react';
import type { DocumentCategory, UploadDocumentInput } from '../../../lib/api/documents';
import { Button } from '../Button/Button';
import { FormField } from '../FormField/FormField';
import { formatEnumLabel } from './connected-experiences-format';
import styles from './UploadDocumentForm.module.css';

const CATEGORIES: DocumentCategory[] = [
  'IDENTIFICATION', 'LEASE', 'FINANCIAL', 'EMPLOYMENT', 'EDUCATION', 'MEDICAL', 'LEGAL', 'OTHER',
];

export interface UploadDocumentFormProps {
  onSubmit: (input: UploadDocumentInput) => void;
  isSubmitting: boolean;
}

/**
 * Upload a document (DOMAIN-008 Founder Decision 2). No cloud storage
 * exists yet, so this deliberately does not pretend to upload file bytes
 * anywhere — a picked file supplies the honest metadata (name, type,
 * size), and the member pastes the text content directly so their Steward
 * can actually read and summarize it, rather than guessing from a
 * filename alone.
 */
export function UploadDocumentForm({ onSubmit, isSubmitting }: UploadDocumentFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('OTHER');
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');

  const canSubmit = title.trim().length > 0 && file !== null && !isSubmitting;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !title.trim()) return;

    onSubmit({
      title: title.trim(),
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      storageRef: `local://${Date.now()}-${file.name}`,
      category,
      extractedText: extractedText.trim() || undefined,
    });

    setTitle('');
    setFile(null);
    setExtractedText('');
    setCategory('OTHER');
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <FormField id="document-title" label="Title" value={title} onChange={setTitle} required />

      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>File *</span>
        <input
          type="file"
          className={styles.fileInput}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Document text</span>
        <textarea
          className={styles.textarea}
          value={extractedText}
          onChange={(event) => setExtractedText(event.target.value)}
          rows={5}
          placeholder="Paste the document's text so your Steward can reference and summarize it."
        />
        <p className={styles.helpText}>
          Optional, but required before your Steward can generate a summary — it only ever summarizes text you have
          actually provided, never a filename alone.
        </p>
      </label>

      <Button type="submit" disabled={!canSubmit}>
        {isSubmitting ? 'Uploading…' : 'Upload document'}
      </Button>
    </form>
  );
}
