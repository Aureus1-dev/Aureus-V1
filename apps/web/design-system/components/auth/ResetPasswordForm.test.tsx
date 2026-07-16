import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ResetPasswordForm } from './ResetPasswordForm';
import * as authApi from '../../../lib/api/auth';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../lib/api/auth');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('ResetPasswordForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resets the password and shows confirmation, without auto-signing in', async () => {
    mockedAuthApi.resetPassword.mockResolvedValue(undefined);

    render(<ResetPasswordForm token="reset-token-abc" />);
    await userEvent.type(screen.getByLabelText('New password', { exact: false }), 'N3wStr0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(mockedAuthApi.resetPassword).toHaveBeenCalledWith('reset-token-abc', 'N3wStr0ng!Passw0rd');
  });

  it('rejects a weak password client-side without calling the API', async () => {
    render(<ResetPasswordForm token="reset-token-abc" />);
    await userEvent.type(screen.getByLabelText('New password', { exact: false }), 'short1');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Password must be at least 10 characters.')).toBeInTheDocument();
    expect(mockedAuthApi.resetPassword).not.toHaveBeenCalled();
  });

  it('shows a calm error and does not call the API when the token is missing', async () => {
    render(<ResetPasswordForm token={null} />);
    await userEvent.type(screen.getByLabelText('New password', { exact: false }), 'N3wStr0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText(/missing its token/i)).toBeInTheDocument();
    expect(mockedAuthApi.resetPassword).not.toHaveBeenCalled();
  });

  it('shows the backend error for an invalid or expired token', async () => {
    mockedAuthApi.resetPassword.mockRejectedValue(new ApiError(401, 'Invalid or expired password reset token'));

    render(<ResetPasswordForm token="expired-token" />);
    await userEvent.type(screen.getByLabelText('New password', { exact: false }), 'N3wStr0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Invalid or expired password reset token')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ResetPasswordForm token="reset-token-abc" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
