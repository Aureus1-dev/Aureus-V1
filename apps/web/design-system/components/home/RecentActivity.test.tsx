import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { RecentActivity } from './RecentActivity';
import type { NotificationDto } from '../../../lib/api/notifications';

function makeNotification(o: Partial<NotificationDto>): NotificationDto {
  return {
    id: 'n-1', recipientId: 'user-1', category: 'JOURNEY', type: 'journey.updated', title: 'Title', body: 'Body',
    data: null, actorId: null, readAt: '2026-01-01T00:00:00Z', archivedAt: null, expiresAt: null,
    createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

describe('RecentActivity', () => {
  it('renders a chronological record regardless of read state, with no per-item action', () => {
    const activity = [
      makeNotification({ id: 'n-1', title: 'Milestone completed', readAt: null }),
      makeNotification({ id: 'n-2', title: 'New message from your steward' }),
    ];

    render(<RecentActivity activity={activity} />);

    expect(screen.getByText('Milestone completed')).toBeInTheDocument();
    expect(screen.getByText('New message from your steward')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows at most the 5 most recent items', () => {
    const activity = Array.from({ length: 8 }, (_, i) => makeNotification({ id: `n-${i}`, title: `Item ${i}` }));
    render(<RecentActivity activity={activity} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('renders nothing when there is no activity', () => {
    const { container } = render(<RecentActivity activity={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RecentActivity activity={[makeNotification({})]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
