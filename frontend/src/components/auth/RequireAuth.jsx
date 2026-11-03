import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../services/api';

function homeForRole(role) {
  if (role === 'patient') return '/dashboard';
  if (role === 'staff') return '/staff/support';
  if (role === 'admin') return '/admin/dashboard';
  return '/';
}

export default function RequireAuth({ roles, children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((requestError) => {
        if (active && requestError.status !== 401) {
          setError(requestError.message || 'Unable to verify your sign-in.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-on-surface-variant">Checking your secure session...</div>;
  }
  if (!user && !error) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (error) {
    return <div role="alert" className="mx-auto max-w-3xl px-4 py-16 text-center text-red-700">{error}</div>;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}
