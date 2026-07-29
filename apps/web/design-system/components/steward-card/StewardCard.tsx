import type { ReactNode } from 'react';
import { Card } from '../Card/Card';
import styles from './StewardCard.module.css';

export type StewardCardVariant = 'neutral' | 'recommendation' | 'approval' | 'milestone';

export interface StewardCardProps {
  variant?: StewardCardVariant;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<StewardCardVariant, string> = {
  neutral: styles.neutral,
  recommendation: styles.recommendation,
  approval: styles.approval,
  milestone: styles.milestone,
};

/**
 * "Something the Steward is telling you" — the generic inline-conversation
 * card shell (a left-edge accent bar over the existing domain color roles:
 * `opportunity` for recommendations, `journey` for milestones, `steward`
 * for approvals) that a coordinated-plan item, journey update, or document
 * event sits inside when it appears in the conversation timeline, so it
 * reads as a card in the dialogue rather than a stray form.
 */
export function StewardCard({ variant = 'neutral', children }: StewardCardProps) {
  return <Card className={`${styles.card} ${VARIANT_CLASS[variant]}`}>{children}</Card>;
}
