import { act, renderHook } from '@testing-library/react';
import { useWorkSurfaceEngine } from './useWorkSurfaceEngine';

describe('useWorkSurfaceEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not invoke the Carry Boundary from a bare goal statement', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('I need housing');
    });

    expect(result.current.state.carryBoundary.status).toBe('idle');
  });

  it('does not invoke the Carry Boundary merely because work now exists', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('I need help finding housing');
    });
    // Let the fixture timeline run all the way to an active, in-progress matter.
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current.state.view.kind).toBe('active-work');
    expect(result.current.state.carryBoundary.status).toBe('idle');
  });

  it('invokes the Carry Boundary intent prompt for an explicit durable-carry request', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('Keep working on this and remind me tomorrow');
    });

    expect(result.current.state.carryBoundary.status).toBe('intent-prompt');
    expect(result.current.state.carryBoundary.reason?.id).toBe('continue-later');
  });

  it('preserves current-session work when the member declines', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('I need help finding housing');
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    const mattersBeforeDecline = result.current.state.matters;
    expect(Object.keys(mattersBeforeDecline)).toHaveLength(1);

    act(() => {
      result.current.submitMessage('remember this for me');
    });
    expect(result.current.state.carryBoundary.status).toBe('intent-prompt');

    act(() => {
      result.current.carryIntentNo();
    });

    expect(result.current.state.matters).toEqual(mattersBeforeDecline);
    expect(result.current.state.view).toEqual({
      kind: 'active-work',
      matterId: expect.any(String),
    });
  });

  it('returns to idle shortly after a decline without requiring further input', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('remind me tomorrow about this');
    });
    act(() => {
      result.current.carryIntentNo();
    });
    expect(result.current.state.carryBoundary.status).toBe('declined-recently');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.state.carryBoundary.status).toBe('idle');
  });

  it('does not re-prompt for the same reason once the member has already declined it', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('remind me tomorrow about this');
    });
    act(() => {
      result.current.carryIntentNo();
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.state.carryBoundary.status).toBe('idle');
    expect(result.current.state.suppressedReasons).toContain('monitoring');

    act(() => {
      result.current.submitMessage('remind me tomorrow about this again');
    });

    // Suppressed: no fresh prompt, and the message still reaches the matter/transcript.
    expect(result.current.state.carryBoundary.status).toBe('idle');
  });

  it('advances the visible work trace one scripted step at a time, never skipping ahead', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));

    act(() => {
      result.current.submitMessage('I need help finding housing');
    });
    expect(result.current.state.view.kind).toBe('understanding');

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.state.view.kind).toBe('active-work');
    const matterId = Object.keys(result.current.state.matters)[0]!;
    expect(result.current.state.matters[matterId]!.stepIndex).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1400);
    });
    expect(result.current.state.matters[matterId]!.stepIndex).toBe(1);
  });

  it('lets a member resolve a Needs You item', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('returning-one'));
    const matterId = Object.keys(result.current.state.matters)[0]!;
    expect(result.current.state.matters[matterId]!.needsYouResolved).toBe(false);

    act(() => {
      result.current.resolveNeedsYou(matterId);
    });

    expect(result.current.state.matters[matterId]!.needsYouResolved).toBe(true);
  });

  it('preserves the current view when an error is triggered, and restores it on retry', () => {
    const { result } = renderHook(() => useWorkSurfaceEngine('arrival'));
    act(() => {
      result.current.submitMessage('I need help finding housing');
      jest.advanceTimersByTime(500);
    });
    const viewBeforeError = result.current.state.view;

    act(() => {
      result.current.triggerError();
    });
    expect(result.current.state.view).toEqual({ kind: 'error' });

    act(() => {
      result.current.retryFromError();
    });
    expect(result.current.state.view).toEqual(viewBeforeError);
  });
});
