import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ApprovalPanel } from './ApprovalPanel';

describe('ApprovalPanel', () => {
  it('renders the rationale and wires approve/dismiss actions', async () => {
    const onApprove = jest.fn();
    const onDismiss = jest.fn();
    render(<ApprovalPanel rationale="This matches your goal." onApprove={onApprove} onDismiss={onDismiss} deciding={false} />);

    expect(screen.getByText('This matches your goal.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables both actions while deciding', () => {
    render(<ApprovalPanel rationale="x" onApprove={jest.fn()} onDismiss={jest.fn()} deciding />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ApprovalPanel rationale="x" onApprove={jest.fn()} onDismiss={jest.fn()} deciding={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
