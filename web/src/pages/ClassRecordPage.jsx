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

export default function ClassRecordPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const { permissions } = useSelector(selectAuth);
  const canViewStudents = permissions.includes('students.view');

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
