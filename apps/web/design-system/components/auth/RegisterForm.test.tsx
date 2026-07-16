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
    mockedUseSession.mockReturnValue({ register });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'short1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at least 10 characters.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers and redirects to /welcome on success', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ register });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith('member@example.com', 'Str0ng!Passw0rd');
    expect(push).toHaveBeenCalledWith('/welcome');
  });

  it('shows the backend error (e.g. email already registered) without redirecting', async () => {
    const register = jest.fn().mockRejectedValue(new ApiError(409, "Email 'member@example.com' is already registered"));
    mockedUseSession.mockReturnValue({ register });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText("Email 'member@example.com' is already registered")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedUseSession.mockReturnValue({ register: jest.fn() });
    const { container } = render(<RegisterForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
