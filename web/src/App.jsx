import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { bootstrapSession, sessionExpired } from './features/auth/authSlice.js';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RolesPage from './pages/RolesPage.jsx';

export default function App() {
  return (
    <>
      <SessionWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="admin/roles"
            element={
              <ProtectedRoute permission="roles.manage">
                <RolesPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function SessionWatcher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  useEffect(() => {
    const onExpired = () => {
      dispatch(sessionExpired());
      navigate('/login', { replace: true });
    };
    const onChangeRequired = () => navigate('/change-password', { replace: true });

    window.addEventListener('meridian:session-expired', onExpired);
    window.addEventListener('meridian:password-change-required', onChangeRequired);

    return () => {
      window.removeEventListener('meridian:session-expired', onExpired);
      window.removeEventListener('meridian:password-change-required', onChangeRequired);
    };
  }, [dispatch, navigate]);

  return null;
}
