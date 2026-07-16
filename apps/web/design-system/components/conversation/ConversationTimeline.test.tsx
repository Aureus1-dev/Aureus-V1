import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ConversationTimeline } from './ConversationTimeline';
import type { MessageDto } from '../../../lib/api/conversations';

const messages: MessageDto[] = [
  { id: '1', conversationId: 'c1', role: 'USER', content: 'Hello', createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', conversationId: 'c1', role: 'ASSISTANT', content: 'Hi there.', createdAt: '2026-01-01T00:00:01Z' },
];

describe('ConversationTimeline', () => {
  it('renders messages in order with an accessible log role', () => {
    render(<ConversationTimeline messages={messages} pendingResponse={false} />);
    const log = screen.getByRole('log');
    expect(log.children).toHaveLength(2);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there.')).toBeInTheDocument();
  });

  it('shows the thinking indicator after the last message while a response is pending', () => {
    render(<ConversationTimeline messages={messages} pendingResponse={true} />);
    expect(screen.getByRole('status', { name: /thinking/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConversationTimeline messages={messages} pendingResponse={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
