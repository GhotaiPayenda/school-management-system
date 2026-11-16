import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Archive, Megaphone, Plus, Send } from 'lucide-react';
import { api } from '../api/client.js';
import { selectHasPermission } from '../features/auth/authSlice.js';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FilterBar,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const canManage = useSelector(selectHasPermission('announcements.manage'));
  const [status, setStatus] = useState(canManage ? '' : 'published');
  const { data, loading, error, reload } = useApi('/announcements', { params: { status: status || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = useMemo(
    () => [
      { name: 'title', label: t('announcements.titleField'), required: true, span: 'full' },
      { name: 'body', label: t('announcements.body'), type: 'textarea', required: true, span: 'full' },
      { name: 'targetType', label: t('announcements.audience'), type: 'select', span: 'half', options: [
        { value: 'all', label: t('announcements.targetAll') },
        { value: 'role', label: t('announcements.targetRole') },
        { value: 'grade', label: t('announcements.targetGrade') },
        { value: 'section', label: t('announcements.targetSection') },
      ], defaultValue: 'all' },
      { name: 'targetValue', label: t('announcements.targetValue'), hint: t('announcements.targetValueHint'), span: 'half' },
      ...(canManage
        ? [{ name: 'status', label: t('people.status'), type: 'select', span: 'half', options: [
          { value: 'draft', label: t('status.draft') },
          { value: 'published', label: t('status.published') },
          { value: 'archived', label: t('status.archived') },
        ], defaultValue: 'draft' }]
        : []),
    ],
    [canManage, t],
  );

  async function submit(payload) {
    const body = {
      ...payload,
      targetValue: payload.targetType === 'all' ? null : payload.targetValue,
    };
    if (editing) await api.put(`/announcements/${editing.id}`, body);
    else await api.post('/announcements', body);
    setOpen(false);
    reload();
    notify('announcements.saved');
  }

  async function publish(row) {
    await api.post(`/announcements/${row.id}/publish`);
    reload();
    notify('announcements.publishedToast');
  }

  async function archive(row) {
    await api.post(`/announcements/${row.id}/archive`);
    reload();
  }

  async function markRead(row) {
    await api.post(`/announcements/${row.id}/read`);
    reload();
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('announcements.eyebrow')}
        title={t('announcements.title')}
        copy={t('announcements.copy')}
        actions={canManage ? <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('announcements.new')}</Button> : null}
      />
      <Panel title={t('announcements.title')}>
        <FilterBar>
          {canManage ? (
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="draft">{t('status.draft')}</option>
              <option value="published">{t('status.published')}</option>
              <option value="archived">{t('status.archived')}</option>
            </Select>
          ) : null}
        </FilterBar>
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        {loading ? <LoadingBlock rows={5} /> : rows.length === 0 ? <EmptyState title={t('dashboard.noAnnouncements')} /> : (
          <div className="announcement-feed">
            {rows.map((row) => (
              <article className={`announcement-card ${row.read_at ? '' : 'is-unread'}`} key={row.id}>
                <div className="announcement-card-head">
                  <div>
                    <h2>{row.title}</h2>
                    <p className="muted">
                      {format.formatDateTime(row.published_at || row.created_at)} · {row.created_by_name || '—'}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <Badge status={row.status} />
                    {row.target_type !== 'all' ? <Badge tone="info">{row.target_type}: {row.target_value}</Badge> : null}
                  </div>
                </div>
                <p className="announcement-body">{row.body}</p>
                <div className="announcement-card-foot">
                  {!row.read_at && row.status === 'published' ? <Button variant="quiet" size="sm" onClick={() => markRead(row)}>{t('announcements.read')}</Button> : null}
                  {canManage ? (
                    <>
                      {row.status !== 'published' ? <Button variant="quiet" size="sm" onClick={() => publish(row)}><Send size={14} /> {t('status.published')}</Button> : null}
                      {row.status !== 'archived' ? <Button variant="quiet" size="sm" onClick={() => archive(row)}><Archive size={14} /> {t('status.archived')}</Button> : null}
                      <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('announcements.new')}
        fields={fields}
        initialValues={editing ? { ...editing, targetType: editing.target_type, targetValue: editing.target_value, status: editing.status } : { targetType: 'all', status: 'draft' }}
        onSubmit={submit}
      />
    </div>
  );
}
