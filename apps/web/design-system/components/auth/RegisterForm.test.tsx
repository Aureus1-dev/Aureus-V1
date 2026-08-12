import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { RegisterForm } from './RegisterForm';
import { useSession } from '../../../state';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedUseSession = useSession as jest.Mock;

describe('RegisterForm', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('rejects a weak password client-side without calling the API', async () => {
    const register = jest.fn();
    mockedUseSession.mockReturnValue({ register, claimAccount: jest.fn(), session: { isGuest: false } });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'short1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at least 10 characters.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers and returns directly to the conversation on success', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ register, claimAccount: jest.fn(), session: { isGuest: false } });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith('member@example.com', 'Str0ng!Passw0rd');
    expect(push).toHaveBeenCalledWith('/conversation');
    expect(push).not.toHaveBeenCalledWith('/welcome');
  });

  it('shows the backend error (e.g. email already registered) without redirecting', async () => {
    const register = jest.fn().mockRejectedValue(new ApiError(409, "Email 'member@example.com' is already registered"));
    mockedUseSession.mockReturnValue({ register, claimAccount: jest.fn(), session: { isGuest: false } });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText("Email 'member@example.com' is already registered")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedUseSession.mockReturnValue({ register: jest.fn(), claimAccount: jest.fn(), session: { isGuest: false } });
    const { container } = render(<RegisterForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ── Guest Steward mode: claiming, not registering ──────────────────────

  it('claims the guest session instead of registering when the caller is a guest', async () => {
    const register = jest.fn();
    const claimAccount = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ register, claimAccount, session: { isGuest: true } });

    render(<RegisterForm />);
    expect(screen.getByRole('button', { name: 'Create free account' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create free account' }));

    expect(claimAccount).toHaveBeenCalledWith('member@example.com', 'Str0ng!Passw0rd');
    expect(register).not.toHaveBeenCalled();
    // Back to the conversation the guest already built, not the full
    // onboarding wizard — the whole point is that nothing restarts.
    expect(push).toHaveBeenCalledWith('/conversation');
  });

  it('shows the backend error from a failed claim without redirecting', async () => {
    const claimAccount = jest.fn().mockRejectedValue(new ApiError(409, "Email 'taken@example.com' is already registered"));
    mockedUseSession.mockReturnValue({ register: jest.fn(), claimAccount, session: { isGuest: true } });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'taken@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create free account' }));

    expect(await screen.findByText("Email 'taken@example.com' is already registered")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
