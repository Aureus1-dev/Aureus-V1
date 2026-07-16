'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../Button/Button';
import styles from './OpportunityFilters.module.css';

export interface OpportunityFiltersValue {
  q?: string;
  category?: string;
  deadlineFilter?: 'afterNow' | 'within7days' | 'within30days';
}

export interface OpportunityFiltersProps {
  value: OpportunityFiltersValue;
  onChange: (value: OpportunityFiltersValue) => void;
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
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
