import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import { useAuthStore, useUiStore } from '../../lib/store';

import {
  IconLayoutDashboard,
  IconBoxSeam,
  IconReceipt,
  IconGitBranch,
  IconClipboardCheck,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconBuildingStore,
} from '@tabler/icons-react';


const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: IconLayoutDashboard, end: true },
  { to: '/dashboard/inventory', label: 'Inventory', icon: IconBoxSeam },
  { to: '/dashboard/orders', label: 'Orders', icon: IconReceipt },
  { to: '/dashboard/workflows', label: 'Workflows', icon: IconGitBranch },
  { to: '/dashboard/approvals', label: 'Approvals', icon: IconClipboardCheck },
];

export function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { merchant, logout } = useAuthStore();

  const businessName = merchant?.businessName || 'VerbaTask Store';
  const merchantEmail = merchant?.email || '';

  const content = (
    <div className="h-full flex flex-col justify-between glass-sidebar border-r border-hairline select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center gap-3 border-b border-hairline">
          <img
            src="/favicon-32x32.png"
            alt="VerbaTask Logo"
            className="w-8 h-8 rounded-lg shrink-0 shadow-sm"
          />
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-sm font-medium text-ink tracking-tight truncate">
                VerbaTask
              </span>
              <span className="text-[11px] text-ink-mute truncate">
                Merchant Hub
              </span>
            </div>
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-ink-secondary hover:text-ink hover:bg-canvas-soft'
                  }`
                }
                title={sidebarCollapsed && !mobileOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {(!sidebarCollapsed || mobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account / Collapse */}
      <div className="p-2 border-t border-hairline space-y-1">
        {/* Merchant Info */}
        {(!sidebarCollapsed || mobileOpen) ? (
          <div className="px-3 py-2 flex items-center gap-2.5 rounded-md bg-canvas-soft/80 border border-hairline">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-medium">
              <IconBuildingStore className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink truncate leading-tight">
                {businessName}
              </p>
              {merchantEmail && (
                <p className="text-[10px] text-ink-mute truncate">{merchantEmail}</p>
              )}
            </div>
          </div>
        ) : (
          <div
            className="w-full flex justify-center py-2 text-ink-secondary"
            title={businessName}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
              <IconBuildingStore className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Sidebar Collapse Toggle (Desktop only) */}
        {!mobileOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-ink-mute hover:text-ink hover:bg-canvas-soft rounded-md transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <IconLayoutSidebarLeftExpand className="w-4 h-4 shrink-0 mx-auto" />
            ) : (
              <>
                <IconLayoutSidebarLeftCollapse className="w-4 h-4 shrink-0" />
                <span className="truncate">Collapse sidebar</span>
              </>
            )}
          </button>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-ruby hover:bg-ruby/10 rounded-md transition-colors cursor-pointer"
          title={sidebarCollapsed && !mobileOpen ? 'Sign out' : undefined}
        >
          <IconLogout className={`w-4 h-4 shrink-0 ${sidebarCollapsed && !mobileOpen ? 'mx-auto' : ''}`} />
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

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-float z-10 animate-slideRight">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
