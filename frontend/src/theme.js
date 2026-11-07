import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'campus.theme';

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch (err) {
    return null;
  }
}

function systemTheme() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

/** The person's saved choice if they made one, otherwise whatever their computer is set to. */
export function getInitialTheme() {
  return readStored() || systemTheme();
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/** [theme, toggleTheme]. A manual choice is remembered; until then the page follows the computer's setting. */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // While nobody has picked a theme by hand, follow the computer if it switches (e.g. at sunset).
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!readStored()) setTheme(query.matches ? 'dark' : 'light');
    };
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch (err) {
        // private window: the choice just won't be remembered
      }
      return next;
    });
  }, []);

  return [theme, toggle];
}
