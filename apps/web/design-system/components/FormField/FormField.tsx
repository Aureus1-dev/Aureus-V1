import type { InputHTMLAttributes } from 'react';
import styles from './FormField.module.css';

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
}

/**
 * Foundational form primitive (FPB-005 §3 "Forms"). Associates the label,
 * help text, and error message via `aria-describedby` and `aria-invalid`
 * so every form built from it satisfies FPB-011 without repeating the
 * wiring per field.
 */
export function FormField({ id, label, value, onChange, error, helpText, required, ...rest }: FormFieldProps) {
  const describedBy = [helpText ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required}
        {...rest}
      />
      {helpText ? (
        <p id={`${id}-help`} className={styles.helpText}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
