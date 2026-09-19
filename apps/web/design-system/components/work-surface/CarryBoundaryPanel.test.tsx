import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { CarryBoundaryPanel } from './CarryBoundaryPanel';
import { useSession } from '../../../state';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const mockedUseSession = useSession as jest.Mock;

const reason = {
  id: 'continue-later' as const,
  why: 'To pick this work back up, Aureus needs a place to keep it.',
};

function baseProps(overrides: Partial<Parameters<typeof CarryBoundaryPanel>[0]> = {}) {
  return {
    reason,
    carryingSummary: ['Housing search', 'Documents'],
    claimStatus: 'idle' as const,
    claimErrorMessage: null,
    onDecline: jest.fn(),
    onClaimStart: jest.fn(),
    onClaimSuccess: jest.fn(),
    onClaimError: jest.fn(),
    ...overrides,
  };
}

describe('CarryBoundaryPanel', () => {
  let claimAccount: jest.Mock;

  beforeEach(() => {
    claimAccount = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({ claimAccount });
  });

  it('explains what is carried, why an account is needed, and what will be preserved', () => {
    render(<CarryBoundaryPanel {...baseProps()} />);

    expect(screen.getByText(reason.why)).toBeInTheDocument();
    expect(screen.getByText('Housing search')).toBeInTheDocument();
    expect(screen.getByText('What will be preserved')).toBeInTheDocument();
  });

  it('offers a real, prominent "Not now" that declines without requiring a form submission', async () => {
    const onDecline = jest.fn();
    render(<CarryBoundaryPanel {...baseProps({ onDecline })} />);

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(claimAccount).not.toHaveBeenCalled();
  });

  it('validates the password before attempting to claim the account', async () => {
    const onClaimStart = jest.fn();
    render(<CarryBoundaryPanel {...baseProps({ onClaimStart })} />);

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'short');
    await userEvent.click(screen.getByRole('button', { name: /Create your free Aureus account/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(onClaimStart).not.toHaveBeenCalled();
    expect(claimAccount).not.toHaveBeenCalled();
  });

  it('really upgrades the current guest session on submit — this is not a fixture', async () => {
    const onClaimStart = jest.fn();
    const onClaimSuccess = jest.fn();
    render(<CarryBoundaryPanel {...baseProps({ onClaimStart, onClaimSuccess })} />);

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'a-strong-password');
    await userEvent.click(screen.getByRole('button', { name: /Create your free Aureus account/ }));

    expect(onClaimStart).toHaveBeenCalledTimes(1);
    expect(claimAccount).toHaveBeenCalledWith('member@example.com', 'a-strong-password');
    await waitFor(() => expect(onClaimSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows a calm confirmation once claimed, replacing the form', () => {
    render(<CarryBoundaryPanel {...baseProps({ claimStatus: 'success' })} />);
    expect(screen.getByText(/keep carrying this/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('surfaces a claim failure without losing the form or the work', () => {
    render(
      <CarryBoundaryPanel
        {...baseProps({
          claimStatus: 'error',
          claimErrorMessage: 'We could not reach the server.',
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We could not reach the server.');
    expect(screen.getByLabelText('Email', { exact: false })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CarryBoundaryPanel {...baseProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
