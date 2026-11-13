import { useEffect, useState } from 'react';
import { api, toErrorPayload } from '../api/client.js';
import { messageFor } from '../i18n/messages.js';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get('/roles')
      .then((response) => {
        if (active) setRoles(response.data.data.roles);
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
          <p className="eyebrow">Access control</p>
          <h1 className="page-title">Roles and permissions</h1>
          <p className="muted">
            A read-only view for the walking skeleton. Editing Roles arrives with the access
            management ticket.
          </p>
        </div>
        <span className="role-pill">{roles.length || '—'} roles</span>
      </header>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {messageFor(error.messageKey, error.message)}
        </div>
      ) : null}

      <section className="panel">
        {loading ? (
          <div aria-busy="true">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-short" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Purpose</th>
                <th scope="col">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.slug}>
                  <th scope="row">
                    <span className="role-name">{role.name}</span>
                    <span className="role-slug">{role.slug}</span>
                  </th>
                  <td>{role.description}</td>
                  <td>
                    <span className="count-badge">{role.permissions.length}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
