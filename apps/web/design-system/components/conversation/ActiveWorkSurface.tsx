import type { ReactNode } from 'react';
import type {
  CarryStateAsk,
  CarryStateEvidenceEntry,
  CarryStateNextAction,
  CarryStateRecovery,
  CarryStateTone,
  CarryStateWaiting,
} from './responsibility-carry-state';
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
  /** UI-006: canonical recovery truth. Entire block is omitted when no bounded setback source exists. */
  recovery?: CarryStateRecovery | null;
  /** UI-004: canonical wait truth. Entire block is omitted when no real waiting state exists. */
  waiting?: CarryStateWaiting | null;
  /**
   * UI-005: a structured canonical ask when truth supports it. A legacy string
   * remains accepted for pre-Responsibility/opportunity surfaces that only know
   * a coarse "Needs you" signal and must not fabricate missing ask details.
   */
  needsYou?: CarryStateAsk | string | null;
  /** The next executable step and who owns it — derived from real Responsibility status, never fabricated. */
  nextAction?: CarryStateNextAction | null;
  doneMeans: string;
  /** Real proof events only (ACTION_EVIDENCED/COMPLETED) — never a tool call or message treated as evidence. */
  evidence?: CarryStateEvidenceEntry[];
  /** The most recent real state transition/evidence event, so the member can see whether work is moving. */
  lastActivityAt?: string | null;
  /** The real authority/privacy boundary disclosure for this Responsibility's kind, when one applies. */
  authorityNote?: string | null;
  onResume?: () => void;
  resumeBusy?: boolean;
  guidePanel?: ReactNode;
}

const OWNER_LABEL: Record<CarryStateNextAction['owner'], string> = {
  AUREUS: 'Aureus',
  MEMBER: 'You',
  HUMAN_STEWARD: 'A Human Steward',
  THIRD_PARTY: 'An outside party',
};

const TONE_CLASS: Record<CarryStateTone, string> = {
  active: styles.toneActive,
  attention: styles.toneAttention,
  blocked: styles.toneBlocked,
  complete: styles.toneComplete,
  neutral: styles.toneNeutral,
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

/**
 * UI Slice 3 established this as the single presentation of one durable
 * Responsibility. UI-004 adds truthful Waiting. UI-005 adds one reasoned ask.
 * UI-006 adds bounded recovery inside that same surface rather than creating a
 * second incident/error card. This component only renders canonical fields
 * supplied by the caller.
 */
export function ActiveWorkSurface({
  workingOn,
  status,
  tone,
  carrying,
  recovery,
  waiting,
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
  const structuredAsk =
    needsYou && typeof needsYou !== 'string' ? needsYou : null;
  const legacyNeedsYou = typeof needsYou === 'string' ? needsYou : null;

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

      {recovery ? (
        <section className={styles.recovery} aria-label="Recovery plan">
          <p className={styles.recoveryLabel}>Here’s what changed</p>
          <p className={styles.recoveryChanged}>{recovery.changed}</p>
          <dl className={styles.recoveryFacts}>
            <div className={styles.recoveryFact}>
              <dt>Still true</dt>
              <dd>{recovery.remainsTrue}</dd>
            </div>
            {recovery.alreadyDone ? (
              <div className={styles.recoveryFact}>
                <dt>What I’ve done</dt>
                <dd>{recovery.alreadyDone}</dd>
              </div>
            ) : null}
            {recovery.next ? (
              <div className={styles.recoveryFact}>
                <dt>Next</dt>
                <dd>{recovery.next}</dd>
              </div>
            ) : null}
            {recovery.holder ? (
              <div className={styles.recoveryFact}>
                <dt>Held by</dt>
                <dd>{OWNER_LABEL[recovery.holder]}</dd>
              </div>
            ) : null}
            {recovery.checkpointAt ? (
              <div className={styles.recoveryFact}>
                <dt>Next check</dt>
                <dd>
                  <time dateTime={recovery.checkpointAt}>
                    {formatDateTime(recovery.checkpointAt)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {waiting ? (
        <section className={styles.waiting} aria-label="Waiting">
          <div className={styles.waitingHeader}>
            <p className={styles.waitingLabel}>Waiting</p>
            <p className={styles.waitingHolder}>Held by {OWNER_LABEL[waiting.holder]}</p>
          </div>
          <p className={styles.waitingOn}>{waiting.waitingOn}</p>
          <dl className={styles.waitingFacts}>
            {waiting.lastFollowUpAt ? (
              <div className={styles.waitingFact}>
                <dt>Last follow-up</dt>
                <dd>
                  <time dateTime={waiting.lastFollowUpAt}>
                    {formatDateTime(waiting.lastFollowUpAt)}
                  </time>
                </dd>
              </div>
            ) : null}
            {waiting.nextFollowUpAt ? (
              <div className={styles.waitingFact}>
                <dt>Next follow-up</dt>
                <dd>
                  <time dateTime={waiting.nextFollowUpAt}>
                    {formatDateTime(waiting.nextFollowUpAt)}
                  </time>
                </dd>
              </div>
            ) : null}
            {waiting.dueAt ? (
              <div className={styles.waitingFact}>
                <dt>Due</dt>
                <dd>
                  <time dateTime={waiting.dueAt}>{formatDateTime(waiting.dueAt)}</time>
                  {waiting.dueProvenance
                    ? ` · ${waiting.dueProvenance === 'VERIFIED' ? 'verified' : 'reported'}`
                    : ''}
                </dd>
              </div>
            ) : null}
          </dl>
          {waiting.noActionNeededFromMember ? (
            <p className={styles.noActionNeeded}>Nothing you need to do.</p>
          ) : null}
        </section>
      ) : null}

      {structuredAsk ? (
        <section className={styles.asking} aria-label="What Aureus needs from you">
          <p className={styles.askingLabel}>I need one thing from you</p>
          <p className={styles.askingRequest}>{structuredAsk.request}</p>
          <dl className={styles.askingFacts}>
            <div className={styles.askingFact}>
              <dt>Why I need it</dt>
              <dd>{structuredAsk.reason}</dd>
            </div>
            <div className={styles.askingFact}>
              <dt>Then I’ll</dt>
              <dd>{structuredAsk.after}</dd>
            </div>
            {structuredAsk.effort ? (
              <div className={styles.askingFact}>
                <dt>What it takes</dt>
                <dd>{structuredAsk.effort}</dd>
              </div>
            ) : null}
            {structuredAsk.alternateRoute ? (
              <div className={styles.askingFact}>
                <dt>If you can’t</dt>
                <dd>{structuredAsk.alternateRoute}</dd>
              </div>
            ) : null}
          </dl>
          {onResume ? (
            <Button type="button" disabled={resumeBusy} onClick={onResume}>
              Continue with Aureus
            </Button>
          ) : null}
        </section>
      ) : legacyNeedsYou ? (
        <div className={styles.needsYou}>
          <p className={styles.needsYouLabel}>Needs you</p>
          <p className={styles.needsYouText}>{legacyNeedsYou}</p>
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
              Last activity:{' '}
              <time dateTime={lastActivityAt}>{formatDateTime(lastActivityAt)}</time>
            </p>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}