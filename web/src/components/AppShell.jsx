import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Cog,
  DatabaseBackup,
  FileBarChart,
  GraduationCap,
  Home,
  Landmark,
  Library,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  School,
  ScrollText,
  ShieldCheck,
  Sun,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { useLogout } from '../features/auth/useLogout.js';
import { selectAuth } from '../features/auth/authSlice.js';
import { api } from '../api/client.js';
import { useLanguageSwitch, useSchool, useTheme } from '../providers/AppProviders.jsx';
import { ReferenceProvider } from '../providers/ReferenceProvider.jsx';
import { supportedLanguages } from '../i18n/index.js';
import { Avatar, IconButton } from './ui.jsx';

const navGroups = [
  {
    key: 'nav.school',
    items: [
      { to: '/', labelKey: 'nav.dashboard', permission: 'dashboard.view', icon: Home, end: true },
      { to: '/classes', labelKey: 'nav.classes', permission: 'academic.view', icon: School },
    ],
  },
  {
    key: 'nav.academics',
    items: [
      { to: '/academic', labelKey: 'nav.academic', permission: 'academic.manage', icon: GraduationCap },
      { to: '/timetable', labelKey: 'nav.timetable', permission: 'academic.manage', icon: CalendarDays },
      { to: '/admissions', labelKey: 'nav.admissions', permission: 'admissions.manage', icon: ClipboardList },
    ],
  },
  {
    key: 'nav.people',
    items: [
      { to: '/students', labelKey: 'nav.students', permission: 'students.view', icon: Users },
      { to: '/staff', labelKey: 'nav.staff', permission: 'staff.view', icon: UserCog },
    ],
  },
  {
    key: 'nav.academics',
    items: [
      { to: '/attendance', labelKey: 'nav.attendance', permission: 'attendance.view', icon: ClipboardCheck },
      { to: '/exams', labelKey: 'nav.exams', permission: 'exams.view', icon: ScrollText },
      { to: '/results', labelKey: 'nav.results', permission: 'exams.view', icon: FileBarChart },
    ],
  },
  {
    key: 'nav.financeAndLibrary',
    items: [
      { to: '/finance', labelKey: 'nav.finance', permission: 'finance.view', icon: Wallet },
      { to: '/library', labelKey: 'nav.library', permission: 'library.view', icon: Library },
    ],
  },
  {
    key: 'nav.administration',
    items: [
      { to: '/announcements', labelKey: 'nav.announcements', permission: 'announcements.view', icon: Megaphone },
      { to: '/audit', labelKey: 'nav.audit', permission: 'audit.view', icon: ShieldCheck },
      { to: '/operations', labelKey: 'nav.operations', permission: 'operations.manage', icon: DatabaseBackup },
      { to: '/settings', labelKey: 'nav.settings', permission: 'settings.manage', icon: Cog },
      { to: '/admin/roles', labelKey: 'nav.roles', permission: 'roles.manage', icon: BadgeDollarSign },
    ],
  },
];

const portalGroups = [
  {
    key: 'nav.account',
    items: [
      { to: '/portal', labelKey: 'nav.portal', permission: null, icon: Home, end: true },
      { to: '/portal/fees', labelKey: 'nav.portalFees', permission: null, icon: Wallet },
      { to: '/portal/reports', labelKey: 'nav.portalReports', permission: null, icon: FileBarChart },
    ],
  },
  {
    key: 'nav.school',
    items: [
      { to: '/announcements', labelKey: 'nav.announcements', permission: 'announcements.view', icon: Megaphone },
      { to: '/dashboard', labelKey: 'nav.dashboard', permission: 'dashboard.view', icon: Landmark },
    ],
  },
];

export default function AppShell() {
  const { user, role, permissions } = useSelector(selectAuth);
  const { t } = useTranslation();
  const logout = useLogout();
  const location = useLocation();
  const { school } = useSchool();
  const { theme, toggleTheme } = useTheme();
  const { current, setLanguage } = useLanguageSwitch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);
  const isPortalRole = role?.slug === 'student' || role?.slug === 'guardian';
  const groups = isPortalRole ? portalGroups : navGroups;

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!permissions.includes('announcements.view')) return undefined;
    let active = true;
    api
      .get('/announcements/unread-count')
      .then((response) => {
        if (active) setUnread(Number(response.data.data?.count ?? 0));
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => {
      active = false;
    };
  }, [permissions, location.pathname]);

  useEffect(() => {
    function onClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, permissions],
  );

  const activeLabel = visibleGroups
    .flatMap((group) => group.items)
    .filter((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]?.labelKey;

  return (
    <div className="app-shell">
      {mobileOpen ? <button type="button" className="sidebar-overlay" aria-label={t('common.close')} onClick={() => setMobileOpen(false)} /> : null}
      <aside className={mobileOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <div>
            <p className="brand-name">{school?.name || t('app.shortName')}</p>
            <p className="brand-subtitle">{t('app.workspace')}</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label={t('nav.main')}>
          {visibleGroups.map((group) => (
            <div key={`${group.key}-${group.items[0]?.to}`}>
              <p className="sidebar-section">{t(group.key)}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
                  >
                    <Icon size={16} className="nav-icon" aria-hidden="true" />
                    <span>{t(item.labelKey)}</span>
                    {item.to === '/announcements' && unread > 0 ? <span className="nav-badge">{unread}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-note">{school?.name || t('app.name')}</p>
          <p className="sidebar-note-muted">{t('app.footer')}</p>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton label={t('nav.menu')} className="mobile-menu-button" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </IconButton>
            <div className="topbar-context">
              <p className="topbar-eyebrow">{t('app.workspace')}</p>
              <p className="topbar-role">{activeLabel ? t(activeLabel) : role?.name || t('app.name')}</p>
            </div>
          </div>

          <div className="topbar-controls">
            <select
              className="control-select"
              aria-label={t('nav.language')}
              value={current}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {supportedLanguages.map((language) => (
                <option key={language.code} value={language.code}>
                  {t(language.labelKey)}
                </option>
              ))}
            </select>
            <IconButton label={theme === 'dark' ? t('nav.light') : t('nav.dark')} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </IconButton>
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <Avatar name={user?.name} />
                <span className="user-menu-copy">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-email">{role?.name}</span>
                </span>
              </button>
              {userMenuOpen ? (
                <div className="user-menu-panel" role="menu">
                  <div className="user-menu-header">
                    <p className="user-name">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                  {permissions.includes('settings.manage') ? (
                    <NavLink className="user-menu-item" to="/settings" role="menuitem">
                      <Cog size={15} />
                      {t('nav.settings')}
                    </NavLink>
                  ) : null}
                  <button type="button" className="user-menu-item" role="menuitem" onClick={logout}>
                    <LogOut size={15} />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="page" id="main-content">
          <ReferenceProvider>
            <Outlet />
          </ReferenceProvider>
        </main>
      </div>
    </div>
  );
}