import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { LiveTranscript } from './LiveTranscript';
import type { VoiceTranscriptEntry } from '../../../state';

const ENTRIES: VoiceTranscriptEntry[] = [
  { id: 'old-1', role: 'member', content: 'Old voice turn', status: 'final', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'item-1', role: 'member', content: 'What is a Journey?', status: 'final', createdAt: '2026-01-01T00:00:01Z' },
  { id: 'resp-1', role: 'steward', content: 'A Journey tracks your progress.', status: 'final', createdAt: '2026-01-01T00:00:02Z' },
];

describe('LiveTranscript — caption presentation', () => {
  it('renders nothing before any turn has happened', () => {
    const { container } = render(<LiveTranscript entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the latest spoken exchange as live captions', () => {
    render(<LiveTranscript entries={ENTRIES} />);
    const log = screen.getByRole('log', { name: /live conversation captions/i });
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('What is a Journey?')).toBeInTheDocument();
    expect(screen.getByText('A Journey tracks your progress.')).toBeInTheDocument();
    expect(screen.queryByText('Old voice turn')).not.toBeInTheDocument();
  });

  it('marks interrupted speech visibly', () => {
    render(<LiveTranscript entries={[
      { id: 'resp-2', role: 'steward', content: 'Here is what I fou', status: 'interrupted', createdAt: '2026-01-01T00:00:02Z' },
    ]} />);
    expect(screen.getByText(/\(interrupted\)/)).toBeInTheDocument();
  });

  it('shows a streaming placeholder before any delta has arrived', () => {
    render(<LiveTranscript entries={[
      { id: 'resp-3', role: 'steward', content: '', status: 'streaming', createdAt: '2026-01-01T00:00:03Z' },
    ]} />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LiveTranscript entries={ENTRIES} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
