import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { changePassword, selectAuth } from '../features/auth/authSlice.js';
import { useLogout } from '../features/auth/useLogout.js';
import { messageFor } from '../i18n/messages.js';

export default function ChangePasswordPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const logout = useLogout();
  const { user, error } = useSelector(selectAuth);
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
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">First sign-in</p>
          <h1 className="auth-title">Replace your temporary password</h1>
          <p className="muted">
            {user?.name}, your account still uses the temporary password issued by the school.
            Choose a private password with at least 8 characters before continuing.
          </p>

          {error ? (
            <div className="alert alert-danger" role="alert">
              {messageFor(error.messageKey, error.message)}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field-label">Current temporary password</span>
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoFocus
              />
              {error?.fields?.currentPassword ? (
                <span className="field-error">{messageFor(error.fields.currentPassword)}</span>
              ) : null}
            </label>

            <label className="field">
              <span className="field-label">New password</span>
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
              {error?.fields?.newPassword ? (
                <span className="field-error">{messageFor(error.fields.newPassword)}</span>
              ) : null}
            </label>

            <label className="field">
              <span className="field-label">Confirm new password</span>
              <input
                type="password"
                name="newPasswordConfirmation"
                autoComplete="new-password"
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                minLength={8}
                required
              />
              {error?.fields?.newPasswordConfirmation ? (
                <span className="field-error">
                  {messageFor(error.fields.newPasswordConfirmation)}
                </span>
              ) : null}
            </label>

            <button type="submit" className="button button-primary button-block" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save password and continue'}
            </button>
            <button type="button" className="button button-quiet button-block" onClick={logout}>
              Sign out instead
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
