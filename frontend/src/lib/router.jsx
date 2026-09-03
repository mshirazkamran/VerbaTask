import { createBrowserRouter, Navigate } from 'react-router';

import { AuthGuard } from '../components/AuthGuard';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LandingPage } from '../pages/LandingPage';
import { FAQPage } from '../pages/FAQPage';
import { ContactPage } from '../pages/ContactPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { LinkCodePage } from '../pages/LinkCodePage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { OverviewPage } from '../pages/OverviewPage';
import { InventoryPage } from '../pages/InventoryPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { WorkflowsPage } from '../pages/WorkflowsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const router = createBrowserRouter([
  // Public landing pages
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/faq',
    element: <FAQPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },

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
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Protected Dashboard routes
  {
    path: '/dashboard',
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
          {
            path: 'settings',
            element: <SettingsPage />,
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
