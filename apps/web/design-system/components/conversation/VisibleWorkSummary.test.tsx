import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { VisibleWorkSummary } from './VisibleWorkSummary';

describe('VisibleWorkSummary', () => {
  it('shows what the member wants accomplished, what Aureus is carrying, and what done means', () => {
    render(
      <VisibleWorkSummary
        workingOn="Help me avoid a utility shutoff"
        carrying="Reading what you shared and figuring out how to help."
        doneMeans="You'll know this is done when Aureus gives you a clear result or next step."
      />,
    );

    expect(screen.getByText('Working on')).toBeInTheDocument();
    expect(screen.getByText('Help me avoid a utility shutoff')).toBeInTheDocument();
    expect(screen.getByText('Aureus is carrying')).toBeInTheDocument();
    expect(screen.getByText('Reading what you shared and figuring out how to help.')).toBeInTheDocument();
    expect(screen.getByText('Done means')).toBeInTheDocument();
  });

  it('omits Needs You entirely when nothing genuinely requires the member, rather than showing a placeholder', () => {
    render(
      <VisibleWorkSummary workingOn="A question" carrying="Nothing further in progress." doneMeans="x" />,
    );
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
  });

  it('shows Needs You only when a real reason is supplied', () => {
    render(
      <VisibleWorkSummary
        workingOn="A question"
        carrying="x"
        needsYou="Confirm whether the Elm Street unit works for you."
        doneMeans="x"
      />,
    );
    expect(screen.getByText('Needs you')).toBeInTheDocument();
    expect(screen.getByText('Confirm whether the Elm Street unit works for you.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <VisibleWorkSummary
        workingOn="Help me avoid a utility shutoff"
        carrying="Reading what you shared."
        needsYou="Review the application before it is submitted."
        doneMeans="x"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('omits Status, Next action, Evidence, and Last activity when no durable Responsibility backs the work', () => {
    render(<VisibleWorkSummary workingOn="A question" carrying="x" doneMeans="x" />);
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
    expect(screen.queryByText('Evidence')).not.toBeInTheDocument();
    expect(screen.queryByText('Last activity')).not.toBeInTheDocument();
  });

  it('shows Status, Next action (with owner), Evidence, and Last activity once real Carry State is supplied', async () => {
    const { container } = render(
      <VisibleWorkSummary
        workingOn="Help me work through the verified application for Career Training Grant"
        status="Paused for you. Come back when you are ready and Aureus will pick it up here."
        carrying="Paused — nothing further until you return."
        needsYou="Return to finish the guided application, or tell Aureus you applied or are not interested."
        nextAction={{ description: 'Return to finish the guided application.', owner: 'MEMBER' }}
        doneMeans="You'll know this is done when you tell Aureus you applied or decided not to continue."
        evidence={[
          { description: 'You reported: submitted/applied (reported).', occurredAt: '2026-09-01T21:00:00.000Z', level: 'REPORTED' },
        ]}
        lastActivityAt="2026-09-01T21:00:00.000Z"
      />,
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(
      screen.getByText('Paused for you. Come back when you are ready and Aureus will pick it up here.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Next action')).toBeInTheDocument();
    expect(screen.getByText(/^You: Return to finish the guided application\.$/)).toBeInTheDocument();

    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('You reported: submitted/applied (reported).')).toBeInTheDocument();

    expect(screen.getByText('Last activity')).toBeInTheDocument();
    const timeEl = container.querySelector('time');
    expect(timeEl).not.toBeNull();
    expect(timeEl).toHaveAttribute('dateTime', '2026-09-01T21:00:00.000Z');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('never describes completed work with a lingering Next action', () => {
    render(
      <VisibleWorkSummary
        workingOn="Help me work through the verified application"
        status="This bounded responsibility is complete."
        carrying="Completed — nothing further to carry."
        nextAction={null}
        doneMeans="x"
      />,
    );
    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
  });
});
