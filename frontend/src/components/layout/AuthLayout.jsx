import { Link } from 'react-router';
import { useUiStore } from '../../lib/store';
import { Sun, Moon } from 'lucide-react';
import { Logo } from '../landing/Logo';

/**
 * Authentication layout with atmospheric backdrop and centered card.
 */
export function AuthLayout({ children, title, subtitle }) {
  const { theme, setTheme } = useUiStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between mesh-gradient-bg px-4 py-8 relative transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="transition-opacity hover:opacity-85" title="Return to Landing Page">
          <Logo size={36} textSize="text-xl sm:text-[1.75rem]" />
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-700" />
          )}
        </button>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md mx-auto my-6 sm:my-8">
        <div className="bg-canvas border border-hairline rounded-xl shadow-md p-5 sm:p-8">
          {title && (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-light tracking-tight text-ink font-heading">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-ink-mute mt-1.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-ink-mute">
        <p>© {new Date().getFullYear()} VerbaTask. Voice and Guided Commerce.</p>
      </footer>
    </div>
  );
}

export default AuthLayout;
