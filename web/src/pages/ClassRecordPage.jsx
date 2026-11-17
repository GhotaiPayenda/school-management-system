import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
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

export default function ClassRecordPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const { permissions } = useSelector(selectAuth);
  const canViewStudents = permissions.includes('students.view');
  const canManageAcademic = permissions.includes('academic.manage');

  const { data, loading, error, reload } = useApi(`/sections/${id}/profile`);
  const [missingYear, setMissingYear] = useState(null);

  useEffect(() => {
    setMissingYear(null);
  }, [id]);

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
