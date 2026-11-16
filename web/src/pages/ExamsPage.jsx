import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Printer, Save, Send, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ConfirmModal,
  DataTable,
  EmptyState,
  FilterBar,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { useFormat } from '../lib/format.js';
import { PrintFooter, PrintHeader } from '../components/print.jsx';

export default function ExamsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('exams');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('nav.exams')} title={t('exams.title', { defaultValue: 'Examinations' })} copy={t('exams.copy', { defaultValue: 'Create the first and final exam for each subject, schedule sittings, and publish scores.' })} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="exams">{t('exams.exams', { defaultValue: 'Exams' })}</TabsTrigger>
          <TabsTrigger value="schedules">{t('exams.schedules', { defaultValue: 'Schedules' })}</TabsTrigger>
          <TabsTrigger value="scores">{t('exams.scores', { defaultValue: 'Score entry' })}</TabsTrigger>
        </TabsList>
        <TabsContent value="exams"><ExamsTab /></TabsContent>
        <TabsContent value="schedules"><SchedulesTab /></TabsContent>
        <TabsContent value="scores"><ScoresTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useSemesterOptions(yearId) {
  const { data } = useApi(`/academic-years/${yearId}`, { enabled: Boolean(yearId) });
  return data?.semesters ?? [];
}

function ExamsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { years, subjects, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data, loading, error, reload } = useApi('/exams', { params: { academicYearId: year || undefined } });
  const semesters = useSemesterOptions(year);
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = useMemo(
    () => [
      { name: 'subjectId', label: t('academic.subjects'), type: 'select', required: true, span: 'half', options: subjects.filter((subject) => Number(subject.has_exam) !== 0).map((subject) => ({ value: subject.id, label: `${subject.code} — ${subject.name}` })) },
      { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
      { name: 'semesterId', label: t('academic.semesters'), type: 'select', required: true, span: 'half', options: semesters.map((semester) => ({ value: semester.id, label: semester.name })) },
      { name: 'type', label: t('exams.type', { defaultValue: 'Exam type' }), type: 'select', required: true, span: 'half', options: [
        { value: 'first', label: t('exams.first', { defaultValue: 'First exam /40' }) },
        { value: 'final', label: t('exams.final', { defaultValue: 'Final exam /60' }) },
      ] },
      { name: 'markingDeadline', label: t('exams.markingDeadline', { defaultValue: 'Marking deadline' }), type: 'date', span: 'half' },
    ],
    [subjects, years, semesters, t],
  );

  async function submit(payload) {
    if (editing) await api.put(`/exams/${editing.id}`, { semesterId: payload.semesterId, markingDeadline: payload.markingDeadline });
    else await api.post('/exams', payload);
    setOpen(false);
    reload();
    notify('exams.saved', 'success');
  }

  return (
    <Panel
      title={t('exams.exams', { defaultValue: 'Exams' })}
      actions={
        <div className="inline-actions">
          <Select value={year} onChange={(event) => setYear(event.target.value)}>
            {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>
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
          { key: 'subject', label: t('academic.subjects'), render: (row) => <strong>{row.subject_code} — {row.subject_name}</strong> },
          { key: 'type', label: t('exams.type', { defaultValue: 'Exam type' }), render: (row) => <Badge tone={row.type === 'first' ? 'brass' : 'forest'}>{row.type === 'first' ? t('exams.first', { defaultValue: 'First' }) : t('exams.final', { defaultValue: 'Final' })}</Badge> },
          { key: 'max_score', label: t('exams.maxScore', { defaultValue: 'Max' }), render: (row) => format.formatInteger(row.max_score) },
          { key: 'semester_name', label: t('academic.semesters') },
          { key: 'marking_deadline', label: t('exams.markingDeadline', { defaultValue: 'Marking deadline' }), render: (row) => format.formatDate(row.marking_deadline) },
          { key: 'published_scores', label: t('exams.publishedScores', { defaultValue: 'Published scores' }), render: (row) => format.formatInteger(row.published_scores) },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
        empty={<EmptyState title={t('exams.noExams', { defaultValue: 'No exams created for this year.' })} copy={t('exams.noExamsHint', { defaultValue: 'Create one first exam and one final exam for each subject.' })} />}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={editing ? fields.filter((field) => ['semesterId', 'markingDeadline'].includes(field.name)) : fields}
        initialValues={editing ? { semesterId: editing.semester_id, markingDeadline: editing.marking_deadline } : { academicYearId: currentYear?.id, type: 'first' }}
        onSubmit={submit}
      />
    </Panel>
  );
}

function SchedulesTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, sections, rooms, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data: examData } = useApi('/exams', { params: { academicYearId: year || undefined } });
  const exams = examData?.items ?? [];
  const [examId, setExamId] = useState('');
  const { data, loading, error, reload } = useApi('/exam-schedules', { params: { examId: examId || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fields = [
    { name: 'examId', label: t('exams.exams', { defaultValue: 'Exam' }), type: 'select', required: true, span: 'half', options: exams.map((exam) => ({ value: exam.id, label: `${exam.subject_code} — ${exam.type}` })) },
    { name: 'sectionId', label: t('people.section'), type: 'select', required: true, span: 'half', options: sections.map((section) => ({ value: section.id, label: `${section.grade_name ?? `Grade ${section.grade_number}`} — ${section.name}` })) },
    { name: 'date', label: t('attendance.date'), type: 'date', required: true, span: 'half' },
    { name: 'startTime', label: t('timetable.startTime'), type: 'time', required: true, span: 'half' },
    { name: 'durationMinutes', label: t('exams.duration', { defaultValue: 'Duration (minutes)' }), type: 'number', span: 'half', min: 15, defaultValue: 90 },
    { name: 'roomId', label: t('academic.rooms'), type: 'select', span: 'half', options: rooms },
  ];

  async function create(payload) {
    await api.post('/exam-schedules', payload);
    setOpen(false);
    reload();
  }

  function endTime(start, minutes) {
    if (!start) return null;
    const [hours, mins] = start.split(':').map(Number);
    const total = hours * 60 + mins + Number(minutes || 0);
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  const yearLabel = years.find((item) => Number(item.id) === Number(year))?.label ?? '';

  return (
    <>
      <Panel
        className="no-print"
        title={t('exams.schedules', { defaultValue: 'Exam schedules' })}
        actions={
          <div className="inline-actions">
            <Select value={year} onChange={(event) => setYear(event.target.value)}>
              {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
            <Select value={examId} onChange={(event) => setExamId(event.target.value)}>
              <option value="">{t('exams.exams', { defaultValue: 'All exams' })}</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.subject_code} — {exam.type}</option>)}
            </Select>
            <Button variant="quiet" size="sm" onClick={() => window.print()} disabled={rows.length === 0}>
              <Printer size={15} /> {t('common.print')}
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus size={15} /> {t('common.add')}</Button>
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
          { key: 'date', label: t('attendance.date'), render: (row) => <strong>{format.formatDate(row.date)}</strong> },
          { key: 'start_time', label: t('timetable.startTime'), render: (row) => format.formatTime(row.start_time) },
          { key: 'exam', label: t('academic.subjects'), render: (row) => `${row.subject_code} — ${row.type === 'first' ? t('exams.first', { defaultValue: 'First' }) : t('exams.final', { defaultValue: 'Final' })}` },
          { key: 'section', label: t('people.section'), render: (row) => `${row.grade_number ? `Grade ${row.grade_number}` : ''} ${row.section_name}` },
          { key: 'room_name', label: t('academic.rooms') },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => setDeleting(row)}><Trash2 size={14} /></Button>,
          },
        ]}
        empty={<EmptyState title={t('common.noResults')} copy={t('exams.noSchedulesHint', { defaultValue: 'Schedule each exam for a section, date, and room.' })} />}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={t('common.add')}
        fields={fields}
        initialValues={{ examId: examId || exams[0]?.id, durationMinutes: 90 }}
        onSubmit={create}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={t('common.confirmDeleteTitle')}
        body={deleting ? `${deleting.subject_code} · ${format.formatDate(deleting.date)}` : ''}
        onConfirm={async () => {
          await api.delete(`/exam-schedules/${deleting.id}`);
          setDeleting(null);
          reload();
        }}
      />
      </Panel>

      <div className="print-only print-sheet print-area">
        <PrintHeader
          title={t('exams.printSchedule')}
          meta={[yearLabel, examId ? exams.find((exam) => Number(exam.id) === Number(examId))?.subject_code : ''].filter(Boolean).join(' · ')}
        />
        <table className="result-table">
          <thead>
            <tr>
              <th>{t('attendance.date')}</th>
              <th>{t('timetable.startTime')}</th>
              <th>{t('timetable.endTime')}</th>
              <th>{t('academic.subjects')}</th>
              <th>{t('people.section')}</th>
              <th>{t('academic.rooms')}</th>
              <th>{t('exams.duration')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{format.formatDate(row.date)}</td>
                <td>{format.formatTime(row.start_time)}</td>
                <td>{format.formatTime(endTime(row.start_time, row.duration_minutes))}</td>
                <td><strong>{row.subject_code}</strong> {row.subject_name}</td>
                <td>{row.grade_number ? `Grade ${format.formatInteger(row.grade_number)}` : ''} {row.section_name}</td>
                <td>{row.room_name || '—'}</td>
                <td>{format.formatInteger(row.duration_minutes)} {t('exams.minutesShort', { defaultValue: 'min' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PrintFooter />
      </div>
    </>
  );
}

function ScoresTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { sections, years, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data: examData } = useApi('/exams', { params: { academicYearId: year || undefined } });
  const exams = examData?.items ?? [];
  const [examId, setExamId] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const activeExam = examId || exams[0]?.id;
  const { data, loading, error, reload } = useApi(`/exams/${activeExam}/scores`, {
    params: { sectionId },
    enabled: Boolean(activeExam && sectionId),
  });
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  const students = data?.students ?? [];
  const exam = data?.exam ?? exams.find((row) => Number(row.id) === Number(activeExam));
  const maxScore = exam?.max_score ?? 60;

  useEffect(() => {
    if (!data?.students) return;
    const next = {};
    for (const student of data.students) {
      next[student.id] = {
        score: student.score ?? '',
        isAbsent: Boolean(student.is_absent),
      };
    }
    setScores(next);
  }, [data]);

  function update(studentId, key, value) {
    setScores((current) => ({ ...current, [studentId]: { ...current[studentId], [key]: value } }));
  }

  async function save(publish) {
    setSaving(true);
    try {
      const payload = students.map((student) => ({
        studentId: student.id,
        score: scores[student.id]?.score === '' ? null : Number(scores[student.id]?.score),
        isAbsent: Boolean(scores[student.id]?.isAbsent),
      }));
      await api.post(`/exams/${activeExam}/scores`, { sectionId: Number(sectionId), scores: payload, publish });
      notify(publish ? 'exams.published' : 'exams.draftSaved', 'success');
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title={t('exams.scores', { defaultValue: 'Score entry' })}
      actions={
        <div className="inline-actions">
          <Select value={year} onChange={(event) => setYear(event.target.value)}>
            {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
          <Select value={activeExam ?? ''} onChange={(event) => setExamId(event.target.value)}>
            <option value="">{t('exams.exams', { defaultValue: 'Choose an exam' })}</option>
            {exams.map((row) => <option key={row.id} value={row.id}>{row.subject_code} — {row.type} ({row.max_score})</option>)}
          </Select>
          <Select value={sectionId} onChange={(event) => setSectionId(Number(event.target.value))}>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.grade_name ?? `Grade ${section.grade_number}`} — {section.name}</option>)}
          </Select>
          <Button variant="quiet" size="sm" disabled={saving || !students.length} onClick={() => save(false)}><Save size={15} /> {t('exams.saveDraft', { defaultValue: 'Save draft' })}</Button>
          <Button size="sm" disabled={saving || !students.length} onClick={() => save(true)}><Send size={15} /> {t('exams.publishScores', { defaultValue: 'Publish scores' })}</Button>
        </div>
      }
    >
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      {data?.schedule ? (
        <p className="muted">{format.formatDate(data.schedule.date)} · {format.formatTime(data.schedule.start_time)} · {data.schedule.room_name || '—'}</p>
      ) : null}
      {loading ? <LoadingBlock rows={6} /> : !activeExam ? <EmptyState title={t('exams.noExams', { defaultValue: 'No exams created for this year.' })} /> : students.length === 0 ? <EmptyState title={t('attendance.noStudents')} /> : (
        <div className="score-sheet">
          <div className="score-head">
            <span>{t('people.student')}</span>
            <span>{t('exams.score', { defaultValue: 'Score' })} /{format.formatInteger(maxScore)}</span>
            <span>{t('attendance.absent')}</span>
          </div>
          {students.map((student) => (
            <div className="score-row" key={student.id}>
              <div className="record-main">
                <strong>{student.first_name} {student.last_name}</strong>
                <span className="muted">{student.admission_number}</span>
              </div>
              <input
                className="input score-input"
                type="number"
                min="0"
                max={maxScore}
                value={scores[student.id]?.score ?? ''}
                disabled={scores[student.id]?.isAbsent}
                onChange={(event) => update(student.id, 'score', event.target.value)}
              />
              <Checkbox
                label={t('attendance.absent')}
                checked={Boolean(scores[student.id]?.isAbsent)}
                onChange={(event) => update(student.id, 'isAbsent', event.target.checked)}
              />
              {student.is_draft === 0 && student.score_id ? <Badge tone="forest">{t('status.published')}</Badge> : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
