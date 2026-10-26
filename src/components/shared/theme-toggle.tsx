'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="flex items-center justify-center h-9 w-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)]">
        <Sun className="h-4 w-4 text-[var(--text-tertiary)]" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center h-9 w-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)] transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-[var(--amber)]" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--violet)]" />
      )}
    </button>
  );
}
