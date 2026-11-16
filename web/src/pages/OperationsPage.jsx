import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseBackup, Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { api } from '../api/client.js';
import { useToast } from '../providers/AppProviders.jsx';
import {
  Alert,
  Badge,
  Button,
  ConfirmModal,
  DataTable,
  EmptyState,
  KeyValue,
  LoadingBlock,
  PageHeader,
  Panel,
  StatCard,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';
import { downloadFile, readFileAsDataUrl } from '../lib/download.js';

export default function OperationsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const info = useApi('/operations/info');
  const backups = useApi('/operations/backups');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const fileRef = useRef(null);

  const rows = backups.data?.items ?? [];

  async function createBackup() {
    setCreating(true);
    try {
      await api.post('/operations/backups');
      info.reload();
      backups.reload();
      notify('operations.backupCreated');
    } finally {
      setCreating(false);
    }
  }

  async function deleteBackup() {
    await api.delete(`/operations/backups/${deleting.id}`);
    setDeleting(null);
    info.reload();
    backups.reload();
    notify('operations.backupDeleted');
  }

  async function chooseRestoreFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      notify('operations.fileTooLarge', 'danger');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setRestoring({ kind: 'upload', filename: file.name, dataUrl });
  }

  async function restore() {
    const body = restoring.kind === 'stored' ? { backupId: restoring.backup.id } : { dataUrl: restoring.dataUrl };
    await api.post('/operations/restore', body, { timeout: 120000 });
    setRestoring(null);
    notify('operations.restored', 'success');
    info.reload();
    backups.reload();
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('operations.eyebrow')}
        title={t('operations.title')}
        copy={t('operations.copy')}
        actions={
          <div className="inline-actions">
            <Button variant="quiet" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> {t('operations.restoreFromFile')}
            </Button>
            <Button size="sm" onClick={createBackup} disabled={creating}>
              <Plus size={15} /> {creating ? t('common.saving') : t('operations.createBackup')}
            </Button>
          </div>
        }
      />
      <input ref={fileRef} type="file" accept=".sqlite,.db,application/vnd.sqlite3,application/x-sqlite3,application/octet-stream" hidden onChange={chooseRestoreFile} />

      {info.error ? <Alert tone="danger">{info.error.message}</Alert> : null}
      {info.loading || !info.data ? (
        <LoadingBlock rows={4} />
      ) : (
        <section className="kpi-grid">
          <StatCard label={t('operations.databaseSize')} value={format.formatBytes(info.data.databaseSize)} hint={info.data.databasePath} tone="forest" icon={DatabaseBackup} />
          <StatCard label={t('operations.migrations')} value={format.formatInteger(info.data.migrations)} hint={info.data.journalMode} tone="ink" />
          <StatCard label={t('operations.phpVersion')} value={info.data.phpVersion} tone="brass" />
          <StatCard label={t('operations.sqliteVersion')} value={info.data.sqliteVersion} tone="terracotta" />
        </section>
      )}

      <div className="dashboard-grid">
        <Panel title={t('operations.systemInfo')}>
          {info.data ? (
            <KeyValue
              columns={1}
              items={[
                { label: t('operations.database'), value: info.data.databasePath },
                { label: t('operations.databaseSize'), value: format.formatBytes(info.data.databaseSize) },
                { label: t('operations.migrations'), value: format.formatInteger(info.data.migrations) },
                { label: t('operations.journalMode'), value: info.data.journalMode },
                { label: t('operations.lastBackup'), value: info.data.lastBackup ? `${info.data.lastBackup.filename} · ${format.formatDateTime(info.data.lastBackup.created_at)}` : '—' },
                { label: t('operations.phpVersion'), value: info.data.phpVersion },
                { label: t('operations.sqliteVersion'), value: info.data.sqliteVersion },
              ]}
            />
          ) : (
            <LoadingBlock rows={4} />
          )}
        </Panel>

        <Panel title={t('operations.restore')} copy={t('operations.restoreWarning')}>
          <div className="detail-stack">
            <p className="muted">{t('operations.restoreFromStored')}</p>
            <div className="inline-actions">
              <Button variant="quiet" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> {t('operations.chooseFile')}
              </Button>
            </div>
            <p className="muted">{t('operations.restoreFromFile')}</p>
          </div>
        </Panel>
      </div>

      <Panel title={t('operations.backups')}>
        {backups.error ? <Alert tone="danger">{backups.error.message}</Alert> : null}
        <DataTable
          loading={backups.loading}
          error={backups.error}
          onRetry={backups.reload}
          rows={rows}
          columns={[
            { key: 'filename', label: t('operations.backupFilename'), render: (row) => <strong className="mono">{row.filename}</strong> },
            { key: 'size', label: t('operations.backupSize'), render: (row) => format.formatBytes(row.size) },
            { key: 'created_by_name', label: t('operations.createdBy'), render: (row) => row.created_by_name || '—' },
            { key: 'created_at', label: t('operations.createdAt'), render: (row) => format.formatDateTime(row.created_at) },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row) => (
                <div className="inline-actions">
                  <Button variant="quiet" size="sm" onClick={() => downloadFile(`/operations/backups/${row.id}/download`, { filename: row.filename })}>
                    <Download size={14} /> {t('operations.downloadBackup')}
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setRestoring({ kind: 'stored', backup: row })}>
                    <RotateCcw size={14} /> {t('operations.restore')}
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setDeleting(row)}>
                    <Trash2 size={14} /> {t('operations.deleteBackup')}
                  </Button>
                </div>
              ),
            },
          ]}
          empty={<EmptyState title={t('operations.noBackups')} copy={t('operations.copy')} />}
        />
      </Panel>

      <ConfirmModal
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={t('operations.confirmDeleteBackup')}
        body={deleting?.filename}
        onConfirm={deleteBackup}
      />

      <ConfirmModal
        open={Boolean(restoring)}
        onOpenChange={(value) => !value && setRestoring(null)}
        title={t('operations.restoreConfirm')}
        body={restoring?.kind === 'stored' ? restoring.backup?.filename : restoring?.filename}
        confirmLabel={t('operations.restore')}
        onConfirm={restore}
      />
    </div>
  );
}
