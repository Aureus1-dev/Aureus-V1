import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { VerifyEmailStatus } from './VerifyEmailStatus';
import * as authApi from '../../../lib/api/auth';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../lib/api/auth');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('VerifyEmailStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('verifies automatically on mount and shows success', async () => {
    mockedAuthApi.verifyEmail.mockResolvedValue(undefined);

    render(<VerifyEmailStatus token="verify-token-abc" />);

    expect(screen.getByText('Verifying your email')).toBeInTheDocument();
    expect(await screen.findByText('Email verified')).toBeInTheDocument();
    expect(mockedAuthApi.verifyEmail).toHaveBeenCalledWith('verify-token-abc');
  });

  it('shows the backend error for an invalid or expired token and can resend', async () => {
    mockedAuthApi.verifyEmail.mockRejectedValue(new ApiError(401, 'Invalid or expired email verification token'));
    mockedAuthApi.resendVerification.mockResolvedValue(undefined);

    render(<VerifyEmailStatus token="expired-token" />);

    expect(await screen.findByText("We couldn't verify that link")).toBeInTheDocument();
    expect(screen.getByText('Invalid or expired email verification token')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send a new verification link' }));

    expect(mockedAuthApi.resendVerification).toHaveBeenCalledWith('member@example.com');
    expect(
      await screen.findByText(
        'If this address still needs verification, a new link is on the way. Check your inbox and spam folder.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a calm error and resend recovery without calling verify when the token is missing', async () => {
    mockedAuthApi.resendVerification.mockResolvedValue(undefined);
    render(<VerifyEmailStatus token={null} />);

    expect(await screen.findByText("We couldn't verify that link")).toBeInTheDocument();
    expect(mockedAuthApi.verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send a new verification link' })).toBeDisabled();
  });

  it('has no accessibility violations once resolved', async () => {
    mockedAuthApi.verifyEmail.mockResolvedValue(undefined);
    const { container } = render(<VerifyEmailStatus token="verify-token-abc" />);
    await screen.findByText('Email verified');
    expect(await axe(container)).toHaveNoViolations();
  });
});
