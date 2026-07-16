'use client';

import { useRef, type KeyboardEvent } from 'react';
import styles from './AcademyTabs.module.css';

export interface AcademyTab {
  id: string;
  label: string;
}

export interface AcademyTabsProps {
  tabs: AcademyTab[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * A standard WAI-ARIA tabs pattern (FPB-011): roving tabindex, arrow-key
 * navigation between tabs, `aria-selected`/`aria-controls` linking each
 * tab to its panel. Mirrors `OpportunityTabs` (DOMAIN-004) but kept as
 * its own small component rather than shared, so each domain's tab ids
 * stay unambiguous in the DOM.
 */
export function AcademyTabs({ tabs, activeId, onChange }: AcademyTabsProps) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextTab = tabs[(index + delta + tabs.length) % tabs.length];
    onChange(nextTab.id);
    buttonRefs.current[nextTab.id]?.focus();
  }

  return (
    <div className={styles.tablist} role="tablist" aria-label="Academy views">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              buttonRefs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`academy-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`academy-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={isActive ? styles.tabActive : styles.tab}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
