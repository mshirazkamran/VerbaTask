# VerbaTask Frontend - Progress Tracker

This file tracks implementation progress against the full plan. It serves as both a TODO list and a reference for the complete scope.

---

## Overall Progress

| Phase | Status | Pages | Coverage |
|---|---|---|---|
| Phase 1: Setup + Foundation + Auth (3 pages) | `[x] Completed` | Login, Signup, LinkCode | 40% of project (100% of Phase 1) |
| Phase 2: Dashboard + CRUD Pages (5 pages) | `[x] Completed` | Overview, Inventory, Orders, Workflows, Approvals | 60% of project (100% of Phase 2) |
| **Total** | | **8 pages** | **100% Complete** |

---

## Phase 1: Setup + Foundation + UI Components + Layout + Auth Pages (40% - COMPLETED)

### Step 1: Project Configuration and Dependencies
- `[x]` Install all npm dependencies (react-router@7, tanstack-query@5, tanstack-table@8, zustand@5, recharts, react-hook-form@7, zod, sonner, motion, geist, tabler-icons, tailwindcss v4)
- `[x]` Configure `vite.config.js` with `@tailwindcss/vite` plugin
- `[x]` Create `.env.local` with `VITE_API_BASE_URL`
- `[x]` Create `src/app.css` with Tailwind v4 theme tokens from DESIGN.md (colors, radii, shadows, typography, dark mode)
- `[x]` Remove old `App.css` and `index.css`

### Step 2: Core Architecture (Foundation Layer)
- `[x]` Rewrite `src/main.jsx` (QueryClientProvider, RouterProvider, Toaster)
- `[x]` Create `src/lib/api.js` (fetch wrapper, auth header, envelope unwrap)
- `[x]` Create `src/lib/store.js` (Zustand authStore + uiStore, localStorage persistence)
- `[x]` Create `src/lib/router.jsx` (React Router v7 config, all routes)
- `[x]` Create `src/lib/queryKeys.js` (TanStack Query key factory)
- `[x]` Create `src/lib/format.js` (formatPKR, formatDate, formatQuantity)

### Step 3: Shared UI Components
- `[x]` Create `src/components/ui/Button.jsx` (primary, secondary, ghost, danger variants, pill shape, weight 400)
- `[x]` Create `src/components/ui/Input.jsx` (label above, error below, focus ring, 15px font)
- `[x]` Create `src/components/ui/Card.jsx` (rounded-lg, hairline border, shadow-card)
- `[x]` Create `src/components/ui/Badge.jsx` (completed, pending, approved, rejected, source tags)
- `[x]` Create `src/components/ui/Table.jsx` (TanStack Table wrapper, tabular figures, getRowClassName support)
- `[x]` Create `src/components/ui/Modal.jsx` (backdrop blur, AnimatePresence, rounded-lg)
- `[x]` Create `src/components/ui/Skeleton.jsx` (shimmer loaders)
- `[x]` Create `src/components/ui/EmptyState.jsx` (icon + heading + CTA)

### Step 4: Layout Components
- `[x]` Create `src/components/layout/DashboardLayout.jsx` (sidebar + topbar + outlet)
- `[x]` Create `src/components/layout/Sidebar.jsx` (collapsible, 240px/64px, nav items)
- `[x]` Create `src/components/layout/TopBar.jsx` (concise page title, theme toggle, system live indicator)
- `[x]` Create `src/components/layout/AuthLayout.jsx` (centered card, atmospheric gradient mesh bg)

### Step 5: Auth Pages
- `[x]` Create `src/pages/LoginPage.jsx` (email + password, POST /api/auth/login)
- `[x]` Create `src/pages/SignupPage.jsx` (email + password + confirm, POST /api/auth/signup)
- `[x]` Create `src/pages/LinkCodePage.jsx` (email + code, POST /api/auth/link-code/confirm)
- `[x]` Create `src/components/AuthGuard.jsx` (route protection, GET /api/auth/me)
- `[x]` Create `src/hooks/useMerchant.js` (TanStack Query hook)

### Phase 1 Verification
- `[x]` `npm run build` passes with zero errors
- `[x]` `npm run lint` passes clean (0 errors, 0 warnings)
- `[x]` Auth flow works: signup -> login -> redirected to dashboard shell -> logout
- `[x]` Sidebar collapse/expand works with smooth Motion animation
- `[x]` Dark mode toggle works in both auth and dashboard views
- `[x]` Responsive: mobile breakpoints & drawer work
- `[x]` All UI components render correctly (Button, Input, Card, Badge, Table, Modal, Skeleton, EmptyState)

---

## Phase 2: Overview Dashboard + Inventory + Orders + Workflows + Approvals (60% - COMPLETED)

### Step 7: Overview Dashboard Page
- `[x]` Create `src/pages/OverviewPage.jsx` (KPI cards + charts + recent orders)
- `[x]` Create `src/hooks/useDashboard.js` (TanStack Query hook, 30s refetchInterval)
- `[x]` KPI stat cards: Today's Sales, Today's Profit, Low Stock, Pending Approvals
- `[x]` Revenue Activity AreaChart (Recharts with indigo gradient fill)
- `[x]` Payment Methods Donut/PieChart (Recharts with method color coding)
- `[x]` Recent Orders compact table (last 5)
- `[x]` Low Stock Alerts sidebar card
- `[x]` Skeleton loading states for all sections

