import { useState, useEffect } from 'react';
import { useUiStore } from '../../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router';
import { Sun, Moon, Mail, Menu, X, ArrowRight } from 'lucide-react';
import { GithubIcon } from '../ui/GithubIcon';
import { Logo } from '../landing/Logo';

export function LandingLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useUiStore();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const toggleLandingTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  const handleNavClick = (e, hash) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', `/${hash}`);
      }
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-canvas text-ink transition-colors duration-200">
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <Logo />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/#features" onClick={(e) => handleNavClick(e, '#features')} className="text-sm text-ink-mute hover:text-ink transition-colors">Features</Link>
            <Link to="/#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-sm text-ink-mute hover:text-ink transition-colors">How It Works</Link>
            <Link to="/faq" className="text-sm text-ink-mute hover:text-ink transition-colors">FAQ</Link>
            <Link to="/contact" className="text-sm text-ink-mute hover:text-ink transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleLandingTheme}
              className="p-2 text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>
            <Link to="/login" className="hidden sm:inline-flex text-sm text-ink-mute hover:text-ink transition-colors">Sign in</Link>
            <Link
              to="/signup"
              className="bg-primary text-on-primary text-xs sm:text-sm font-medium px-3.5 sm:px-4 py-2 rounded-pill hover:bg-primary-deep transition-colors"
            >
              Get started
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden border-t border-hairline px-4 pt-2 pb-4 space-y-1 bg-canvas"
            >
              <Link
                to="/#features"
                onClick={(e) => handleNavClick(e, '#features')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-ink-secondary hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <span>Features</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              </Link>
              <Link
                to="/#how-it-works"
                onClick={(e) => handleNavClick(e, '#how-it-works')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-ink-secondary hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <span>How It Works</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              </Link>
              <Link
                to="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-ink-secondary hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <span>FAQ</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-ink-secondary hover:text-ink hover:bg-canvas-soft transition-colors"
              >
                <span>Contact</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              </Link>
              <div className="pt-2 border-t border-hairline">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-2 rounded-lg border border-hairline text-sm font-medium text-ink hover:bg-canvas-soft transition-colors"
                >
                  Sign In to Account
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>{children}</main>

      <footer className="border-t border-hairline">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Logo size={30} textSize="text-lg" />
              </div>
              <p className="text-xs text-ink-mute leading-relaxed">
                Voice-first commerce for Pakistani shopkeepers.
              </p>
            </div>
            <div>
              <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-ink-mute mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/#features" onClick={(e) => handleNavClick(e, '#features')} className="text-sm text-ink-secondary hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-sm text-ink-secondary hover:text-primary transition-colors">How it works</Link></li>
                <li><Link to="/signup" className="text-sm text-ink-secondary hover:text-primary transition-colors">Get started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-ink-mute mb-3">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/faq" className="text-sm text-ink-secondary hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="text-sm text-ink-secondary hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-ink-mute mb-3">Connect</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:verbatask.business@gmail.com"
                    className="text-sm text-ink-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Email Us
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/soban-iftikhar/VerbaTask"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <GithubIcon className="w-4 h-4" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Email chip matching user badge */}
            <a
              href="mailto:verbatask.business@gmail.com"
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-hairline bg-surface/40 hover:border-primary/40 transition-colors group"
            >
              <span className="w-6 h-6 rounded-full bg-[#004D40] text-white font-bold text-xs flex items-center justify-center shrink-0">
                V
              </span>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-ink leading-tight">VerbaTask</p>
                <p className="text-[11px] text-ink-mute group-hover:text-primary transition-colors font-mono leading-tight">
                  verbatask.business@gmail.com
                </p>
              </div>
            </a>

            <div className="flex items-center gap-4 text-xs text-ink-mute">
              <p>&copy; {new Date().getFullYear()} VerbaTask. All rights reserved.</p>
              <a
                href="https://github.com/soban-iftikhar/VerbaTask"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ink-mute hover:text-primary transition-colors inline-flex items-center gap-1.5"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                Open source on GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingLayout;
