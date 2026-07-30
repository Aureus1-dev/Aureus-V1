import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { VoiceOrb } from './VoiceOrb';

// jsdom does not implement canvas rendering (no `canvas` npm package
// installed) — VoiceOrb already no-ops gracefully when getContext returns
// null (see the component's `if (!canvas || !ctx) return;` guard), so
// stubbing it here just keeps that expected, harmless path from logging
// jsdom's own "not implemented" warning on every render.
beforeAll(() => {
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('VoiceOrb', () => {
  it('is purely decorative — hidden from assistive technology, since VoiceStateLabel carries the same information as text', () => {
    const { container } = render(<VoiceOrb turnState="speaking" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a canvas for the live ember glow (Warm & Elemental) rather than a flat colored div', () => {
    const { container } = render(<VoiceOrb turnState="idle" />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('never throws when getContext is unavailable (e.g. an environment with no 2D canvas support)', () => {
    expect(() => render(<VoiceOrb turnState="listening" />)).not.toThrow();
  });

  it('has no accessibility violations in any state', async () => {
    for (const turnState of ['idle', 'connecting', 'listening', 'thinking', 'speaking', 'ended'] as const) {
      const { container } = render(<VoiceOrb turnState={turnState} />);
      expect(await axe(container)).toHaveNoViolations();
    }
  });
});
