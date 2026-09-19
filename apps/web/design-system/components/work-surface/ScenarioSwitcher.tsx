'use client';

import { useState } from 'react';
import { useTheme } from '../../theme';
import type { ScenarioId } from './engine/types';
import styles from './ScenarioSwitcher.module.css';

export interface ScenarioSwitcherProps {
  onSelect: (scenario: ScenarioId) => void;
  onTriggerError: () => void;
}

const SCENARIOS: Array<{ id: ScenarioId; label: string }> = [
  { id: 'arrival', label: 'Ordinary arrival' },
  { id: 'urgent', label: 'Urgent arrival' },
  { id: 'returning-one', label: 'Returning · one matter' },
  { id: 'returning-several', label: 'Returning · several matters' },
  { id: 'returning-none', label: 'Returning · nothing active' },
  { id: 'error', label: 'Error / recovery' },
];

/**
 * Reviewer-only scenario switcher for Slice 0. This is the honest
 * disclosure surface the build instructions require ("deterministic
 * fixture events may simulate scenarios for review, but must be clearly
 * implemented as prototype fixtures") — it is deliberately tucked into a
 * closed drawer so it never competes with the calm primary surface it is
 * reviewing, but it is always reachable and always says what it is.
 */
export function ScenarioSwitcher({ onSelect, onTriggerError }: ScenarioSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { motionPreference, setMotionPreference } = useTheme();
  const reduced = motionPreference === 'reduced';

  return (
    <div className={styles.drawer} data-open={open}>
      <button
        type="button"
        className={styles.tab}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="work-surface-scenario-panel"
      >
        Prototype
      </button>
      {open ? (
        <div id="work-surface-scenario-panel" className={styles.panel}>
          <p className={styles.disclosure}>
            Slice 0 prototype — every scenario below jumps to scripted fixture state for review. No
            real orchestration runs here.
          </p>
          <p className={styles.groupLabel}>Jump to scenario</p>
          <div className={styles.buttonGrid}>
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className={styles.scenarioButton}
                onClick={() => onSelect(scenario.id)}
              >
                {scenario.label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.scenarioButton} onClick={onTriggerError}>
            Trigger error from current state
          </button>
          <label className={styles.motionToggle}>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(event) => setMotionPreference(event.target.checked ? 'reduced' : 'system')}
            />
            Reduced motion
          </label>
        </div>
      ) : null}
    </div>
  );
}
