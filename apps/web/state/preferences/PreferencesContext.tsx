'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Local Preferences (FPB-010 §3 "Local Preferences") not already covered
 * by ThemeProvider (theme + reduced motion). Persisted so members never
 * feel Aureus has "forgotten" them (FPB-010 §2).
 */
export interface PreferencesState {
  language: string;
  notificationsEnabled: boolean;
}

interface PreferencesContextValue {
  preferences: PreferencesState;
  setLanguage: (language: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'aureus.preferences.local';

const defaultPreferences: PreferencesState = {
  language: 'en',
  notificationsEnabled: true,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<PreferencesState>(defaultPreferences);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPreferences({ ...defaultPreferences, ...(JSON.parse(stored) as Partial<PreferencesState>) });
    }
  }, []);

  const persist = useCallback((next: PreferencesState) => {
    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setLanguage = useCallback(
    (language: string) => persist({ ...preferences, language }),
    [preferences, persist],
  );

  const setNotificationsEnabled = useCallback(
    (notificationsEnabled: boolean) => persist({ ...preferences, notificationsEnabled }),
    [preferences, persist],
  );

  const value = useMemo(
    () => ({ preferences, setLanguage, setNotificationsEnabled }),
    [preferences, setLanguage, setNotificationsEnabled],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
