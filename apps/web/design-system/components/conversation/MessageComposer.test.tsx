import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MessageComposer } from './MessageComposer';

describe('MessageComposer', () => {
  it('submits on Enter and not on Shift+Enter', async () => {
    const onSubmit = jest.fn();
    const onChange = jest.fn();
    render(<MessageComposer value="Hello" onChange={onChange} onSubmit={onSubmit} disabled={false} />);

    const textarea = screen.getByLabelText('Message your steward');
    await userEvent.type(textarea, '{Shift>}{Enter}{/Shift}');
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(textarea, '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the send button while a response is pending, preventing duplicate sends', () => {
    render(<MessageComposer value="Hello" onChange={jest.fn()} onSubmit={jest.fn()} disabled={true} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('disables the send button when the draft is empty', () => {
    render(<MessageComposer value="" onChange={jest.fn()} onSubmit={jest.fn()} disabled={false} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <MessageComposer value="Hello" onChange={jest.fn()} onSubmit={jest.fn()} disabled={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
