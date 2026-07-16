import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ProgressIndicator } from './ProgressIndicator';

describe('ProgressIndicator', () => {
  it('exposes progress via ARIA attributes', () => {
    render(<ProgressIndicator completed={2} total={5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(screen.getByText('2 of 5 complete')).toBeInTheDocument();
  });

  it('handles zero total without dividing by zero', () => {
    render(<ProgressIndicator completed={0} total={0} />);
    expect(screen.getByText('0 of 0 complete')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProgressIndicator completed={2} total={5} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
