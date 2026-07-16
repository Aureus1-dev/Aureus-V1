import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import * as authApi from '../../../lib/api/auth';

jest.mock('../../../lib/api/auth');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('ForgotPasswordForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the same generic confirmation regardless of whether the email is registered', async () => {
    mockedAuthApi.forgotPassword.mockResolvedValue(undefined);

    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'someone@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(mockedAuthApi.forgotPassword).toHaveBeenCalledWith('someone@example.com');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ForgotPasswordForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
