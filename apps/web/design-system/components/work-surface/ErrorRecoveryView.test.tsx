import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ErrorRecoveryView } from './ErrorRecoveryView';

describe('ErrorRecoveryView', () => {
  it('reassures the member that their place and work are preserved', () => {
    render(<ErrorRecoveryView onRetry={jest.fn()} />);
    expect(
      screen.getByText(/place and everything Aureus was carrying are still here/),
    ).toBeInTheDocument();
  });

  it('lets the member retry', async () => {
    const onRetry = jest.fn();
    render(<ErrorRecoveryView onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ErrorRecoveryView onRetry={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
