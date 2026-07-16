'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeName } from '../tokens';

type ThemePreference = ThemeName | 'system';
type MotionPreference = 'system' | 'reduced' | 'full';

interface ThemeContextValue {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  motionPreference: MotionPreference;
  setMotionPreference: (preference: MotionPreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'aureus.preferences.theme';
const MOTION_STORAGE_KEY = 'aureus.preferences.motion';

function applyThemeAttribute(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }
}

function applyMotionAttribute(preference: MotionPreference) {
  const root = document.documentElement;
  if (preference === 'system') {
    root.removeAttribute('data-reduced-motion');
  } else {
    root.setAttribute('data-reduced-motion', String(preference === 'reduced'));
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [motionPreference, setMotionPreferenceState] = useState<MotionPreference>('system');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    const storedMotion = window.localStorage.getItem(MOTION_STORAGE_KEY) as MotionPreference | null;
    if (storedTheme) {
      setThemePreferenceState(storedTheme);
      applyThemeAttribute(storedTheme);
    }
    if (storedMotion) {
      setMotionPreferenceState(storedMotion);
      applyMotionAttribute(storedMotion);
    }
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    applyThemeAttribute(preference);
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }, []);

  const setMotionPreference = useCallback((preference: MotionPreference) => {
    setMotionPreferenceState(preference);
    applyMotionAttribute(preference);
    window.localStorage.setItem(MOTION_STORAGE_KEY, preference);
  }, []);

  const value = useMemo(
    () => ({ themePreference, setThemePreference, motionPreference, setMotionPreference }),
    [themePreference, setThemePreference, motionPreference, setMotionPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
