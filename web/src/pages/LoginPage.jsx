import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { login, selectAuth } from '../features/auth/authSlice.js';
import { messageFor } from '../i18n/messages.js';
import { supportedLanguages } from '../i18n/index.js';
import { useLanguageSwitch, useSchool, useTheme } from '../providers/AppProviders.jsx';
import { Alert, Button, Field, IconButton, Input } from '../components/ui.jsx';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { status, initialized, user, error } = useSelector(selectAuth);
  const { school } = useSchool();
  const { theme, toggleTheme } = useTheme();
  const { current, setLanguage } = useLanguageSwitch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (initialized && status === 'authenticated' && user) {
    return <Navigate to={user.mustChangePassword ? '/change-password' : '/'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    await dispatch(login({ email, password }));
    setSubmitting(false);
  }

  return (
    <main className="auth-layout">
      <div className="auth-controls">
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
      </div>

      <section className="auth-brand" aria-label={school?.name || 'Meridian Academy'}>
        <div>
          <span className="brand-mark brand-mark-large" aria-hidden="true">M</span>
          <p className="auth-eyebrow">{school?.name || t('app.name')}</p>
          <h1 className="auth-display">{t('auth.brandTitle')}</h1>
          <p className="auth-lead">{t('auth.brandLead')}</p>
        </div>
        <p className="auth-footnote">{t('auth.brandFootnote')}</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{t('auth.welcomeBack')}</p>
          <h2 className="auth-title">{t('auth.signIn')}</h2>
          <p className="muted">{t('auth.signInCopy')}</p>

          {error ? (
            <Alert tone="danger">{messageFor(error.messageKey, error.message)}</Alert>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <Field label={t('auth.email')} error={error?.fields?.email ? messageFor(error.fields.email) : null}>
              <Input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </Field>

            <Field label={t('auth.password')} error={error?.fields?.password ? messageFor(error.fields.password) : null}>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            <Button type="submit" className="button-block" disabled={submitting}>
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          <p className="auth-hint">{t('auth.firstRunHint')}</p>
        </div>
      </section>
    </main>
  );
}
