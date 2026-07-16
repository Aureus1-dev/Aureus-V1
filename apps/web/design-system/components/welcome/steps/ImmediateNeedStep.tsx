'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../../Button/Button';
import { FormField } from '../../FormField';
import styles from './ImmediateNeedStep.module.css';

export interface ImmediateNeedStepProps {
  onSubmit: (need: string) => void;
  submitting: boolean;
}

/**
 * Elicits the member's immediate need (FPB-003 §6 Immediate Problem
 * Flow). The question explains its purpose before asking (AFX-001 §7
 * "Earn Every Question") — this becomes the member's first Goal.
 */
export function ImmediateNeedStep({ onSubmit, submitting }: ImmediateNeedStepProps) {
  const [need, setNeed] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (need.trim()) onSubmit(need.trim());
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>What brings you to Aureus today?</h2>
      <p className={styles.body}>
        Whatever it is — big or small — tell us in your own words. We&apos;ll use this to shape your first mission
        and start looking for opportunities that could help.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="immediate-need"
          label="Your immediate need"
          value={need}
          onChange={setNeed}
          placeholder="e.g. I need help finding a better job"
          required
        />
        <Button type="submit" disabled={submitting || !need.trim()}>
          {submitting ? 'Getting started…' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
