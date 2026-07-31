'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../../state';
import { Button } from '../Button/Button';
import { ErrorState } from '../ErrorState/ErrorState';
import { FormField } from '../FormField';
import { AuthLayout } from './AuthLayout';
import { authErrorMessage } from './auth-error-copy';

export interface LoginFormProps {
  sessionExpired?: boolean;
}

export function LoginForm({ sessionExpired = false }: LoginFormProps) {
  const router = useRouter();
  const { login, establishGuestSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [continuingAsGuest, setContinuingAsGuest] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/welcome');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  // Guest Steward mode: nothing here should be a true dead end,
  // including for a guest whose own session already lapsed (a guest has
  // no password to sign back in with). This is the same "How can we
  // help?" first-touch experience the root landing page offers, reached
  // from wherever a visitor happened to land on a login wall instead.
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
      title="Welcome back"
      description="Sign in to continue your conversation with your steward."
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
        <Button type="submit" disabled={submitting || !email || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
