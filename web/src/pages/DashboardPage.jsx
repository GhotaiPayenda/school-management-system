import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { api, toErrorPayload } from '../api/client.js';
import { selectUser } from '../features/auth/authSlice.js';
import { messageFor } from '../i18n/messages.js';

export default function DashboardPage() {
  const user = useSelector(selectUser);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get('/dashboard')
      .then((response) => {
        if (active) setDashboard(response.data.data);
      })
      .catch((caught) => {
        if (active) setError(toErrorPayload(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-title">
            {dashboard?.greeting || `Welcome back, ${user?.name || 'there'}.`}
          </h1>
          <p className="muted">
            This is the foundation shell. Each later ticket fills one of these spaces.
          </p>
        </div>
        <span className="role-pill">{dashboard?.role?.name || 'Signed in'}</span>
      </header>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {messageFor(error.messageKey, error.message)}
        </div>
      ) : null}

      <section className="kpi-grid" aria-label="School overview">
        {loading
          ? [0, 1, 2, 3].map((key) => (
              <article className="kpi-card" key={key} aria-busy="true">
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-line skeleton-line-number" />
                <span className="skeleton-line" />
              </article>
            ))
          : (dashboard?.cards || []).map((card) => (
              <article className="kpi-card" key={card.key}>
                <p className="kpi-label">{card.label}</p>
                <p className="kpi-value">{card.value ?? '—'}</p>
                <p className="kpi-hint">{card.hint}</p>
              </article>
            ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Next steps</p>
            <h2 className="panel-title">The walking skeleton is alive</h2>
          </div>
        </div>
        <p className="muted panel-copy">
          Authentication, forced password change, session cookies, CSRF protection, permissions,
          and this role-aware shell are in place. The design-system ticket will replace these
          placeholder surfaces with the full Meridian visual language.
        </p>
      </section>
    </div>
  );
}
