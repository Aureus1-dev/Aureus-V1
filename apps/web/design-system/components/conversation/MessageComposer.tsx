'use client';

import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import styles from './MessageComposer.module.css';

const MAX_LENGTH = 4000;

export interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

/**
 * Text entry for the conversation (FPB-005 §3). `onChange` accepts a
 * plain string regardless of where it came from, so a future input
 * source (e.g. voice transcription) can populate the same draft state
 * without changing this component's contract — no such source is wired
 * up in this Work Order (Founder Decision, FWO-002).
 */
export function MessageComposer({ value, onChange, onSubmit, disabled }: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!disabled && value.trim().length > 0) {
      onSubmit();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim().length > 0) {
        onSubmit();
      }
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label htmlFor="conversation-composer">
        <VisuallyHidden>Message your steward</VisuallyHidden>
      </label>
      <textarea
        ref={textareaRef}
        id="conversation-composer"
        className={styles.textarea}
        value={value}
        maxLength={MAX_LENGTH}
        placeholder="Share what's on your mind..."
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
      />
      <Button type="submit" disabled={disabled || value.trim().length === 0}>
        Send
      </Button>
    </form>
  );
}
