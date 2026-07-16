import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { OpportunityDetail } from './OpportunityDetail';
import type { OpportunityDto } from '../../../lib/api/opportunities';

const opportunity: OpportunityDto = {
  id: 'opp-1', opportunityRef: 'AUR-OPP-000001', title: 'Community Grant', shortDescription: 'A grant.',
  fullDescription: 'A grant for the community, covering rent and utilities.', category: 'GRANT', tags: [],
  provider: 'City Hall', officialSourceUrl: 'https://example.com/source', applicationUrl: 'https://example.com/apply',
  location: null, country: null, state: null, eligibilityRules: 'Open to residents of the city.', benefitType: 'GRANT',
  benefitAmount: null, deadline: '2026-08-01T00:00:00.000Z', status: 'ACTIVE', verificationStatus: 'VERIFIED',
  rejectionReason: null, confidenceScore: 90, freshnessScore: 90, datePublished: null, dateLastVerified: null,
  sourceName: 'City Hall', sourceUrl: null, sourceType: 'ADMIN_ENTRY', submittedById: 'admin-1', createdById: 'admin-1',
  lastUpdatedById: 'admin-1', createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

describe('OpportunityDetail', () => {
  it('presents everything a member needs to decide, with the official source visible', () => {
    render(<OpportunityDetail opportunity={opportunity} saved={false} onToggleSave={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Community Grant' })).toBeInTheDocument();
    expect(screen.getByText('A grant for the community, covering rent and utilities.')).toBeInTheDocument();
    expect(screen.getByText('Open to residents of the city.')).toBeInTheDocument();
    expect(screen.getByText(/Deadline/)).toBeInTheDocument();

    const sourceLink = screen.getByRole('link', { name: 'View official source' });
    expect(sourceLink).toHaveAttribute('href', 'https://example.com/apply');
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('falls back to the official source URL when no application URL exists', () => {
    render(<OpportunityDetail opportunity={{ ...opportunity, applicationUrl: null }} saved={false} onToggleSave={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'View official source' })).toHaveAttribute('href', 'https://example.com/source');
  });

  it('calls onToggleSave and reflects the saved state', async () => {
    const onToggleSave = jest.fn();
    render(<OpportunityDetail opportunity={opportunity} saved onToggleSave={onToggleSave} />);

    const saveButton = screen.getByRole('button', { name: 'Saved' });
    expect(saveButton).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(saveButton);
    expect(onToggleSave).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OpportunityDetail opportunity={opportunity} saved={false} onToggleSave={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
