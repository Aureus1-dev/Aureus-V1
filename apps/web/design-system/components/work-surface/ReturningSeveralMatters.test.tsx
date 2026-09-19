import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ReturningSeveralMatters } from './ReturningSeveralMatters';
import { HOUSING_MATTER, MOVE_PLAN_MATTER, UTILITY_MATTER } from './engine/fixtures';

const matters = [
  { matter: HOUSING_MATTER, stepIndex: HOUSING_MATTER.needsYouAt },
  { matter: UTILITY_MATTER, stepIndex: 1 },
  { matter: MOVE_PLAN_MATTER, stepIndex: 0 },
];

describe('ReturningSeveralMatters', () => {
  it('shows a small number of calm cards, not a dense dashboard', () => {
    render(<ReturningSeveralMatters memberName="Jordan" matters={matters} onOpen={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('answers what is this, does Aureus need me, and what happens next for each matter', () => {
    render(<ReturningSeveralMatters memberName="Jordan" matters={matters} onOpen={jest.fn()} />);

    expect(screen.getByText(HOUSING_MATTER.workingOn)).toBeInTheDocument();
    expect(screen.getByText(`Needs you: ${HOUSING_MATTER.needsYou!.prompt}`)).toBeInTheDocument();
    expect(screen.getByText('Aureus is carrying this — no action needed.')).toBeInTheDocument();
  });

  it('opens the selected matter', async () => {
    const onOpen = jest.fn();
    render(<ReturningSeveralMatters memberName="Jordan" matters={matters} onOpen={onOpen} />);
    await userEvent.click(screen.getByText(HOUSING_MATTER.workingOn));
    expect(onOpen).toHaveBeenCalledWith(HOUSING_MATTER.id);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ReturningSeveralMatters memberName="Jordan" matters={matters} onOpen={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
