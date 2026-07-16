import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SavedOpportunityRow } from './SavedOpportunityRow';
import type { OpportunityDto } from '../../../lib/api/opportunities';
import type { SavedOpportunityDto } from '../../../lib/api/saved-opportunities';

const opportunity: OpportunityDto = {
  id: 'opp-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A grant.', fullDescription: 'x',
  category: 'GRANT', tags: [], provider: 'City Hall', officialSourceUrl: 'https://example.com/source',
  applicationUrl: 'https://example.com/apply', location: null, country: null, state: null, eligibilityRules: 'x',
  benefitType: 'GRANT', benefitAmount: null, deadline: null, status: 'ACTIVE', verificationStatus: 'VERIFIED',
  rejectionReason: null, confidenceScore: 90, freshnessScore: 90, datePublished: null, dateLastVerified: null,
  sourceName: 'City Hall', sourceUrl: null, sourceType: 'ADMIN_ENTRY', submittedById: 'admin-1', createdById: 'admin-1',
  lastUpdatedById: 'admin-1', createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

const record: SavedOpportunityDto = {
  id: 'saved-1', userId: 'member-1', opportunityId: 'opp-1', isFavorite: false, trackingStatus: 'SAVED',
  notes: null, savedAt: 'x', updatedAt: 'x',
};

describe('SavedOpportunityRow', () => {
  it('renders resolved opportunity details and current tracking status', () => {
    render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={jest.fn()} onRemove={jest.fn()} />);

    expect(screen.getByText('Community Grant')).toBeInTheDocument();
    expect(screen.getByText('City Hall')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('SAVED');
  });

  it('shows loading copy while the opportunity detail has not resolved yet', () => {
    render(<SavedOpportunityRow record={record} opportunity={null} isLoadingDetail onUpdate={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('changing status calls onUpdate with the new tracking status', async () => {
    const onUpdate = jest.fn();
    render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={onUpdate} onRemove={jest.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'APPLYING');
    expect(onUpdate).toHaveBeenCalledWith({ trackingStatus: 'APPLYING' });
  });

  it('toggling favorite calls onUpdate with the flipped flag', async () => {
    const onUpdate = jest.fn();
    render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={onUpdate} onRemove={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Favorite/ }));
    expect(onUpdate).toHaveBeenCalledWith({ isFavorite: true });
  });

  it('commits a note on blur, not on every keystroke', async () => {
    const onUpdate = jest.fn();
    render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={onUpdate} onRemove={jest.fn()} />);

    const notesField = screen.getByLabelText('Notes');
    await userEvent.type(notesField, 'Applied via referral');
    expect(onUpdate).not.toHaveBeenCalled();

    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith({ notes: 'Applied via referral' });
  });

  it('does not call onUpdate on blur if the note is unchanged', async () => {
    const onUpdate = jest.fn();
    render(<SavedOpportunityRow record={{ ...record, notes: 'Existing' }} opportunity={opportunity} isLoadingDetail={false} onUpdate={onUpdate} onRemove={jest.fn()} />);

    screen.getByLabelText('Notes').focus();
    await userEvent.tab();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('calls onRemove when Remove is clicked', async () => {
    const onRemove = jest.fn();
    render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={jest.fn()} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('links to the application URL when present', () => {
    render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'View official source' })).toHaveAttribute('href', 'https://example.com/apply');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SavedOpportunityRow record={record} opportunity={opportunity} isLoadingDetail={false} onUpdate={jest.fn()} onRemove={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
