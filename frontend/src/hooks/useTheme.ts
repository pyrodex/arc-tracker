import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'arc-theme';

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'dark';
  });

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Keep system theme in sync when OS preference changes
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return { mode, setMode };
}

// Call once at app startup (before React renders) to avoid flash of wrong theme
export function initTheme() {
  const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'dark';
  applyTheme(stored);
}
