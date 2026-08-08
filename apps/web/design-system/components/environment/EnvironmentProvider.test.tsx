import { act, render, screen } from '@testing-library/react';
import { EnvironmentProvider, useEnvironment } from './EnvironmentProvider';

function Reading() {
  const { time, resolved } = useEnvironment();
  return <p>{`${time}/${resolved}`}</p>;
}

describe('EnvironmentProvider — the Hall’s one source of the hour', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives a complete, deliberate environment to anything rendered outside it', () => {
    // Total by design: the opening sequence, a test, a future harness —
    // none of them should have to know the provider exists to render a
    // finished room. AUREUS-201: the composition is "complete and
    // deliberate on its own".
    render(<Reading />);
    expect(screen.getByText('afternoon/false')).toBeInTheDocument();
  });

  it('resolves the member’s actual hour once the browser can tell it', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-04T21:30:00'));

    render(
      <EnvironmentProvider>
        <Reading />
      </EnvironmentProvider>,
    );

    expect(screen.getByText('evening/true')).toBeInTheDocument();
  });

  it('notices the day moving through the room', () => {
    // The Hall is permanent now. An environment resolved once at mount
    // would keep a member in the afternoon at midnight — AUREUS-006
    // §TIME: "The passing of hours." A room that never notices the
    // evening is not a living home.
    jest.useFakeTimers().setSystemTime(new Date('2026-03-04T16:59:30'));

    render(
      <EnvironmentProvider>
        <Reading />
      </EnvironmentProvider>,
    );
    expect(screen.getByText('afternoon/true')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText('evening/true')).toBeInTheDocument();
  });

  it('stops reading the clock once the room is gone', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-04T09:00:00'));
    const clearInterval = jest.spyOn(globalThis, 'clearInterval');

    const { unmount } = render(
      <EnvironmentProvider>
        <Reading />
      </EnvironmentProvider>,
    );
    unmount();

    expect(clearInterval).toHaveBeenCalled();
    clearInterval.mockRestore();
  });
});
