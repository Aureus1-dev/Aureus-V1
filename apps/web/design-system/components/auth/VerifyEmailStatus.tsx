'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as authApi from '../../../lib/api/auth';
import { LoadingState } from '../LoadingState/LoadingState';
import { AuthLayout } from './AuthLayout';
import { authErrorMessage } from './auth-error-copy';

export interface VerifyEmailStatusProps {
  token: string | null;
}

type VerificationState = 'verifying' | 'succeeded' | 'failed';

export function VerifyEmailStatus({ token }: VerifyEmailStatusProps) {
  const [state, setState] = useState<VerificationState>(token ? 'verifying' : 'failed');
  const [error, setError] = useState<string | null>(null);

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
    </AuthLayout>
  );
}
