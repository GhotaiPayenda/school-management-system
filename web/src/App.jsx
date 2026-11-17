import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { bootstrapSession, selectAuth, sessionExpired } from './features/auth/authSlice.js';
import AcademicPage from './pages/AcademicPage.jsx';
import AdmissionsPage from './pages/AdmissionsPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import ClassesPage from './pages/ClassesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExamsPage from './pages/ExamsPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import PortalFeesPage from './pages/PortalFeesPage.jsx';
import PortalOverviewPage from './pages/PortalOverviewPage.jsx';
import PortalReportsPage from './pages/PortalReportsPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import TimetablePage from './pages/TimetablePage.jsx';

function guarded(permission, element) {
  return <ProtectedRoute permission={permission}>{element}</ProtectedRoute>;
}

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
          <Route index element={<HomeRoute />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="classes" element={guarded('academic.view', <ClassesPage />)} />
          <Route path="academic" element={guarded('academic.manage', <AcademicPage />)} />
          <Route path="timetable" element={guarded('academic.manage', <TimetablePage />)} />
          <Route path="admissions" element={guarded('admissions.manage', <AdmissionsPage />)} />
          <Route path="students" element={guarded('students.view', <StudentsPage />)} />
          <Route path="staff" element={guarded('staff.view', <StaffPage />)} />
          <Route path="attendance" element={guarded('attendance.view', <AttendancePage />)} />
          <Route path="exams" element={guarded('exams.view', <ExamsPage />)} />
          <Route path="results" element={guarded('exams.view', <ResultsPage />)} />
          <Route path="finance" element={guarded('finance.view', <FinancePage />)} />
          <Route path="library" element={guarded('library.view', <LibraryPage />)} />
          <Route path="announcements" element={guarded('announcements.view', <AnnouncementsPage />)} />
          <Route path="audit" element={guarded('audit.view', <AuditPage />)} />
          <Route path="operations" element={guarded('operations.manage', <OperationsPage />)} />
          <Route path="settings" element={guarded('settings.manage', <SettingsPage />)} />
          <Route path="admin/roles" element={guarded('roles.manage', <RolesPage />)} />
          <Route path="portal" element={<PortalRoute><PortalOverviewPage /></PortalRoute>} />
          <Route path="portal/fees" element={<PortalRoute><PortalFeesPage /></PortalRoute>} />
          <Route path="portal/reports" element={<PortalRoute><PortalReportsPage /></PortalRoute>} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function HomeRoute() {
  const { role } = useSelector(selectAuth);
  if (role?.slug === 'student' || role?.slug === 'guardian') return <Navigate to="/portal" replace />;

  return <DashboardPage />;
}

function PortalRoute({ children }) {
  const { role } = useSelector(selectAuth);
  if (role?.slug !== 'student' && role?.slug !== 'guardian') return <ForbiddenPage embedded />;

  return children;
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
