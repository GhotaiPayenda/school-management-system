import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Printer } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  Select,
  StatCard,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { gradeTranslationKey, useFormat } from '../lib/format.js';
import { usePrintMode } from '../components/print.jsx';

function GradeBadge({ letter }) {
  const { t } = useTranslation();
  return <Badge tone={letter === 'F' ? 'danger' : letter === 'A' ? 'forest' : letter === 'B' ? 'info' : 'brass'}>{letter ? t(gradeTranslationKey(letter), { defaultValue: letter }) : '—'}</Badge>;
}

export default function PortalReportsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const childrenRequest = useApi('/portal/children');
  const children = childrenRequest.data?.items ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    if (!selectedId && children.length > 0) setSelectedId(children[0].id);
  }, [children, selectedId]);

  const activeChild = children.find((child) => Number(child.id) === Number(selectedId)) ?? children[0] ?? null;
  const overview = useApi(`/portal/children/${activeChild?.id}/overview`, { enabled: Boolean(activeChild?.id) });
  const reportCards = usePagedApi('/report-cards', {
    studentId: activeChild?.id,
    status: 'published',
  }, { perPage: 10, enabled: Boolean(activeChild?.id) });

  if (childrenRequest.error) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.reports')} />
        <ErrorState error={childrenRequest.error} onRetry={childrenRequest.reload} />
      </div>
    );
  }

  if (childrenRequest.loading) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.reports')} />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.reports')} copy={t('portal.reportsCopy')} />
        <EmptyState title={t('portal.noChildren')} />
      </div>
    );
  }

  const detail = overview.data;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('portal.eyebrow')}
        title={t('portal.reports')}
        copy={t('portal.reportsCopy')}
        actions={children.length > 1 ? (
          <Select value={activeChild?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.firstName} {child.lastName}</option>
            ))}
          </Select>
        ) : <Badge tone="forest">{activeChild?.firstName} {activeChild?.lastName}</Badge>}
      />

      {overview.error ? <ErrorState error={overview.error} onRetry={overview.reload} /> : null}

      {overview.loading || !detail ? <LoadingBlock rows={6} /> : (
        <>
          <section className="kpi-grid">
            <StatCard label={t('portal.average')} value={detail.average === null ? '—' : format.formatNumber(detail.average, { maximumFractionDigits: 1 })} tone="forest" />
            <StatCard label={t('results.letterGrade')} value={<GradeBadge letter={detail.letterGrade} />} tone="brass" />
            <StatCard label={t('portal.attendance')} value={format.formatPercent(detail.attendanceRate)} tone="ink" />
            <StatCard label={t('portal.reports')} value={format.formatInteger(reportCards.pagination?.total ?? 0)} tone="terracotta" />
          </section>

          <Panel title={t('portal.subjects')} copy={`${activeChild.gradeName} — ${activeChild.sectionName} · ${activeChild.academicYearLabel}`}>
            <div className="table-wrap">
              <table className="data-table result-table">
                <thead>
                  <tr>
                    <th>{t('academic.subjects')}</th>
                    <th>{t('exams.first', { defaultValue: 'First' })}</th>
                    <th>{t('exams.final', { defaultValue: 'Final' })}</th>
                    <th>{t('exams.score', { defaultValue: 'Score' })}</th>
                    <th>{t('results.letterGrade')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.subjects ?? []).map((subject) => (
                    <tr key={subject.subjectId}>
                      <td><strong>{subject.code}</strong> {subject.name}</td>
                      <td>{subject.published ? subject.firstScore : '—'}</td>
                      <td>{subject.published ? subject.finalScore : '—'}</td>
                      <td>{subject.published ? subject.score : '—'}</td>
                      <td><GradeBadge letter={subject.published ? subject.letterGrade : null} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={t('portal.reports')}>
            <DataTable
              loading={reportCards.loading}
              error={reportCards.error}
              onRetry={reportCards.reload}
              rows={reportCards.items}
              columns={[
                { key: 'type', label: t('exams.type', { defaultValue: 'Type' }), render: (row) => (row.type === 'annual' ? t('results.annual') : t('results.semester')) },
                { key: 'academic_year_label', label: t('admissions.academicYear') },
                { key: 'semester_name', label: t('academic.semesters'), render: (row) => row.semester_name || '—' },
                { key: 'version', label: t('results.version'), render: (row) => `v${row.version}` },
                { key: 'published_at', label: t('results.publishedAt', { date: '' }), render: (row) => format.formatDate(row.published_at) },
                {
                  key: 'actions',
                  label: '',
                  align: 'end',
                  render: (row) => <Button variant="quiet" size="sm" onClick={() => setViewingId(row.id)}><FileText size={14} /> {t('results.viewReport')}</Button>,
                },
              ]}
              empty={<EmptyState title={t('portal.noReportCards')} copy={t('portal.reportsCopy')} />}
            />
            <Pagination
              page={reportCards.pagination.page}
              pages={reportCards.pagination.pages}
              total={reportCards.pagination.total}
              perPage={reportCards.pagination.perPage}
              onPageChange={reportCards.setPage}
            />
          </Panel>
        </>
      )}

      <PortalReportModal reportId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}

function PortalReportModal({ reportId, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi(`/report-cards/${reportId}`, { enabled: Boolean(reportId) });
  usePrintMode(Boolean(reportId));
  const snapshot = data?.snapshot;

  return (
    <Modal open={Boolean(reportId)} onOpenChange={(value) => !value && onClose()} title={t('portal.reportCard')} size="lg">
      {loading || !snapshot ? <LoadingBlock rows={8} /> : (
        <>
          <div className="report-sheet print-area">
            <header className="report-head">
              <div>
                <p className="eyebrow">{snapshot.school?.name}</p>
                <h2>{snapshot.academicYear?.label} · {snapshot.type === 'annual' ? t('results.annual') : t('results.semester')}</h2>
                <p className="muted">{snapshot.school?.address}</p>
              </div>
              <div className="report-student">
                <strong>{snapshot.student?.firstName} {snapshot.student?.lastName}</strong>
                <span>{snapshot.student?.admissionNumber}</span>
                <span>{snapshot.enrollment?.grade_name} — {snapshot.enrollment?.section_name}</span>
              </div>
            </header>
            <div className="result-summary">
              <div><span className="muted">{t('portal.average')}</span><strong>{snapshot.average === null ? '—' : format.formatNumber(snapshot.average, { maximumFractionDigits: 1 })}</strong></div>
              <div><span className="muted">{t('results.letterGrade')}</span><GradeBadge letter={snapshot.letterGrade} /></div>
              <div><span className="muted">{t('results.attendanceRate')}</span><strong>{format.formatPercent(snapshot.attendance?.rate ?? 0)}</strong></div>
              <div><span className="muted">{t('results.rank', { rank: snapshot.rank, size: snapshot.sectionSize })}</span><strong>{snapshot.outcome || '—'}</strong></div>
            </div>
            <table className="result-table">
              <thead>
                <tr>
                  <th>{t('academic.subjects')}</th>
                  <th>{t('exams.first', { defaultValue: 'First' })}</th>
                  <th>{t('exams.final', { defaultValue: 'Final' })}</th>
                  <th>{t('exams.score', { defaultValue: 'Score' })}</th>
                  <th>{t('results.letterGrade')}</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot.results?.subjects ?? []).map((subject) => (
                  <tr key={subject.subjectId}>
                    <td><strong>{subject.code}</strong> {subject.name}</td>
                    <td>{subject.firstExam?.score ?? '—'} / 40</td>
                    <td>{subject.finalExam?.score ?? '—'} / 60</td>
                    <td>{subject.score ?? '—'}</td>
                    <td><GradeBadge letter={subject.letterGrade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {snapshot.remark ? <p className="report-remark">{snapshot.remark}</p> : null}
            <footer className="report-foot">
              <div><span className="muted">{snapshot.school?.principalTitle || 'Principal'}</span><strong>{snapshot.school?.principalName || '—'}</strong></div>
              <div><span className="muted">{t('results.publishedAt', { date: '' })}</span><strong>{data.published_at ? format.formatDateTime(data.published_at) : '—'}</strong></div>
            </footer>
          </div>
          <div className="detail-footer no-print">
            <Button variant="quiet" size="sm" onClick={() => window.print()}><Printer size={15} /> {t('results.printReport')}</Button>
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
