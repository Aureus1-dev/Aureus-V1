import { useGreetingName } from './useGreetingName';
import styles from './Greeting.module.css';

export interface GreetingProps {
  now?: Date;
}

function timeOfDayGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The personalized greeting (AFX-006 — measured by outcomes, never
 * engagement: no streaks, no urgency, no "you're behind" framing).
 * Falls back to calm generic copy rather than a broken or empty
 * heading when no name is available yet.
 */
export function Greeting({ now = new Date() }: GreetingProps) {
  const name = useGreetingName();

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>
        {timeOfDayGreeting(now)}
        {name ? `, ${name}` : ''}
      </h1>
      <p className={styles.subheading}>Here&apos;s where things stand.</p>
    </div>
  );
}
