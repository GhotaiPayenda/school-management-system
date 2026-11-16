import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, LockKeyhole, Save, UnlockKeyhole } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  Select,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { currentMonthIso, todayIso, useFormat } from '../lib/format.js';
import { downloadFile } from '../lib/download.js';

const statuses = ['present', 'absent', 'late', 'excused'];

export default function AttendancePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('sheet');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('attendance.eyebrow')} title={t('attendance.title')} copy={t('attendance.copy')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sheet">{t('attendance.sheet')}</TabsTrigger>
          <TabsTrigger value="history">{t('attendance.history')}</TabsTrigger>
          <TabsTrigger value="locks">{t('attendance.locks')}</TabsTrigger>
        </TabsList>
        <TabsContent value="sheet"><SheetTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
        <TabsContent value="locks"><LocksTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SheetTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { sections, currentYear } = useReference();
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [date, setDate] = useState(todayIso());
  const [periodId, setPeriodId] = useState('');
  const selected = sectionId || sections[0]?.id;
  const { data, loading, error, reload } = useApi('/attendance/sheet', {
    params: { sectionId: selected || undefined, date, periodId: periodId || undefined },
    enabled: Boolean(selected),
  });
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.students) return;
    const next = {};
    for (const student of data.students) {
      next[student.id] = {
        status: student.attendance?.status || 'present',
        reason: student.attendance?.reason || '',
      };
    }
    setMarks(next);
  }, [data]);

  function setStatus(studentId, status) {
    setMarks((current) => ({ ...current, [studentId]: { ...current[studentId], status } }));
  }

  function setReason(studentId, reason) {
    setMarks((current) => ({ ...current, [studentId]: { ...current[studentId], reason } }));
  }

  function markAll(status) {
    setMarks((current) => {
      const next = {};
      for (const student of data?.students ?? []) next[student.id] = { ...current[student.id], status };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const records = (data?.students ?? []).map((student) => ({
        studentId: student.id,
        status: marks[student.id]?.status || 'present',
        reason: marks[student.id]?.reason || undefined,
      }));
      await api.post('/attendance/bulk', {
        sectionId: Number(selected),
        date,
        periodId: periodId ? Number(periodId) : undefined,
        records,
      });
      notify('attendance.saved', 'success', { count: records.length });
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title={t('attendance.sheet')}
      actions={
        <div className="inline-actions">
          <Select value={selected ?? ''} onChange={(event) => setSectionId(Number(event.target.value))}>
            <option value="">{t('attendance.selectSection')}</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.grade_name ?? `Grade ${section.grade_number}`} — {section.name}
              </option>
            ))}
          </Select>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          {data?.perPeriodAttendance ? (
            <Select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              <option value="">{t('attendance.fullDay')}</option>
              {(data.periods ?? []).filter((period) => period.kind === 'period').map((period) => (
                <option key={period.id} value={period.id}>{period.label || `${period.start_time}–${period.end_time}`}</option>
              ))}
            </Select>
          ) : null}
          <Button variant="quiet" size="sm" onClick={() => markAll('present')}>{t('attendance.markAllPresent')}</Button>
          <Button size="sm" disabled={saving || !data?.students?.length} onClick={save}>
            <Save size={15} /> {saving ? t('common.saving') : t('attendance.save')}
          </Button>
        </div>
      }
    >
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      {loading ? <LoadingBlock rows={8} /> : null}
      {!loading && selected && data?.students?.length === 0 ? <EmptyState title={t('attendance.noStudents')} /> : null}
      {!loading && selected && data?.students?.length > 0 ? (
        <div className="attendance-list">
          {data.students.map((student) => {
            const mark = marks[student.id] ?? { status: 'present', reason: '' };
            return (
              <div className="attendance-row" key={student.id}>
                <div className="record-main">
                  <strong>{student.first_name} {student.last_name}</strong>
                  <span className="muted">{student.admission_number}</span>
                </div>
                <div className="attendance-choice" role="group" aria-label={t('attendance.sheet')}>
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`attendance-option attendance-${status} ${mark.status === status ? 'is-active' : ''}`}
                      onClick={() => setStatus(student.id, status)}
                    >
                      {t(`attendance.${status}`)}
                    </button>
                  ))}
                </div>
                {['absent', 'late', 'excused'].includes(mark.status) ? (
                  <input
                    className="input attendance-reason"
                    placeholder={t('attendance.reason')}
                    value={mark.reason}
                    onChange={(event) => setReason(student.id, event.target.value)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );
}

function HistoryTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { sections, years, currentYear } = useReference();
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = useMemo(
    () => ({ sectionId: section || undefined, status: status || undefined, from: from || undefined, to: to || undefined }),
    [section, status, from, to],
  );
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/attendance', params);
  const { data: summary } = useApi('/attendance/summary', {
    params: { sectionId: section || undefined, from: from || undefined, to: to || undefined },
    enabled: Boolean(section),
  });

  return (
    <div className="page-stack">
      {summary ? (
        <section className="kpi-grid">
          <StatCard label={t('attendance.rate')} value={format.formatPercent(summary.attendanceRate ?? 0)} hint={`${format.formatInteger(summary.total)} ${t('attendance.records', { count: summary.total })}`} tone="forest" />
          <StatCard label={t('attendance.present')} value={format.formatInteger(summary.counts?.present ?? 0)} tone="forest" />
          <StatCard label={t('attendance.absent')} value={format.formatInteger(summary.counts?.absent ?? 0)} tone="terracotta" />
          <StatCard label={t('attendance.late')} value={format.formatInteger(summary.counts?.late ?? 0)} tone="brass" />
        </section>
      ) : null}
      <Panel
        title={t('attendance.history')}
        copy={t('attendance.historyCopy')}
        actions={
          <Button variant="quiet" size="sm" onClick={() => downloadFile('/attendance/export', { params, filename: 'attendance.csv' })}>
            <FileDown size={15} /> {t('common.export')}
          </Button>
        }
      >
        <FilterBar>
          <Select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="">{t('people.section')}: {t('common.all')}</option>
            {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {statuses.map((value) => <option key={value} value={value}>{t(`attendance.${value}`)}</option>)}
          </Select>
          <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={t('common.from')} />
          <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={t('common.to')} />
        </FilterBar>
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={items}
          columns={[
            { key: 'date', label: t('attendance.date'), render: (row) => <strong>{format.formatDate(row.date)}</strong> },
            { key: 'student', label: t('people.student'), render: (row) => `${row.first_name} ${row.last_name}` },
            { key: 'section', label: t('people.section'), render: (row) => `${row.grade_number ? `Grade ${row.grade_number}` : ''} ${row.section_name}` },
            { key: 'period', label: t('attendance.period'), render: (row) => row.period_label || t('attendance.fullDay') },
            { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
            { key: 'reason', label: t('attendance.reason') },
          ]}
          empty={<EmptyState title={t('common.noResults')} copy={t('attendance.historyCopy')} />}
        />
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />
      </Panel>
    </div>
  );
}

function LocksTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data, loading, error, reload } = useApi('/attendance/locks', { params: { academicYearId: year || undefined } });
  const [lockOpen, setLockOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(null);
  const rows = data?.items ?? [];

  async function createLock(payload) {
    await api.post('/attendance/locks', payload);
    setLockOpen(false);
    reload();
  }

  async function unlock(payload) {
    await api.post(`/attendance/locks/${unlocking.id}/unlock`, payload);
    setUnlocking(null);
    reload();
  }

  return (
    <Panel
      title={t('attendance.locks')}
      copy={t('attendance.lockHint')}
      actions={
        <div className="inline-actions">
          <Select value={year} onChange={(event) => setYear(event.target.value)}>
            {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
          <Button size="sm" onClick={() => setLockOpen(true)}><LockKeyhole size={15} /> {t('attendance.lockMonth')}</Button>
        </div>
      }
    >
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'month', label: t('attendance.month'), render: (row) => <strong>{format.formatMonth(row.month)}</strong> },
          { key: 'locked_by_name', label: t('attendance.lock'), render: (row) => row.locked_by_name || '—' },
          { key: 'locked_at', label: t('common.created'), render: (row) => format.formatDateTime(row.locked_at) },
          { key: 'reopened_at', label: t('attendance.unlock'), render: (row) => row.reopened_at ? format.formatDateTime(row.reopened_at) : '—' },
          { key: 'reason', label: t('attendance.reason') },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => (
              <Button variant="quiet" size="sm" onClick={() => setUnlocking(row)}>
                <UnlockKeyhole size={14} /> {t('attendance.unlock')}
              </Button>
            ),
          },
        ]}
        empty={<EmptyState title={t('common.noResults')} copy={t('attendance.lockHint')} />}
      />
      <EntityFormModal
        open={lockOpen}
        onOpenChange={setLockOpen}
        title={t('attendance.lockMonth')}
        fields={[
          { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, options: years.map((item) => ({ value: item.id, label: item.label })) },
          { name: 'month', label: t('attendance.month'), type: 'month', required: true },
          { name: 'reason', label: t('attendance.reason'), type: 'textarea' },
        ]}
        initialValues={{ academicYearId: currentYear?.id, month: currentMonthIso() }}
        onSubmit={createLock}
      />
      <EntityFormModal
        open={Boolean(unlocking)}
        onOpenChange={(value) => !value && setUnlocking(null)}
        title={t('attendance.unlock')}
        description={unlocking ? format.formatMonth(unlocking.month) : ''}
        fields={[{ name: 'reason', label: t('attendance.reason'), type: 'textarea', required: true }]}
        initialValues={{}}
        onSubmit={unlock}
      />
    </Panel>
  );
}
