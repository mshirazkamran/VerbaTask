import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Menu, X, ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { Logo } from './Logo';
import { Magnet } from '../ui/reactbits/Magnet';
import { useUiStore } from '../../lib/store';

const links = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Problem', href: '#problem' },
  { label: 'Features', href: '#features' },
  { label: 'Why WhatsApp', href: '#why-whatsapp' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useUiStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6 pt-3.5 pb-2 pointer-events-none"
    >
      <div className="mx-auto max-w-6xl pointer-events-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/90 dark:bg-[#0E1716]/90 backdrop-blur-md shadow-xs dark:shadow-md px-4 py-2.5 transition-colors duration-200">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <Logo />
          </Link>

          {/* Center Nav Links (Desktop) */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-xs lg:text-sm font-medium text-[var(--text-ink-secondary)] hover:text-[var(--color-anchor)] dark:hover:text-[var(--color-mint)] hover:bg-[var(--color-anchor)]/8 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-ink-mute)] hover:text-[var(--text-ink)] bg-[var(--bg-canvas-soft)] hover:bg-[var(--color-anchor)]/10 border border-[var(--border-hairline)] transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FFF8B0]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--color-anchor)]" />
              )}
            </button>

            <Link
              to="/login"
              className="hidden sm:inline-flex rounded-xl px-3.5 py-1.5 text-xs lg:text-sm font-medium text-[var(--text-ink-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--color-anchor)]/8 transition-colors"
            >
              Sign In
            </Link>

            <Magnet padding={40} magnetStrength={3}>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#287A74] hover:bg-[#1E5C58] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98]"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>Start Free</span>
              </Link>
            </Magnet>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl text-[var(--text-ink-mute)] hover:text-[var(--text-ink)] bg-[var(--bg-canvas-soft)] border border-[var(--border-hairline)] transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden border-t border-[var(--border-hairline)] mt-3 pt-2 pb-3 space-y-1"
            >
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={handleLinkClick}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-ink-secondary)] hover:text-[var(--color-anchor)] dark:hover:text-[var(--color-mint)] hover:bg-[var(--color-anchor)]/8 transition-colors"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-ink-mute)]" />
                </a>
              ))}

              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2">
                <Link
                  to="/login"
                  onClick={handleLinkClick}
                  className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas-soft)] text-sm font-medium text-[var(--text-ink)] hover:bg-[var(--color-anchor)]/10 transition-colors"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

export default Nav;
