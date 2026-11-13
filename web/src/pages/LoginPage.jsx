import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { login, selectAuth } from '../features/auth/authSlice.js';
import { messageFor } from '../i18n/messages.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { status, initialized, user, error } = useSelector(selectAuth);
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
      <section className="auth-brand" aria-label="Meridian Academy">
        <div>
          <span className="brand-mark brand-mark-large" aria-hidden="true">M</span>
          <p className="auth-eyebrow">Meridian Academy</p>
          <h1 className="auth-display">A calmer way to run a school.</h1>
          <p className="auth-lead">
            One workspace for academic records, attendance, results, finance, and the library —
            built for the way Meridian actually teaches.
          </p>
        </div>
        <p className="auth-footnote">Self-hosted · English · Dari · Pashto</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Welcome back</p>
          <h2 className="auth-title">Sign in</h2>
          <p className="muted">Use the account created for you by the school office.</p>

          {error ? (
            <div className="alert alert-danger" role="alert">
              {messageFor(error.messageKey, error.message)}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
              {error?.fields?.email ? (
                <span className="field-error">{messageFor(error.fields.email)}</span>
              ) : null}
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error?.fields?.password ? (
                <span className="field-error">{messageFor(error.fields.password)}</span>
              ) : null}
            </label>

            <button type="submit" className="button button-primary button-block" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-hint">
            First run? The seeded Super Admin credentials are in the repository README. You will be
            asked to replace the temporary password immediately.
          </p>
        </div>
      </section>
    </main>
  );
}
