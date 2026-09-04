import { NavLink, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore, useUiStore } from '../../lib/store';

import {
  LayoutDashboard,
  Package,
  Receipt,
  GitBranch,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Store,
  Settings,
  X,
} from 'lucide-react';

import { Logo } from '../landing/Logo';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/dashboard/inventory',
    label: 'Inventory',
    icon: Package,
  },
  {
    to: '/dashboard/orders',
    label: 'Orders',
    icon: Receipt,
  },
  {
    to: '/dashboard/workflows',
    label: 'Workflows',
    icon: GitBranch,
  },
  {
    to: '/dashboard/approvals',
    label: 'Approvals',
    icon: ClipboardCheck,
  },
  {
    to: '/dashboard/settings',
    label: 'Store Settings',
    icon: Settings,
  },
];

export function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { merchant, logout } = useAuthStore();

  const businessName = merchant?.businessName || 'My Business';
  const merchantEmail = merchant?.email || '';

  const content = (
    <div className="h-full flex flex-col justify-between glass-sidebar border-r border-zinc-200 dark:border-white/10 select-none transition-colors duration-200">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-white/10">
          <Link
            to="/"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
            title="Return to Landing Page"
          >
            <Logo showWordmark={!sidebarCollapsed || mobileOpen} size={36} textSize="text-xl" />
          </Link>

          {mobileOpen && (
            <button
              type="button"
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold border-l-2 border-emerald-600 dark:border-emerald-500'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.04] border-l-2 border-transparent'
                  }`
                }
                title={sidebarCollapsed && !mobileOpen ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                      }`}
                    />
                    {(!sidebarCollapsed || mobileOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account / Collapse */}
      <div className="p-2 border-t border-zinc-200 dark:border-white/10 space-y-1">
        {/* Merchant Info */}
        {!sidebarCollapsed || mobileOpen ? (
          <NavLink
            to="/dashboard/settings"
            onClick={onMobileClose}
            className="px-3 py-2 flex items-center gap-2.5 rounded-md bg-zinc-100/80 border border-zinc-200 hover:border-emerald-500/40 hover:bg-zinc-100 dark:bg-canvas-soft/80 dark:border-hairline dark:hover:border-primary/40 dark:hover:bg-canvas-soft transition-colors cursor-pointer"
            title="Open Store Settings"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-medium">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-900 dark:text-ink truncate leading-tight">
                {businessName}
              </p>
              {merchantEmail && (
                <p className="text-[10px] text-zinc-500 dark:text-ink-mute truncate">{merchantEmail}</p>
              )}
            </div>
          </NavLink>
        ) : (
          <NavLink
            to="/dashboard/settings"
            className="w-full flex justify-center py-2 text-zinc-600 hover:text-emerald-600 dark:text-ink-secondary dark:hover:text-primary transition-colors cursor-pointer"
            title={businessName}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-medium">
              <Store className="w-4 h-4" />
            </div>
          </NavLink>
        )}

        {/* Sidebar Collapse Toggle (Desktop only) */}
        {!mobileOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] dark:hover:bg-[#1E293B] rounded-md transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 shrink-0 mx-auto" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 shrink-0" />
                <span className="truncate">Collapse sidebar</span>
              </>
            )}
          </button>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-ruby dark:hover:bg-ruby/10 rounded-md transition-colors cursor-pointer"
          title={sidebarCollapsed && !mobileOpen ? 'Sign out' : undefined}
        >
          <LogOut className={`w-4 h-4 shrink-0 ${sidebarCollapsed && !mobileOpen ? 'mx-auto' : ''}`} />
          {(!sidebarCollapsed || mobileOpen) && (
            <span className="truncate font-medium">Sign out</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar with Motion width */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:block shrink-0 h-screen sticky top-0 z-30"
      >
        {content}
      </motion.aside>

      {/* Mobile Drawer with AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
