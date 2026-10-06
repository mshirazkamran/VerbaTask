import { Sun, Moon } from 'lucide-react';
import { useUiStore } from '../../lib/store';
import { useIsDark } from '../../lib/useIsDark';

export function ThemeToggle({ className = '' }) {
  const setTheme = useUiStore((s) => s.setTheme);
  const isDark = useIsDark();

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-pill border border-rule bg-surface text-ink-2 transition-colors duration-150 hover:bg-paper-2 hover:text-ink ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Day counter' : 'Night counter'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export default ThemeToggle;
