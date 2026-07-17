import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { InterfaceProvider, useInterfaceState } from './InterfaceContext';

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useInterfaceState>) => void }) {
  const value = useInterfaceState();
  useEffect(() => {
    onReady(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useInterfaceState>;
  render(
    <InterfaceProvider>
      <Harness onReady={(value) => (api = value)} />
    </InterfaceProvider>,
  );
  return () => api;
}

describe('InterfaceContext', () => {
  it('starts with no current surface, no open panels, and empty history', () => {
    const getApi = renderHarness();
    expect(getApi().interfaceState).toEqual({ currentSurfaceId: null, openPanelIds: [], navigationHistory: [] });
  });

  it('records the current surface and appends it to navigation history', () => {
    const getApi = renderHarness();
    act(() => getApi().setCurrentSurface('home'));
    expect(getApi().interfaceState.currentSurfaceId).toBe('home');
    expect(getApi().interfaceState.navigationHistory).toEqual(['home']);

    act(() => getApi().setCurrentSurface('journey'));
    expect(getApi().interfaceState.currentSurfaceId).toBe('journey');
    expect(getApi().interfaceState.navigationHistory).toEqual(['home', 'journey']);
  });

  it('caps navigation history at 50 entries', () => {
    const getApi = renderHarness();
    for (let i = 0; i < 55; i += 1) {
      act(() => getApi().setCurrentSurface(`surface-${i}`));
    }
    expect(getApi().interfaceState.navigationHistory).toHaveLength(50);
    expect(getApi().interfaceState.navigationHistory[0]).toBe('surface-5');
    expect(getApi().interfaceState.navigationHistory[49]).toBe('surface-54');
  });

  it('opens a panel, and opening the same panel twice does not duplicate it', () => {
    const getApi = renderHarness();
    act(() => getApi().openPanel('steward-workspace'));
    act(() => getApi().openPanel('steward-workspace'));
    expect(getApi().interfaceState.openPanelIds).toEqual(['steward-workspace']);
  });

  it('closes a panel', () => {
    const getApi = renderHarness();
    act(() => getApi().openPanel('steward-workspace'));
    act(() => getApi().closePanel('steward-workspace'));
    expect(getApi().interfaceState.openPanelIds).toEqual([]);
  });

  it('closing a panel that was never open is a no-op, not an error', () => {
    const getApi = renderHarness();
    act(() => getApi().closePanel('never-opened'));
    expect(getApi().interfaceState.openPanelIds).toEqual([]);
  });

  it('throws when used outside a provider', () => {
    function Bare() {
      useInterfaceState();
      return null;
    }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow('useInterfaceState must be used within an InterfaceProvider');
    spy.mockRestore();
  });
});
