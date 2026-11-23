
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function ProtectedRoute({ allowedRoles, redirectTo = '/profile' }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main className="container page-shell"><p role="status">Checking your session…</p></main>;
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  const userRole = String(currentUser.role ?? '').toLowerCase();

  if (
    allowedRoles &&
    !allowedRoles.some(
      (role) => String(role).toLowerCase() === userRole
    )
  ) {
    const fallback =
      userRole === 'admin'
        ? '/admin'
        : userRole === 'artist'
          ? '/artist/dashboard'
          : redirectTo;

    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
