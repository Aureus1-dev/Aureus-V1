'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import * as authApi from '../../../lib/api/auth';
import { Button } from '../Button/Button';
import { ErrorState } from '../ErrorState/ErrorState';
import { FormField } from '../FormField';
import { AuthLayout } from './AuthLayout';
import { authErrorMessage } from './auth-error-copy';
import { passwordRequirementError } from './password-strength';

export interface ResetPasswordFormProps {
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('This password reset link is missing its token. Please request a new one.');
      return;
    }

    const requirementError = passwordRequirementError(password);
    setPasswordError(requirementError);
    if (requirementError) {
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setSucceeded(true);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (succeeded) {
    return (
      <AuthLayout title="Password updated" footer={<Link href="/login">Sign in</Link>}>
        <p>Your password has been updated. For your security, you&apos;ll need to sign in again.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" footer={<Link href="/login">Return to sign in</Link>}>
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="reset-password-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          helpText="At least 10 characters, with a letter and a number."
          error={passwordError ?? undefined}
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (passwordError) setPasswordError(null);
          }}
        />
        {error ? <ErrorState title="We couldn't reset your password" description={error} /> : null}
        <Button type="submit" disabled={submitting || !password}>
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
