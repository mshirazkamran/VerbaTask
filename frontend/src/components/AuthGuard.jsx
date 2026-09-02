import { Navigate, useLocation, Outlet } from 'react-router';
import { useAuthStore } from '../lib/store';
import { useMerchant } from '../hooks/useMerchant';
import { Skeleton } from './ui/Skeleton';

export function AuthGuard({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const { isLoading } = useMerchant();


  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-canvas-soft p-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 bg-canvas p-8 rounded-xl border border-hairline shadow-card">
          <Skeleton variant="circle" className="w-12 h-12" />
          <Skeleton variant="title" className="w-48" />
          <Skeleton variant="text" count={2} />
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
