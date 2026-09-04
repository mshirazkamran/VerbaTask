import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Menu, X, ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { Logo } from './Logo';
import { useUiStore } from '../../lib/store';

const links = [
  { label: 'How it works', href: '#how-it-works' },
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
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-x-0 top-0 z-50 bg-white/95 dark:bg-[#0B0D11]/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-4 py-3 transition-colors duration-200"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        {/* Brand */}
        <Link to="/" onClick={handleLinkClick} className="transition-opacity hover:opacity-85">
          <Logo />
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
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
            className="p-2 rounded-lg text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>

          <Link
            to="/login"
            className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition-all duration-150"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Get Started</span>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
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
            className="md:hidden overflow-hidden border-t border-zinc-200 dark:border-white/10 mt-3 pt-2 pb-4 space-y-1"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={handleLinkClick}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              >
                <span>{l.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            ))}

            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 space-y-2">
              <Link
                to="/login"
                onClick={handleLinkClick}
                className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Nav;
