import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ApprovalCard } from './ApprovalCard';

describe('ApprovalCard', () => {
  it('renders its children', () => {
    render(<ApprovalCard>A pending decision</ApprovalCard>);
    expect(screen.getByText('A pending decision')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ApprovalCard>A pending decision</ApprovalCard>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
