import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { OutcomeQuestionStep } from './OutcomeQuestionStep';

describe('OutcomeQuestionStep', () => {
  it('asks the Founder-approved wording', () => {
    render(<OutcomeQuestionStep onSubmit={jest.fn()} submitting={false} error={null} onRetry={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'What would help most right now?' })).toBeInTheDocument();
  });

  it('submits the trimmed answer and does not submit an empty one', async () => {
    const onSubmit = jest.fn();
    render(<OutcomeQuestionStep onSubmit={onSubmit} submitting={false} error={null} onRetry={jest.fn()} />);

    const submit = screen.getByRole('button', { name: 'Continue' });
    expect(submit).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText('What would help most', { exact: false }),
      '  I need to find stable housing before Friday  ',
    );
    await userEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith('I need to find stable housing before Friday');
  });

  it('shows a loading state instead of the form while submitting', () => {
    render(<OutcomeQuestionStep onSubmit={jest.fn()} submitting error={null} onRetry={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('shows a retryable error with a retry action', async () => {
    const onRetry = jest.fn();
    render(
      <OutcomeQuestionStep
        onSubmit={jest.fn()}
        submitting={false}
        error={{ kind: 'unavailable', message: 'The AI service is temporarily unavailable', retryable: true }}
        onRetry={onRetry}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a non-retryable error with no retry action', () => {
    render(
      <OutcomeQuestionStep
        onSubmit={jest.fn()}
        submitting={false}
        error={{ kind: 'authentication', message: 'Sign in required', retryable: false }}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OutcomeQuestionStep onSubmit={jest.fn()} submitting={false} error={null} onRetry={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
