import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { scrollToHash } from '../../lib/scroll';

const links = [
  { label: 'How it works', hash: '#how-it-works' },
  { label: 'Features', hash: '#features' },
  { label: 'Pricing', hash: '#pricing' },
  { label: 'FAQ', hash: '#faq' },
];

// N1b · canonical three-section bar. Knobs: centre links=4, dropdowns=none, scroll=always-solid.
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const go = (e, hash) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === '/') {
      if (scrollToHash(hash)) window.history.replaceState(null, '', `/${hash}`);
    } else {
      navigate(`/${hash}`);
    }
  };

  return (
    <header
      className={`sticky top-0 z-[200] transition-colors duration-200 ${
        scrolled || open ? 'border-b border-rule bg-paper' : 'border-b border-transparent bg-paper'
      }`}
    >
      <div className="shell flex h-16 items-center gap-6">
        <Link to="/" onClick={() => setOpen(false)} className="shrink-0 rounded-sm" aria-label="VerbaTask home">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.hash}
              href={`/${l.hash}`}
              onClick={(e) => go(e, l.hash)}
              className="whitespace-nowrap rounded-pill px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            to="/login"
            className="hidden whitespace-nowrap rounded-pill px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link to="/signup" className="btn btn--sm">
            Start free
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-pill border border-rule bg-surface text-ink lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-[200] overflow-y-auto bg-paper lg:hidden">
          <nav className="shell flex flex-col py-4" aria-label="Mobile">
            {links.map((l, i) => (
              <a
                key={l.hash}
                href={`/${l.hash}`}
                onClick={(e) => go(e, l.hash)}
                className="reveal flex items-center justify-between border-b border-rule py-4 font-display text-2xl font-semibold tracking-tight text-ink"
                style={{ '--i': i }}
              >
                {l.label}
                <ArrowRight className="size-5 text-muted" />
              </a>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-rule py-4 font-display text-2xl font-semibold tracking-tight text-ink"
            >
              Contact
              <ArrowRight className="size-5 text-muted" />
            </Link>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/login" onClick={() => setOpen(false)} className="btn btn--soft flex-1">
                Sign in
              </Link>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Nav;
