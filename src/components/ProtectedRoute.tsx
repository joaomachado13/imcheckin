import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';

export function ProtectedRoute() {
  const { user, loading, approvalStatus } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Logo size="lg" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect based on approval status
  if (approvalStatus === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (approvalStatus === 'rejected') {
    return <Navigate to="/rejected" replace />;
  }

  return <Outlet />;
}
