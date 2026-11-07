import React from 'react';
import { SunIcon, MoonIcon } from '../icons';

export default function ThemeToggle({ theme, onToggle, floating = false }) {
  const goingDark = theme !== 'dark';
  const label = goingDark ? 'Switch to dark mode' : 'Switch to light mode';
  return (
    <button
      type="button"
      className={`bell__button theme-toggle ${floating ? 'theme-toggle--floating' : ''}`}
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {goingDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
