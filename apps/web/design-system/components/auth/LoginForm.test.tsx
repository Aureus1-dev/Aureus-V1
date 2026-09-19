import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { LoginForm } from './LoginForm';
import { useSession } from '../../../state';
import * as authApi from '../../../lib/api/auth';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));
jest.mock('../../../lib/api/auth');

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedUseSession = useSession as jest.Mock;
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockClear();
    jest.clearAllMocks();
  });

  it('signs in and returns directly to the conversation on success', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ login, establishGuestSession: jest.fn() });

    render(<LoginForm />);
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.queryByText('Welcome home')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('member@example.com', 'Str0ng!Passw0rd');
    expect(push).toHaveBeenCalledWith('/conversation');
    expect(push).not.toHaveBeenCalledWith('/welcome');
  });

  it('shows the backend error message on failed login without redirecting', async () => {
    const login = jest.fn().mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    mockedUseSession.mockReturnValue({ login, establishGuestSession: jest.fn() });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText("Sign-in didn't work")).toBeInTheDocument();
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend verification email' })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('offers a resend action when a correct login is blocked only by email verification', async () => {
    const login = jest
      .fn()
      .mockRejectedValue(new ApiError(403, 'Please verify your email address before logging in.'));
    mockedUseSession.mockReturnValue({ login, establishGuestSession: jest.fn() });
    mockedAuthApi.resendVerification.mockResolvedValue(undefined);

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const resend = await screen.findByRole('button', { name: 'Resend verification email' });
    await userEvent.click(resend);

    expect(mockedAuthApi.resendVerification).toHaveBeenCalledWith('member@example.com');
    expect(
      await screen.findByText(
        'If this address still needs verification, a new link is on the way. Check your inbox and spam folder.',
      ),
    ).toBeInTheDocument();
  });

  it('does not expose resend for an unrelated forbidden error', async () => {
    const login = jest.fn().mockRejectedValue(new ApiError(403, 'This action is not allowed'));
    mockedUseSession.mockReturnValue({ login, establishGuestSession: jest.fn() });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('This action is not allowed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend verification email' })).not.toBeInTheDocument();
  });

  it('shows a session-expired notice when instructed', () => {
    mockedUseSession.mockReturnValue({ login: jest.fn(), establishGuestSession: jest.fn() });
    render(<LoginForm sessionExpired />);
    expect(screen.getByText('Your session has ended')).toBeInTheDocument();
  });

  it('disables submission until both fields are filled', () => {
    mockedUseSession.mockReturnValue({ login: jest.fn(), establishGuestSession: jest.fn() });
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    mockedUseSession.mockReturnValue({ login: jest.fn(), establishGuestSession: jest.fn() });
    const { container } = render(<LoginForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ── Guest Steward mode: never a true dead end ──────────────────────────

  it('offers a way to continue without an account, even here', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ login: jest.fn(), establishGuestSession });

    render(<LoginForm sessionExpired />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue without an account' }));

    expect(establishGuestSession).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/conversation');
  });
});
