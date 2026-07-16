import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { VoiceControls } from './VoiceControls';

describe('VoiceControls', () => {
  it('toggles mute without requiring a press-and-hold per utterance', async () => {
    const onToggleMute = jest.fn();
    render(<VoiceControls turnState="listening" muted={false} onToggleMute={onToggleMute} onInterrupt={jest.fn()} onEnd={jest.fn()} />);

    const muteButton = screen.getByRole('button', { name: /mute/i });
    await userEvent.click(muteButton);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('reflects the muted state via aria-pressed', () => {
    render(<VoiceControls turnState="listening" muted={true} onToggleMute={jest.fn()} onInterrupt={jest.fn()} onEnd={jest.fn()} />);
    expect(screen.getByRole('button', { name: /unmute/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the Interrupt control only while the steward is speaking — the accessible barge-in alternative', () => {
    const { rerender } = render(
      <VoiceControls turnState="listening" muted={false} onToggleMute={jest.fn()} onInterrupt={jest.fn()} onEnd={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /interrupt/i })).not.toBeInTheDocument();

    rerender(<VoiceControls turnState="speaking" muted={false} onToggleMute={jest.fn()} onInterrupt={jest.fn()} onEnd={jest.fn()} />);
    expect(screen.getByRole('button', { name: /interrupt/i })).toBeInTheDocument();
  });

  it('calls onInterrupt when pressed', async () => {
    const onInterrupt = jest.fn();
    render(<VoiceControls turnState="speaking" muted={false} onToggleMute={jest.fn()} onInterrupt={onInterrupt} onEnd={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /interrupt/i }));
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });

  it('always renders an End conversation control — a session-level action, not a per-turn one', async () => {
    const onEnd = jest.fn();
    render(<VoiceControls turnState="listening" muted={false} onToggleMute={jest.fn()} onInterrupt={jest.fn()} onEnd={onEnd} />);
    await userEvent.click(screen.getByRole('button', { name: 'End conversation' }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <VoiceControls turnState="speaking" muted={false} onToggleMute={jest.fn()} onInterrupt={jest.fn()} onEnd={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
