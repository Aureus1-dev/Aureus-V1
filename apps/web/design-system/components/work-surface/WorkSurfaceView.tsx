'use client';

import { Composer } from './Composer';
import { ResultArtifactCard } from './ResultArtifactCard';
import type { CarryingItemStatus, MatterScript } from './engine/types';
import styles from './WorkSurfaceView.module.css';

export interface MatterRuntimeView {
  script: MatterScript;
  stepIndex: number;
  needsYouResolved: boolean;
}

export interface WorkSurfaceViewProps {
  matter: MatterRuntimeView;
  onAsk: (text: string, attachments: string[]) => void;
  onResolveNeedsYou: () => void;
}

const STATUS_LABEL: Record<CarryingItemStatus, string> = {
  queued: 'Queued',
  working: 'In progress',
  completed: 'Done',
  'needs-you': 'Needs you',
  blocked: 'Blocked',
};

/**
 * State C / the Visible Work mechanism (portfolio §6 State C, §8;
 * addendum §3.2–§3.5). The single shared grammar: Working on, Now,
 * Aureus is carrying, Needs you, Found, Done means. Only the current
 * "Now" line dominates visually — completed work recedes, per addendum
 * §3.3. No fake percentages, no cycling filler: every line rendered here
 * comes from the matter's scripted fixture timeline
 * (`engine/fixtures.ts`), never a decorative timer.
 */
export function WorkSurfaceView({ matter, onAsk, onResolveNeedsYou }: WorkSurfaceViewProps) {
  const { script, stepIndex, needsYouResolved } = matter;
  const started = stepIndex >= 0;
  const currentStep = started ? script.steps[stepIndex] : null;
  const finished = stepIndex >= script.steps.length - 1;

  const showNeedsYou =
    script.needsYou &&
    script.needsYouAt >= 0 &&
    stepIndex >= script.needsYouAt &&
    !needsYouResolved;
  const foundItems = script.foundAt >= 0 && stepIndex >= script.foundAt ? script.found : [];
  const showArtifact = script.artifactAt >= 0 && stepIndex >= script.artifactAt;

  return (
    <div className={styles.surface}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Working on</p>
        <h1 className={styles.workingOn}>{script.workingOn}</h1>
      </header>

      <section className={styles.nowSection} aria-live="polite">
        {!finished && currentStep ? (
          <p key={currentStep.id} className={styles.nowLine}>
            <span className={styles.nowDot} aria-hidden="true" />
            {currentStep.label}
          </p>
        ) : (
          <p className={styles.nowLine}>
            <span className={styles.nowDotDone} aria-hidden="true" />
            {currentStep?.label ?? 'Ready.'}
          </p>
        )}
      </section>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="carrying-heading">
          <h2 id="carrying-heading" className={styles.panelHeading}>
            Aureus is carrying
          </h2>
          <ul className={styles.carryingList}>
            {script.carrying.map((item) => (
              <li key={item.id} className={styles.carryingItem} data-status={item.status}>
                <span className={styles.carryingLabel}>{item.label}</span>
                <span className={styles.carryingStatus}>
                  {STATUS_LABEL[item.status]}
                  {item.detail ? ` · ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {showNeedsYou && script.needsYou ? (
          <section className={styles.needsYou} aria-labelledby="needs-you-heading">
            <h2 id="needs-you-heading" className={styles.needsYouHeading}>
              Needs you
            </h2>
            <p className={styles.needsYouPrompt}>{script.needsYou.prompt}</p>
            <button type="button" className={styles.needsYouAction} onClick={onResolveNeedsYou}>
              {script.needsYou.actionLabel}
            </button>
          </section>
        ) : null}

        {foundItems.length > 0 ? (
          <section className={styles.panel} aria-labelledby="found-heading">
            <h2 id="found-heading" className={styles.panelHeading}>
              Found
            </h2>
            <ul className={styles.foundList}>
              {foundItems.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {showArtifact ? <ResultArtifactCard artifact={script.artifact} /> : null}

      <section className={styles.doneMeans} aria-labelledby="done-means-heading">
        <h2 id="done-means-heading" className={styles.doneMeansHeading}>
          Done means
        </h2>
        <p className={styles.doneMeansText}>{script.doneMeans}</p>
      </section>

      <div className={styles.composerWrap}>
        <Composer onSubmit={onAsk} placeholder="Ask Aureus anything about this work…" />
      </div>
    </div>
  );
}
