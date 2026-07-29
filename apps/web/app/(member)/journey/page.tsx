'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useJourney } from '../../../state';
import { LoadingState } from '../../../design-system/components/LoadingState/LoadingState';
import { EmptyState } from '../../../design-system/components/EmptyState/EmptyState';
import { ErrorState } from '../../../design-system/components/ErrorState/ErrorState';
import { Button } from '../../../design-system/components/Button/Button';
import { JourneyCard, MilestoneChecklist, ProgressIndicator } from '../../../design-system/components/journey';
import { JourneyTimeline } from '../../../design-system/components/journey-timeline';
import { Room } from '../../../design-system/components/room';
import { domainErrorCopy } from '../../../design-system/components/domain-error-copy';
import styles from './page.module.css';

export default function JourneyPage() {
  const journey = useJourney();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  useEffect(() => {
    void journey.loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openGoal(goalId: string) {
    setSelectedGoalId(goalId);
    void journey.loadJourneyDetail(goalId);
  }

  const selectedGoal = journey.state.goals.find((g) => g.id === selectedGoalId) ?? null;
  const selectedJourney = selectedGoal ? journey.state.journeysByGoalId[selectedGoal.id] : undefined;
  const milestones = selectedJourney ? (journey.state.milestonesByJourneyId[selectedJourney.id] ?? []) : [];
  const tasksByMilestoneId = journey.state.tasksByMilestoneId;
  const totalTasks = milestones.reduce((sum, m) => sum + (tasksByMilestoneId[m.id]?.length ?? 0), 0);
  const completedTasks = milestones.reduce(
    (sum, m) => sum + (tasksByMilestoneId[m.id]?.filter((t) => t.status === 'COMPLETED').length ?? 0),
    0,
  );

  if (journey.state.goals.length === 0 && !journey.state.isLoadingGoals) {
    return (
      <Room title="Journey Review">
        <EmptyState
          title="Your journey starts with a first mission"
          description="Head back to Welcome to set your first goal."
          action={
            <Link href="/welcome">
              <Button>Get started</Button>
            </Link>
          }
        />
      </Room>
    );
  }

  return (
    <Room
      title="Journey Review"
      headerAction={
        selectedGoal ? (
          <button type="button" className={styles.back} onClick={() => setSelectedGoalId(null)}>
            ← All goals
          </button>
        ) : undefined
      }
    >
      {selectedGoal ? (
        <div className={styles.detail}>
          <h2 className={styles.goalTitle}>{selectedGoal.title}</h2>

          {journey.state.isLoadingDetail ? <LoadingState label="Loading progress" /> : null}

          {journey.state.error ? (
            <ErrorState
              title={domainErrorCopy(journey.state.error.kind).title}
              description={domainErrorCopy(journey.state.error.kind).description}
            />
          ) : null}

          {!journey.state.isLoadingDetail && milestones.length > 0 ? (
            <>
              <ProgressIndicator completed={completedTasks} total={totalTasks} />
              <MilestoneChecklist
                milestones={milestones}
                tasksByMilestoneId={tasksByMilestoneId}
                onToggleMilestone={(milestoneId, completed) =>
                  void journey.setMilestoneStatus(selectedJourney!.id, milestoneId, completed ? 'COMPLETED' : 'PENDING')
                }
                onToggleTask={(milestoneId, taskId, completed) =>
                  void journey.setTaskStatus(milestoneId, taskId, completed ? 'COMPLETED' : 'PENDING')
                }
              />
            </>
          ) : null}
        </div>
      ) : (
        <JourneyTimeline loading={journey.state.isLoadingGoals} loadingLabel="Loading your journey">
          {journey.state.goals.map((goal) => (
            <JourneyCard key={goal.id} goal={goal} onOpen={() => openGoal(goal.id)} />
          ))}
        </JourneyTimeline>
      )}
    </Room>
  );
}
