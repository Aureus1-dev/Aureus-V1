'use client';

import { useEffect, useRef } from 'react';
import { LivingHallEnvironment } from '../living-hall';
import styles from './ArrivalScene.module.css';

export interface ArrivalSceneProps {
  /** Fires as soon as the Hall is mounted. There is no forced introduction. */
  onFinished: () => void;
}

/**
 * The front door is already the Hall. The member can see what Aureus is for
 * immediately while the anonymous session is established in the background.
 * No logo, promise, tutorial, countdown, or skip control stands between a
 * person and asking for help.
 */
export function ArrivalScene({ onFinished }: ArrivalSceneProps) {
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  }, [onFinished]);

  return (
    <main className={styles.scene} aria-labelledby="arrival-question">
      <LivingHallEnvironment wakeOnMount />
      <p className={styles.wordmark}>Aureus</p>
      <section className={styles.entry} aria-label="Begin with Aureus">
        <h1 id="arrival-question">How can we help?</h1>
        <div className={styles.previewComposer} aria-hidden="true">
          <span>Type here to begin</span>
          <span className={styles.send}>Send</span>
        </div>
        <p className={styles.status}>Preparing a private place to begin…</p>
      </section>
    </main>
  );
}
