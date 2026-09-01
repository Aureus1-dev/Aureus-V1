import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ConversationHistory } from './ConversationHistory';

const conversations = [
  { id: 'c1', userId: 'u1', title: 'Rent help', createdAt: 'x', updatedAt: 'x' },
  { id: 'c2', userId: 'u1', title: 'Job search', createdAt: 'y', updatedAt: 'y' },
];

const messages = [
  { id: 'm1', conversationId: 'c1', role: 'USER' as const, content: 'My rent is late.', createdAt: 'x' },
  { id: 'm2', conversationId: 'c1', role: 'ASSISTANT' as const, content: 'I can help.', createdAt: 'y' },
];

describe('ConversationHistory', () => {
  it('keeps history closed by default, then reveals the full transcript on demand', async () => {
    render(<ConversationHistory conversations={conversations} activeConversationId="c1" messages={messages} onSelect={jest.fn()} onStartNew={jest.fn()} />);
    expect(screen.queryByText('My rent is late.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('dialog', { name: 'Conversation history' })).toBeInTheDocument();
    expect(screen.getByText('My rent is late.')).toBeInTheDocument();
    expect(screen.getByText('I can help.')).toBeInTheDocument();
  });

  it('selects another saved conversation through the existing callback', async () => {
    const onSelect = jest.fn();
    render(<ConversationHistory conversations={conversations} activeConversationId="c1" messages={messages} onSelect={onSelect} onStartNew={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'Job search' }));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });

  it('starts a fresh conversation from the quiet Hall control', async () => {
    const onStartNew = jest.fn();
    render(<ConversationHistory conversations={conversations} activeConversationId="c1" messages={messages} onSelect={jest.fn()} onStartNew={onStartNew} />);
    await userEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(onStartNew).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(<ConversationHistory conversations={conversations} activeConversationId="c1" messages={messages} onSelect={jest.fn()} onStartNew={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
