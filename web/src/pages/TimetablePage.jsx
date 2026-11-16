import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Plus, Printer, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Button,
  ConfirmModal,
  DataTable,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';
import { PrintFooter, PrintHeader } from '../components/print.jsx';

export default function TimetablePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('grid');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('nav.academics')} title={t('nav.timetable')} copy={t('timetable.copy', { defaultValue: 'Build a weekly rhythm for each section, then place lessons into its periods.' })} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="grid">{t('nav.timetable')}</TabsTrigger>
          <TabsTrigger value="assignments">{t('timetable.assignments', { defaultValue: 'Teaching assignments' })}</TabsTrigger>
        </TabsList>
        <TabsContent value="grid"><TimetableGrid /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TimetableGrid() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { sections, currentYear, roomOptions, reload: refresh } = useReference();
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const selected = sectionId || sections[0]?.id;
  const { data, loading, error, reload } = useApi(`/sections/${selected}/timetable`, { enabled: Boolean(selected) });
  const [periodOpen, setPeriodOpen] = useState(false);
  const [cell, setCell] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deleteLesson, setDeleteLesson] = useState(null);

  const { data: assignmentData, reload: reloadAssignments } = useApi('/teaching-assignments', {
    params: { academicYearId: currentYear?.id || undefined },
    enabled: Boolean(currentYear?.id),
  });
  const assignments = (assignmentData?.items ?? []).filter(
    (assignment) => !selected || Number(assignment.section_id) === Number(selected),
  );

  const days = data?.teachingDays ?? [6, 0, 1, 2, 3, 4];
  const periods = data?.periods ?? [];
  const lessons = data?.lessons ?? {};
  const section = sections.find((item) => Number(item.id) === Number(selected));
  const sectionLabel = section
    ? `${section.grade_name ?? `Grade ${section.grade_number}`} — ${section.name}`
    : '';

  const assignmentOptions = useMemo(
    () =>
      assignments.map((assignment) => ({
        value: assignment.id,
        label: `${assignment.subject_code} — ${assignment.first_name} ${assignment.last_name}`,
      })),
    [assignments],
  );

  const periodFields = [
    { name: 'startTime', label: t('timetable.startTime', { defaultValue: 'Start time' }), type: 'time', required: true, span: 'half', defaultValue: '07:30' },
    { name: 'periodCount', label: t('academic.weeklyPeriods', { defaultValue: 'Periods' }), type: 'number', span: 'half', min: 1, max: 16, defaultValue: 7 },
    { name: 'periodMinutes', label: t('timetable.periodMinutes', { defaultValue: 'Minutes per period' }), type: 'number', span: 'half', min: 20, max: 120, defaultValue: 45 },
  ];

  async function savePeriods(payload) {
    await api.post(`/sections/${selected}/periods`, payload);
    reload();
    notify('timetable.periodSaved');
  }

  function openCell(period, day) {
    const lesson = lessons?.[period.id]?.[day] ?? null;
    setEditingLesson(lesson);
    setCell({ period, day });
  }

  async function saveLesson(payload) {
    const body = {
      sectionId: Number(selected),
      periodId: Number(cell.period.id),
      teachingAssignmentId: Number(payload.teachingAssignmentId),
      dayOfWeek: Number(cell.day),
      roomId: payload.roomId ? Number(payload.roomId) : null,
    };
    if (editingLesson) await api.put(`/lessons/${editingLesson.id}`, body);
    else await api.post('/lessons', body);
    setCell(null);
    reload();
    reloadAssignments();
  }

  async function removeLesson() {
    await api.delete(`/lessons/${deleteLesson.id}`);
    setDeleteLesson(null);
    setCell(null);
    reload();
    refresh();
  }

  return (
    <>
      <Panel
        className="no-print"
        title={t('nav.timetable')}
        actions={
          <div className="inline-actions">
            <Select value={selected ?? ''} onChange={(event) => setSectionId(Number(event.target.value))}>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.grade_name ? `${section.grade_name} — ${section.name}` : `Grade ${section.grade_number} — ${section.name}`}
                </option>
              ))}
            </Select>
            <Button variant="quiet" size="sm" onClick={() => window.print()} disabled={!periods.length}>
              <Printer size={15} />
              {t('common.print')}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setPeriodOpen(true)}>
              <CalendarClock size={15} />
              {t('timetable.configurePeriods', { defaultValue: 'Period grid' })}
            </Button>
          </div>
        }
      >
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      {loading ? <LoadingBlock rows={6} /> : null}
      {!loading && (!selected || periods.length === 0) ? (
        <EmptyState
          title={t('timetable.noPeriods', { defaultValue: 'No period grid yet.' })}
          copy={t('timetable.noPeriodsHint', { defaultValue: 'Create the daily periods before placing lessons.' })}
          action={<Button onClick={() => setPeriodOpen(true)}>{t('timetable.configurePeriods', { defaultValue: 'Period grid' })}</Button>}
        />
      ) : null}
      {!loading && selected && periods.length > 0 ? (
        <div className="timetable-wrap">
          <table className="timetable">
            <thead>
              <tr>
                <th>{t('attendance.period')}</th>
                {days.map((day) => <th key={day}>{t(`day.${day}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id}>
                  <th className={period.kind === 'break' ? 'timetable-break' : ''}>
                    <span className="timetable-period">{period.label || (period.kind === 'break' ? t('timetable.break', { defaultValue: 'Break' }) : format.formatInteger(period.sort_order))}</span>
                    <span className="timetable-time">{format.formatTime(period.start_time)} – {format.formatTime(period.end_time)}</span>
                  </th>
                  {days.map((day) => {
                    const lesson = lessons?.[period.id]?.[day];
                    if (period.kind === 'break') {
                      return <td key={day} className="timetable-break" />;
                    }
                    return (
                      <td key={day} className="timetable-cell" onClick={() => openCell(period, day)}>
                        {lesson ? (
                          <button type="button" className="lesson-chip" onClick={(event) => { event.stopPropagation(); openCell(period, day); }}>
                            <span className="lesson-subject">{lesson.subject_code}</span>
                            <span className="lesson-name">{lesson.subject_name}</span>
                            <span className="lesson-teacher">{lesson.first_name} {lesson.last_name}</span>
                            <span className="lesson-room">{lesson.room_name || '—'}</span>
                          </button>
                        ) : (
                          <span className="timetable-add"><Plus size={14} /></span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <EntityFormModal
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        title={t('timetable.configurePeriods', { defaultValue: 'Period grid' })}
        description={t('timetable.configurePeriodsHint', { defaultValue: 'This replaces the periods for the selected section.' })}
        fields={periodFields}
        initialValues={{ startTime: periods[0]?.start_time || '07:30', periodCount: periods.filter((p) => p.kind === 'period').length || 7, periodMinutes: 45 }}
        onSubmit={savePeriods}
      />

      <EntityFormModal
        open={Boolean(cell)}
        onOpenChange={(value) => !value && setCell(null)}
        title={editingLesson ? t('common.edit') : t('timetable.addLesson', { defaultValue: 'Add lesson' })}
        description={cell ? `${t(`day.${cell.day}`)} · ${cell.period.label}` : ''}
        fields={[
          { name: 'teachingAssignmentId', label: t('timetable.assignment', { defaultValue: 'Subject & teacher' }), type: 'select', required: true, options: assignmentOptions },
          { name: 'roomId', label: t('academic.rooms'), type: 'select', options: roomOptions },
        ]}
        initialValues={editingLesson ? { teachingAssignmentId: editingLesson.teaching_assignment_id, roomId: editingLesson.room_id ?? '' } : {}}
        onSubmit={saveLesson}
        extra={editingLesson ? (
          <Button variant="danger" size="sm" type="button" onClick={() => setDeleteLesson(editingLesson)}>
            <Trash2 size={15} /> {t('common.delete')}
          </Button>
        ) : null}
      />

      <ConfirmModal
        open={Boolean(deleteLesson)}
        onOpenChange={(value) => !value && setDeleteLesson(null)}
        title={t('common.confirmDeleteTitle')}
        body={`${deleteLesson?.subject_name || ''} · ${deleteLesson ? t(`day.${deleteLesson.day_of_week}`) : ''}`}
        onConfirm={removeLesson}
      />
      </Panel>

      <div className="print-only print-sheet print-area">
        <PrintHeader title={t('timetable.printTimetable')} meta={[sectionLabel, currentYear?.label].filter(Boolean).join(' · ')} />
        <table className="timetable">
          <thead>
            <tr>
              <th>{t('attendance.period')}</th>
              {days.map((day) => <th key={day}>{t(`day.${day}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id}>
                <th className={period.kind === 'break' ? 'timetable-break' : ''}>
                  <span className="timetable-period">
                    {period.label || (period.kind === 'break' ? t('timetable.break') : format.formatInteger(period.sort_order))}
                  </span>
                  <span className="timetable-time">{format.formatTime(period.start_time)} – {format.formatTime(period.end_time)}</span>
                </th>
                {days.map((day) => {
                  const lesson = lessons?.[period.id]?.[day];
                  if (period.kind === 'break') return <td key={day} className="timetable-break" />;
                  return (
                    <td key={day} className="timetable-cell">
                      {lesson ? (
                        <>
                          <span className="lesson-subject">{lesson.subject_code}</span>
                          <span className="lesson-name">{lesson.subject_name}</span>
                          <span className="lesson-teacher">{lesson.first_name} {lesson.last_name}</span>
                          <span className="lesson-room">{lesson.room_name || '—'}</span>
                        </>
                      ) : <span className="muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <PrintFooter />
      </div>
    </>
  );
}

function AssignmentsTab() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { sections, subjects, teacherOptions, years, currentYear, reload: refresh } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data, loading, error, reload } = useApi('/teaching-assignments', { params: { academicYearId: year || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fields = [
    { name: 'teacherStaffId', label: t('nav.staff'), type: 'select', required: true, span: 'half', options: teacherOptions },
    { name: 'subjectId', label: t('academic.subjects'), type: 'select', required: true, span: 'half', options: subjects.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` })) },
    { name: 'sectionId', label: t('academic.sections'), type: 'select', required: true, span: 'half', options: sections.map((item) => ({ value: item.id, label: `${item.grade_name ?? `Grade ${item.grade_number}`} — ${item.name}` })) },
    { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
  ];

  async function submit(payload) {
    await api.post('/teaching-assignments', payload);
    reload();
    refresh();
    notify('timetable.assignmentSaved');
  }

  return (
    <Panel
      title={t('timetable.assignments', { defaultValue: 'Teaching assignments' })}
      actions={<div className="inline-actions"><Select value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select><Button size="sm" onClick={() => setOpen(true)}><Plus size={15} /> {t('common.add')}</Button></div>}
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'grade_name', label: t('academic.grades'), render: (row) => `${row.grade_name || `Grade ${row.grade_number}`} — ${row.section_name}` },
          { key: 'subject', label: t('academic.subjects'), render: (row) => `${row.subject_code} — ${row.subject_name}` },
          { key: 'teacher', label: t('nav.staff'), render: (row) => `${row.first_name} ${row.last_name}` },
          { key: 'academic_year_label', label: t('admissions.academicYear') },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => setDeleting(row)}><Trash2 size={14} /></Button>,
          },
        ]}
      />
      <EntityFormModal open={open} onOpenChange={setOpen} title={t('common.add')} fields={fields} initialValues={{ academicYearId: currentYear?.id }} onSubmit={submit} />
      <ConfirmModal
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={t('common.confirmDeleteTitle')}
        body={deleting ? `${deleting.subject_name} — ${deleting.first_name} ${deleting.last_name}` : ''}
        onConfirm={async () => {
          await api.delete(`/teaching-assignments/${deleting.id}`);
          setDeleting(null);
          reload();
          refresh();
        }}
      />
    </Panel>
  );
}
