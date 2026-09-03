import { useLocation } from 'react-router';
import { useUiStore } from '../../lib/store';
import { IconSun, IconMoon, IconMenu2, IconCircleFilled } from '@tabler/icons-react';

const ROUTE_TITLES = {
 '/dashboard': 'Overview',
 '/dashboard/inventory': 'Inventory',
 '/dashboard/orders': 'Orders',
 '/dashboard/workflows': 'Workflows',
 '/dashboard/approvals': 'Approvals',
};

export function TopBar({ onOpenMobileMenu }) {
 const location = useLocation();
 const { theme, setTheme } = useUiStore();


 const title = ROUTE_TITLES[location.pathname] || 'Dashboard';

 const toggleTheme = () => {
 setTheme(theme === 'dark' ? 'light' : 'dark');
 };

 return (
 <header className="h-16 sticky top-0 z-20 w-full glass-nav px-4 sm:px-6 flex items-center justify-between">
 {/* Left: Mobile hamburger + Page Title */}
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={onOpenMobileMenu}
 className="md:hidden p-2 text-ink-secondary hover:text-ink rounded-md hover:bg-canvas-soft transition-colors cursor-pointer"
 aria-label="Open navigation menu"
 >
 <IconMenu2 className="w-5 h-5" />
 </button>

 <h1 className="text-base sm:text-lg font-light tracking-tight text-ink">
 {title}
 </h1>
 </div>

 {/* Right: Live System indicator + Theme Toggle */}
 <div className="flex items-center gap-3">
 <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
 <IconCircleFilled className="w-2 h-2 animate-pulse text-emerald-500" />
 <span>System Live</span>
 </div>

 <button
 type="button"
 onClick={toggleTheme}
 className="p-2 text-ink-secondary hover:text-ink bg-canvas-soft border border-hairline rounded-md hover:bg-canvas transition-colors cursor-pointer"
 aria-label="Toggle dark mode"
 >
 {theme === 'dark' ? (
 <IconSun className="w-4 h-4 text-amber-400" />
 ) : (
 <IconMoon className="w-4 h-4 text-ink-secondary" />
 )}
 </button>
 </div>
 </header>
 );
}
