import { render, screen } from '@testing-library/react';
import { FounderGate } from './FounderGate';
import { useSession } from '../../../state';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const mockedUseSession = useSession as jest.Mock;

describe('FounderGate', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('renders protected content for a Platform Administrator', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['PLATFORM_ADMINISTRATOR'] } });

    render(
      <FounderGate>
        <div>Founder content</div>
      </FounderGate>,
    );

    expect(screen.getByText('Founder content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders protected content for a System Administrator', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['SYSTEM_ADMINISTRATOR'] } });

    render(
      <FounderGate>
        <div>Founder content</div>
      </FounderGate>,
    );

    expect(screen.getByText('Founder content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects a non-admin member to /home and renders nothing', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['MEMBER'] } });

    render(
      <FounderGate>
        <div>Founder content</div>
      </FounderGate>,
    );

    expect(replace).toHaveBeenCalledWith('/home');
    expect(screen.queryByText('Founder content')).not.toBeInTheDocument();
  });

  it('redirects a Steward (not a Founder role) to /home', () => {
    mockedUseSession.mockReturnValue({ session: { roles: ['STEWARD'] } });

    render(
      <FounderGate>
        <div>Founder content</div>
      </FounderGate>,
    );

    expect(replace).toHaveBeenCalledWith('/home');
    expect(screen.queryByText('Founder content')).not.toBeInTheDocument();
  });
});
