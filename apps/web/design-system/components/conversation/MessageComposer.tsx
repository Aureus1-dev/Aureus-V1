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

export function MessageComposer({ value, onChange, onSubmit, disabled }: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!disabled && value.trim().length > 0) onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim().length > 0) onSubmit();
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label htmlFor="conversation-composer">
        <VisuallyHidden>Message your steward</VisuallyHidden>
      </label>
      <div className={styles.inputShell}>
        <textarea
          ref={textareaRef}
          id="conversation-composer"
          className={styles.textarea}
          value={value}
          maxLength={MAX_LENGTH}
          placeholder="How can we help?"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="button"
          className={styles.micButton}
          aria-label="Talk to your steward"
          title="Talk"
          onClick={() => {
            window.location.assign('/conversation?mode=voice');
          }}
        >
          <span aria-hidden="true">●</span>
        </button>
      </div>
      <Button type="submit" disabled={disabled || value.trim().length === 0}>
        Send
      </Button>
    </form>
  );
}
