import { Button } from '../../Button/Button';
import styles from './PreferencesStep.module.css';

export interface PreferencesStepProps {
  reducedMotion: boolean;
  onReducedMotionChange: (reducedMotion: boolean) => void;
  onContinue: () => void;
}

/**
 * B4 (Gate B — The Gate): an accessibility preference captured during
 * arrival that observably changes behavior from that point forward, not
 * merely stored. Reduced motion already had real backend/token/CSS
 * support (`ThemeProvider`'s `motionPreference`, the `data-reduced-motion`
 * attribute, and the motion-duration tokens it zeroes out) — the real gap
 * was that no member-facing surface ever let a member set it. This step
 * closes that gap; it does not rebuild what already worked.
 *
 * A preference, not a gate: there is no wrong answer, so a member may
 * continue without changing anything (LAUNCH-001: "no wrong way to
 * begin").
 */
export function PreferencesStep({ reducedMotion, onReducedMotionChange, onContinue }: PreferencesStepProps) {
  return (
    <div className={styles.step}>
      <h1 className={styles.title}>Make this comfortable for you</h1>
      <p className={styles.body}>
        You can change this any time. It applies immediately and everywhere in Aureus.
      </p>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(event) => onReducedMotionChange(event.target.checked)}
        />
        Reduce motion and animation
      </label>
      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}
