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
});
