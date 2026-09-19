import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { CarryBoundaryPrompt } from './CarryBoundaryPrompt';

describe('CarryBoundaryPrompt', () => {
  it('asks the plain-language intent question rather than jumping straight to registration', () => {
    render(<CarryBoundaryPrompt onYes={jest.fn()} onNo={jest.fn()} declined={false} />);
    expect(
      screen.getByText('Do you want Aureus to carry this beyond this visit?'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('moves keyboard focus to itself so the question is immediately reachable', () => {
    render(<CarryBoundaryPrompt onYes={jest.fn()} onNo={jest.fn()} declined={false} />);
    expect(screen.getByRole('region')).toHaveFocus();
  });

  it('calls onYes and onNo from keyboard-reachable buttons', async () => {
    const onYes = jest.fn();
    const onNo = jest.fn();
    render(<CarryBoundaryPrompt onYes={onYes} onNo={onNo} declined={false} />);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Yes, keep carrying this' })).toHaveFocus();
    await userEvent.keyboard('{enter}');
    expect(onYes).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onNo).toHaveBeenCalledTimes(1);
  });

  it('shows a calm, non-punitive message immediately after decline — never a blocked or nagging state', () => {
    render(<CarryBoundaryPrompt onYes={jest.fn()} onNo={jest.fn()} declined />);
    expect(screen.getByText(/No problem/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CarryBoundaryPrompt onYes={jest.fn()} onNo={jest.fn()} declined={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
