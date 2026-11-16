import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { changeLanguage, languageMeta, storedLanguage } from '../i18n/index.js';

const ThemeContext = createContext(null);
const SchoolContext = createContext(null);
const ToastContext = createContext(null);

function initialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('meridian.theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppProviders({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  const [school, setSchool] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#111a15' : '#1f4d3a');
  }, [theme]);

  useEffect(() => {
    let active = true;
    api
      .get('/settings/summary')
      .then((response) => {
        if (!active) return;
        const summary = response.data.data;
        setSchool(summary);
        if (!window.localStorage.getItem('meridian.theme') && (summary.default_theme === 'light' || summary.default_theme === 'dark')) {
          setThemeState(summary.default_theme);
        }
        if (!window.localStorage.getItem('meridian.language')) {
          const language = summary.default_language;
          if (language === 'en' || language === 'fa-AF' || language === 'ps-AF') {
            changeLanguage(language);
          }
        }
      })
      .catch(() => {
        // The public summary is optional; the shell still renders with defaults.
      });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    window.localStorage.setItem('meridian.theme', next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('meridian.theme', next);
      return next;
    });
  }, []);

  const notify = useCallback((keyOrText, tone = 'success', values = {}) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, keyOrText, tone, values }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const themeValue = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  const schoolValue = useMemo(() => ({ school, setSchool }), [school]);
  const toastValue = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <SchoolContext.Provider value={schoolValue}>
        <ToastContext.Provider value={toastValue}>
          {children}
          <ToastStack toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
      </SchoolContext.Provider>
    </ThemeContext.Provider>
  );
}

function ToastStack({ toasts, dismiss }) {
  const { t } = useTranslation();
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const text = t(toast.keyOrText, toast.values);
        return (
          <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
            <span className="toast-dot" aria-hidden="true" />
            <span>{text}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label={t('common.close')}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside AppProviders');
  return value;
}

export function useSchool() {
  const value = useContext(SchoolContext);
  if (!value) throw new Error('useSchool must be used inside AppProviders');
  return value;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside AppProviders');
  return value;
}

export function useLanguageSwitch() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || storedLanguage();
  const meta = languageMeta(current);
  const setLanguage = useCallback((code) => changeLanguage(code), []);
  return { current: meta.code, dir: meta.dir, meta, setLanguage };
}