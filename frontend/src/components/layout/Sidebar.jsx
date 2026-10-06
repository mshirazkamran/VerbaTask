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
  Settings,
  X,
} from 'lucide-react';
import { Logo } from '../landing/Logo';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders', label: 'Orders', icon: Receipt },
  { to: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard/approvals', label: 'Approvals', icon: ClipboardCheck },
  { to: '/dashboard/workflows', label: 'Workflows', icon: GitBranch },
];

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'VT';
}

function NavItem({ item, compact, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-pill text-sm font-medium transition-colors duration-150 ${
          compact ? 'size-11 justify-center' : 'h-11 px-4'
        } ${isActive ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-3 hover:text-ink'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
          {!compact && <span className="truncate">{item.label}</span>}
          {!compact && isActive && <span className="ml-auto size-1.5 rounded-pill bg-pear" aria-hidden="true" />}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { merchant, logout } = useAuthStore();

  const businessName = merchant?.businessName || 'My shop';
  const merchantEmail = merchant?.email || '';

  const content = (compact) => (
    <div className="flex h-full flex-col bg-paper-2 select-none">
      <div className={`flex h-16 shrink-0 items-center ${compact ? 'justify-center' : 'justify-between px-5'}`}>
        <Link to="/" onClick={onMobileClose} className="rounded-sm" title="Back to the VerbaTask site">
          <Logo showWordmark={!compact} size={30} textSize="text-xl" />
        </Link>
        {mobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            className="grid size-10 place-items-center rounded-pill border border-rule text-ink-2 hover:text-ink"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Shop identity sits above navigation — this is your shop's console */}
      <NavLink
        to="/dashboard/settings"
        onClick={onMobileClose}
        title={compact ? businessName : 'Shop settings'}
        className={({ isActive }) =>
          `mx-3 mt-2 flex items-center gap-3 rounded-card border transition-colors duration-150 ${
            compact ? 'size-11 justify-center self-center p-0' : 'p-3'
          } ${isActive ? 'border-ink bg-surface' : 'border-rule bg-surface hover:border-rule-2'}`
        }
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-pear font-display text-sm font-bold text-on-pear">
          {initials(businessName)}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-semibold tracking-tight text-ink">{businessName}</span>
            {merchantEmail && <span className="block truncate font-mono text-[10.5px] text-muted">{merchantEmail}</span>}
          </span>
        )}
        {!compact && <Settings className="size-4 shrink-0 text-muted" />}
      </NavLink>

      <nav className={`mt-6 flex flex-1 flex-col gap-1 ${compact ? 'items-center px-0' : 'px-3'}`} aria-label="Dashboard">
        {!compact && <p className="label mb-2 px-4">Shop</p>}
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} item={item} compact={compact} onNavigate={onMobileClose} />
        ))}
      </nav>

      <div className={`flex shrink-0 flex-col gap-1 border-t border-rule py-3 ${compact ? 'items-center' : 'px-3'}`}>
        {!mobileOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`flex items-center gap-3 rounded-pill text-xs font-medium text-muted transition-colors hover:bg-paper-3 hover:text-ink ${
              compact ? 'size-11 justify-center' : 'h-10 px-4'
            }`}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!compact && <span>Collapse</span>}
          </button>
        )}
        <button
          type="button"
          onClick={logout}
          title={compact ? 'Sign out' : undefined}
          className={`flex items-center gap-3 rounded-pill text-xs font-medium text-danger-ink transition-colors hover:bg-coral-tint ${
            compact ? 'size-11 justify-center' : 'h-10 px-4'
          }`}
        >
          <LogOut className="size-4" />
          {!compact && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 76 : 256 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-[10] hidden h-screen shrink-0 overflow-hidden border-r border-rule md:block"
      >
        {content(sidebarCollapsed)}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[400] flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-[var(--color-scrim)]"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%', transition: { duration: 0.18, ease: [0.7, 0, 0.84, 0] } }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 h-full w-[17rem] max-w-[85vw] shadow-[var(--shadow-pop)]"
            >
              {content(false)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
