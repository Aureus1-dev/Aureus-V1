import type { ReactNode } from 'react';
import styles from './ArrivalStage.module.css';

export interface ArrivalStageProps {
  /**
   * What the member is currently doing, as a stable identity — an
   * arrival step, or a phase like restoring their session. Changing it
   * plays the entrance; keeping it stable across a re-render leaves the
   * stage exactly where it is.
   */
  stepKey: string;
  children: ReactNode;
}

/**
 * The place inside the Hall where whatever the member is currently doing
 * actually sits.
 *
 * Keyed on `stepKey`, so each new thing *enters the room* rather than
 * replacing it: the room, its light, and the hearth stay mounted
 * throughout, and only the stage's contents change. That is the whole
 * mechanism behind "continuity rather than interruption" (AUREUS-005
 * §MOTION) — and the reason waiting, failing, and progressing all belong
 * on this same stage rather than on screens of their own. A member
 * should never watch Aureus swap one surface for another mid-arrival.
 */
export function ArrivalStage({ stepKey, children }: ArrivalStageProps) {
  return (
    <div key={stepKey} className={styles.stage}>
      {children}
    </div>
  );
}
