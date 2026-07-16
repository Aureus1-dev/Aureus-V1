'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import * as authApi from '../../../lib/api/auth';
import { Button } from '../Button/Button';
import { ErrorState } from '../ErrorState/ErrorState';
import { FormField } from '../FormField';
import { AuthLayout } from './AuthLayout';
import { authErrorMessage } from './auth-error-copy';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Check your email" footer={<Link href="/login">Return to sign in</Link>}>
        <p>If an account exists for that email address, we&apos;ve sent instructions to reset your password.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email and we'll send you instructions to reset your password."
      footer={<Link href="/login">Return to sign in</Link>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="forgot-password-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        {error ? <ErrorState title="Something went wrong" description={error} /> : null}
        <Button type="submit" disabled={submitting || !email}>
          {submitting ? 'Sending…' : 'Send reset instructions'}
        </Button>
      </form>
    </AuthLayout>
  );
}
