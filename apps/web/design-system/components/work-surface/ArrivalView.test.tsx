import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ArrivalView } from './ArrivalView';

describe('ArrivalView', () => {
  it('renders help immediately with no authentication wall — a Sign in link, never a form', () => {
    render(<ArrivalView mode="ordinary" onSubmit={jest.fn()} onRequestUrgent={jest.fn()} />);

    expect(screen.getByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument();
    expect(screen.getByText('You can start without an account.')).toBeInTheDocument();
  });

  it('shows public stewardship stories at ordinary arrival', () => {
    render(<ArrivalView mode="ordinary" onSubmit={jest.fn()} onRequestUrgent={jest.fn()} />);
    expect(screen.getByText('What Aureus has helped carry')).toBeInTheDocument();
  });

  it('submits what the member typed', async () => {
    const onSubmit = jest.fn();
    render(<ArrivalView mode="ordinary" onSubmit={onSubmit} onRequestUrgent={jest.fn()} />);

    await userEvent.type(screen.getByRole('textbox'), 'I need help with rent{enter}');

    expect(onSubmit).toHaveBeenCalledWith('I need help with rent', []);
  });

  it('lets a visitor explicitly request urgent help', async () => {
    const onRequestUrgent = jest.fn();
    render(<ArrivalView mode="ordinary" onSubmit={jest.fn()} onRequestUrgent={onRequestUrgent} />);

    await userEvent.click(screen.getByRole('button', { name: 'I need help right now' }));
    expect(onRequestUrgent).toHaveBeenCalled();
  });

  it('recedes stories and shows a contextual safety notice in urgent mode, without a universal crisis banner', () => {
    render(<ArrivalView mode="urgent" onSubmit={jest.fn()} onRequestUrgent={jest.fn()} />);

    expect(screen.queryByText('What Aureus has helped carry')).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/AI steward, not emergency services/);
  });

  it('greets a returning member with nothing active the same way, without an empty dashboard', () => {
    render(
      <ArrivalView
        mode="ordinary"
        onSubmit={jest.fn()}
        onRequestUrgent={jest.fn()}
        returningMemberName="Jordan"
      />,
    );

    expect(screen.getByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Jordan.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ArrivalView mode="ordinary" onSubmit={jest.fn()} onRequestUrgent={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
