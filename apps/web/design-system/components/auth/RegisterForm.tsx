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
import { passwordRequirementError } from './password-strength';

export function RegisterForm() {
  const router = useRouter();
  const { register, claimAccount, session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Guest Steward mode: every visitor already holds a guest session by
  // the time they reach this form (see the root landing page), so
  // "create an account" almost always means claiming it — attaching real
  // credentials to the SAME account id, preserving every conversation,
  // need, and goal already built rather than starting a disconnected
  // second account. A caller who somehow has no session at all (e.g. a
  // direct visit to /register with guest provisioning unavailable) still
  // gets a normal fresh registration.
  const isClaiming = session.isGuest;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const requirementError = passwordRequirementError(password);
    setPasswordError(requirementError);
    if (requirementError) {
      return;
    }

    setSubmitting(true);
    try {
      if (isClaiming) {
        await claimAccount(email, password);
        router.push('/conversation');
      } else {
        await register(email, password);
        router.push('/conversation');
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={isClaiming ? 'Save everything we\'ve worked on' : 'Create your account'}
      description={
        isClaiming
          ? 'Add an email and password so nothing here is lost, and you can pick up right where you left off.'
          : 'Aureus is ready to listen whenever you are.'
      }
      footer={
        <p>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <FormField
          id="register-password"
          label="Password"
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
        {error ? <ErrorState title="We couldn't create your account" description={error} /> : null}
        <Button type="submit" disabled={submitting || !email || !password}>
          {submitting
            ? (isClaiming ? 'Saving…' : 'Creating account…')
            : (isClaiming ? 'Create free account' : 'Create account')}
        </Button>
      </form>
    </AuthLayout>
  );
}
