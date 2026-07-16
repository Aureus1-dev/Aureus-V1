import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { LiveTranscript } from './LiveTranscript';
import type { VoiceTranscriptEntry } from '../../../state';

const ENTRIES: VoiceTranscriptEntry[] = [
  { id: 'item-1', role: 'member', content: 'What is a Journey?', status: 'final', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'resp-1', role: 'steward', content: 'A Journey tracks your progress.', status: 'final', createdAt: '2026-01-01T00:00:01Z' },
];

describe('LiveTranscript', () => {
  it('renders nothing before any turn has happened', () => {
    const { container } = render(<LiveTranscript entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each entry as a live-announced log — how a Deaf or hard-of-hearing member follows the conversation', () => {
    render(<LiveTranscript entries={ENTRIES} />);
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('What is a Journey?')).toBeInTheDocument();
    expect(screen.getByText('A Journey tracks your progress.')).toBeInTheDocument();
  });

  it('marks an interrupted steward reply visibly, matching what was actually said rather than hiding it', () => {
    render(<LiveTranscript entries={[
      { id: 'resp-2', role: 'steward', content: 'Here is what I fou', status: 'interrupted', createdAt: '2026-01-01T00:00:02Z' },
    ]} />);
    expect(screen.getByText(/\(interrupted\)/)).toBeInTheDocument();
    expect(screen.getByText(/Here is what I fou/)).toBeInTheDocument();
  });

  it('shows a streaming placeholder before any delta has arrived, rather than an empty bubble', () => {
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
