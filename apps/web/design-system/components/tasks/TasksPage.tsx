'use client';

import { useEffect } from 'react';
import { useSession, useTasks } from '../../../state';
import type { TaskDto, TaskStatus } from '../../../lib/api/tasks';
import { Card } from '../Card/Card';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './TasksPage.module.css';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SKIPPED', label: 'Skipped' },
];

function priorityLabel(priority: TaskDto['priority']): string {
  return priority[0] + priority.slice(1).toLowerCase();
}

/**
 * The standing Tasks surface (PR-002) — every task the member owns
 * across every Journey, not just the one Milestone in view. A flat,
 * status-editable list rather than the Journey/Milestone tree shown at
 * `/journey`, since "everything I need to do right now" is the point of
 * a standalone Tasks surface.
 */
export function TasksPage() {
  const { session } = useSession();
  const { state, load, setStatus } = useTasks();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!session.isAuthenticated) {
    return <EmptyState title="Sign in to view your tasks" description="Sign in to see the tasks across your Journeys." />;
  }

  const errorCopy = state.error ? domainErrorCopy(state.error.kind) : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tasks</h1>

      {state.isLoading && state.tasks.length === 0 ? <LoadingState label="Loading tasks" /> : null}

      {errorCopy && state.tasks.length === 0 && !state.isLoading ? (
        <ErrorState title={errorCopy.title} description={errorCopy.description} />
      ) : null}

      {!state.isLoading && !state.error && state.tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Tasks appear here once you start a Journey — each Milestone breaks down into small next steps."
        />
      ) : null}

      {state.tasks.length > 0 ? (
        <ul className={styles.list}>
          {state.tasks.map((task) => (
            <li key={task.id}>
              <Card className={styles.item}>
                <div className={styles.itemMain}>
                  <p className={styles.itemTitle}>{task.title}</p>
                  <span className={styles.priority}>{priorityLabel(task.priority)} priority</span>
                </div>
                <label className={styles.statusField}>
                  <span className={styles.statusLabel}>Status</span>
                  <select
                    className={styles.select}
                    value={task.status}
                    disabled={state.updatingTaskId === task.id}
                    onChange={(event) => void setStatus(task.id, event.target.value as TaskStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
