import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ReturningOneMatter } from './ReturningOneMatter';
import { HOUSING_MATTER } from './engine/fixtures';

describe('ReturningOneMatter', () => {
  it('resumes directly into the most relevant matter with what changed, carrying, needs-you, and latest result', () => {
    render(
      <ReturningOneMatter
        memberName="Jordan"
        matter={HOUSING_MATTER}
        whatChanged="Aureus found 2 more programs since your last visit."
        onContinue={jest.fn()}
      />,
    );

    expect(screen.getByText('Welcome back, Jordan.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: HOUSING_MATTER.workingOn })).toBeInTheDocument();
    expect(
      screen.getByText('Aureus found 2 more programs since your last visit.'),
    ).toBeInTheDocument();
    expect(screen.getByText(HOUSING_MATTER.needsYou!.prompt)).toBeInTheDocument();
  });

  it('opens the full work surface on continue', async () => {
    const onContinue = jest.fn();
    render(
      <ReturningOneMatter
        memberName="Jordan"
        matter={HOUSING_MATTER}
        whatChanged="x"
        onContinue={onContinue}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue this work' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ReturningOneMatter
        memberName="Jordan"
        matter={HOUSING_MATTER}
        whatChanged="x"
        onContinue={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
