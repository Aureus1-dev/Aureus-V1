'use client';

import { useState } from 'react';
import type { StewardshipStory } from './engine/types';
import styles from './StoryRail.module.css';

export interface StoryRailProps {
  stories: StewardshipStory[];
}

/**
 * Restrained public proof strip (portfolio §4, addendum §4.1): "Situation
 * → What Aureus carried → Verified result." No autoplay, no vanity
 * counters, no hardship spectacle — each card expands in place on request
 * rather than looping past the visitor.
 */
export function StoryRail({ stories }: StoryRailProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className={styles.rail} aria-labelledby="work-surface-stories-heading">
      <h2 id="work-surface-stories-heading" className={styles.heading}>
        What Aureus has helped carry
      </h2>
      <ul className={styles.list}>
        {stories.map((story) => {
          const expanded = expandedId === story.id;
          return (
            <li key={story.id} className={styles.card}>
              <button
                type="button"
                className={styles.cardToggle}
                aria-expanded={expanded}
                aria-controls={`story-detail-${story.id}`}
                onClick={() => setExpandedId(expanded ? null : story.id)}
              >
                <p className={styles.situation}>{story.situation}</p>
                <p className={styles.result}>{story.result}</p>
              </button>
              {expanded ? (
                <div id={`story-detail-${story.id}`} className={styles.detail}>
                  <p className={styles.detailLabel}>What Aureus carried</p>
                  <ul className={styles.carriedList}>
                    {story.carried.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
