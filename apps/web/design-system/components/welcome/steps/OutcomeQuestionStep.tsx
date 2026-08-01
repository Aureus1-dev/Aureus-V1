'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../../Button/Button';
import { FormField } from '../../FormField';
import { LoadingState } from '../../LoadingState/LoadingState';
import { ErrorState } from '../../ErrorState/ErrorState';
import { domainErrorCopy } from '../../domain-error-copy';
import type { ArrivalError } from '../classify-arrival-error';
import styles from './OutcomeQuestionStep.module.css';

export interface OutcomeQuestionStepProps {
  onSubmit: (answer: string) => void;
  submitting: boolean;
  error: ArrivalError | null;
  onRetry: () => void;
}

/**
 * Member Arrival — Steward Experience migration. Shown only when the
 * member's stated need doesn't already make clear what result they
 * want (the Founder-approved wording "What would help most right
 * now?" — see `apps/api/src/needs/outcome.util.ts`, asked once by
 * `ConversationsService.ask()`). The answer must be handed to the
 * caller to send through that same `ask()` call (via
 * `ConversationContext.sendMessage`), not posted directly, so crisis
 * detection and clarification stay in force on this message exactly
 * as on every other one — this component only presents the question.
 */
export function OutcomeQuestionStep({ onSubmit, submitting, error, onRetry }: OutcomeQuestionStepProps) {
  const [answer, setAnswer] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (answer.trim()) onSubmit(answer.trim());
  }

  if (submitting) {
    return (
      <div className={styles.step}>
        <LoadingState label="Listening" />
      </div>
    );
  }

  if (error) {
    const copy = domainErrorCopy(error.kind);
    return (
      <div className={styles.step}>
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            error.retryable ? (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <h1 className={styles.title}>What would help most right now?</h1>
      <p className={styles.body}>Tell us in your own words — Aureus will use this to find the most useful next step.</p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="outcome-answer"
          multiline
          label="What would help most"
          value={answer}
          onChange={setAnswer}
          placeholder="e.g. I need to find stable housing before Friday"
          required
        />
        <Button type="submit" disabled={!answer.trim()}>
          Continue
        </Button>
      </form>
    </div>
  );
}
