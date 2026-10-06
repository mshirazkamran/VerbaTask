import { useLocation, Link } from 'react-router';
import { Menu, ArrowUpRight } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

const ROUTE_TITLES = {
  '/dashboard': 'Overview',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/orders': 'Orders',
  '/dashboard/workflows': 'Workflows',
  '/dashboard/approvals': 'Approvals',
  '/dashboard/settings': 'Shop settings',
};

export function TopBar({ onOpenMobileMenu }) {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] || 'Dashboard';
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });

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
        <p className="label hidden sm:block">Dashboard /</p>
        <p className="truncate font-display text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="label hidden items-center gap-2 lg:inline-flex">
          <span className="size-1.5 rounded-pill bg-primary" aria-hidden="true" />
          Live · {today}
        </span>
        <Link
          to="/"
          className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 text-sm font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink sm:inline-flex"
        >
          Site
          <ArrowUpRight className="size-3.5" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default TopBar;
