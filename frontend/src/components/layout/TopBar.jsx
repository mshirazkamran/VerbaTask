import { useLocation, Link } from 'react-router';
import { Menu, ArrowUpRight } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useUiStore } from '../../lib/store';
import { getTranslations } from '../../lib/translations';

export function TopBar({ onOpenMobileMenu }) {
  const { pathname } = useLocation();
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).topBar;

  const routeTitles = {
    '/dashboard': t.overview,
    '/dashboard/inventory': t.inventory,
    '/dashboard/orders': t.orders,
    '/dashboard/ledger': t.ledger,
    '/dashboard/workflows': t.workflows,
    '/dashboard/approvals': t.approvals,
    '/dashboard/settings': t.settings,
  };

  const title = routeTitles[pathname] || (language === 'ur' ? 'ڈیش بورڈ' : 'Dashboard');
  const today = new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="sticky top-0 z-[200] flex h-16 w-full items-center justify-between gap-3 border-b border-rule bg-paper px-3 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="grid size-10 shrink-0 place-items-center rounded-pill border border-rule bg-surface text-ink md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-4" />
        </button>
        <p className="label hidden sm:block">{language === 'ur' ? 'ڈیش بورڈ /' : 'Dashboard /'}</p>
        <p className="truncate font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="label hidden items-center gap-2 lg:inline-flex">
          <span className="size-1.5 rounded-pill bg-primary" aria-hidden="true" />
          {t.live} · {today}
        </span>
        <Link
          to="/"
          className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 text-sm font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink sm:inline-flex"
        >
          {t.site}
          <ArrowUpRight className="size-3.5 rtl:rotate-90" />
        </Link>
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

export default TopBar;
