'use client';

import type { ReactNode } from 'react';
import { lightingStateAt, LivingHallEnvironment, type HallLightingStateId } from '../living-hall';
import styles from './ArrivalRoom.module.css';

export type Daylight = HallLightingStateId;

export function daylightAt(date: Date): Daylight {
  return lightingStateAt(date).id;
}

export interface ArrivalRoomProps {
  children: ReactNode;
}

/** One continuous Hall around session restoration, arrival, and recovery. */
export function ArrivalRoom({ children }: ArrivalRoomProps) {
  return (
    <div className={styles.room}>
      <LivingHallEnvironment wakeOnMount={false} />
      {children}
    </div>
  );
}
