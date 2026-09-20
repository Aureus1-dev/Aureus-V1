import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { CarryBoundaryPanel } from './CarryBoundaryPanel';

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
  it('explains the carry boundary while making the prototype-only status explicit', () => {
    render(<CarryBoundaryPanel {...baseProps()} />);

    expect(screen.getByText(reason.why)).toBeInTheDocument();
    expect(screen.getByText('Housing search')).toBeInTheDocument();
    expect(screen.getByText('What production would preserve at this boundary')).toBeInTheDocument();
    expect(screen.getByText(/No account will be created/i)).toBeInTheDocument();
  });

  it('offers a prominent "Not now" that declines without requiring a form submission', async () => {
    const onDecline = jest.fn();
    const onClaimStart = jest.fn();
    render(<CarryBoundaryPanel {...baseProps({ onDecline, onClaimStart })} />);

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onClaimStart).not.toHaveBeenCalled();
  });

  it('validates the password before previewing the claim interaction', async () => {
    const onClaimStart = jest.fn();
    render(<CarryBoundaryPanel {...baseProps({ onClaimStart })} />);

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'short');
    await userEvent.click(screen.getByRole('button', { name: /Preview account claim/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(onClaimStart).not.toHaveBeenCalled();
  });

  it('previews the claim success state without calling any real account API', async () => {
    const onClaimStart = jest.fn();
    const onClaimSuccess = jest.fn();
    render(<CarryBoundaryPanel {...baseProps({ onClaimStart, onClaimSuccess })} />);

    await userEvent.type(screen.getByLabelText('Email', { exact: false }), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password', { exact: false }), 'a-strong-password');
    await userEvent.click(screen.getByRole('button', { name: /Preview account claim/ }));

    expect(onClaimStart).toHaveBeenCalledTimes(1);
    expect(onClaimSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows an explicit prototype confirmation once the claim interaction is previewed', () => {
    render(<CarryBoundaryPanel {...baseProps({ claimStatus: 'success' })} />);
    expect(screen.getByText(/No account was created here/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('surfaces an injected claim error state without losing the form', () => {
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
