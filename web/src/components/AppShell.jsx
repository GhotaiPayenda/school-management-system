import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useLogout } from '../features/auth/useLogout.js';
import { selectAuth } from '../features/auth/authSlice.js';

const navigation = [
  { to: '/', label: 'Dashboard', permission: 'dashboard.view', end: true },
  { to: '/admin/roles', label: 'Roles', permission: 'roles.manage' },
];

export default function AppShell() {
  const { user, role, permissions } = useSelector(selectAuth);
  const logout = useLogout();
  const items = navigation.filter((item) => permissions.includes(item.permission));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <div>
            <p className="brand-name">Meridian</p>
            <p className="brand-subtitle">Academy</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-note">Foundation build</p>
          <p className="sidebar-note-muted">Academic modules arrive ticket by ticket.</p>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">School workspace</p>
            <p className="topbar-role">{role?.name || 'Signed in'}</p>
          </div>
          <div className="topbar-user">
            <div className="user-copy">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button type="button" className="button button-quiet" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="page" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
