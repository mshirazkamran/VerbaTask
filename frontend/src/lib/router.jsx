import { createBrowserRouter, Navigate } from 'react-router';

import { AuthGuard } from '../components/AuthGuard';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { LinkCodePage } from '../pages/LinkCodePage';
import {
  OverviewPlaceholder,
  InventoryPlaceholder,
  OrdersPlaceholder,
  WorkflowsPlaceholder,
  ApprovalsPlaceholder,
} from '../pages/Placeholders';

export const router = createBrowserRouter([
  // Public Auth routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/link-code',
    element: <LinkCodePage />,
  },

  // Protected Dashboard routes
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <OverviewPlaceholder />,
          },
          {
            path: 'inventory',
            element: <InventoryPlaceholder />,
          },
          {
            path: 'orders',
            element: <OrdersPlaceholder />,
          },
          {
            path: 'workflows',
            element: <WorkflowsPlaceholder />,
          },
          {
            path: 'approvals',
            element: <ApprovalsPlaceholder />,
          },
        ],
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
