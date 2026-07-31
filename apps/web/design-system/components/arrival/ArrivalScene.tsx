'use client';

import { useEffect, useRef, useState } from 'react';
import { HallArchitecture, HallHearth, HallThresholds } from '../environment';
import styles from './ArrivalScene.module.css';

export interface ArrivalSceneProps {
  /** Fires once the opening sequence has fully played, or the member skips it. */
  onFinished: () => void;
}

const STAGE_ORDER = [
  'darkness',
  'light',
  'mark',
  'wordmark',
  'tagline',
  'invitation',
  'hall',
  'steward',
] as const;

type Stage = (typeof STAGE_ORDER)[number];

/** Time (ms) before revealing STAGE_ORDER[i + 1], one entry per stage but the last. */
const TRANSITION_DELAYS_MS = [350, 550, 700, 700, 900, 900, 700];

const LAST_STAGE_INDEX = STAGE_ORDER.length - 1;

/** Mirrors build-theme-css.ts's own precedence: an explicit preference wins, otherwise the OS setting applies. Guarded for matchMedia's absence in the jsdom test environment. */
function prefersReducedMotion(): boolean {
  const explicit = document.documentElement.getAttribute('data-reduced-motion');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function joinClasses(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * The Opening Sequence (AUREA-002 Arrival Canon): darkness, gentle light,
 * the Aureus Mark, the wordmark, the promise, the invitation, the Hall,
 * and the Steward's first question — unfolding slowly so the first
 * impression is "I can relax," not "I need to figure this out."
 *
 * Every line of copy is present in the DOM from the first render; only
 * its opacity is staged. Assistive technology and reduced-motion visitors
 * receive the full welcome immediately rather than waiting on or racing
 * the animation (AUREA-002 "Accessibility"). A visible skip control is
 * always available for the same reason.
 */
export function ArrivalScene({ onFinished }: ArrivalSceneProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStageIndex(LAST_STAGE_INDEX);
      onFinished();
    };

    if (prefersReducedMotion()) {
      finish();
      return;
    }

    let cancelled = false;
    let index = 0;

    const advance = () => {
      if (cancelled || index >= LAST_STAGE_INDEX) {
        finish();
        return;
      }
      window.setTimeout(() => {
        if (cancelled) return;
        index += 1;
        setStageIndex(index);
        advance();
      }, TRANSITION_DELAYS_MS[index]);
    };
    advance();

    return () => {
      cancelled = true;
    };
    // finish/advance intentionally run once from mount; onFinished is only ever invoked through finishedRef's guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStageIndex(LAST_STAGE_INDEX);
    onFinished();
  };

  const reached = (stage: Stage) => stageIndex >= STAGE_ORDER.indexOf(stage);

  return (
    <section
      className={joinClasses(styles.scene, reached('hall') && styles.hall)}
      data-time="evening"
      aria-label="Welcome to Aureus"
    >
      {/*
        The Hall itself, revealed around the light rather than cut to.
        These are the same components the Hall is built from, so when the
        sequence finishes there is nothing to swap: the member is already
        looking at the room they are about to be standing in.
      */}
      <div
        className={joinClasses(styles.environment, reached('hall') && styles.environmentVisible)}
        aria-hidden="true"
      >
        <HallArchitecture />
        <HallThresholds />
      </div>

      {/*
        The light that forms during the sequence *is* the hearth. Same
        component, same geometry, same position — it simply gains the
        room around it. That is what makes the transition one continuous
        transformation instead of a cinematic followed by an interface.
      */}
      <div
        className={joinClasses(
          styles.hearthWrap,
          reached('light') && styles.hearthLit,
          reached('mark') && styles.hearthFormed,
        )}
      >
        <HallHearth />
      </div>

      <div className={styles.copy}>
        <p className={joinClasses(styles.wordmark, reached('wordmark') && styles.visible)}>Aureus.</p>
        <p className={joinClasses(styles.tagline, reached('tagline') && styles.visible)}>
          Helping people flourish. Forever.
        </p>
        <p className={joinClasses(styles.invitation, reached('invitation') && styles.visible)}>Help starts here.</p>
        <p className={joinClasses(styles.stewardLine, reached('steward') && styles.visible)}>How can we help?</p>
      </div>

      <button type="button" className={styles.skip} onClick={skip}>
        Skip introduction
      </button>
    </section>
  );
}
