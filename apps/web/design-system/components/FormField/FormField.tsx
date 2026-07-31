import type { InputHTMLAttributes } from 'react';
import styles from './FormField.module.css';

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
  /**
   * Render a `<textarea>` instead of a single-line `<input>`. Defaults to
   * false, so every existing field is untouched.
   *
   * For the arrival questions that ask a member to describe a situation
   * "in their own words", a one-line box quietly contradicts the
   * invitation — someone explaining that they have lost their job and
   * fear losing their housing should be able to see what they have
   * written.
   */
  multiline?: boolean;
  rows?: number;
}

/**
 * Foundational form primitive (FPB-005 §3 "Forms"). Associates the label,
 * help text, and error message via `aria-describedby` and `aria-invalid`
 * so every form built from it satisfies FPB-011 without repeating the
 * wiring per field.
 */
export function FormField({ id, label, value, onChange, error, helpText, required, multiline = false, rows = 3, ...rest }: FormFieldProps) {
  const describedBy = [helpText ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={styles.input}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required}
          placeholder={rest.placeholder}
          required={required}
        />
      ) : (
        <input
          id={id}
          type={rest.type ?? 'text'}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required}
          {...rest}
        />
      )}
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
