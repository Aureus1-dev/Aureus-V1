import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderCard } from './ProviderCard';

const comingSoon = {
  providerType: 'GMAIL' as const,
  category: 'EMAIL' as const,
  displayName: 'Gmail',
  connectionState: 'COMING_SOON' as const,
  whatAureusCanAccess: 'Messages you choose.',
  whyItsNeeded: 'To help with your goals.',
  whatTheAiStewardCanDo: 'Point out relevant messages.',
};

describe('ProviderCard', () => {
  it('does not present a coming-soon integration as an actionable connection', async () => {
    const onConnect = jest.fn();
    render(
      <ProviderCard item={comingSoon} isBusy={false} onConnect={onConnect} onRevoke={jest.fn()} />,
    );

    const button = screen.getByRole('button', { name: 'Not available yet' });
    expect(button).toBeDisabled();
    await userEvent.setup().click(button);
    expect(onConnect).not.toHaveBeenCalled();
  });
});
