'use client';

import { LinkButton } from '../../Button/LinkButton';
import styles from './ExecutionStatusStep.module.css';

export type PlanItemDecision = 'APPROVED' | 'DISMISSED' | 'ACCEPTED' | 'DECLINED';

export interface DecidedPlanItem {
  title: string;
  categoryLabel: string;
  decision: PlanItemDecision;
}

export interface ExecutionStatusStepProps {
  decisions: DecidedPlanItem[];
}

function isAccepted(decision: PlanItemDecision): boolean {
  return decision === 'APPROVED' || decision === 'ACCEPTED';
}

/**
 * Execution status narration, followed by a long-term stewardship prompt
 * (Member Arrival — Steward Experience migration) — the Founder-specified
 * replacement for the old flow's "anything else?" close. Never claims
 * Aureus submitted an application, signed anything, or otherwise acted
 * beyond what approval-before-action actually did: an approved
 * recommendation or accepted resource is a decision recorded, not an
 * external action taken (`RecommendationsService.generate` "never
 * enrolls, saves, or otherwise acts on the member's behalf"), so the
 * copy here says exactly that and nothing more.
 */
export function ExecutionStatusStep({ decisions }: ExecutionStatusStepProps) {
  const accepted = decisions.filter((d) => isAccepted(d.decision));

  return (
    <div className={styles.step}>
      <h1 className={styles.title}>Here&apos;s where things stand</h1>

      {accepted.length > 0 ? (
        <ul className={styles.decisionList}>
          {accepted.map((item, index) => (
            <li key={`${item.categoryLabel}-${index}`} className={styles.decisionItem}>
              <strong>{item.title}</strong> — noted on your Journey. The {item.categoryLabel.toLowerCase()} itself still
              needs your own next action to see it through.
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.body}>Nothing was approved just yet — that&apos;s alright, there&apos;s no wrong pace here.</p>
      )}

      <p className={styles.body}>
        This isn&apos;t a one-time visit. Aureus will keep watching for what fits what you&apos;re working toward, and
        you can pick this back up any time.
      </p>

      <div className={styles.actions}>
        <LinkButton href="/journey">View my journey</LinkButton>
        <LinkButton href="/opportunities" variant="secondary">Browse opportunities</LinkButton>
        <LinkButton href="/conversation" variant="secondary">Talk to my steward</LinkButton>
      </div>
    </div>
  );
}
