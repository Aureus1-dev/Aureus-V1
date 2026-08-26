import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import type { OpportunityActionDto } from '../../../lib/api/conversations';
import { OpportunityActionCard } from './OpportunityActionCard';

const action: OpportunityActionDto = {
  opportunityId: 'opp-1',
  opportunityRef: 'AUR-OPP-000001',
  title: 'Warehouse Associate',
  provider: 'Example Employer',
  url: 'https://example.org/apply',
  canonicalUrl: 'https://example.org/apply',
  referralUrl: null,
  affiliateDisclosure: null,
  eligibility: 'Applicants must be 18 or older.',
  geography: 'Philadelphia, PA',
  payoutNotes: null,
  timeToCashNotes: null,
  status: 'verified',
  lastVerifiedAt: '2026-08-25T12:00:00.000Z',
  sourceName: 'Employer careers page',
  sourceUrl: 'https://example.org/jobs',
  sourceType: 'EXTERNAL_SOURCE',
};

describe('OpportunityActionCard', () => {
  it('renders only the server-provided verified URL as a new-tab action', () => {
    render(<OpportunityActionCard action={action} />);

    const link = screen.getByRole('link', { name: 'Open verified application' });
    expect(link).toHaveAttribute('href', 'https://example.org/apply');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText('Eligibility: Applicants must be 18 or older.')).toBeInTheDocument();
  });

  it('shows plain-language affiliate disclosure when compensation metadata exists', () => {
    render(<OpportunityActionCard action={{
      ...action,
      affiliateDisclosure: 'Aureus may receive compensation if you use this link.',
    }} />);

    expect(screen.getByText(/Aureus may receive compensation/i)).toBeInTheDocument();
  });

  it('renders no actionable link for stale registry state', () => {
    render(<OpportunityActionCard action={{ ...action, status: 'stale' }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OpportunityActionCard action={action} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
