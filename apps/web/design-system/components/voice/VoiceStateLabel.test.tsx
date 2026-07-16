import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { VoiceStateLabel } from './VoiceStateLabel';

describe('VoiceStateLabel', () => {
  it('announces the current state as a polite live status', () => {
    render(<VoiceStateLabel turnState="thinking" />);
    expect(screen.getByRole('status')).toHaveTextContent('Your steward is thinking…');
  });

  it('renders nothing for the idle state', () => {
    const { container } = render(<VoiceStateLabel turnState="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<VoiceStateLabel turnState="speaking" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
