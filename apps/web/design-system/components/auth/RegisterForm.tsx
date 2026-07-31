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
  const { register } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      await register(email, password);
      router.push('/welcome');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Aureus is ready to listen whenever you are."
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
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
