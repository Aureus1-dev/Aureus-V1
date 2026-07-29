import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ExecutionStatusStep } from './ExecutionStatusStep';

describe('ExecutionStatusStep', () => {
  it('narrates each approved or accepted item honestly, without claiming an external action was taken', () => {
    render(
      <ExecutionStatusStep
        decisions={[
          { title: 'Community Grant', categoryLabel: 'Opportunity', decision: 'APPROVED' },
          { title: 'Chester County Food Bank', categoryLabel: 'Resource', decision: 'ACCEPTED' },
        ]}
      />,
    );
    expect(screen.getByText('Community Grant')).toBeInTheDocument();
    expect(screen.getByText('Chester County Food Bank')).toBeInTheDocument();
    expect(screen.getAllByText(/noted on your Journey/)).toHaveLength(2);
    expect(screen.queryByText(/submitted|applied on your behalf/i)).not.toBeInTheDocument();
  });

  it('excludes dismissed and declined items from the narration', () => {
    render(
      <ExecutionStatusStep
        decisions={[
          { title: 'Community Grant', categoryLabel: 'Opportunity', decision: 'APPROVED' },
          { title: 'Unwanted Course', categoryLabel: 'Training', decision: 'DISMISSED' },
        ]}
      />,
    );
    expect(screen.getByText('Community Grant')).toBeInTheDocument();
    expect(screen.queryByText('Unwanted Course')).not.toBeInTheDocument();
  });

  it('shows an honest no-wrong-pace message when nothing was approved', () => {
    render(<ExecutionStatusStep decisions={[]} />);
    expect(screen.getByText(/Nothing was approved just yet/)).toBeInTheDocument();
  });

  it('closes with a long-term stewardship prompt rather than "anything else?"', () => {
    render(<ExecutionStatusStep decisions={[]} />);
    expect(screen.getByText(/keep watching for what fits/)).toBeInTheDocument();
    expect(screen.queryByText(/anything else/i)).not.toBeInTheDocument();
  });

  it('offers ongoing destinations to return to', () => {
    render(<ExecutionStatusStep decisions={[]} />);
    expect(screen.getByRole('link', { name: 'View my journey' })).toHaveAttribute('href', '/journey');
    expect(screen.getByRole('link', { name: 'Talk to my steward' })).toHaveAttribute('href', '/conversation');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ExecutionStatusStep decisions={[{ title: 'Community Grant', categoryLabel: 'Opportunity', decision: 'APPROVED' }]} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
