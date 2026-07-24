import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { MatchedResourceDto } from '../../../lib/api/needs';
import { MatchedResourceCard } from './MatchedResourceCard';

const makeResource = (o: Partial<MatchedResourceDto> = {}): MatchedResourceDto => ({
  id: 'entry-001', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Food Bank',
  category: 'FOOD_RESOURCE', description: 'Provides groceries to families in need.',
  address: null, serviceArea: 'Chester County', phone: '+1-610-555-0100', website: null,
  hours: 'Mon-Fri 9am-5pm', eligibilityRequirements: null, languagesSupported: [], accessibilityNotes: null,
  cost: null, requiredDocuments: [], referralRequired: false, isEmergencyService: false,
  verificationStatus: 'VERIFIED', isTestFixture: false, ...o,
});

describe('MatchedResourceCard', () => {
  it('shows the Verified badge for a verified, non-fixture resource', () => {
    render(<MatchedResourceCard resource={makeResource()} response={null} deciding={false} onAccept={jest.fn()} onDecline={jest.fn()} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows the Not yet verified badge for an unverified resource', () => {
    render(
      <MatchedResourceCard
        resource={makeResource({ verificationStatus: 'UNVERIFIED' })}
        response={null} deciding={false} onAccept={jest.fn()} onDecline={jest.fn()}
      />,
    );
    expect(screen.getByText('Not yet verified')).toBeInTheDocument();
  });

  it('shows the Test data badge for a test-fixture resource, even if verified', () => {
    render(
      <MatchedResourceCard
        resource={makeResource({ verificationStatus: 'VERIFIED', isTestFixture: true })}
        response={null} deciding={false} onAccept={jest.fn()} onDecline={jest.fn()}
      />,
    );
    expect(screen.getByText('Test data')).toBeInTheDocument();
  });

  it('wires accept/decline actions and disables them while deciding', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<MatchedResourceCard resource={makeResource()} response={null} deciding={false} onAccept={onAccept} onDecline={onDecline} />);

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('replaces the actions with a decided message once a response is recorded', () => {
    render(<MatchedResourceCard resource={makeResource()} response="ACCEPTED" deciding={false} onAccept={jest.fn()} onDecline={jest.fn()} />);
    expect(screen.getByText('You accepted this resource.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <MatchedResourceCard resource={makeResource()} response={null} deciding={false} onAccept={jest.fn()} onDecline={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
