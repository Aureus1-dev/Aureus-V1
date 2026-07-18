import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../state/session/SessionContext';
import { AppShell } from './AppShell';

function SignedInAs({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (session.roles.length === 0 && roles.length > 0) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'user-1', roles });
  }
  return <>{children}</>;
}

function renderShell(roles: string[] = []) {
  return render(
    <SessionProvider>
      <SignedInAs roles={roles}>
        <AppShell>
          <p>Content</p>
        </AppShell>
      </SignedInAs>
    </SessionProvider>,
  );
}

describe('AppShell', () => {
  it('renders every primary surface link', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('link', { name: 'Steward' })).toHaveAttribute('href', '/steward');
  });

  it('does not show the Founder link for a member', () => {
    renderShell(['MEMBER']);
    expect(screen.queryByRole('link', { name: 'Founder' })).not.toBeInTheDocument();
  });

  it('shows the Founder link for a Platform Administrator', () => {
    renderShell(['PLATFORM_ADMINISTRATOR']);
    expect(screen.getByRole('link', { name: 'Founder' })).toHaveAttribute('href', '/founder');
  });

  it('shows the Founder link for a System Administrator', () => {
    renderShell(['SYSTEM_ADMINISTRATOR']);
    expect(screen.getByRole('link', { name: 'Founder' })).toHaveAttribute('href', '/founder');
  });

  it('has no accessibility violations without the Founder nav entry', async () => {
    const { container } = renderShell(['MEMBER']);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations with the Founder nav entry', async () => {
    const { container } = renderShell(['PLATFORM_ADMINISTRATOR']);
    expect(await axe(container)).toHaveNoViolations();
  });
});
