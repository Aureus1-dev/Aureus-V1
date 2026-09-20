import type { ReactNode } from 'react';
import type { CarryStateEvidenceEntry, CarryStateNextAction, CarryStateTone } from './responsibility-carry-state';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility/VisuallyHidden';
import styles from './ActiveWorkSurface.module.css';

export interface ActiveWorkSurfaceProps {
  /** The member's own words, or — once a durable Responsibility exists — its real objective. Never invented. */
  workingOn: string;
  /** Plain-language lifecycle status. Omitted (not shown) when no durable work exists yet. */
  status?: string | null;
  /** Visual-only classification of `status` — never displayed as text. */
  tone?: CarryStateTone | null;
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
  /** The real authority/privacy boundary disclosure for this Responsibility's kind, when one applies. */
  authorityNote?: string | null;
  /**
   * A genuine, already-wired Resume action — only passed when the existing
   * workflow actually supports resuming inline (`ConversationSurface`'s own
   * `startApplicationGuideForOpportunity`, bound to the correct conversation
   * and opportunity). Never invented for a state that has no real action.
   */
  onResume?: () => void;
  resumeBusy?: boolean;
  /**
   * The real, unmodified `ApplicationGuidePanel` for this Responsibility's
   * live guide session, composed inside this surface rather than as a
   * separate competing card. `null`/omitted whenever no live session exists
   * — this component never renders guide-session UI on its own.
   */
  guidePanel?: ReactNode;
}

const OWNER_LABEL: Record<CarryStateNextAction['owner'], string> = {
  AUREUS: 'Aureus',
  MEMBER: 'You',
  THIRD_PARTY: 'An outside party',
};

const TONE_CLASS: Record<CarryStateTone, string> = {
  active: styles.toneActive,
  attention: styles.toneAttention,
  blocked: styles.toneBlocked,
  complete: styles.toneComplete,
  neutral: styles.toneNeutral,
};

/**
 * UI Slice 3 — Active Work Surface. The single presentation of one durable
 * Responsibility (or, before Aureus has formally accepted anything, the
 * honest pre-acceptance conversation signals from Slice 1) — replacing the
 * three previously-separate, partly-redundant surfaces (`VisibleWorkSummary`,
 * `ResponsibilityProgressCard`, and the loose CSS `ResponsibilityProgressCard`
 * inherited) with one surface with real visual hierarchy and progressive
 * disclosure.
 *
 * Every field is supplied by the caller (`ConversationSurface`), sourced
 * either from `responsibility-carry-state.ts`'s `buildCarryState` (once a
 * durable Responsibility exists) or from real conversation signals — this
 * component renders only what it is given and never fabricates activity, a
 * percentage, a status, or an action. Primary content (outcome, status,
 * carrying, needs-you, next action, done-means) is always visible; evidence
 * and last-activity sit behind a native `<details>` disclosure so the
 * member is not asked to read everything at once, and that disclosure is
 * omitted entirely when there is nothing real to show inside it.
 */
export function ActiveWorkSurface({
  workingOn,
  status,
  tone,
  carrying,
  needsYou,
  nextAction,
  doneMeans,
  evidence,
  lastActivityAt,
  authorityNote,
  onResume,
  resumeBusy = false,
  guidePanel,
}: ActiveWorkSurfaceProps) {
  const hasDetail = Boolean((evidence && evidence.length > 0) || lastActivityAt);

  return (
    <section className={styles.surface} aria-label="Active work">
      <h2 className={styles.outcome}>{workingOn}</h2>

      {status ? (
        <p className={`${styles.status} ${tone ? TONE_CLASS[tone] : ''}`}>
          <span className={styles.statusDot} aria-hidden="true" />
          <VisuallyHidden>Status:</VisuallyHidden> {status}
        </p>
      ) : null}

      <p className={styles.carrying}>
        <span className={styles.fieldLabel}>Aureus is carrying</span>
        {carrying}
      </p>

      {needsYou ? (
        <div className={styles.needsYou}>
          <p className={styles.needsYouLabel}>Needs you</p>
          <p className={styles.needsYouText}>{needsYou}</p>
          {onResume ? (
            <Button type="button" disabled={resumeBusy} onClick={onResume}>
              Continue with Aureus
            </Button>
          ) : null}
        </div>
      ) : null}

      {nextAction ? (
        <p className={styles.nextAction}>
          <span className={styles.fieldLabel}>Next action</span>
          {OWNER_LABEL[nextAction.owner]}: {nextAction.description}
        </p>
      ) : null}

      <p className={styles.doneMeans}>
        <span className={styles.fieldLabel}>Done means</span>
        {doneMeans}
      </p>

      {authorityNote ? <p className={styles.authorityNote}>{authorityNote}</p> : null}

      {guidePanel ? <div className={styles.guidePanelSlot}>{guidePanel}</div> : null}

      {hasDetail ? (
        <details className={styles.detail}>
          <summary className={styles.detailSummary}>Evidence and activity</summary>

          {evidence && evidence.length > 0 ? (
            <div className={styles.detailBlock}>
              <p className={styles.fieldLabel}>Evidence</p>
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
            <p className={styles.lastActivity}>
              Last activity: <time dateTime={lastActivityAt}>{new Date(lastActivityAt).toLocaleString()}</time>
            </p>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}
