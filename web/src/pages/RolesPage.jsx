import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, KeyRound, Search, ShieldCheck } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  Panel,
  SearchField,
  StatCard,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';

export default function RolesPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useApi('/roles');
  const roles = data?.roles ?? [];
  const [selectedSlug, setSelectedSlug] = useState('');
  const [search, setSearch] = useState('');

  const allPermissions = useMemo(() => {
    const set = new Set();
    for (const role of roles) {
      for (const permission of role.permissions ?? []) set.add(permission);
    }
    return [...set].sort();
  }, [roles]);

  const selected = roles.find((role) => role.slug === selectedSlug) ?? roles[0] ?? null;
  const filteredPermissions = allPermissions.filter((permission) => permission.toLowerCase().includes(search.toLowerCase()));
  const totalAssignments = roles.reduce((sum, role) => sum + (role.permissions?.length ?? 0), 0);

  if (error) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('roles.eyebrow')} title={t('roles.title')} copy={t('roles.copy')} />
        <Alert tone="danger">{error.message}</Alert>
        <Button variant="quiet" onClick={reload}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('roles.eyebrow')} title={t('roles.title')} copy={t('roles.copy')} />
      {loading ? <LoadingBlock rows={6} /> : (
        <>
          <section className="kpi-grid">
            <StatCard label={t('roles.role')} value={roles.length} tone="forest" icon={ShieldCheck} />
            <StatCard label={t('roles.permissions')} value={allPermissions.length} tone="brass" icon={KeyRound} />
            <StatCard label={t('roles.seeded')} value={totalAssignments} hint={t('roles.copy')} tone="ink" />
          </section>

          <div className="settings-layout">
            <Panel title={t('roles.role')} className="role-list-panel">
              <div className="record-list">
                {roles.map((role) => (
                  <button
                    type="button"
                    key={role.slug}
                    className={`role-list-item ${selected?.slug === role.slug ? 'is-active' : ''}`}
                    onClick={() => setSelectedSlug(role.slug)}
                  >
                    <span>
                      <strong>{role.name}</strong>
                      <span className="muted person-sub">{role.slug}</span>
                    </span>
                    <Badge tone={selected?.slug === role.slug ? 'forest' : 'neutral'}>{role.permissions?.length ?? 0}</Badge>
                  </button>
                ))}
              </div>
            </Panel>

            <div className="page-stack">
              {selected ? (
                <Panel title={selected.name} copy={selected.description || t('roles.noPermissions')} actions={<Badge tone="info">{selected.slug}</Badge>}>
                  <div className="permission-chips">
                    {(selected.permissions ?? []).length === 0 ? (
                      <p className="muted">{t('roles.noPermissions')}</p>
                    ) : (
                      selected.permissions.map((permission) => (
                        <span className="permission-chip" key={permission}>
                          <Check size={13} /> {permission}
                        </span>
                      ))
                    )}
                  </div>
                </Panel>
              ) : <EmptyState title={t('roles.role')} />}

              <Panel
                title={t('roles.permissions')}
                actions={<SearchField value={search} onChange={setSearch} placeholder={t('roles.searchPlaceholder', { defaultValue: 'Filter permissions' })} />}
              >
                {filteredPermissions.length === 0 ? <p className="muted">{t('roles.noPermissions')}</p> : (
                  <div className="table-wrap permission-matrix">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('roles.permissions')}</th>
                          {roles.map((role) => (
                            <th key={role.slug} className="cell-center" title={role.name}>{role.slug}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPermissions.map((permission) => (
                          <tr key={permission}>
                            <th scope="row" className="mono">{permission}</th>
                            {roles.map((role) => (
                              <td key={`${role.slug}-${permission}`} className="cell-center">
                                {(role.permissions ?? []).includes(permission) ? (
                                  <span className="matrix-check" aria-label={t('roles.permissions')}><Check size={14} /></span>
                                ) : <span className="muted">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
