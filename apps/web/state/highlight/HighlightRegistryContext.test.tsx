import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import {
  HighlightRegistryProvider,
  useHighlightRegistry,
  useRegisterHighlightTarget,
} from './HighlightRegistryContext';

function TargetButton({ id, label, onActivate }: { id: string; label: string; onActivate?: () => void }) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLButtonElement>(id, { label }, { onActivate });
  return (
    <button ref={ref} data-active={isActive}>
      {label}
    </button>
  );
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useHighlightRegistry>) => void }) {
  const registry = useHighlightRegistry();
  useEffect(() => {
    onReady(registry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry]);
  return null;
}

describe('HighlightRegistryContext', () => {
  it('throws when useHighlightRegistry is used outside a provider', () => {
    const Broken = () => {
      useHighlightRegistry();
      return null;
    };
    expect(() => render(<Broken />)).toThrow('useHighlightRegistry must be used within a HighlightRegistryProvider');
  });

  it('useRegisterHighlightTarget degrades gracefully outside a provider, rather than requiring every consumer to carry one', () => {
    // Highlighting is a progressive enhancement, not a hard dependency —
    // components (and their tests) that don't care about it should never
    // be forced to wrap in HighlightRegistryProvider just to render.
    expect(() => render(<TargetButton id="Home.NextMission" label="Your next mission" />)).not.toThrow();
    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'false');
  });

  it('registers a target and activate() finds and highlights it', () => {
    let api!: ReturnType<typeof useHighlightRegistry>;
    render(
      <HighlightRegistryProvider>
        <TargetButton id="Home.NextMission" label="Your next mission" />
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    let found = false;
    act(() => {
      found = api.activate('Home.NextMission');
    });

    expect(found).toBe(true);
    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'true');
  });

  it('activate() returns false for an unregistered target and highlights nothing', () => {
    let api!: ReturnType<typeof useHighlightRegistry>;
    render(
      <HighlightRegistryProvider>
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    let found = true;
    act(() => {
      found = api.activate('Nonexistent.Target');
    });
    expect(found).toBe(false);
  });

  it('focusField() moves keyboard focus to the registered element', () => {
    let api!: ReturnType<typeof useHighlightRegistry>;
    render(
      <HighlightRegistryProvider>
        <TargetButton id="Welcome.ImmediateNeedInput" label="What brings you here" />
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    let found = false;
    act(() => {
      found = api.focusField('Welcome.ImmediateNeedInput');
    });

    expect(found).toBe(true);
    expect(screen.getByText('What brings you here')).toHaveFocus();
  });

  it('calls the registered onActivate callback when activated', () => {
    const onActivate = jest.fn();
    let api!: ReturnType<typeof useHighlightRegistry>;
    render(
      <HighlightRegistryProvider>
        <TargetButton id="Home.NextMission" label="Your next mission" onActivate={onActivate} />
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    act(() => {
      api.activate('Home.NextMission');
    });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('unregisters on unmount, so a later activate() no longer finds it', () => {
    let api!: ReturnType<typeof useHighlightRegistry>;
    const { rerender } = render(
      <HighlightRegistryProvider>
        <TargetButton id="Opportunity.Card.opp-1" label="Community Grant" />
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    rerender(
      <HighlightRegistryProvider>
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    let found = true;
    act(() => {
      found = api.activate('Opportunity.Card.opp-1');
    });
    expect(found).toBe(false);
  });

  it('describeTargets() returns a summary of every currently-registered target', () => {
    let api!: ReturnType<typeof useHighlightRegistry>;
    render(
      <HighlightRegistryProvider>
        <TargetButton id="Home.NextMission" label="Your next mission" />
        <TargetButton id="Journey.Goal.Primary" label="Find a better job" />
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    const summaries = api.describeTargets();
    expect(summaries).toEqual(
      expect.arrayContaining([
        { id: 'Home.NextMission', label: 'Your next mission', description: undefined },
        { id: 'Journey.Goal.Primary', label: 'Find a better job', description: undefined },
      ]),
    );
  });

  it('auto-clears the active highlight after a duration so it does not stay lit forever', () => {
    jest.useFakeTimers();
    let api!: ReturnType<typeof useHighlightRegistry>;
    render(
      <HighlightRegistryProvider>
        <TargetButton id="Home.NextMission" label="Your next mission" />
        <Harness onReady={(v) => (api = v)} />
      </HighlightRegistryProvider>,
    );

    act(() => {
      api.activate('Home.NextMission');
    });
    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'true');

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'false');

    jest.useRealTimers();
  });
});
