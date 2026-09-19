'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { VisuallyHidden } from '../../accessibility';
import styles from './Composer.module.css';

const MAX_LENGTH = 4000;

export interface ComposerProps {
  onSubmit: (text: string, attachments: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * The multimodal request surface (portfolio §7). Text is the obvious,
 * always-available path; voice/file/camera sit beside it as affordances,
 * not a separate toolbar the member has to learn.
 *
 * Voice, file, and camera are real interactions, not decoration — but
 * none of them claims a capability this isolated prototype does not
 * have. Attaching a file/photo really attaches it (visible as a named
 * chip); Aureus never claims to have read or analyzed its contents,
 * because Slice 0 has no real document pipeline behind it. Voice opens a
 * clearly labeled preview state rather than a working call, because a
 * real voice connection is a separate, already-built system
 * (`design-system/components/voice/`) that this isolated route
 * deliberately does not reach into.
 */
export function Composer({
  onSubmit,
  disabled = false,
  placeholder = 'How can we help?',
  autoFocus = false,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }

  function submit() {
    const trimmed = value.trim();
    if (disabled || (trimmed.length === 0 && attachments.length === 0)) return;
    onSubmit(
      trimmed.length > 0 ? trimmed : `Shared ${attachments.length} attachment(s).`,
      attachments,
    );
    setValue('');
    setAttachments([]);
    requestAnimationFrame(resize);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setAttachments((prev) => [...prev, ...Array.from(fileList).map((f) => f.name)]);
  }

  function removeAttachment(name: string) {
    setAttachments((prev) => prev.filter((a) => a !== name));
  }

  return (
    <div className={styles.composer}>
      {attachments.length > 0 ? (
        <ul className={styles.attachments} aria-label="Attached files">
          {attachments.map((name) => (
            <li key={name} className={styles.attachmentChip}>
              <span className={styles.attachmentName}>{name}</span>
              <button
                type="button"
                className={styles.attachmentRemove}
                aria-label={`Remove ${name}`}
                onClick={() => removeAttachment(name)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {voiceOpen ? (
        <div className={styles.voicePreview} role="status">
          <span className={styles.voiceIndicator} aria-hidden="true" />
          <p>
            Voice preview — full spoken conversations happen in Aureus&apos;s connected voice
            experience. Keep typing here any time.
          </p>
          <button type="button" className={styles.voiceClose} onClick={() => setVoiceOpen(false)}>
            Close
          </button>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="work-surface-composer">
          <VisuallyHidden>Tell Aureus what you need</VisuallyHidden>
        </label>
        <div className={styles.inputShell}>
          <textarea
            ref={textareaRef}
            id="work-surface-composer"
            className={styles.textarea}
            value={value}
            maxLength={MAX_LENGTH}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            onChange={(event) => {
              setValue(event.target.value);
              resize();
            }}
            onKeyDown={handleKeyDown}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Attach a file"
              title="Attach a file"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className={styles.glyphAttach} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Show Aureus with your camera"
              title="Show me"
              onClick={() => cameraInputRef.current?.click()}
            >
              <span className={styles.glyphCamera} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Talk to Aureus"
              title="Talk"
              aria-pressed={voiceOpen}
              onClick={() => setVoiceOpen((v) => !v)}
            >
              <span className={styles.glyphMic} aria-hidden="true" />
            </button>
            <button
              type="submit"
              className={styles.sendButton}
              aria-label="Send"
              title="Send"
              disabled={disabled || (value.trim().length === 0 && attachments.length === 0)}
            >
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className={styles.hiddenInput}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
