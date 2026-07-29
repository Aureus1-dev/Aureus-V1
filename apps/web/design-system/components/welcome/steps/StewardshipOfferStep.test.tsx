import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { StewardshipOfferStep } from './StewardshipOfferStep';

describe('StewardshipOfferStep', () => {
  it('explains what Aureus can do and what stays the member\'s own action', () => {
    render(<StewardshipOfferStep isGuest={false} onContinue={jest.fn()} />);
    expect(screen.getByText('Aureus can')).toBeInTheDocument();
    expect(screen.getByText('Only you can')).toBeInTheDocument();
    expect(screen.getByText(/Decide what to approve/)).toBeInTheDocument();
  });

  it('offers account creation, framed around preserving progress, only to a guest', () => {
    render(<StewardshipOfferStep isGuest onContinue={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute('href', '/register');
    expect(screen.getByText(/only preserves your progress/)).toBeInTheDocument();
    expect(screen.queryByText(/unlock/i)).not.toBeInTheDocument();
  });

  it('shows no account offer for a member who already has an account', () => {
    render(<StewardshipOfferStep isGuest={false} onContinue={jest.fn()} />);
    expect(screen.queryByRole('link', { name: 'Create free account' })).not.toBeInTheDocument();
  });

  it('continues without an account for a guest who declines', async () => {
    const onContinue = jest.fn();
    render(<StewardshipOfferStep isGuest onContinue={onContinue} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue without an account' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('continues for a member who already has an account', async () => {
    const onContinue = jest.fn();
    render(<StewardshipOfferStep isGuest={false} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StewardshipOfferStep isGuest onContinue={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
