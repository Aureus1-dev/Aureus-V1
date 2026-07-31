import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { LinkButton } from './LinkButton';

describe('LinkButton', () => {
  it('renders a single anchor, not a button nested in a link', () => {
    const { container } = render(<LinkButton href="/register">Create free account</LinkButton>);

    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.querySelector('button')).toBeNull();
  });

  it('exposes exactly one control to assistive technology — the defect it replaces exposed two with the same name', () => {
    render(<LinkButton href="/welcome">Go to Welcome</LinkButton>);

    expect(screen.getAllByRole('link', { name: 'Go to Welcome' })).toHaveLength(1);
    expect(screen.queryAllByRole('button', { name: 'Go to Welcome' })).toHaveLength(0);
  });

  it('keeps the href so it still navigates', () => {
    render(<LinkButton href="/journey">Review journey</LinkButton>);
    expect(screen.getByRole('link', { name: 'Review journey' })).toHaveAttribute('href', '/journey');
  });

  it('carries the button styling, including the secondary variant', () => {
    const { container } = render(
      <LinkButton href="/x" variant="secondary">
        Later
      </LinkButton>,
    );
    const anchor = container.querySelector('a')!;
    expect(anchor.className).toContain('button');
    expect(anchor.className).toContain('secondary');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LinkButton href="/register">Create free account</LinkButton>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
