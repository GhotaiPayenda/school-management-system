import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ChevronDown, Printer } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  KeyValue,
  LetterBadge,
  LoadingBlock,
  Modal,
  PageHeader,
  Panel,
  Select,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { PrintButton, PrintFooter, PrintHeader, usePrintMode } from '../components/print.jsx';
import { selectAuth } from '../features/auth/authSlice.js';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';
import { localizedGrade, yearLabel } from '../lib/classes.js';

function studentName(student, language) {
  if (language === 'fa-AF' && student.name_fa) return student.name_fa;
  if (language === 'ps-AF' && student.name_ps) return student.name_ps;
  return `${student.first_name} ${student.last_name}`;
}

function subjectName(subject, language) {
  if (language === 'fa-AF' && subject.name_fa) return subject.name_fa;
  if (language === 'ps-AF' && subject.name_ps) return subject.name_ps;
  return subject.name;
}

function teacherName(teacher, language) {
  if (language === 'fa-AF' && teacher.name_fa) return teacher.name_fa;
  if (language === 'ps-AF' && teacher.name_ps) return teacher.name_ps;
  return `${teacher.first_name} ${teacher.last_name}`;
}

function examCell(exam, t, format) {
  if (!exam) return '—';
  if (!exam.published) return t('classes.pending');
  if (exam.isAbsent) return t('classes.absentScore');
  if (exam.score === null || exam.score === undefined) return '—';
  return `${format.formatNumber(exam.score, { maximumFractionDigits: 1 })} / ${format.formatInteger(exam.maxScore)}`;
}

