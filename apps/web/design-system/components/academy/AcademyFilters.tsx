'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../Button/Button';
import type { LearningDomain } from '../../../lib/api/academy';
import { formatLearningDomain } from './academy-format';
import styles from './AcademyFilters.module.css';

export interface AcademyFiltersValue {
  q?: string;
  learningDomain?: LearningDomain;
}

export interface AcademyFiltersProps {
  value: AcademyFiltersValue;
  onChange: (value: AcademyFiltersValue) => void;
}

const LEARNING_DOMAINS: LearningDomain[] = [
  'PERSONAL_DEVELOPMENT',
  'FINANCIAL_LITERACY',
  'CAREER_READINESS',
  'ENTREPRENEURSHIP',
  'LEADERSHIP',
  'TECHNOLOGY_AND_AI',
  'HEALTH_AND_WELLBEING',
  'CIVIC_AND_COMMUNITY_ENGAGEMENT',
  'STEWARDSHIP',
  'MISSION_SPECIFIC_PROGRAMS',
];

/**
 * Progressive-disclosure search (AFX-004 §10) — a plain text search plus
 * one category narrowing filter (`learningDomain`, already supported by
 * the backend's `ListCoursesQueryDto`), not an overwhelming filter panel.
 */
export function AcademyFilters({ value, onChange }: AcademyFiltersProps) {
  const [q, setQ] = useState(value.q ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onChange({ ...value, q: q || undefined });
  }

  return (
    <form className={styles.filters} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Search</span>
        <input
          className={styles.input}
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search courses..."
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Area</span>
        <select
          className={styles.input}
          value={value.learningDomain ?? ''}
          onChange={(event) =>
            onChange({ ...value, learningDomain: (event.target.value || undefined) as LearningDomain | undefined })
          }
        >
          <option value="">All areas</option>
          {LEARNING_DOMAINS.map((domain) => (
            <option key={domain} value={domain}>
              {formatLearningDomain(domain)}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
