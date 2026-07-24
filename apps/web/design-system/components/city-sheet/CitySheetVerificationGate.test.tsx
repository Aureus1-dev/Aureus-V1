import { render, screen } from '@testing-library/react';
import { CitySheetVerificationGate } from './CitySheetVerificationGate';
import { useSession } from '../../../state';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const mockedUseSession = useSession as jest.Mock;

describe('CitySheetVerificationGate', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('renders protected content for a Steward', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['STEWARD'] } });

    render(
      <CitySheetVerificationGate>
        <div>Verification content</div>
      </CitySheetVerificationGate>,
    );

    expect(screen.getByText('Verification content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders protected content for a Platform Administrator', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['PLATFORM_ADMINISTRATOR'] } });

    render(
      <CitySheetVerificationGate>
        <div>Verification content</div>
      </CitySheetVerificationGate>,
    );

    expect(screen.getByText('Verification content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects a non-verifier member to /home and renders nothing', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['MEMBER'] } });

    render(
      <CitySheetVerificationGate>
        <div>Verification content</div>
      </CitySheetVerificationGate>,
    );

    expect(replace).toHaveBeenCalledWith('/home');
    expect(screen.queryByText('Verification content')).not.toBeInTheDocument();
  });
});
