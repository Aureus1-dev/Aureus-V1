'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { GoalDto } from '../../../lib/api/goals';
import { Button } from '../Button/Button';
import { JourneyCard } from '../journey';
import { FirstRunWelcome } from './FirstRunWelcome';
import styles from './ReturningWelcome.module.css';

export interface ReturningWelcomeProps {
  goals: GoalDto[];
}

/**
 * A returning member should never be forced through onboarding again
 * (AFX-005 §3 "Members should never be forced through identical
 * paths"). Offers a calm summary and, if they choose, a fresh First
 * Mission alongside their existing goals.
 */
export function ReturningWelcome({ goals }: ReturningWelcomeProps) {
  const router = useRouter();
  const [startingNewMission, setStartingNewMission] = useState(false);

  if (startingNewMission) {
    return <FirstRunWelcome skipHospitality />;
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.body}>Here&apos;s where things stand.</p>
      <div className={styles.goals}>
        {goals.map((goal) => (
          <JourneyCard key={goal.id} goal={goal} onOpen={() => router.push('/journey')} />
        ))}
      </div>
      <div className={styles.actions}>
        <Link href="/journey">
          <Button>View my journey</Button>
        </Link>
        <Link href="/opportunities">
          <Button variant="secondary">Browse opportunities</Button>
        </Link>
        <Button variant="secondary" onClick={() => setStartingNewMission(true)}>
          Start a new mission
        </Button>
      </div>
    </div>
  );
}
