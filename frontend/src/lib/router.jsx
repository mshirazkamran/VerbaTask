import { createBrowserRouter, Navigate } from 'react-router';

import { AuthGuard } from '../components/AuthGuard';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { LinkCodePage } from '../pages/LinkCodePage';
import { OverviewPage } from '../pages/OverviewPage';
import { InventoryPage } from '../pages/InventoryPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { WorkflowsPage } from '../pages/WorkflowsPage';

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
            element: <OverviewPage />,
          },
          {
            path: 'inventory',
            element: <InventoryPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'workflows',
            element: <WorkflowsPage />,
          },
          {
            path: 'approvals',
            element: <ApprovalsPage />,
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
