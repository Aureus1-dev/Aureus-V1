import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { QuickActions } from './QuickActions';

describe('QuickActions', () => {
  it('offers the three contextual next actions', () => {
    render(<QuickActions />);

    expect(screen.getByRole('link', { name: 'Continue my journey' })).toHaveAttribute('href', '/journey');
    expect(screen.getByRole('link', { name: 'Browse opportunities' })).toHaveAttribute('href', '/opportunities');
    expect(screen.getByRole('link', { name: 'Start a new mission' })).toHaveAttribute(
      'href',
      '/welcome?newMission=true',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<QuickActions />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
