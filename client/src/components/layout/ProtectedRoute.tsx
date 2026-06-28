import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { firebaseConfigured } from '../../lib/firebase';

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // If Firebase isn't configured, allow access in demo mode so users
  // exploring the codebase can still see the dashboard with seed data.
  if (!firebaseConfigured) return <Outlet />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
