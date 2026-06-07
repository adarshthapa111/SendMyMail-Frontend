import { useCallback, useEffect, useState } from 'react';

/* Theme system — feature-theme-system V1.
   ─────────────────────────────────────────
   Two concepts tracked distinctly:

     preference   — what the user picked from the 4-option picker.
                    Values: 'default' | 'dark' | 'white' | 'system'
                    Persisted to localStorage.

     appliedTheme — the actual theme attribute on <html>.
                    Values: 'default' | 'dark' | 'white' (never 'system')
                    Derived from preference. When preference === 'system',
                    resolves to 'default' or 'dark' via
                    prefers-color-scheme.

   The inline script in index.html applies the initial appliedTheme
   BEFORE React mounts (flash-free). This hook stays in sync with the
   stored preference + listens for OS theme changes when preference is
   'system'. */

export type Preference   = 'default' | 'dark' | 'white' | 'system';
export type AppliedTheme = 'default' | 'dark' | 'white';

const STORAGE_KEY = 'sendmymail-theme';

function isPreference(v: unknown): v is Preference {
  return v === 'default' || v === 'dark' || v === 'white' || v === 'system';
}

function readPreference(): Preference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isPreference(stored)) return stored;
  } catch {
    /* localStorage disabled (private browsing) — fall through to system */
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

function resolve(preference: Preference, systemDark: boolean): AppliedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'default';
  return preference;
}

export function useTheme() {
  const [preference, setPrefState] = useState<Preference>(readPreference);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  /* Listen for OS-level theme changes. Fires when macOS / Windows
     auto-switch (sunrise/sunset) or when the user toggles dark mode
     in System Settings. Only effective when preference === 'system';
     otherwise the appliedTheme derivation ignores systemDark. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const appliedTheme = resolve(preference, systemDark);

  /* Sync <html data-theme="..."> whenever appliedTheme changes. The
     inline script handles the initial value; this keeps it correct
     after user changes or OS changes. */
  useEffect(() => {
    document.documentElement.dataset.theme = appliedTheme;
  }, [appliedTheme]);

  const setPreference = useCallback((next: Preference) => {
    setPrefState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private browsing — preference will reset on reload */
    }
  }, []);

  return { preference, appliedTheme, systemDark, setPreference };
}
