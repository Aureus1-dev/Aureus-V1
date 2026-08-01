import { Card } from '../Card/Card';
import { LinkButton } from '../Button/LinkButton';
import { VisuallyHidden } from '../../accessibility';
import styles from './QuickActions.module.css';

/**
 * Contextual shortcuts, not a second navigation menu — `AppShell`
 * already provides global navigation to every surface (FPB-002 §3).
 * These are the specific next actions a member most likely wants from
 * Home (AFX-001 §6).
 */
export function QuickActions() {
  return (
    <Card>
      <h2 className={styles.title}>
        <VisuallyHidden>Quick actions</VisuallyHidden>
      </h2>
      <div className={styles.actions}>
        <LinkButton href="/journey" variant="secondary">Continue my journey</LinkButton>
        <LinkButton href="/opportunities" variant="secondary">Browse opportunities</LinkButton>
        <LinkButton href="/welcome?newMission=true" variant="secondary">Start a new mission</LinkButton>
      </div>
    </Card>
  );
}
