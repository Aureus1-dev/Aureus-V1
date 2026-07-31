import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { LoginForm } from './LoginForm';
import { useSession } from '../../../state';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedUseSession = useSession as jest.Mock;

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('signs in and redirects to /welcome on success', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ login });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('member@example.com', 'Str0ng!Passw0rd');
    expect(push).toHaveBeenCalledWith('/welcome');
  });

  it('shows the backend error message on failed login without redirecting', async () => {
    const login = jest.fn().mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    mockedUseSession.mockReturnValue({ login });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText("Sign-in didn't work")).toBeInTheDocument();
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a session-expired notice when instructed', () => {
    mockedUseSession.mockReturnValue({ login: jest.fn() });
    render(<LoginForm sessionExpired />);
    expect(screen.getByText('Your session has ended')).toBeInTheDocument();
  });

  it('disables submission until both fields are filled', () => {
    mockedUseSession.mockReturnValue({ login: jest.fn() });
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    mockedUseSession.mockReturnValue({ login: jest.fn() });
    const { container } = render(<LoginForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
