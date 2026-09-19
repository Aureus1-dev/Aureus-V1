import type { MatterScript } from './engine/types';
import styles from './ReturningSeveralMatters.module.css';

export interface MatterSummary {
  matter: MatterScript;
  stepIndex: number;
}

export interface ReturningSeveralMattersProps {
  memberName: string;
  matters: MatterSummary[];
  onOpen: (matterId: string) => void;
}

/**
 * Returning member, several active matters (portfolio §6 State E;
 * addendum §6.2). A small number of calm matter cards, never a dense
 * operations dashboard — each answers only: what is this, where is it
 * now, does Aureus need me, what happens next.
 */
export function ReturningSeveralMatters({
  memberName,
  matters,
  onOpen,
}: ReturningSeveralMattersProps) {
  return (
    <div className={styles.wrap}>
      <p className={styles.greeting}>Welcome back, {memberName}.</p>
      <h1 className={styles.heading}>Your active work</h1>

      <ul className={styles.list}>
        {matters.map(({ matter, stepIndex }) => {
          const needsMember = Boolean(
            matter.needsYou && matter.needsYouAt >= 0 && stepIndex >= matter.needsYouAt,
          );
          const done = stepIndex >= matter.steps.length - 1 && !needsMember;
          return (
            <li key={matter.id}>
              <button
                type="button"
                className={styles.card}
                onClick={() => onOpen(matter.id)}
                data-needs-member={needsMember}
              >
                <p className={styles.matterName}>{matter.workingOn}</p>
                <p className={styles.status}>
                  {done ? 'Done' : (matter.steps[Math.max(stepIndex, 0)]?.label ?? 'In progress')}
                </p>
                <p className={styles.needsMember}>
                  {needsMember
                    ? `Needs you: ${matter.needsYou?.prompt}`
                    : done
                      ? 'Nothing further needed — this is done.'
                      : 'Aureus is carrying this — no action needed.'}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
