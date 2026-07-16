import Link from 'next/link';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
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
        <Link href="/journey">
          <Button variant="secondary">Continue my journey</Button>
        </Link>
        <Link href="/opportunities">
          <Button variant="secondary">Browse opportunities</Button>
        </Link>
        <Link href="/welcome?newMission=true">
          <Button variant="secondary">Start a new mission</Button>
        </Link>
      </div>
    </Card>
  );
}
