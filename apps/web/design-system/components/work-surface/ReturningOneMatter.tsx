import type { MatterScript } from './engine/types';
import styles from './ReturningOneMatter.module.css';

export interface ReturningOneMatterProps {
  memberName: string;
  matter: MatterScript;
  whatChanged: string;
  onContinue: () => void;
}

/**
 * Returning member, one dominant active matter (portfolio §6 State E;
 * addendum §6.1). Resumes directly into the most relevant work rather
 * than a generic dashboard — shows what changed, current state, what
 * Aureus is carrying, what needs the member, and the latest result
 * before the member continues into the full work surface.
 */
export function ReturningOneMatter({
  memberName,
  matter,
  whatChanged,
  onContinue,
}: ReturningOneMatterProps) {
  const needsYou = matter.needsYou;
  const latestFound = matter.found[matter.found.length - 1];

  return (
    <div className={styles.wrap}>
      <p className={styles.greeting}>Welcome back, {memberName}.</p>
      <h1 className={styles.matterName}>{matter.workingOn}</h1>

      <dl className={styles.fields}>
        <div className={styles.field}>
          <dt>What changed</dt>
          <dd>{whatChanged}</dd>
        </div>
        <div className={styles.field}>
          <dt>Aureus is carrying</dt>
          <dd>{matter.carrying.map((c) => c.label).join(' · ')}</dd>
        </div>
        {needsYou ? (
          <div className={styles.field} data-emphasis="true">
            <dt>Needs you</dt>
            <dd>{needsYou.prompt}</dd>
          </div>
        ) : null}
        {latestFound ? (
          <div className={styles.field}>
            <dt>Latest result</dt>
            <dd>{latestFound.label}</dd>
          </div>
        ) : null}
      </dl>

      <button type="button" className={styles.continueButton} onClick={onContinue}>
        Continue this work
      </button>
    </div>
  );
}
