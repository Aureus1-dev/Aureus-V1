import Link from 'next/link';
import { Button } from '../../Button/Button';
import styles from './NextStepSummary.module.css';

export interface NextStepSummaryProps {
  nextStepTitle: string | null;
}

/**
 * The Welcome flow's final step (AFX-001 §6 "One Meaningful Next
 * Step", AFX-005 §3 "help members identify the next appropriate
 * step"). Every first-run experience ends here, understanding what to
 * do next — not just having completed a form.
 */
export function NextStepSummary({ nextStepTitle }: NextStepSummaryProps) {
  return (
    <div className={styles.step}>
      <h2 className={styles.title}>You&apos;re ready to begin</h2>
      {nextStepTitle ? (
        <p className={styles.body}>
          Your next meaningful step: <strong>{nextStepTitle}</strong>
        </p>
      ) : (
        <p className={styles.body}>Your journey is ready whenever you are.</p>
      )}
      <div className={styles.actions}>
        <Link href="/journey">
          <Button>View my journey</Button>
        </Link>
        <Link href="/opportunities">
          <Button variant="secondary">Browse opportunities</Button>
        </Link>
        <Link href="/conversation">
          <Button variant="secondary">Talk to my steward</Button>
        </Link>
      </div>
    </div>
  );
}
