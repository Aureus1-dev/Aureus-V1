import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkSurfacePrototype } from './WorkSurfacePrototype';
import { useSession } from '../../../state';
import { useTheme } from '../../theme';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));
jest.mock('../../theme', () => ({ useTheme: jest.fn() }));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseTheme = useTheme as jest.Mock;

function submit(text: string) {
  const textbox = screen.getByRole('textbox');
  fireEvent.change(textbox, { target: { value: text } });
  fireEvent.keyDown(textbox, { key: 'Enter' });
}

describe('WorkSurfacePrototype', () => {
  let establishGuestSession: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false, isGuest: false },
      establishGuestSession,
      claimAccount: jest.fn(),
    });
    mockedUseTheme.mockReturnValue({ motionPreference: 'system', setMotionPreference: jest.fn() });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders help immediately with no authentication wall, while quietly establishing a real guest session', () => {
    render(<WorkSurfacePrototype />);

    expect(screen.getByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument();
    expect(establishGuestSession).toHaveBeenCalled();
  });

  it('never opens the Carry Boundary for a bare goal statement', () => {
    render(<WorkSurfacePrototype />);
    act(() => submit('I need housing'));

    expect(
      screen.queryByText('Do you want Aureus to carry this beyond this visit?'),
    ).not.toBeInTheDocument();
  });

  it('keeps the active work visible behind the Carry Boundary prompt, and decline leaves it fully intact', () => {
    render(<WorkSurfacePrototype />);

    act(() => submit('I need help finding housing'));
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    const workingOnHeading = screen.getByRole('heading', { level: 1 });
    const matterName = workingOnHeading.textContent;

    act(() => submit('remember this for me'));
    expect(
      screen.getByText('Do you want Aureus to carry this beyond this visit?'),
    ).toBeInTheDocument();
    // The work is still rendered behind the prompt, not replaced by it.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(matterName!);

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByText(/No problem/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(matterName!);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(
      screen.queryByText('Do you want Aureus to carry this beyond this visit?'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No problem/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(matterName!);
  });

  it('does not re-prompt for the same reason after the member already declined it once this session', () => {
    render(<WorkSurfacePrototype />);
    act(() => submit('remind me tomorrow about this'));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(
      screen.queryByText('Do you want Aureus to carry this beyond this visit?'),
    ).not.toBeInTheDocument();

    act(() => submit('remind me tomorrow about this again'));
    expect(
      screen.queryByText('Do you want Aureus to carry this beyond this visit?'),
    ).not.toBeInTheDocument();
  });

  it('lets a visitor reach urgent help directly, and the safety notice never appears on ordinary arrival', () => {
    render(<WorkSurfacePrototype />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'I need help right now' }));
    expect(screen.getByRole('note')).toHaveTextContent(/AI steward, not emergency services/);
  });
});
