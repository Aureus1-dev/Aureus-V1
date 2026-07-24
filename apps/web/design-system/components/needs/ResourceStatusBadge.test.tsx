import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ResourceStatusBadge } from './ResourceStatusBadge';

describe('ResourceStatusBadge', () => {
  it.each([
    ['verified', 'Verified'],
    ['unverified', 'Not yet verified'],
    ['test', 'Test data'],
    ['unavailable', 'Unavailable'],
  ] as const)('renders the "%s" state as "%s"', (state, label) => {
    render(<ResourceStatusBadge state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ResourceStatusBadge state="verified" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
