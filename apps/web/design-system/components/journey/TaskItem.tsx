import type { TaskDto } from '../../../lib/api/tasks';
import styles from './TaskItem.module.css';

export interface TaskItemProps {
  task: TaskDto;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * A single task within a milestone (FPB-005 §3 "Data Presentation").
 */
export function TaskItem({ task, onToggle, disabled }: TaskItemProps) {
  const completed = task.status === 'COMPLETED';
  return (
    <li className={styles.item}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={completed}
          onChange={onToggle}
          disabled={disabled}
          aria-label={`Mark "${task.title}" as ${completed ? 'not complete' : 'complete'}`}
        />
        <span className={completed ? styles.completedText : undefined}>{task.title}</span>
      </label>
    </li>
  );
}