export default function ClassRecordPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const { permissions } = useSelector(selectAuth);
  const canViewStudents = permissions.includes('students.view');
  const canManageAcademic = permissions.includes('academic.manage');
  const canViewAttendance = permissions.includes('attendance.view');
  const canViewResults = permissions.includes('exams.view');

  const { data, loading, error, reload } = useApi(`/sections/${id}/profile`);
  const [missingYear, setMissingYear] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [attendanceSemester, setAttendanceSemester] = useState('');
  const [expandedResult, setExpandedResult] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  const attendanceParams = useMemo(() => {
    const params = {};
    if (attendanceDate) params.date = attendanceDate;
    if (attendanceSemester) params.semesterId = attendanceSemester;
    return params;
  }, [attendanceDate, attendanceSemester]);

  const {
    data: attendance,
    loading: attendanceLoading,
    error: attendanceError,
    reload: reloadAttendance,
  } = useApi(`/sections/${id}/attendance`, {
    params: attendanceParams,
    enabled: canViewAttendance,
  });

  const {
    data: results,
    loading: resultsLoading,
    error: resultsError,
    reload: reloadResults,
  } = useApi(`/sections/${id}/results`, { enabled: canViewResults });

  useEffect(() => {
    setMissingYear(null);
    setAttendanceDate('');
    setAttendanceSemester('');
    setExpandedResult(null);
    setPrintOpen(false);
  }, [id]);

  usePrintMode(printOpen);

  const section = data?.section;
  const counts = data?.counts;
  const years = data?.academic_years ?? [];
  const siblings = data?.siblings ?? [];
  const students = data?.students ?? [];
  const teachers = data?.teachers ?? [];
  const curriculum = data?.curriculum ?? [];
  const timetable = data?.timetable ?? { periods: [], lessons: {}, teachingDays: [] };
  const periods = timetable.periods ?? [];
  const days = timetable.teachingDays ?? [];
  const lessons = timetable.lessons ?? {};
  const lessonCount = useMemo(
    () => Object.values(lessons).reduce((total, byDay) => total + Object.keys(byDay).length, 0),
    [lessons],
  );
  const activeStudents = useMemo(
    () => students.filter((student) => student.enrollment_status === 'active'),
    [students],
  );
  const inactiveStudents = useMemo(
    () => students.filter((student) => student.enrollment_status !== 'active'),
    [students],
  );
  const siblingByYear = useMemo(
    () => new Map(siblings.map((sibling) => [sibling.academic_year_id, sibling])),
    [siblings],
  );

  function switchYear(value) {
    const yearId = Number(value);
    if (!section) return;
    if (yearId === section.academic_year_id) {
      setMissingYear(null);
      return;
    }
    const sibling = siblingByYear.get(yearId);
    if (sibling) {
      setMissingYear(null);
      navigate(`/classes/${sibling.id}`);
      return;
    }
    setMissingYear(yearId);
  }

  if (loading && !data) {
    return (
      <div className="page-stack">
        <BackLink />
        <LoadingBlock rows={8} />
      </div>
    );
  }

  if (error?.status === 404) {
    return (
      <div className="page-stack">
        <BackLink />
        <Panel>
          <EmptyState title={t('classes.notFoundTitle')} copy={t('classes.notFoundCopy')} />
        </Panel>
      </div>
    );
  }

  if (error?.status === 403) {
    return (
      <div className="page-stack">
        <BackLink />
        <Panel>
          <EmptyState title={t('classes.unavailableTitle')} copy={t('classes.unavailableCopy')} />
        </Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <BackLink />
        <Panel>
          <ErrorState error={error} onRetry={reload} />
        </Panel>
      </div>
    );
  }

  if (!section) return null;

  const overCapacity = counts.active_students > counts.capacity;
  const atCapacity = counts.active_students === counts.capacity;
  const selectedYear = missingYear ?? section.academic_year_id;
  const missingYearLabel = years.find((year) => year.id === missingYear)?.label ?? '';
  const yearEntry = years.find((year) => year.id === section.academic_year_id);

  const attendanceDayRows = attendance?.day?.rows ?? [];
  const attendanceStudentById = new Map(attendanceDayRows.map((row) => [row.student_id, row]));

  const resultRows = results?.items ?? [];
  const resultAverages = resultRows
    .map((row) => row.average)
    .filter((value) => value !== null && value !== undefined);
  const classAverage = resultAverages.length
    ? resultAverages.reduce((total, value) => total + Number(value), 0) / resultAverages.length
    : null;
  const passingStudents = resultRows.filter((row) => row.failedSubjects === 0).length;
  const failingStudents = resultRows.length - passingStudents;
  const retentionStudents = resultRows.filter((row) =>
    (row.subjects ?? []).some((subject) => subject.retention),
  ).length;
  const hasPublishedResults = resultRows.some((row) =>
    (row.subjects ?? []).some(
      (subject) =>
        subject.firstExam?.published ||
        subject.finalExam?.published ||
        (subject.score !== null && subject.score !== undefined),
    ),
  );

  const columns = [
    { key: 'admission_number', label: t('people.admissionNumber') },
    {
      key: 'student',
      label: t('people.student'),
      render: (row) => studentName(row, format.language),
    },
    {
      key: 'enrollment_status',
      label: t('people.status'),
      render: (row) => <Badge status={row.enrollment_status} />,
    },
    {
      key: 'started_at',
      label: t('classes.startedOn'),
      render: (row) => format.formatDate(row.started_at),
    },
    {
      key: 'ended_at',
      label: t('classes.endedOn'),
      render: (row) => (row.ended_at ? format.formatDate(row.ended_at) : '—'),
    },
  ];

  const openStudent = canViewStudents
    ? (row) => navigate(`/students?studentId=${row.id}`)
    : undefined;

  return (
    <div className="page-stack">
      <BackLink />

      <PageHeader
        eyebrow={t('classes.recordEyebrow')}
        title={t('classes.recordTitle', { name: section.name })}
        copy={t('classes.recordCopy')}
        actions={
          <div className="inline-actions class-record-actions">
            <Button variant="quiet" size="sm" onClick={() => setPrintOpen(true)}>
              <Printer size={15} />
              {t('classes.printProfile')}
            </Button>
            <div className="class-year-filter">
              <Select
                aria-label={t('classes.yearSwitcher')}
                value={selectedYear}
                onChange={(event) => switchYear(event.target.value)}
              >
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {yearLabel(year, format)}
                    {Number(year.is_current) === 1 ? ` · ${t('classes.currentYear')}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      {missingYear ? (
        <div className="alert alert-warning" role="status">
          <AlertTriangle size={17} aria-hidden="true" />
          <div className="alert-copy">
            <strong>{t('classes.notOffered')}</strong>
            <div>{t('classes.notOfferedHint', { year: missingYearLabel || '—' })}</div>
          </div>
        </div>
      ) : null}

      <Panel title={t('classes.overview')}>
        <div className="class-card-warnings">
          {overCapacity ? (
            <Badge tone="danger">
              <AlertTriangle size={13} aria-hidden="true" />
              {t('classes.overCapacity')}
            </Badge>
          ) : null}
          {!overCapacity && atCapacity ? (
            <Badge tone="warning">
              <AlertTriangle size={13} aria-hidden="true" />
              {t('classes.atCapacity')}
            </Badge>
          ) : null}
          {counts.unassigned_subject_count > 0 ? (
            <Badge tone="warning">
              <AlertTriangle size={13} aria-hidden="true" />
              {t('classes.unassignedWarning', { count: format.formatInteger(counts.unassigned_subject_count) })}
            </Badge>
          ) : null}
        </div>
        <KeyValue
          columns={3}
          items={[
            { label: t('classes.gradeLevel'), value: localizedGrade(section, format.language) },
            {
              label: t('classes.academicYear'),
              value: yearLabel(
                yearEntry ?? {
                  label: section.academic_year_label,
                  start_date: section.academic_year_start_date,
                  end_date: section.academic_year_end_date,
                },
                format,
              ),
            },
            {
              label: t('classes.homeroomTeacher'),
              value: section.homeroom_teacher_name || t('classes.noHomeroomTeacher'),
            },
            {
              label: t('classes.activeStudents'),
              value: t('classes.occupancy', {
                active: format.formatInteger(counts.active_students),
                capacity: format.formatInteger(counts.capacity),
              }),
            },
            { label: t('classes.inactiveStudents'), value: format.formatInteger(counts.inactive_students) },
            { label: t('classes.subjects'), value: format.formatInteger(counts.subject_count) },
          ]}
        />
      </Panel>

      <Panel
        title={t('classes.roster')}
        copy={t('classes.rosterCopy')}
        actions={
          <span className="muted">
            {t('classes.rosterCount', {
              active: format.formatInteger(counts.active_students),
              capacity: format.formatInteger(counts.capacity),
            })}
          </span>
        }
      >
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              {t('classes.activeTab', { count: format.formatInteger(activeStudents.length) })}
            </TabsTrigger>
            <TabsTrigger value="inactive">
              {t('classes.inactiveTab', { count: format.formatInteger(inactiveStudents.length) })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <DataTable
              columns={columns.filter((column) => column.key !== 'ended_at')}
              rows={activeStudents}
              onRowClick={openStudent}
              empty={<EmptyState title={t('classes.noActiveStudents')} copy={t('classes.noActiveStudentsHint')} />}
            />
          </TabsContent>
          <TabsContent value="inactive">
            <DataTable
              columns={columns}
              rows={inactiveStudents}
              empty={<EmptyState title={t('classes.noInactiveStudents')} copy={t('classes.noInactiveStudentsHint')} />}
            />
          </TabsContent>
        </Tabs>
      </Panel>

      <Panel title={t('classes.teachers')} copy={t('classes.teachersCopy')}>
        {teachers.length === 0 ? (
          <EmptyState title={t('classes.noTeachers')} copy={t('classes.noTeachersHint')} />
        ) : (
          <ul className="teacher-list">
            {teachers.map((teacher) => (
              <li key={teacher.staff_id} className="teacher-row">
                <div className="teacher-identity">
                  <span>{teacherName(teacher, format.language)}</span>
                  {teacher.is_homeroom ? <Badge tone="success">{t('classes.homeroomBadge')}</Badge> : null}
                </div>
                <div className="teacher-subjects">
                  {teacher.subjects.map((subject) => (
                    <span key={subject.id} className="subject-chip">
                      {subjectName(subject, format.language)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={t('classes.subjects')}
        copy={t('classes.subjectsCopy')}
        actions={canManageAcademic ? <Link to="/timetable">{t('classes.manageStaffing')}</Link> : null}
      >
        <DataTable
          columns={[
            {
              key: 'subject',
              label: t('classes.subject'),
              render: (row) => (
                <span className="inline-actions">
                  <span>{subjectName(row, format.language)}</span>
                  {row.is_elective ? <Badge tone="info">{t('classes.elective')}</Badge> : null}
                </span>
              ),
            },
            {
              key: 'weekly_periods',
              label: t('academic.weeklyPeriods'),
              render: (row) => format.formatInteger(row.weekly_periods),
            },
            {
              key: 'teacher',
              label: t('timetable.teacher'),
              render: (row) => row.teacher_name || <Badge tone="warning">{t('classes.unassigned')}</Badge>,
            },
          ]}
          rows={curriculum}
          rowKey="subject_id"
          empty={<EmptyState title={t('classes.noCurriculum')} copy={t('classes.noCurriculumHint')} />}
        />
      </Panel>

      <Panel title={t('classes.timetable')} copy={t('classes.timetableCopy')}>
        {periods.length === 0 ? (
          <EmptyState title={t('classes.noPeriodGrid')} copy={t('classes.noPeriodGridHint')} />
        ) : lessonCount === 0 ? (
          <EmptyState title={t('classes.noLessons')} copy={t('classes.noLessonsHint')} />
        ) : (
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
                      <span className="timetable-period">
                        {period.label || (period.kind === 'break'
                          ? t('timetable.break')
                          : format.formatInteger(period.sort_order))}
                      </span>
                      <span className="timetable-time">
                        {format.formatTime(period.start_time)} – {format.formatTime(period.end_time)}
                      </span>
                    </th>
                    {days.map((day) => {
                      const lesson = lessons?.[period.id]?.[day];
                      if (period.kind === 'break') return <td key={day} className="timetable-break" />;
                      return (
                        <td key={day} className="timetable-cell">
                          {lesson ? (
                            <div className="lesson-chip lesson-chip-readonly">
                              <span className="lesson-subject">{lesson.subject_code}</span>
                              <span className="lesson-name">{lesson.subject_name}</span>
                              <span className="lesson-teacher">{lesson.first_name} {lesson.last_name}</span>
                              <span className="lesson-room">{lesson.room_name || '—'}</span>
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title={t('classes.attendance')}
        copy={t('classes.attendanceCopy')}
        actions={
          canViewAttendance && attendance ? (
            <div className="attendance-controls">
              <label className="field">
                <span className="field-label">{t('attendance.date')}</span>
                <Input
                  type="date"
                  value={attendanceDate || attendance.date}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                />
              </label>
              {attendance.semesters.length > 0 ? (
                <label className="field">
                  <span className="field-label">{t('classes.semester')}</span>
                  <Select
                    value={attendanceSemester || attendance.semester?.id || ''}
                    onChange={(event) => setAttendanceSemester(event.target.value)}
                  >
                    {attendance.semesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>{semester.name}</option>
                    ))}
                  </Select>
                </label>
              ) : null}
            </div>
          ) : null
        }
      >
        {!canViewAttendance ? (
          <EmptyState
            title={t('classes.attendanceUnavailable')}
            copy={t('classes.attendanceUnavailableHint')}
          />
        ) : attendanceLoading && !attendance ? (
          <LoadingBlock rows={4} />
        ) : attendanceError ? (
          <ErrorState error={attendanceError} onRetry={reloadAttendance} />
        ) : attendance && !attendance.has_records ? (
          <EmptyState title={t('classes.noAttendance')} copy={t('classes.noAttendanceHint')} />
        ) : attendance ? (
          <>
            <div className="attendance-totals">
              <span>
                {t('attendance.present')}: <strong>{format.formatInteger(attendance.summary.section.present)}</strong>
              </span>
              <span>
                {t('attendance.absent')}: <strong>{format.formatInteger(attendance.summary.section.absent)}</strong>
              </span>
              <span>
                {t('attendance.late')}: <strong>{format.formatInteger(attendance.summary.section.late)}</strong>
              </span>
              <span>
                {t('attendance.excused')}: <strong>{format.formatInteger(attendance.summary.section.excused)}</strong>
              </span>
              <span>
                {t('attendance.rate')}:{' '}
                <strong>
                  {attendance.summary.section.attendance_rate === null
                    ? t('classes.notRecorded')
                    : format.formatPercent(attendance.summary.section.attendance_rate)}
                </strong>
              </span>
            </div>

            <Tabs defaultValue="day">
              <TabsList>
                <TabsTrigger value="day">{t('classes.dayView')}</TabsTrigger>
                <TabsTrigger value="summary">{t('classes.semesterSummary')}</TabsTrigger>
              </TabsList>
              <TabsContent value="day">
                <DataTable
                  columns={[
                    {
                      key: 'student',
                      label: t('people.student'),
                      render: (row) => studentName(row, format.language),
                    },
                    {
                      key: 'status',
                      label: t('people.status'),
                      render: (row) => (row.status
                        ? <Badge status={row.status} />
                        : <span className="muted">{t('classes.notRecorded')}</span>),
                    },
                    {
                      key: 'reason',
                      label: t('attendance.reason'),
                      render: (row) => row.reason || '—',
                    },
                  ]}
                  rows={attendanceDayRows}
                  rowKey="student_id"
                  empty={<EmptyState title={t('classes.noActiveStudents')} copy={t('classes.noActiveStudentsHint')} />}
                />
              </TabsContent>
              <TabsContent value="summary">
                <DataTable
                  columns={[
                    {
                      key: 'student',
                      label: t('people.student'),
                      render: (row) => {
                        const student = attendanceStudentById.get(row.student_id);
                        return student ? studentName(student, format.language) : '—';
                      },
                    },
                    {
                      key: 'present',
                      label: t('attendance.present'),
                      align: 'end',
                      render: (row) => format.formatInteger(row.present),
                    },
                    {
                      key: 'absent',
                      label: t('attendance.absent'),
                      align: 'end',
                      render: (row) => format.formatInteger(row.absent),
                    },
                    {
                      key: 'late',
                      label: t('attendance.late'),
                      align: 'end',
                      render: (row) => format.formatInteger(row.late),
                    },
                    {
                      key: 'excused',
                      label: t('attendance.excused'),
                      align: 'end',
                      render: (row) => format.formatInteger(row.excused),
                    },
                    {
                      key: 'attendance_rate',
                      label: t('attendance.rate'),
                      align: 'end',
                      render: (row) => (row.attendance_rate === null
                        ? t('classes.notRecorded')
                        : format.formatPercent(row.attendance_rate)),
                    },
                  ]}
                  rows={attendance.summary.students}
                  rowKey="student_id"
                  empty={<EmptyState title={t('classes.noActiveStudents')} copy={t('classes.noActiveStudentsHint')} />}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </Panel>

      <Panel title={t('classes.results')} copy={t('classes.resultsCopy')}>
        {!canViewResults ? (
          <EmptyState title={t('classes.resultsUnavailable')} copy={t('classes.resultsUnavailableHint')} />
        ) : resultsLoading && !results ? (
          <LoadingBlock rows={5} />
        ) : resultsError ? (
          <ErrorState error={resultsError} onRetry={reloadResults} />
        ) : !hasPublishedResults ? (
          <EmptyState
            title={t('classes.noPublishedResults')}
            copy={t('classes.noPublishedResultsHint')}
          />
        ) : (
          <>
            <section className="kpi-grid class-result-kpis">
              <StatCard
                label={t('classes.classAverage')}
                value={classAverage === null ? '—' : format.formatNumber(classAverage, { maximumFractionDigits: 1 })}
                tone="forest"
              />
              <StatCard
                label={t('classes.passRate')}
                value={resultRows.length === 0 ? '—' : format.formatPercent((passingStudents / resultRows.length) * 100)}
                tone="forest"
              />
              <StatCard
                label={t('classes.studentsWithFailures')}
                value={format.formatInteger(failingStudents)}
                tone="terracotta"
              />
              <StatCard
                label={t('classes.retentionCount')}
                value={format.formatInteger(retentionStudents)}
                tone="brass"
              />
            </section>

            <ul className="result-list">
              {resultRows.map((row) => {
                const expanded = expandedResult === row.student.id;
                const retention = (row.subjects ?? []).some((subject) => subject.retention);
                return (
                  <li key={row.student.id} className="result-row">
                    <button
                      type="button"
                      className="result-summary"
                      aria-expanded={expanded}
                      onClick={() => setExpandedResult(expanded ? null : row.student.id)}
                    >
                      <span className="result-student">
                        <strong>{row.student.first_name} {row.student.last_name}</strong>
                        <span className="muted">{row.student.admission_number}</span>
                      </span>
                      <span className="result-metric">
                        <span className="result-label">{t('results.average')}</span>
                        <strong>
                          {row.average === null
                            ? '—'
                            : format.formatNumber(row.average, { maximumFractionDigits: 1 })}
                        </strong>
                      </span>
                      <span className="result-metric">
                        <span className="result-label">{t('results.letterGrade')}</span>
                        <LetterBadge letter={row.letterGrade} />
                      </span>
                      <span className="result-metric">
                        <span className="result-label">{t('results.retentionSubjects')}</span>
                        <Badge tone={row.failedSubjects > 0 ? 'warning' : 'success'}>
                          {format.formatInteger(row.failedSubjects)}
                        </Badge>
                      </span>
                      <span className="result-metric">
                        <span className="result-label">{t('people.status')}</span>
                        <Badge tone={row.failedSubjects === 0 ? 'success' : 'danger'}>
                          {row.failedSubjects === 0 ? t('results.passed') : t('results.failed')}
                        </Badge>
                      </span>
                      {retention ? <Badge tone="danger">{t('results.retention')}</Badge> : null}
                      <ChevronDown
                        size={16}
                        className={`result-chevron${expanded ? ' result-chevron-open' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {expanded ? (
                      <div className="result-detail">
                        <table className="class-subject-table">
                          <thead>
                            <tr>
                              <th>{t('classes.subject')}</th>
                              <th>{t('exam.first')}</th>
                              <th>{t('exam.final')}</th>
                              <th>{t('results.supplementary')}</th>
                              <th>{t('results.annual')}</th>
                              <th>{t('results.letterGrade')}</th>
                              <th>{t('people.status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(row.subjects ?? []).map((subject) => (
                              <tr key={subject.subjectId}>
                                <td>{subjectName(subject, format.language)}</td>
                                <td>{examCell(subject.firstExam, t, format)}</td>
                                <td>{examCell(subject.finalExam, t, format)}</td>
                                <td>
                                  {subject.supplementaryScore === null || subject.supplementaryScore === undefined
                                    ? '—'
                                    : format.formatNumber(subject.supplementaryScore, { maximumFractionDigits: 1 })}
                                </td>
                                <td>
                                  {subject.score === null || subject.score === undefined
                                    ? '—'
                                    : format.formatNumber(subject.score, { maximumFractionDigits: 1 })}
                                </td>
                                <td><LetterBadge letter={subject.letterGrade} /></td>
                                <td>
                                  <Badge tone={subject.passed ? 'success' : 'danger'}>
                                    {subject.passed ? t('results.passed') : t('results.failed')}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      <Modal
        open={printOpen}
        onOpenChange={setPrintOpen}
        title={t('classes.printProfile')}
        size="xl"
        footer={
          <>
            <Button variant="quiet" onClick={() => setPrintOpen(false)}>{t('common.close')}</Button>
            <PrintButton />
          </>
        }
      >
        <div className="print-area class-profile-sheet">
          <PrintHeader
            title={t('classes.printTitle')}
            meta={`${localizedGrade(section, format.language)} · ${yearLabel(
              yearEntry ?? {
                label: section.academic_year_label,
                start_date: section.academic_year_start_date,
                end_date: section.academic_year_end_date,
              },
              format,
            )}`}
          />

          <section className="profile-section">
            <h3>{t('classes.overview')}</h3>
            <KeyValue
              columns={3}
              items={[
                { label: t('classes.classLabel'), value: section.name },
                { label: t('classes.gradeLevel'), value: localizedGrade(section, format.language) },
                { label: t('classes.homeroomTeacher'), value: section.homeroom_teacher_name || t('classes.noHomeroomTeacher') },
                {
                  label: t('classes.activeStudents'),
                  value: t('classes.occupancy', {
                    active: format.formatInteger(counts.active_students),
                    capacity: format.formatInteger(counts.capacity),
                  }),
                },
                { label: t('classes.subjects'), value: format.formatInteger(counts.subject_count) },
                { label: t('classes.unassignedSubjects'), value: format.formatInteger(counts.unassigned_subject_count) },
              ]}
            />
          </section>

          <section className="profile-section">
            <h3>{t('classes.roster')}</h3>
            <table className="class-subject-table">
              <thead>
                <tr>
                  <th>{t('people.admissionNumber')}</th>
                  <th>{t('people.student')}</th>
                  <th>{t('people.status')}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.enrollment_id}>
                    <td>{student.admission_number}</td>
                    <td>{studentName(student, format.language)}</td>
                    <td>{t(`status.${student.enrollment_status}`, { defaultValue: student.enrollment_status })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="profile-section">
            <h3>{t('classes.teachers')}</h3>
            {teachers.length === 0 ? (
              <p className="muted">{t('classes.noTeachers')}</p>
            ) : (
              <ul className="profile-teacher-list">
                {teachers.map((teacher) => (
                  <li key={teacher.staff_id}>
                    <strong>{teacherName(teacher, format.language)}</strong>
                    {teacher.is_homeroom ? ` · ${t('classes.homeroomBadge')}` : ''}
                    {': '}
                    {teacher.subjects.map((subject) => subjectName(subject, format.language)).join('، ')}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="profile-section">
            <h3>{t('classes.subjects')}</h3>
            <table className="class-subject-table">
              <thead>
                <tr>
                  <th>{t('classes.subject')}</th>
                  <th>{t('academic.weeklyPeriods')}</th>
                  <th>{t('timetable.teacher')}</th>
                </tr>
              </thead>
              <tbody>
                {curriculum.map((subject) => (
                  <tr key={subject.subject_id}>
                    <td>{subjectName(subject, format.language)}</td>
                    <td>{format.formatInteger(subject.weekly_periods)}</td>
                    <td>{subject.teacher_name || t('classes.unassigned')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {periods.length > 0 && lessonCount > 0 ? (
            <section className="profile-section">
              <h3>{t('classes.timetable')}</h3>
              <table className="class-subject-table timetable">
                <thead>
                  <tr>
                    <th>{t('attendance.period')}</th>
                    {days.map((day) => <th key={day}>{t(`day.${day}`)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <th>{period.label || (period.kind === 'break'
                        ? t('timetable.break')
                        : format.formatInteger(period.sort_order))}</th>
                      {period.kind === 'break' ? (
                        <td colSpan={days.length} className="muted">{t('timetable.break')}</td>
                      ) : days.map((day) => {
                        const lesson = lessons?.[period.id]?.[day];
                        return (
                          <td key={day}>
                            {lesson
                              ? `${lesson.subject_name} · ${lesson.first_name} ${lesson.last_name}`
                              : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {canViewAttendance && attendance?.has_records ? (
            <section className="profile-section">
              <h3>{t('classes.attendance')}</h3>
              <p className="print-totals">
                {t('attendance.present')}: {format.formatInteger(attendance.summary.section.present)} ·{' '}
                {t('attendance.absent')}: {format.formatInteger(attendance.summary.section.absent)} ·{' '}
                {t('attendance.late')}: {format.formatInteger(attendance.summary.section.late)} ·{' '}
                {t('attendance.excused')}: {format.formatInteger(attendance.summary.section.excused)} ·{' '}
                {t('attendance.rate')}: {attendance.summary.section.attendance_rate === null
                  ? t('classes.notRecorded')
                  : format.formatPercent(attendance.summary.section.attendance_rate)}
              </p>
              <table className="class-subject-table">
                <thead>
                  <tr>
                    <th>{t('people.student')}</th>
                    <th>{t('attendance.present')}</th>
                    <th>{t('attendance.absent')}</th>
                    <th>{t('attendance.late')}</th>
                    <th>{t('attendance.excused')}</th>
                    <th>{t('attendance.rate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.summary.students.map((row) => {
                    const student = attendanceStudentById.get(row.student_id);
                    return (
                      <tr key={row.student_id}>
                        <td>{student ? studentName(student, format.language) : '—'}</td>
                        <td>{format.formatInteger(row.present)}</td>
                        <td>{format.formatInteger(row.absent)}</td>
                        <td>{format.formatInteger(row.late)}</td>
                        <td>{format.formatInteger(row.excused)}</td>
                        <td>{row.attendance_rate === null ? t('classes.notRecorded') : format.formatPercent(row.attendance_rate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : null}

          {canViewResults && hasPublishedResults ? (
            <section className="profile-section">
              <h3>{t('classes.results')}</h3>
              <p className="print-totals">
                {t('classes.classAverage')}: {classAverage === null ? '—' : format.formatNumber(classAverage, { maximumFractionDigits: 1 })} ·{' '}
                {t('classes.passRate')}: {resultRows.length === 0 ? '—' : format.formatPercent((passingStudents / resultRows.length) * 100)} ·{' '}
                {t('classes.studentsWithFailures')}: {format.formatInteger(failingStudents)} ·{' '}
                {t('classes.retentionCount')}: {format.formatInteger(retentionStudents)}
              </p>
              <table className="class-subject-table">
                <thead>
                  <tr>
                    <th>{t('people.student')}</th>
                    <th>{t('results.average')}</th>
                    <th>{t('results.letterGrade')}</th>
                    <th>{t('results.retentionSubjects')}</th>
                    <th>{t('people.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.map((row) => (
                    <tr key={row.student.id}>
                      <td>{row.student.first_name} {row.student.last_name}</td>
                      <td>{row.average === null ? '—' : format.formatNumber(row.average, { maximumFractionDigits: 1 })}</td>
                      <td>{row.letterGrade || '—'}</td>
                      <td>{format.formatInteger(row.failedSubjects)}</td>
                      <td>
                        {row.failedSubjects === 0 ? t('results.passed') : t('results.failed')}
                        {(row.subjects ?? []).some((subject) => subject.retention) ? ` · ${t('results.retention')}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <PrintFooter />
        </div>
      </Modal>
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Link to="/classes" className="back-link">
      <ArrowLeft size={15} aria-hidden="true" />
      {t('classes.backToClasses')}
    </Link>
  );
}
