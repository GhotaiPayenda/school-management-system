import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { changePassword, selectAuth } from '../features/auth/authSlice.js';
import { useLogout } from '../features/auth/useLogout.js';
import { messageFor } from '../i18n/messages.js';
import { supportedLanguages } from '../i18n/index.js';
import { useLanguageSwitch, useTheme } from '../providers/AppProviders.jsx';
import { Alert, Button, Field, IconButton, Input } from '../components/ui.jsx';

export default function ChangePasswordPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const logout = useLogout();
  const { t } = useTranslation();
  const { user, error } = useSelector(selectAuth);
  const { theme, toggleTheme } = useTheme();
  const { current, setLanguage } = useLanguageSwitch();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && !user.mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    const result = await dispatch(
      changePassword({ currentPassword, newPassword, newPasswordConfirmation }),
    );

    if (changePassword.fulfilled.match(result)) {
      navigate('/', { replace: true });
    }

    setSubmitting(false);
  }

  return (
    <main className="auth-layout auth-layout-single">
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

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{t('auth.changePassword')}</p>
          <h1 className="auth-title">{t('auth.replaceTemporary')}</h1>
          <p className="muted">{t('auth.replaceTemporaryCopy', { name: user?.name ?? '' })}</p>

          {error ? (
            <Alert tone="danger">{messageFor(error.messageKey, error.message)}</Alert>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <Field
              label={t('auth.currentPassword')}
              error={error?.fields?.currentPassword ? messageFor(error.fields.currentPassword) : null}
            >
              <Input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoFocus
              />
            </Field>

            <Field
              label={t('auth.newPassword')}
              hint={t('auth.passwordSecurityHint')}
              error={error?.fields?.newPassword ? messageFor(error.fields.newPassword) : null}
            >
              <Input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>

            <Field
              label={t('auth.confirmPassword')}
              error={error?.fields?.newPasswordConfirmation ? messageFor(error.fields.newPasswordConfirmation) : null}
            >
              <Input
                type="password"
                name="newPasswordConfirmation"
                autoComplete="new-password"
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                minLength={8}
                required
              />
            </Field>

            <Button type="submit" className="button-block" disabled={submitting}>
              {submitting ? t('common.saving') : t('auth.saveAndContinue')}
            </Button>
            <Button type="button" variant="quiet" className="button-block" onClick={logout}>
              {t('auth.signOutInstead')}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
