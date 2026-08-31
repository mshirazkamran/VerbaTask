# VerbaTask Frontend

React dashboard for VerbaTask merchants. The WhatsApp bot is the main product surface; this dashboard gives merchants a visual way to review sales, stock, approvals, and simple automation rules.

## What the dashboard does

- Sign up, log in, and link a WhatsApp number with a 6-digit code.
- View today's sales, recent orders, low-stock items, pending approvals, and active workflows.
- Add, edit, and delete inventory items.
- Review orders created from WhatsApp guided flows, voice notes, typed messages, or the dashboard.
- Approve or reject high-value orders.
- Create stock-threshold workflows that trigger WhatsApp alerts.

## Tech stack

- Vite 8
- React 19
- React Router 7
- Tailwind CSS 4
- TanStack Query 5
- TanStack Table 8
- Zustand
- React Hook Form + Zod
- Recharts
- Sonner
- Motion
- Geist font
- Tabler Icons

## Local setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the backend URL. For local development, that is usually:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Scripts

```bash
npm run dev      # Start the Vite dev server
npm run build    # Build production assets
npm run lint     # Run ESLint
npm run preview  # Preview the production build locally
```

## Project layout

```text
src/
  components/      Shared layout and UI components
  hooks/           TanStack Query hooks for API resources
  lib/             API client, router, stores, format helpers
  pages/           Route-level dashboard and auth screens
  app.css          Tailwind import, Geist fonts, theme tokens, global styles
  main.jsx         React entrypoint
vite.config.js     Vite, React Compiler, Tailwind, and PWA plugin config
```

## PWA behavior

The app is installable on supported browsers. `index.html` keeps iOS web-app metadata. `vite.config.js` uses `vite-plugin-pwa` to inject the manifest link, generate `site.webmanifest`, register an auto-updating service worker, precache the app shell, and serve `index.html` for offline navigations. API requests are excluded from navigation fallback so live backend data is not cached as app shell content.

## API contract

The dashboard expects the backend to return a consistent envelope:

```json
{ "success": true, "data": {} }
```

For errors:

```json
{ "success": false, "error": { "message": "Human-readable error" } }
```

The source of truth for endpoint shapes is `frontend/api-spec.md`.
