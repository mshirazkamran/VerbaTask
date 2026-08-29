# VerbaTask Frontend - Progress Tracker

This file tracks implementation progress against the full plan. It serves as both a TODO list and a reference for the complete scope.

---

## Overall Progress

| Phase | Status | Pages | Coverage |
|---|---|---|---|
| Phase 1: Setup + Foundation + Auth (3 pages) | `[x] Completed` | Login, Signup, LinkCode | 40% of project (100% of Phase 1) |
| Phase 2: Dashboard + CRUD Pages (5 pages) | `[ ] Not Started` | Overview, Inventory, Orders, Workflows, Approvals | 60% of project |
| **Total** | | **8 pages** | **40% Complete** |

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
- `[x]` Create `src/lib/router.jsx` (React Router v7 config, all routes including Phase 2 placeholders)
- `[x]` Create `src/lib/queryKeys.js` (TanStack Query key factory)
- `[x]` Create `src/lib/format.js` (formatPKR, formatDate, formatQuantity)

### Step 3: Shared UI Components
- `[x]` Create `src/components/ui/Button.jsx` (primary, secondary, ghost, danger variants, pill shape)
- `[x]` Create `src/components/ui/Input.jsx` (label above, error below, focus ring)
- `[x]` Create `src/components/ui/Card.jsx` (rounded-lg, hairline border, shadow-card)
- `[x]` Create `src/components/ui/Badge.jsx` (completed, pending, approved, rejected, source tags)
- `[x]` Create `src/components/ui/Table.jsx` (TanStack Table wrapper, tabular figures)
- `[x]` Create `src/components/ui/Modal.jsx` (backdrop blur, AnimatePresence)
- `[x]` Create `src/components/ui/Skeleton.jsx` (shimmer loaders)
- `[x]` Create `src/components/ui/EmptyState.jsx` (icon + heading + CTA)

### Step 4: Layout Components
- `[x]` Create `src/components/layout/DashboardLayout.jsx` (sidebar + topbar + outlet)
- `[x]` Create `src/components/layout/Sidebar.jsx` (collapsible, 240px/64px, nav items)
- `[x]` Create `src/components/layout/TopBar.jsx` (page title, theme toggle, system live indicator)
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
- `[x]` Dark mode toggle works seamlessly in both auth & dashboard views
- `[x]` Responsive: mobile breakpoints & drawer work
- `[x]` All UI components render correctly (Button, Input, Card, Badge, Table, Modal, Skeleton, EmptyState)

---

## Phase 2: Overview Dashboard + Inventory + Orders + Workflows + Approvals (60% - READY TO START)

### Step 7: Overview Dashboard Page
- `[ ]` Create `src/pages/OverviewPage.jsx` (KPI cards + charts + recent orders)
- `[ ]` Create `src/hooks/useDashboard.js` (TanStack Query hook, 30s refetch)
- `[ ]` KPI stat cards: Today's Sales, Revenue (PKR), Low Stock, Pending Approvals
- `[ ]` Revenue Trend AreaChart (Recharts, indigo gradient, 7/30-day toggle)
- `[ ]` Payment Methods DonutChart (indigo/ruby/magenta/lemon)
- `[ ]` Recent Orders compact table (last 5)
- `[ ]` Skeleton loading states for all sections
- `[ ]` Empty/welcome state for new merchants

### Step 8: Inventory Page
- `[ ]` Create `src/pages/InventoryPage.jsx` (full CRUD table)
- `[ ]` Create `src/hooks/useInventory.js` (list, create, update, delete mutations)
- `[ ]` Inventory table with TanStack Table (name, quantity, price PKR, unit, actions)
- `[ ]` Sortable columns (name, quantity, price)
- `[ ]` Low-stock row highlighting (quantity < 5, ruby left-border)
- `[ ]` Search/filter input
- `[ ]` Add Item modal (name, quantity, price, unit fields, Zod validation)
- `[ ]` Edit Item modal (pre-filled fields, PATCH /api/inventory/:id)
- `[ ]` Delete confirmation modal (DELETE /api/inventory/:id, Sonner toast)
- `[ ]` Optimistic updates via TanStack Query onMutate
- `[ ]` Empty state ("Add your first item")

### Step 9: Orders Page
- `[ ]` Create `src/pages/OrdersPage.jsx` (orders table + filters)
- `[ ]` Create `src/pages/OrderDetailPage.jsx` (single order at /orders/:id)
- `[ ]` Create `src/hooks/useOrders.js` (list, single, create mutations)
- `[ ]` Orders table (ID, items, total PKR, payment method, source badge, status badge, date)
- `[ ]` Filter tabs: All / Completed / Pending / Rejected
- `[ ]` Click row to navigate to order detail
- `[ ]` Create Order modal (item selection from inventory, quantity, payment method, amount)
- `[ ]` Order Detail page: full order card, items list, status, back button
- `[ ]` Sortable by date, total

### Step 10: Workflows Page
- `[ ]` Create `src/pages/WorkflowsPage.jsx` (workflow cards + CRUD)
- `[ ]` Create `src/hooks/useWorkflows.js` (list, create, update, delete)
- `[ ]` Workflow cards in grid (not table): instruction, trigger badge, condition, action, toggle
- `[ ]` Active/inactive toggle (PATCH /api/workflows/:id with { active })
- `[ ]` Create Workflow modal (raw instruction, trigger type, condition, action)
- `[ ]` Delete confirmation
- `[ ]` Empty state

### Step 11: Approvals Page
- `[ ]` Create `src/pages/ApprovalsPage.jsx` (approval cards + respond)
- `[ ]` Create `src/hooks/useApprovals.js` (list, respond mutation)
- `[ ]` Filter tabs: Pending / Approved / Rejected
- `[ ]` Approval cards: type badge, summary, status, created date
- `[ ]` Pending cards: "Approve" (primary) + "Reject" (danger) buttons
- `[ ]` POST /api/approvals/:id/respond with { decision }
- `[ ]` Approved/rejected show respondedAt timestamp
- `[ ]` Empty state

### Phase 2 Verification
- `[ ]` Overview dashboard: KPI cards, charts, recent orders render correctly
- `[ ]` Dashboard auto-refreshes every 30s
- `[ ]` Inventory CRUD: add -> edit -> delete cycle works
- `[ ]` Orders: create -> view list -> click detail -> back
- `[ ]` Workflows: create -> toggle active -> delete
- `[ ]` Approvals: view pending -> approve -> view approved
- `[ ]` All tables sort correctly
- `[ ]` All modals open/close with animation
- `[ ]` All forms validate with Zod
- `[ ]` All mutations show Sonner toasts
- `[ ]` `npm run build` still passes
- `[ ]` Dark mode correct on all new pages

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
