import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { UrgentHelpAffordance } from './UrgentHelpAffordance';

describe('UrgentHelpAffordance', () => {
  it('renders a persistent, always-visible trigger', () => {
    render(<UrgentHelpAffordance />);
    expect(screen.getByRole('button', { name: 'Urgent help' })).toBeInTheDocument();
  });

  it('opens an honest, dependency-free dialog with universal crisis resources on click', async () => {
    const user = userEvent.setup();
    render(<UrgentHelpAffordance />);

    await user.click(screen.getByRole('button', { name: 'Urgent help' }));

    const dialog = screen.getByRole('dialog', { name: 'Urgent help' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toMatch(/call 911 now/i);
    expect(dialog.textContent).toMatch(/988/);
    expect(dialog.textContent).toMatch(/741741/);
    // Must not claim a capability Aureus doesn't have yet (Gate C's steward
    // paging/resource discovery isn't built) — the note says so honestly.
    expect(dialog.textContent).toMatch(/still being verified and isn.t ready to rely on yet/i);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<UrgentHelpAffordance />);

    const trigger = screen.getByRole('button', { name: 'Urgent help' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Urgent help' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on clicking the Close button', async () => {
    const user = userEvent.setup();
    render(<UrgentHelpAffordance />);

    await user.click(screen.getByRole('button', { name: 'Urgent help' }));
    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on clicking outside the dialog (backdrop)', async () => {
    const user = userEvent.setup();
    const { container } = render(<UrgentHelpAffordance />);

    await user.click(screen.getByRole('button', { name: 'Urgent help' }));
    const backdrop = container.querySelector('[role="dialog"]')?.parentElement;
    expect(backdrop).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await user.click(backdrop!);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(<UrgentHelpAffordance />);
    expect(await axe(container)).toHaveNoViolations();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Urgent help' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
