'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../../Button/Button';
import { FormField } from '../../FormField';
import styles from './GoalReflectionStep.module.css';

export interface GoalReflectionStepProps {
  /** A natural-language reflection of the outcome Aureus already understood from the member's own words — never a repeated question. */
  reflection: string;
  onConfirm: () => void;
  onAdjust: (revised: string) => void;
}

/**
 * Member Arrival — Steward Experience migration (Founder ruling on the
 * single outcome question: "When [the desired result] is already
 * clear, confirm the inferred outcome naturally rather than making
 * them repeat it."). Shown instead of `OutcomeQuestionStep` whenever
 * the member's first message already stated what they want
 * (`isOutcomeUnclear()` returned false) — this step never asks the
 * outcome question again, it only offers a chance to correct a wrong
 * inference before Aureus builds a plan around it.
 */
export function GoalReflectionStep({ reflection, onConfirm, onAdjust }: GoalReflectionStepProps) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [revised, setRevised] = useState('');

  function handleAdjustSubmit(event: FormEvent) {
    event.preventDefault();
    if (revised.trim()) onAdjust(revised.trim());
  }

  if (isAdjusting) {
    return (
      <div className={styles.step}>
        <h2 className={styles.title}>What would help most, in your own words?</h2>
        <form onSubmit={handleAdjustSubmit} noValidate>
          <FormField id="goal-reflection-adjust" label="What would help most" value={revised} onChange={setRevised} required />
          <Button type="submit" disabled={!revised.trim()}>
            Continue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Here&apos;s what we understood</h2>
      <p className={styles.body}>{reflection}</p>
      <div className={styles.actions}>
        <Button onClick={onConfirm}>That&apos;s right — continue</Button>
        <Button variant="secondary" onClick={() => setIsAdjusting(true)}>
          Not quite
        </Button>
      </div>
    </div>
  );
}
