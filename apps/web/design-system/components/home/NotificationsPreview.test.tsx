import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { NotificationsPreview } from './NotificationsPreview';
import type { NotificationDto } from '../../../lib/api/notifications';

function makeNotification(o: Partial<NotificationDto>): NotificationDto {
  return {
    id: 'n-1', recipientId: 'user-1', category: 'JOURNEY', type: 'journey.updated', title: 'Title', body: 'Body',
    data: null, actorId: null, readAt: null, archivedAt: null, expiresAt: null, createdAt: 'x', ...o,
  };
}

describe('NotificationsPreview', () => {
  it('renders unread notifications with an accessible, disambiguated mark-read action', () => {
    const onMarkRead = jest.fn();
    const unread = [makeNotification({ id: 'n-1', title: 'A new opportunity matched you' })];

    render(<NotificationsPreview unread={unread} unreadCount={1} onMarkRead={onMarkRead} />);

    expect(screen.getByText('A new opportunity matched you')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Mark read "A new opportunity matched you"' });
    button.click();
    expect(onMarkRead).toHaveBeenCalledWith('n-1');
  });

  it('renders nothing when there is no unread count yet', () => {
    const { container } = render(<NotificationsPreview unread={[]} unreadCount={null} onMarkRead={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the unread count is zero', () => {
    const { container } = render(<NotificationsPreview unread={[]} unreadCount={0} onMarkRead={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const unread = [makeNotification({ id: 'n-1', title: 'A new opportunity matched you' })];
    const { container } = render(<NotificationsPreview unread={unread} unreadCount={1} onMarkRead={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
