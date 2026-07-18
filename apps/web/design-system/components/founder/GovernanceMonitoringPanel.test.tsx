import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { GovernanceMonitoringPanel } from './GovernanceMonitoringPanel';

describe('GovernanceMonitoringPanel', () => {
  it('states the read-only constraint plainly', () => {
    render(<GovernanceMonitoringPanel />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Constitutional-Conflict-Comparison\.md/)).toBeInTheDocument();
  });

  it('lists every protected path', () => {
    render(<GovernanceMonitoringPanel />);
    expect(screen.getByText('docs/constitution/')).toBeInTheDocument();
    expect(screen.getByText('docs/docs/constitution/')).toBeInTheDocument();
    expect(screen.getByText('docs/constitutional/register/')).toBeInTheDocument();
    expect(screen.getByText('docs/sessions/')).toBeInTheDocument();
    expect(screen.getByText('docs/drafts/')).toBeInTheDocument();
  });

  it('surfaces the known document-number collisions', () => {
    render(<GovernanceMonitoringPanel />);
    expect(screen.getByText('OAS-004')).toBeInTheDocument();
    expect(screen.getByText('OAS-005')).toBeInTheDocument();
    expect(screen.getByText('OAS-006')).toBeInTheDocument();
    expect(screen.getByText('OAS-ACA-007')).toBeInTheDocument();
  });

  it('offers no edit, merge, or delete controls anywhere on the page', () => {
    render(<GovernanceMonitoringPanel />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<GovernanceMonitoringPanel />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
