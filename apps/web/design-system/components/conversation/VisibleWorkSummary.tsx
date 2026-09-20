import type { CarryStateEvidenceEntry, CarryStateNextAction } from './responsibility-carry-state';
import styles from './VisibleWorkSummary.module.css';

export interface VisibleWorkSummaryProps {
  /** The member's own words, or — once a durable Responsibility exists — its real objective. Never invented. */
  workingOn: string;
  /** Plain-language lifecycle status of a durable Responsibility. Omitted (not shown) when no durable work exists yet. */
  status?: string | null;
  /** What Aureus is actually doing right now — real signals only, never a decorative filler line. */
  carrying: string;
  /** Only set when something real genuinely requires the member; omitted entirely otherwise. */
  needsYou?: string | null;
  /** The next executable step and who owns it — derived from real Responsibility status, never fabricated. */
  nextAction?: CarryStateNextAction | null;
  doneMeans: string;
  /** Real proof events only (ACTION_EVIDENCED/COMPLETED) — never a tool call or message treated as evidence. */
  evidence?: CarryStateEvidenceEntry[];
  /** The most recent real state transition/evidence event, so the member can see whether work is moving. */
  lastActivityAt?: string | null;
}

const OWNER_LABEL: Record<CarryStateNextAction['owner'], string> = {
  AUREUS: 'Aureus',
  MEMBER: 'You',
  THIRD_PARTY: 'An outside party',
};

/**
 * Slice 1's minimal Visible Work grammar, extended in Slice 2 (Production
 * Carry State) with Status/Next action/Evidence/Last activity once a durable
 * Responsibility backs the conversation. `ConversationSurface` is the only
 * caller and decides, per field, whether a value comes from real Responsibility
 * state (`responsibility-carry-state.ts`) or from real conversation signals —
 * this component only renders what it is given and never fabricates activity,
 * a percentage, or a status on its own. It is deliberately small: this is not
 * the future Work Surface, only the minimum that makes a first accomplishment
 * legible and — once Aureus has accepted durable work — provable.
 */
export function VisibleWorkSummary({
  workingOn,
  status,
  carrying,
  needsYou,
  nextAction,
  doneMeans,
  evidence,
  lastActivityAt,
}: VisibleWorkSummaryProps) {
  return (
    <section className={styles.summary} aria-label="What Aureus is doing">
      <div className={styles.row}>
        <p className={styles.label}>Working on</p>
        <p className={styles.value}>{workingOn}</p>
      </div>

      {status ? (
        <div className={styles.row}>
          <p className={styles.label}>Status</p>
          <p className={styles.value}>{status}</p>
        </div>
      ) : null}

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

      {nextAction ? (
        <div className={styles.row}>
          <p className={styles.label}>Next action</p>
          <p className={styles.value}>
            {OWNER_LABEL[nextAction.owner]}: {nextAction.description}
          </p>
        </div>
      ) : null}

      <div className={styles.row}>
        <p className={styles.label}>Done means</p>
        <p className={styles.value}>{doneMeans}</p>
      </div>

      {evidence && evidence.length > 0 ? (
        <div className={styles.row}>
          <p className={styles.label}>Evidence</p>
          <ul className={styles.evidenceList}>
            {evidence.map((item, index) => (
              <li key={`${item.occurredAt}:${index}`} className={styles.evidenceItem}>
                {item.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lastActivityAt ? (
        <div className={styles.row}>
          <p className={styles.label}>Last activity</p>
          <p className={styles.value}>
            <time dateTime={lastActivityAt}>{new Date(lastActivityAt).toLocaleString()}</time>
          </p>
        </div>
      ) : null}
    </section>
  );
}
