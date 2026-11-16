import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Search } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  KeyValue,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  Select,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { useFormat } from '../lib/format.js';
import { downloadFile } from '../lib/download.js';

function pretty(value) {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = useMemo(
    () => ({
      search: search || undefined,
      module: module || undefined,
      action: action || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [search, module, action, from, to],
  );
  const { items, pagination, setPage, loading, error, reload, data } = usePagedApi('/audit', params, { perPage: 50 });
  const modules = data?.modules ?? [];
  const [detailId, setDetailId] = useState(null);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('audit.eyebrow')}
        title={t('audit.title')}
        copy={t('audit.copy')}
        actions={
          <Button variant="quiet" size="sm" onClick={() => downloadFile('/audit/export', { filename: 'audit-entries.csv' })}>
            <FileDown size={15} /> {t('common.export')}
          </Button>
        }
      />
      <Panel title={t('audit.title')}>
        <FilterBar>
          <SearchField value={search} onChange={setSearch} placeholder={t('audit.searchPlaceholder', { defaultValue: 'Search action, reason, or actor' })} />
          <Select value={module} onChange={(event) => setModule(event.target.value)}>
            <option value="">{t('audit.module')}: {t('common.all')}</option>
            {modules.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
          <input className="input" value={action} onChange={(event) => setAction(event.target.value)} placeholder={t('audit.action')} aria-label={t('audit.action')} />
          <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={t('common.from')} />
          <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={t('common.to')} />
        </FilterBar>
        {error ? <p className="field-error">{error.message}</p> : null}
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={items}
          onRowClick={(row) => setDetailId(row.id)}
          columns={[
            { key: 'created_at', label: t('audit.time'), render: (row) => <strong>{format.formatDateTime(row.created_at)}</strong> },
            { key: 'actor_name', label: t('audit.actor'), render: (row) => row.actor_name || '—' },
            { key: 'module', label: t('audit.module'), render: (row) => <Badge tone="info">{row.module}</Badge> },
            { key: 'action', label: t('audit.action'), render: (row) => <span className="mono">{row.action}</span> },
            { key: 'entity_type', label: t('audit.entity'), render: (row) => (row.entity_id ? `${row.entity_type} #${row.entity_id}` : row.entity_type || '—') },
            { key: 'reason', label: t('audit.reason'), render: (row) => <span className="truncate-cell">{row.reason || '—'}</span> },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row) => (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailId(row.id);
                  }}
                >
                  {t('common.view')}
                </Button>
              ),
            },
          ]}
          empty={<EmptyState title={t('audit.noEntries')} copy={t('audit.searchPlaceholder', { defaultValue: 'Try a different module, action, or date range.' })} />}
        />
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />
      </Panel>
      <AuditDetailModal entryId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function AuditDetailModal({ entryId, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi(`/audit/${entryId}`, { enabled: Boolean(entryId) });

  return (
    <Modal
      open={Boolean(entryId)}
      onOpenChange={(value) => !value && onClose()}
      title={t('audit.detail')}
      description={data ? `${data.action} · ${format.formatDateTime(data.created_at)}` : ''}
      size="lg"
    >
      {loading || !data ? (
        <LoadingBlock rows={6} />
      ) : (
        <div className="detail-stack">
          <KeyValue
            columns={2}
            items={[
              { label: t('audit.actor'), value: data.actor_name || '—' },
              { label: t('audit.time'), value: format.formatDateTime(data.created_at) },
              { label: t('audit.module'), value: <Badge tone="info">{data.module}</Badge> },
              { label: t('audit.action'), value: <span className="mono">{data.action}</span> },
              { label: t('audit.entity'), value: data.entity_id ? `${data.entity_type} #${data.entity_id}` : data.entity_type || '—' },
              { label: t('audit.ip'), value: data.ip || '—' },
              { label: t('audit.reason'), value: data.reason || '—' },
              { label: t('audit.userAgent'), value: data.user_agent || '—' },
            ]}
          />
          <h3 className="section-title">{t('audit.changedFields')}</h3>
          <div className="audit-diff-grid">
            <div>
              <p className="eyebrow">{t('audit.before')}</p>
              {data.before ? <pre className="code-block">{pretty(data.before)}</pre> : <p className="muted">{t('audit.noChanges')}</p>}
            </div>
            <div>
              <p className="eyebrow">{t('audit.after')}</p>
              {data.after ? <pre className="code-block">{pretty(data.after)}</pre> : <p className="muted">{t('audit.noChanges')}</p>}
            </div>
          </div>
          <div className="detail-footer">
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
