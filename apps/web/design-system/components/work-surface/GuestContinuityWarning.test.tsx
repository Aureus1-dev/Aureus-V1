import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { GuestContinuityWarning } from './GuestContinuityWarning';

describe('GuestContinuityWarning', () => {
  it('is a truthful continuity notice, not a registration advertisement', () => {
    render(<GuestContinuityWarning onKeepIt={jest.fn()} onDismiss={jest.fn()} />);
    expect(
      screen.getByText(/only available in this guest visit unless you choose to keep it/),
    ).toBeInTheDocument();
  });

  it('offers both keeping the work and dismissing, without forcing a choice', async () => {
    const onKeepIt = jest.fn();
    const onDismiss = jest.fn();
    render(<GuestContinuityWarning onKeepIt={onKeepIt} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onKeepIt).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Keep this' }));
    expect(onKeepIt).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <GuestContinuityWarning onKeepIt={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
