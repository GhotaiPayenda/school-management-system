import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Printer, Send, Sparkles } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  EmptyState,
  FilterBar,
  KeyValue,
  LoadingBlock,
  Modal,
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
import { gradeTranslationKey, useFormat } from '../lib/format.js';
import { usePrintMode } from '../components/print.jsx';

export default function ResultsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('section');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('results.eyebrow')} title={t('results.title')} copy={t('results.copy')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="section">{t('results.sectionResults')}</TabsTrigger>
          <TabsTrigger value="cards">{t('results.reportCards')}</TabsTrigger>
          <TabsTrigger value="supplementary">{t('results.supplementary')}</TabsTrigger>
        </TabsList>
        <TabsContent value="section"><SectionResultsTab /></TabsContent>
        <TabsContent value="cards"><ReportCardsTab /></TabsContent>
        <TabsContent value="supplementary"><SupplementaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function GradeBadge({ letter }) {
  const { t } = useTranslation();
  if (!letter) return <span>—</span>;
  return <Badge tone={letter === 'Fail' ? 'danger' : letter === 'A' ? 'forest' : letter === 'B' ? 'info' : 'brass'}>{t(gradeTranslationKey(letter), { defaultValue: letter })}</Badge>;
}

function SectionResultsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { sections, years, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const [section, setSection] = useState(sections[0]?.id ?? '');
  const { data, loading, error, reload } = useApi(`/sections/${section}/results`, {
    params: { academicYearId: year || undefined },
    enabled: Boolean(section),
  });
  const [studentId, setStudentId] = useState(null);
  const rows = data?.items ?? [];
  const averages = rows.map((row) => row.average).filter((value) => value !== null && value !== undefined);
  const classAverage = averages.length ? averages.reduce((sum, value) => sum + Number(value), 0) / averages.length : null;
  const passing = rows.filter((row) => row.failedSubjects === 0).length;

  return (
    <div className="page-stack">
      <section className="kpi-grid">
        <StatCard label={t('results.students', { defaultValue: 'Students' })} value={format.formatInteger(rows.length)} tone="ink" />
        <StatCard label={t('results.average')} value={classAverage === null ? '—' : format.formatNumber(classAverage, { maximumFractionDigits: 1 })} tone="forest" />
        <StatCard label={t('results.passed')} value={format.formatInteger(passing)} tone="forest" />
        <StatCard label={t('results.retention')} value={format.formatInteger(rows.length - passing)} tone="terracotta" />
      </section>
      <Panel
        title={t('results.sectionResults')}
        actions={
          <div className="inline-actions">
            <Select value={year} onChange={(event) => setYear(event.target.value)}>
              {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
            <Select value={section} onChange={(event) => setSection(Number(event.target.value))}>
              {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
            </Select>
          </div>
        }
      >
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          onRowClick={(row) => setStudentId(row.student.id)}
          columns={[
            { key: 'rank', label: '#', width: 54, render: (row, index) => format.formatInteger(index + 1) },
            { key: 'student', label: t('results.student'), render: (row) => <strong>{row.student.first_name} {row.student.last_name}</strong> },
            { key: 'average', label: t('results.average'), render: (row) => row.average === null ? '—' : format.formatNumber(row.average, { maximumFractionDigits: 1 }) },
            { key: 'letter', label: t('results.letterGrade'), render: (row) => <GradeBadge letter={row.letterGrade} /> },
            { key: 'failed', label: t('results.retentionSubjects'), render: (row) => format.formatInteger(row.failedSubjects) },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row) => <Button variant="quiet" size="sm" onClick={(event) => { event.stopPropagation(); setStudentId(row.student.id); }}>{t('common.view')}</Button>,
            },
          ]}
          empty={<EmptyState title={t('results.noResults')} />}
        />
      </Panel>
      <StudentResultsModal studentId={studentId} year={year} onClose={() => setStudentId(null)} />
    </div>
  );
}

function StudentResultsModal({ studentId, year, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi(`/students/${studentId}/results`, { params: { academicYearId: year }, enabled: Boolean(studentId) });
  const annual = data?.annual;
  return (
    <Modal open={Boolean(studentId)} onOpenChange={(value) => !value && onClose()} title={t('results.studentResults')} description={data?.student ? `${data.student.first_name} ${data.student.last_name}` : ''} size="lg">
      {loading || !data ? <LoadingBlock rows={6} /> : (
        <div className="detail-stack">
          <div className="result-summary">
            <div>
              <span className="muted">{t('results.average')}</span>
              <strong>{annual?.average === null || annual?.average === undefined ? '—' : format.formatNumber(annual.average, { maximumFractionDigits: 1 })}</strong>
            </div>
            <div>
              <span className="muted">{t('results.letterGrade')}</span>
              <GradeBadge letter={annual?.letterGrade} />
            </div>
            <div>
              <span className="muted">{t('results.retention')}</span>
              <strong>{format.formatInteger(annual?.retentionSubjects?.length ?? 0)}</strong>
            </div>
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
              {(annual?.subjects ?? []).map((subject) => (
                <tr key={subject.subjectId}>
                  <td><strong>{subject.code}</strong> {subject.name}</td>
                  <td>{subject.firstExam?.score ?? '—'} / {subject.firstExam?.maxScore ?? 40}</td>
                  <td>{subject.finalExam?.score ?? '—'} / {subject.finalExam?.maxScore ?? 60}</td>
                  <td>{subject.score ?? '—'}</td>
                  <td><GradeBadge letter={subject.letterGrade} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function ReportCardsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { sections, years, students, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const params = useMemo(
    () => ({ academicYearId: year || undefined, sectionId: section || undefined, status: status || undefined, type: type || undefined }),
    [year, section, status, type],
  );
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/report-cards', params);
  const { data: yearData } = useApi(`/academic-years/${year}`, { enabled: Boolean(year) });
  const semesters = yearData?.semesters ?? [];
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [selected, setSelected] = useState(new Set());

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function generate(payload) {
    const body = {
      academicYearId: Number(payload.academicYearId),
      type: payload.type,
      semesterId: payload.type === 'semester' ? Number(payload.semesterId) : undefined,
      sectionId: payload.sectionId ? Number(payload.sectionId) : undefined,
      studentId: payload.studentId ? Number(payload.studentId) : undefined,
      remark: payload.remark || undefined,
    };
    await api.post('/report-cards/generate', body);
    setGenerateOpen(false);
    setSelected(new Set());
    reload();
    notify('results.generated', 'success');
  }

  async function publish() {
    await api.post('/report-cards/publish', { ids: [...selected] });
    setSelected(new Set());
    reload();
    notify('results.publishedToast', 'success', { count: selected.size });
  }

  return (
    <Panel
      title={t('results.reportCards')}
      copy={t('results.snapshotImmutable')}
      actions={
        <div className="inline-actions">
          <Button size="sm" onClick={() => setGenerateOpen(true)}><Sparkles size={15} /> {t('results.generate')}</Button>
          <Button variant="quiet" size="sm" disabled={selected.size === 0} onClick={publish}><Send size={15} /> {t('results.publish')}</Button>
        </div>
      }
    >
      <FilterBar>
        <Select value={year} onChange={(event) => setYear(event.target.value)}>
          {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Select value={section} onChange={(event) => setSection(event.target.value)}>
          <option value="">{t('people.section')}: {t('common.all')}</option>
          {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.all')}</option>
          <option value="draft">{t('status.draft')}</option>
          <option value="published">{t('status.published')}</option>
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">{t('common.all')}</option>
          <option value="annual">{t('results.annual')}</option>
          <option value="semester">{t('results.semester')}</option>
        </Select>
      </FilterBar>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={items}
        columns={[
          {
            key: 'select',
            label: '',
            width: 44,
            render: (row) => row.status === 'draft' ? <Checkbox checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={t('common.select')} /> : null,
          },
          { key: 'student', label: t('results.student'), render: (row) => <strong>{row.first_name} {row.last_name}</strong> },
          { key: 'type', label: t('exams.type', { defaultValue: 'Type' }), render: (row) => (row.type === 'annual' ? t('results.annual') : t('results.semester')) },
          { key: 'semester_name', label: t('academic.semesters'), render: (row) => row.semester_name || '—' },
          { key: 'version', label: t('results.version', { defaultValue: 'Version' }), render: (row) => `v${row.version}` },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
          { key: 'published_at', label: t('results.publishedAt', { date: '' }), render: (row) => row.published_at ? format.formatDate(row.published_at) : '—' },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => setViewingId(row.id)}><FileText size={14} /> {t('results.viewReport')}</Button>,
          },
        ]}
        empty={<EmptyState title={t('results.noReportCards')} copy={t('results.generateHint')} action={<Button onClick={() => setGenerateOpen(true)}>{t('results.generate')}</Button>} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />

      <EntityFormModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title={t('results.generate')}
        description={t('results.generateHint')}
        fields={[
          { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
          { name: 'type', label: t('exams.type', { defaultValue: 'Type' }), type: 'select', required: true, span: 'half', options: [
            { value: 'annual', label: t('results.annual') },
            { value: 'semester', label: t('results.semester') },
          ] },
          { name: 'semesterId', label: t('academic.semesters'), type: 'select', span: 'half', options: semesters.map((semester) => ({ value: semester.id, label: semester.name })) },
          { name: 'sectionId', label: t('people.section'), type: 'select', span: 'half', options: sections.map((item) => ({ value: item.id, label: `${item.grade_name ?? `Grade ${item.grade_number}`} — ${item.name}` })) },
          { name: 'studentId', label: t('results.student'), type: 'select', span: 'half', options: students },
          { name: 'remark', label: t('results.remarks'), type: 'textarea', span: 'full' },
        ]}
        initialValues={{ academicYearId: currentYear?.id, type: 'annual', sectionId: section || undefined }}
        onSubmit={generate}
      />

      <ReportCardModal reportId={viewingId} onClose={() => setViewingId(null)} />
    </Panel>
  );
}

function ReportCardModal({ reportId, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi(`/report-cards/${reportId}`, { enabled: Boolean(reportId) });
  usePrintMode(Boolean(reportId));
  const snapshot = data?.snapshot;

  return (
    <Modal open={Boolean(reportId)} onOpenChange={(value) => !value && onClose()} title={t('results.viewReport')} size="lg">
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
              <div><span className="muted">{t('results.average')}</span><strong>{snapshot.average === null ? '—' : format.formatNumber(snapshot.average, { maximumFractionDigits: 1 })}</strong></div>
              <div><span className="muted">{t('results.letterGrade')}</span><GradeBadge letter={snapshot.letterGrade} /></div>
              <div><span className="muted">{t('results.rank', { rank: snapshot.rank, size: snapshot.sectionSize })}</span><strong>{snapshot.outcome || '—'}</strong></div>
              <div><span className="muted">{t('results.attendanceRate')}</span><strong>{format.formatPercent(snapshot.attendance?.rate ?? 0)}</strong></div>
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
              <div><span className="muted">{t('results.publishedAt', { date: '' })}</span><strong>{data.published_at ? format.formatDateTime(data.published_at) : t('status.draft')}</strong></div>
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

function SupplementaryTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { years, subjects, studentOptions, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data, loading, error, reload } = useApi('/supplementary-exams', { params: { academicYearId: year || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);

  const fields = [
    { name: 'studentId', label: t('results.student'), type: 'select', required: true, span: 'half', options: studentOptions },
    { name: 'subjectId', label: t('academic.subjects'), type: 'select', required: true, span: 'half', options: subjects.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` })) },
    { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
    { name: 'score', label: t('results.supplementaryScore'), type: 'number', required: true, span: 'half', min: 0, max: 100 },
  ];

  async function save(payload) {
    await api.post('/supplementary-exams', payload);
    setOpen(false);
    reload();
    notify('results.supplementarySaved', 'success');
  }

  return (
    <Panel
      title={t('results.supplementary')}
      copy={t('results.cappedHint')}
      actions={<div className="inline-actions"><Select value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select><Button size="sm" onClick={() => setOpen(true)}><Sparkles size={15} /> {t('results.addSupplementary')}</Button></div>}
    >
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'student', label: t('results.student'), render: (row) => <strong>{row.first_name} {row.last_name}</strong> },
          { key: 'subject', label: t('academic.subjects'), render: (row) => `${row.subject_code} — ${row.subject_name}` },
          { key: 'score', label: t('results.rawScore'), render: (row) => format.formatInteger(row.score) },
          { key: 'capped_score', label: t('results.cappedScore'), render: (row) => format.formatInteger(row.capped_score) },
          { key: 'passed', label: t('results.outcome'), render: (row) => <Badge tone={Number(row.passed) ? 'forest' : 'danger'}>{Number(row.passed) ? t('results.passed') : t('results.retention')}</Badge> },
          { key: 'created_at', label: t('common.created'), render: (row) => format.formatDate(row.created_at) },
        ]}
        empty={<EmptyState title={t('common.noResults')} copy={t('results.cappedHint')} />}
      />
      <EntityFormModal open={open} onOpenChange={setOpen} title={t('results.addSupplementary')} fields={fields} initialValues={{ academicYearId: currentYear?.id }} onSubmit={save} />
    </Panel>
  );
}
