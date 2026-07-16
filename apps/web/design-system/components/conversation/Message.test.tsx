import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemberMessage } from './MemberMessage';
import { StewardMessage } from './StewardMessage';

describe('MemberMessage and StewardMessage', () => {
  it('renders content and distinguishes the speaker for assistive technology', () => {
    render(
      <div>
        <MemberMessage content="Hello" />
        <StewardMessage content="Hi there." />
      </div>,
    );
    expect(screen.getByText('You said')).toBeInTheDocument();
    expect(screen.getByText('Your steward said')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <MemberMessage content="Hello" />
        <StewardMessage content="Hi there." />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
