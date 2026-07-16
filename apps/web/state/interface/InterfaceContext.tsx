'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Interface State (FPB-010 §3 "Interface State"): current screen, open
 * panels, and navigation history. Layout preferences live under Local
 * Preferences (see PreferencesContext) since they persist across sessions.
 */
export interface InterfaceState {
  currentSurfaceId: string | null;
  openPanelIds: string[];
  navigationHistory: string[];
}

interface InterfaceContextValue {
  interfaceState: InterfaceState;
  setCurrentSurface: (surfaceId: string) => void;
  openPanel: (panelId: string) => void;
  closePanel: (panelId: string) => void;
}

const initialInterfaceState: InterfaceState = {
  currentSurfaceId: null,
  openPanelIds: [],
  navigationHistory: [],
};

const InterfaceContext = createContext<InterfaceContextValue | null>(null);

export function InterfaceProvider({ children }: { children: React.ReactNode }) {
  const [interfaceState, setInterfaceState] = useState<InterfaceState>(initialInterfaceState);

  const setCurrentSurface = useCallback((surfaceId: string) => {
    setInterfaceState((previous) => ({
      ...previous,
      currentSurfaceId: surfaceId,
      navigationHistory: [...previous.navigationHistory, surfaceId].slice(-50),
    }));
  }, []);

  const openPanel = useCallback((panelId: string) => {
    setInterfaceState((previous) => ({
      ...previous,
      openPanelIds: previous.openPanelIds.includes(panelId)
        ? previous.openPanelIds
        : [...previous.openPanelIds, panelId],
    }));
  }, []);

  const closePanel = useCallback((panelId: string) => {
    setInterfaceState((previous) => ({
      ...previous,
      openPanelIds: previous.openPanelIds.filter((id) => id !== panelId),
    }));
  }, []);

  const value = useMemo(
    () => ({ interfaceState, setCurrentSurface, openPanel, closePanel }),
    [interfaceState, setCurrentSurface, openPanel, closePanel],
  );

  return <InterfaceContext.Provider value={value}>{children}</InterfaceContext.Provider>;
}

export function useInterfaceState(): InterfaceContextValue {
  const context = useContext(InterfaceContext);
  if (!context) {
    throw new Error('useInterfaceState must be used within an InterfaceProvider');
  }
  return context;
}
