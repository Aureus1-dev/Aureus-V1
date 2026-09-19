'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../../state';
import * as authApi from '../../../lib/api/auth';
import { ApiError } from '../../../lib/api/errors';
import { Button } from '../Button/Button';
import { ErrorState } from '../ErrorState/ErrorState';
import { FormField } from '../FormField';
import { AuthLayout } from './AuthLayout';
import { authErrorMessage } from './auth-error-copy';

export interface LoginFormProps {
  sessionExpired?: boolean;
}

const EMAIL_VERIFICATION_REQUIRED = 'Please verify your email address before logging in.';

function requiresEmailVerification(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.message === EMAIL_VERIFICATION_REQUIRED;
}

export function LoginForm({ sessionExpired = false }: LoginFormProps) {
  const router = useRouter();
  const { login, establishGuestSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [continuingAsGuest, setContinuingAsGuest] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setVerificationRequired(false);
    setVerificationNotice(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/conversation');
    } catch (caught) {
      setVerificationRequired(requiresEmailVerification(caught));
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!email || resendingVerification) return;
    setResendingVerification(true);
    setVerificationNotice(null);
    try {
      await authApi.resendVerification(email);
      // Deliberately non-enumerating: the API uses the same response whether
      // the address is unknown, already verified, or received a new message.
      setVerificationNotice(
        'If this address still needs verification, a new link is on the way. Check your inbox and spam folder.',
      );
    } catch (caught) {
      setVerificationNotice(authErrorMessage(caught));
    } finally {
      setResendingVerification(false);
    }
  }

  async function handleContinueAsGuest() {
    setContinuingAsGuest(true);
    try {
      await establishGuestSession();
      router.push('/conversation');
    } catch {
      setContinuingAsGuest(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome"
      description="Sign in to continue a saved conversation."
      footer={
        <>
          <p>
            <Link href="/forgot-password">Forgot your password?</Link>
          </p>
          <p>
            New to Aureus? <Link href="/register">Create an account</Link>
          </p>
          <p>
            <button type="button" onClick={() => void handleContinueAsGuest()} disabled={continuingAsGuest}>
              {continuingAsGuest ? 'One moment…' : 'Continue without an account'}
            </button>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {sessionExpired && !error ? (
          <ErrorState title="Your session has ended" description="Please sign in again to continue." />
        ) : null}
        <FormField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <FormField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
        />
        {error ? <ErrorState title="Sign-in didn't work" description={error} /> : null}
        {verificationRequired ? (
          <div>
            <Button
              type="button"
              onClick={() => void handleResendVerification()}
              disabled={resendingVerification || !email}
            >
              {resendingVerification ? 'Sending…' : 'Resend verification email'}
            </Button>
            {verificationNotice ? <p role="status">{verificationNotice}</p> : null}
          </div>
        ) : null}
        <Button type="submit" disabled={submitting || !email || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
