'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../Button/Button';
import styles from './ResourceFilters.module.css';

export interface ResourceFiltersValue {
  q?: string;
  category?: string;
  isRemote?: boolean;
}

export interface ResourceFiltersProps {
  value: ResourceFiltersValue;
  onChange: (value: ResourceFiltersValue) => void;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'GOVERNMENT_AGENCY', label: 'Government Agency' },
  { value: 'NONPROFIT_ORGANIZATION', label: 'Nonprofit Organization' },
  { value: 'COMMUNITY_ORGANIZATION', label: 'Community Organization' },
  { value: 'EDUCATIONAL_INSTITUTION', label: 'Educational Institution' },
  { value: 'HEALTHCARE_PROVIDER', label: 'Healthcare Provider' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'LEGAL_SERVICES', label: 'Legal Services' },
  { value: 'HOUSING_RESOURCES', label: 'Housing Resources' },
  { value: 'EMPLOYMENT_SERVICES', label: 'Employment Services' },
  { value: 'BUSINESS_SUPPORT', label: 'Business Support' },
  { value: 'TECHNOLOGY_TOOLS', label: 'Technology Tools' },
  { value: 'MENTAL_HEALTH_WELLNESS', label: 'Mental Health & Wellness' },
  { value: 'OTHER', label: 'Other' },
];

/** Progressive-disclosure search (AFX-004 §10), mirroring Opportunities' pattern (PR-002). */
export function ResourceFilters({ value, onChange }: ResourceFiltersProps) {
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
          placeholder="Search resources..."
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
      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={value.isRemote ?? false}
          onChange={(event) => onChange({ ...value, isRemote: event.target.checked || undefined })}
        />
        <span>Remote only</span>
      </label>
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
