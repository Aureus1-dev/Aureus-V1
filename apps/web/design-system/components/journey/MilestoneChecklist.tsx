import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';
import { TaskItem } from './TaskItem';
import styles from './MilestoneChecklist.module.css';

export interface MilestoneChecklistProps {
  milestones: MilestoneDto[];
  tasksByMilestoneId: Record<string, TaskDto[]>;
  onToggleMilestone: (milestoneId: string, completed: boolean) => void;
  onToggleTask: (milestoneId: string, taskId: string, completed: boolean) => void;
}

/**
 * Checklist / Timeline hybrid (FPB-005 §3 "Data Presentation"). Renders
 * the Journey's Milestones in `position` order, each with its Tasks.
 */
export function MilestoneChecklist({
  milestones,
  tasksByMilestoneId,
  onToggleMilestone,
  onToggleTask,
}: MilestoneChecklistProps) {
  const ordered = [...milestones].sort((a, b) => a.position - b.position);

  return (
    <ol className={styles.list}>
      {ordered.map((milestone) => {
        const completed = milestone.status === 'COMPLETED';
        const tasks = tasksByMilestoneId[milestone.id] ?? [];
        return (
          <li key={milestone.id} className={styles.milestone}>
            <label className={styles.milestoneLabel}>
              <input
                type="checkbox"
                checked={completed}
                onChange={() => onToggleMilestone(milestone.id, !completed)}
                aria-label={`Mark milestone "${milestone.title}" as ${completed ? 'not complete' : 'complete'}`}
              />
              <span className={completed ? styles.completedText : undefined}>{milestone.title}</span>
            </label>
            {tasks.length > 0 ? (
              <ul className={styles.tasks}>
                {tasks
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={() => onToggleTask(milestone.id, task.id, task.status !== 'COMPLETED')}
                    />
                  ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