### Step 8: Inventory Page
- `[x]` Create `src/pages/InventoryPage.jsx` (full CRUD table)
- `[x]` Create `src/hooks/useInventory.js` (list, create, update, delete mutations)
- `[x]` Inventory table with TanStack Table (name, quantity, price PKR, unit, actions)
- `[x]` Sortable columns (name, quantity, price)
- `[x]` Low-stock row highlighting (quantity < 10, ruby left-border)
- `[x]` Clean search input
- `[x]` Add Item modal (name, quantity, price, unit fields)
- `[x]` Edit Item modal (pre-filled fields with price ?? 0 fallback, PATCH /api/inventory/:id)
- `[x]` Delete confirmation modal (DELETE /api/inventory/:id, Sonner toast)
- `[x]` EmptyState component for empty inventory

### Step 9: Orders Page
- `[x]` Create `src/pages/OrdersPage.jsx` (orders table + filter tabs + search)
- `[x]` Create `src/hooks/useOrders.js` (list, single, create mutations)
- `[x]` Orders table (ID, items, total PKR, payment method, source badge, status badge, date)
- `[x]` Filter tabs with count badges: All / Completed / Pending Approval / Rejected
- `[x]` Click row to view Order Detail modal
- `[x]` Create Order modal (item selection from inventory, quantity, payment method, dynamic total)
- `[x]` EmptyState component for filtered empty orders

### Step 10: Workflows Page
- `[x]` Create `src/pages/WorkflowsPage.jsx` (workflow cards + CRUD)
- `[x]` Create `src/hooks/useWorkflows.js` (list, create, update, delete)
- `[x]` Workflow table: trigger badge, condition, action label, status toggle, created date
- `[x]` Active/inactive toggle (PATCH /api/workflows/:id with { active })
- `[x]` Create Workflow modal (trigger type, quantity threshold, action type, info banner)
- `[x]` Delete confirmation modal
- `[x]` EmptyState component for empty workflows

### Step 11: Approvals Page
- `[x]` Create `src/pages/ApprovalsPage.jsx` (approvals queue + respond)
- `[x]` Create `src/hooks/useApprovals.js` (list pending, respond mutation with cache invalidation)
- `[x]` Approval table: type badge, summary, status, requested date
- `[x]` Actions: "Approve" (primary CTA) + "Reject" (danger ghost) with individual row loading
- `[x]` PATCH /api/approvals/:id/respond with { decision }
- `[x]` EmptyState component ("No approvals pending. You're all caught up!")

### Phase 2 Verification
- `[x]` Overview dashboard: KPI cards, AreaChart, PieChart, recent orders render correctly
- `[x]` Dashboard auto-refreshes every 30s (`refetchInterval`)
- `[x]` Inventory CRUD: add -> edit -> delete cycle works with Sonner toasts
- `[x]` Orders: create -> view list -> filter tabs -> modal details
- `[x]` Workflows: create -> toggle active -> delete
- `[x]` Approvals: view pending -> approve / reject -> immediate list invalidation
- `[x]` All tables sort and render with tabular figures
- `[x]` All modals open/close with Motion animation
- `[x]` `npm run build` passes
- `[x]` Dark mode verified across all pages and layouts

---

## Tech Stack Reference

| Category | Library | Version | Import Path |
|---|---|---|---|
| Framework | React | 19.x | `react` |
| Build | Vite | 8.x | - |
| CSS | Tailwind CSS | 4.x | `@tailwindcss/vite` |
| Router | React Router | 7.x | `react-router` |
| Server State | TanStack Query | 5.x | `@tanstack/react-query` |
| Tables | TanStack Table | 8.x | `@tanstack/react-table` |
| Client State | Zustand | 5.x | `zustand` |
| Charts | Recharts | 2.x | `recharts` |
| Forms | React Hook Form | 7.x | `react-hook-form` |
| Validation | Zod | 3.x | `zod` |
| Toasts | Sonner | latest | `sonner` |
| Animation | Motion | latest | `motion/react` |
| Font | Geist | latest | `geist` |
| Icons | Tabler Icons | latest | `@tabler/icons-react` |

---

## Design Tokens Reference (from DESIGN.md)

### Colors
| Token | Light | Dark |
|---|---|---|
| primary | `#533afd` | `#665efd` |
| primary-deep | `#4434d4` | `#533afd` |
| primary-press | `#2e2b8c` | `#4434d4` |
| primary-soft | `#665efd` | `#857efd` |
| primary-subdued | `#b9b9f9` | `#2d2b6b` |
| brand-dark | `#1c1e54` | `#070a1e` |
| ink | `#0d253d` | `#f1f5f9` |
| ink-secondary | `#273951` | `#cbd5e1` |
| ink-mute | `#64748d` | `#8193af` |
| canvas | `#ffffff` | `#0b1329` |
| canvas-soft | `#f6f9fc` | `#060b18` |
| hairline | `#e3e8ee` | `#1e293b` |
| hairline-input | `#a8c3de` | `#334155` |
| ruby | `#ea2261` | `#f43f5e` |
| on-primary | `#ffffff` | `#ffffff` |

### Radii
| Token | Value |
|---|---|
| xs | 4px |
| sm | 6px |
| md | 8px |
| lg | 12px |
| xl | 16px |
| pill | 9999px |

### Shadows
| Level | Value |
|---|---|
| card (Level 1) | `0 1px 3px rgba(0,55,112,0.08)` (light) / `0 1px 3px rgba(0,0,0,0.4)` (dark) |
| float (Level 2) | `0 8px 24px rgba(0,55,112,0.08)` (light) / `0 8px 24px rgba(0,0,0,0.5)` (dark) |
