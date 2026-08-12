'use client';

import { useEffect, useRef } from 'react';
import { LivingHallEnvironment } from '../living-hall';
import styles from './ArrivalScene.module.css';

export interface ArrivalSceneProps {
  /** Fires as soon as the Hall is mounted. There is no forced introduction. */
  onFinished: () => void;
}

/**
 * The front door is already the Hall. While the anonymous session is
 * established, the person remains in that same place instead of being covered
 * by a duplicate conversation card. The real conversation surface appears as
 * soon as it is ready.
 */
export function ArrivalScene({ onFinished }: ArrivalSceneProps) {
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  }, [onFinished]);

  return (
    <main className={styles.scene} aria-label="Aureus Living Hall">
      <LivingHallEnvironment wakeOnMount />
      <p className={styles.wordmark}>Aureus</p>
      <p className={styles.status} role="status">
        Preparing a private place to begin…
      </p>
    </main>
  );
}
