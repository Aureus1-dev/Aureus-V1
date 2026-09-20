import styles from './VisibleWorkSummary.module.css';

export interface VisibleWorkSummaryProps {
  /** The member's own words, or an active Goal's title — never invented. */
  workingOn: string;
  /** What Aureus is actually doing right now — real signals only, never a decorative filler line. */
  carrying: string;
  /** Only set when something real genuinely requires the member; omitted entirely otherwise. */
  needsYou?: string | null;
  doneMeans: string;
}

/**
 * Slice 1's minimal Visible Work grammar (UI Slice 1 §"Visible work"):
 * What you want accomplished / Aureus is carrying / Needs you / Done means.
 * Every field here is grounded in real conversation/goal state passed in by
 * `ConversationSurface` — this component renders whatever it is given and
 * never fabricates activity, a percentage, or a status on its own. It is
 * deliberately small: this is not the future Work Surface, only the
 * minimum that makes a first accomplishment legible.
 */
export function VisibleWorkSummary({ workingOn, carrying, needsYou, doneMeans }: VisibleWorkSummaryProps) {
  return (
    <section className={styles.summary} aria-label="What Aureus is doing">
      <div className={styles.row}>
        <p className={styles.label}>Working on</p>
        <p className={styles.value}>{workingOn}</p>
      </div>

      <div className={styles.row}>
        <p className={styles.label}>Aureus is carrying</p>
        <p className={styles.value}>{carrying}</p>
      </div>

      {needsYou ? (
        <div className={`${styles.row} ${styles.needsYou}`}>
          <p className={styles.label}>Needs you</p>
          <p className={styles.value}>{needsYou}</p>
        </div>
      ) : null}

      <div className={styles.row}>
        <p className={styles.label}>Done means</p>
        <p className={styles.value}>{doneMeans}</p>
      </div>
    </section>
  );
}
