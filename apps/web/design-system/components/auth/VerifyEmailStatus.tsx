'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import * as authApi from '../../../lib/api/auth';
import { LoadingState } from '../LoadingState/LoadingState';
import { Button } from '../Button/Button';
import { FormField } from '../FormField';
import { AuthLayout } from './AuthLayout';
import { authErrorMessage } from './auth-error-copy';

export interface VerifyEmailStatusProps {
  token: string | null;
}

type VerificationState = 'verifying' | 'succeeded' | 'failed';

export function VerifyEmailStatus({ token }: VerifyEmailStatusProps) {
  const [state, setState] = useState<VerificationState>(token ? 'verifying' : 'failed');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This verification link is missing its token.');
      return;
    }
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setState('succeeded');
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(authErrorMessage(caught));
          setState('failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    if (!email || resending) return;
    setResending(true);
    setResendNotice(null);
    try {
      await authApi.resendVerification(email);
      setResendNotice(
        'If this address still needs verification, a new link is on the way. Check your inbox and spam folder.',
      );
    } catch (caught) {
      setResendNotice(authErrorMessage(caught));
    } finally {
      setResending(false);
    }
  }

  if (state === 'verifying') {
    return (
      <AuthLayout title="Verifying your email">
        <LoadingState label="Confirming your email address" />
      </AuthLayout>
    );
  }

  if (state === 'succeeded') {
    return (
      <AuthLayout title="Email verified" footer={<Link href="/welcome">Continue</Link>}>
        <p>Thank you — your email address has been confirmed.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="We couldn't verify that link" footer={<Link href="/login">Return to sign in</Link>}>
      <p>{error ?? 'This verification link is invalid or has expired.'}</p>
      <p>Enter your email and Aureus can send a fresh verification link.</p>
      <form onSubmit={handleResend} noValidate>
        <FormField
          id="verification-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <Button type="submit" disabled={!email || resending}>
          {resending ? 'Sending…' : 'Send a new verification link'}
        </Button>
      </form>
      {resendNotice ? <p role="status">{resendNotice}</p> : null}
    </AuthLayout>
  );
}
