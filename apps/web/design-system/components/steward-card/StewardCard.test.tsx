import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { StewardCard } from './StewardCard';

describe('StewardCard', () => {
  it('renders its children', () => {
    render(<StewardCard>Content</StewardCard>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('defaults to the neutral variant', () => {
    const { container } = render(<StewardCard>Content</StewardCard>);
    expect(container.firstElementChild?.className).toMatch(/neutral/);
  });

  it.each(['recommendation', 'approval', 'milestone'] as const)('applies the %s variant class', (variant) => {
    const { container } = render(<StewardCard variant={variant}>Content</StewardCard>);
    expect(container.firstElementChild?.className).toMatch(new RegExp(variant));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StewardCard variant="approval">Content</StewardCard>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
