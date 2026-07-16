import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { VoiceOrb } from './VoiceOrb';

describe('VoiceOrb', () => {
  it('is purely decorative — hidden from assistive technology, since VoiceStateLabel carries the same information as text', () => {
    const { container } = render(<VoiceOrb turnState="speaking" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations in any state', async () => {
    for (const turnState of ['idle', 'connecting', 'listening', 'thinking', 'speaking', 'ended'] as const) {
      const { container } = render(<VoiceOrb turnState={turnState} />);
      expect(await axe(container)).toHaveNoViolations();
    }
  });
});
