'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../Button/Button';
import styles from './OpportunityFilters.module.css';

export type OpportunitySortOption = 'newest' | 'confidence' | 'deadline' | 'freshness';

export interface OpportunityFiltersValue {
  q?: string;
  category?: string;
  deadlineFilter?: 'afterNow' | 'within7days' | 'within30days';
  sort?: OpportunitySortOption;
}

export interface OpportunityFiltersProps {
  value: OpportunityFiltersValue;
  onChange: (value: OpportunityFiltersValue) => void;
}

const SORT_OPTIONS: { value: OpportunitySortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'confidence', label: 'Best match' },
  { value: 'deadline', label: 'Closing soon' },
  { value: 'freshness', label: 'Most current' },
];

/**
 * Maps the member-facing sort choice to the backend's `sortBy`/`sortOrder`
 * pair. "Closing soon" is the one case that means ascending (soonest
 * deadline first) — every other option means "most" first.
 */
export function sortOptionToParams(sort: OpportunitySortOption | undefined): { sortBy?: 'newest' | 'deadline' | 'confidence' | 'freshness'; sortOrder?: 'asc' | 'desc' } {
  if (!sort || sort === 'newest') return {};
  if (sort === 'deadline') return { sortBy: 'deadline', sortOrder: 'asc' };
  return { sortBy: sort, sortOrder: 'desc' };
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'SCHOLARSHIP', label: 'Scholarship' },
  { value: 'GRANT', label: 'Grant' },
  { value: 'GOVERNMENT_BENEFIT', label: 'Government Benefit' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'FINANCIAL_ASSISTANCE', label: 'Financial Assistance' },
  { value: 'BANKING_INCENTIVE', label: 'Banking Incentive' },
  { value: 'CREDIT_BUILDING', label: 'Credit Building' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'COMMUNITY_PROGRAM', label: 'Community Program' },
  { value: 'HEALTH_WELLNESS', label: 'Health & Wellness' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * Progressive-disclosure search (AFX-004 §10) — a plain text search plus
 * two optional narrowing filters, not an overwhelming filter panel.
 */
export function OpportunityFilters({ value, onChange }: OpportunityFiltersProps) {
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
          placeholder="Search opportunities..."
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <select
          className={styles.input}
          value={value.category ?? ''}
          onChange={(event) => onChange({ ...value, category: event.target.value || undefined })}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Deadline</span>
        <select
          className={styles.input}
          value={value.deadlineFilter ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              deadlineFilter: (event.target.value || undefined) as OpportunityFiltersValue['deadlineFilter'],
            })
          }
        >
          <option value="">Any time</option>
          <option value="within7days">Within 7 days</option>
          <option value="within30days">Within 30 days</option>
          <option value="afterNow">Upcoming</option>
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Sort by</span>
        <select
          className={styles.input}
          value={value.sort ?? 'newest'}
          onChange={(event) => onChange({ ...value, sort: event.target.value as OpportunitySortOption })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
