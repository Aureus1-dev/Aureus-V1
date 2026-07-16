import { Button } from '../../Button/Button';
import styles from './HospitalityStep.module.css';

export interface HospitalityStepProps {
  onContinue: () => void;
}

/**
 * The first thing a member sees (AFX-001 §4 Hospitality). Establishes
 * emotional safety and introduces the steward before asking for
 * anything (FPB-003 §4 Welcome Flow).
 */
export function HospitalityStep({ onContinue }: HospitalityStepProps) {
  return (
    <div className={styles.step}>
      <h1 className={styles.title}>Welcome to Aureus</h1>
      <p className={styles.body}>
        Aureus is a steward for your journey — here to listen, help you find real opportunities, and prepare the
        work so you can move forward with confidence. There&apos;s no wrong way to begin.
      </p>
      <Button onClick={onContinue}>Get started</Button>
    </div>
  );
}
