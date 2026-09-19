import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Composer } from './Composer';

describe('Composer', () => {
  it('submits on Enter and not on Shift+Enter, matching a familiar chat composer', async () => {
    const onSubmit = jest.fn();
    render(<Composer onSubmit={onSubmit} />);
    const textbox = screen.getByRole('textbox');

    await userEvent.type(textbox, 'Line one');
    await userEvent.keyboard('{Shift>}{enter}{/Shift}');
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(textbox, '{enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('never submits an empty message', async () => {
    const onSubmit = jest.fn();
    render(<Composer onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('every primary control is reachable by keyboard with a clear accessible name', async () => {
    render(<Composer onSubmit={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Attach a file' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show Aureus with your camera' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talk to Aureus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole('textbox')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Attach a file' })).toHaveFocus();
  });

  it('opens a clearly labeled voice preview rather than simulating a working call', async () => {
    render(<Composer onSubmit={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Talk to Aureus' }));
    expect(screen.getByText(/Voice preview/)).toBeInTheDocument();
  });

  it('lets a member remove an attached file before sending', async () => {
    render(<Composer onSubmit={jest.fn()} />);

    const hiddenInputs = document.querySelectorAll('input[type="file"]');
    expect(hiddenInputs).toHaveLength(2);

    const file = new File(['hello'], 'utility-bill.pdf', { type: 'application/pdf' });
    await userEvent.upload(hiddenInputs[0] as HTMLInputElement, file);

    expect(screen.getByText('utility-bill.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove utility-bill.pdf' }));
    expect(screen.queryByText('utility-bill.pdf')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Composer onSubmit={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
