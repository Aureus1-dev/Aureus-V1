'use client';

import { useEffect } from 'react';
import { useConversation, useJourney, useMemory, useSession } from '../../../state';
import { computeNextStep } from '../home/compute-next-step';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import styles from './MemorySidebar.module.css';

/**
 * The right-hand Steward context panel's content (Living Steward Workspace
 * redesign) — Current Goal, Desired Outcome, Today's Progress, Suggested
 * Next Step, Relevant Journey, Recent Memory. Every section reads from
 * state this app already fetches elsewhere: `JourneyContext` for the
 * first five (Desired Outcome has no separate field — the arrival flow's
 * confirmed understood need already becomes the Goal's own title, so it's
 * read from there), and the new `MemoryContext` (`GET /memory/me`) only
 * for the last. `computeNextStep` (already used by `/home`) is reused
 * unchanged rather than re-derived here. Re-fetches whenever the active
 * conversation's timeline grows, so the panel "updates automatically as
 * the conversation evolves" (Founder brief) via a plain effect + existing
 * data, not a new push/subscription mechanism.
 */
export function MemorySidebar() {
  const { session } = useSession();
  const journey = useJourney();
  const memory = useMemory();
  const conversation = useConversation();

  useEffect(() => {
    if (!session.isAuthenticated) return;
    void journey.loadGoals();
    void memory.loadMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated, conversation.timeline.length]);

  const activeGoal = journey.state.goals.find((goal) => goal.status === 'ACTIVE') ?? null;

  useEffect(() => {
    if (activeGoal && !journey.state.journeysByGoalId[activeGoal.id]) {
      void journey.loadJourneyDetail(activeGoal.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoal?.id]);

  if (journey.state.isLoadingGoals || memory.state.isLoading) {
    return <LoadingState label="Gathering your context" />;
  }

  if (!activeGoal) {
    return (
      <EmptyState
        title="No active goal yet"
        description="Once you begin, your Steward will keep this panel updated as you go."
      />
    );
  }

  const activeJourney = journey.state.journeysByGoalId[activeGoal.id] ?? null;
  const milestones = activeJourney ? (journey.state.milestonesByJourneyId[activeJourney.id] ?? []) : [];
  const completedMilestones = milestones.filter((milestone) => milestone.status === 'COMPLETED').length;
  const nextStep = computeNextStep(milestones, journey.state.tasksByMilestoneId);
  const recentSnippets = memory.state.memory?.recentConversationSnippets ?? [];

  return (
    <div className={styles.sidebar}>
      <section className={styles.section}>
        <h3 className={styles.label}>Current Goal</h3>
        <p className={styles.value}>{activeGoal.title}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.label}>Desired Outcome</h3>
        <p className={styles.value}>You want to: {activeGoal.title}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.label}>Today&apos;s Progress</h3>
        <p className={styles.value}>
          {milestones.length > 0 ? `${completedMilestones} of ${milestones.length} milestones complete` : 'Just getting started'}
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.label}>Suggested Next Step</h3>
        <p className={styles.value}>{nextStep ? `${nextStep.taskTitle} — ${nextStep.milestoneTitle}` : 'Nothing pending right now'}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.label}>Relevant Journey</h3>
        <p className={styles.value}>{activeJourney?.title ?? activeGoal.title}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.label}>Recent Memory</h3>
        {recentSnippets.length > 0 ? (
          <ul className={styles.memoryList}>
            {recentSnippets.map((snippet, index) => (
              <li key={index}>{snippet}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.value}>Nothing recent yet.</p>
        )}
      </section>
    </div>
  );
}
