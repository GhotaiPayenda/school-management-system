import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectAuth } from '../features/auth/authSlice.js';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';

export default function ProtectedRoute({ permission, children }) {
  const { status, initialized, user, permissions } = useSelector(selectAuth);
  const location = useLocation();

  if (!initialized || status === 'loading' || status === 'idle') {
    return <LoadingScreen />;
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (permission && !permissions.includes(permission)) {
    return <ForbiddenPage embedded />;
  }

  return children;
}

function LoadingScreen() {
  return (
    <main className="center-screen" aria-busy="true" aria-live="polite">
      <div className="loading-card">
        <span className="brand-mark" aria-hidden="true">M</span>
        <p>Opening your workspace…</p>
        <span className="skeleton-line" />
        <span className="skeleton-line skeleton-line-short" />
      </div>
    </main>
  );
}
