import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/**
 * Foundational surface primitive (FPB-005 §3 "Information"). Opportunity,
 * Journey, Resource, and Progress cards compose this shell rather than
 * each defining their own surface treatment.
 */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className].filter(Boolean).join(' ')} {...rest} />;
}
