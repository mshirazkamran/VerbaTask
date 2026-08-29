import { useUiStore } from '../../lib/store';
import { IconSun, IconMoon } from '@tabler/icons-react';



/**
 * Authentication layout with atmospheric gradient mesh backdrop and centered card.
 */
export function AuthLayout({ children, title, subtitle }) {
  const { theme, setTheme } = useUiStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between mesh-gradient-bg px-4 py-8 relative">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon-32x32.png"
            alt="VerbaTask Logo"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <span className="text-lg font-medium tracking-tight text-ink">
            VerbaTask
          </span>
        </div>


        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-ink-secondary hover:text-ink bg-canvas/60 backdrop-blur-xs border border-hairline rounded-pill hover:bg-canvas transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <IconSun className="w-4 h-4 text-lemon" />
          ) : (
            <IconMoon className="w-4 h-4 text-ink-secondary" />
          )}
        </button>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md mx-auto my-8">
        <div className="bg-canvas border border-hairline rounded-xl shadow-float p-6 sm:p-8 backdrop-blur-md">
          {title && (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-light tracking-tight text-ink">
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
