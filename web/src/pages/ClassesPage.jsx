import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';

function localizedGrade(entry, language) {
  if (language === 'fa-AF') return entry.grade_name_fa || entry.grade_name;
  if (language === 'ps-AF') return entry.grade_name_ps || entry.grade_name;
  return entry.grade_name;
}

function yearLabel(year, format) {
  if (!year) return '—';
  if (!format.eastern) return year.label || '—';
  const start = format.formatDate(year.start_date, { year: 'numeric' });
  const end = format.formatDate(year.end_date, { year: 'numeric' });
  return start === end ? start : `${start} – ${end}`;
}

function buildGroups(classes, yearsById, language) {
  const yearMap = new Map();
  for (const entry of classes) {
    let year = yearMap.get(entry.academic_year_id);
    if (!year) {
      year = {
        id: entry.academic_year_id,
        year: yearsById.get(entry.academic_year_id) ?? {
          id: entry.academic_year_id,
          label: entry.academic_year_label,
          start_date: entry.academic_year_start_date,
          end_date: entry.academic_year_start_date,
          is_current: entry.is_current_year,
        },
        grades: new Map(),
        count: 0,
      };
      yearMap.set(entry.academic_year_id, year);
    }
    year.count += 1;
    let grade = year.grades.get(entry.grade_level_id);
    if (!grade) {
      grade = {
        id: entry.grade_level_id,
        number: entry.grade_number,
        name: localizedGrade(entry, language),
        classes: [],
      };
      year.grades.set(entry.grade_level_id, grade);
    }
    grade.classes.push(entry);
  }

  return [...yearMap.values()].map((year) => ({
    ...year,
    grades: [...year.grades.values()].sort((a, b) => a.number - b.number),
  }));
}

export default function ClassesPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const [yearFilter, setYearFilter] = useState(null);

  const params = useMemo(() => {
    if (yearFilter === 'all') return { allYears: 1 };
    if (yearFilter) return { academicYearId: yearFilter };
    return {};
  }, [yearFilter]);

  const { data, loading, error, reload } = useApi('/classes', { params });
  const years = data?.years ?? [];
  const yearsById = useMemo(() => new Map(years.map((year) => [year.id, year])), [years]);
  const groups = useMemo(
    () => buildGroups(data?.classes ?? [], yearsById, format.language),
    [data, yearsById, format.language],
  );

  const selectedValue =
    yearFilter ?? (data?.all_years ? 'all' : data?.selected_academic_year_id ? String(data.selected_academic_year_id) : '');

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('classes.eyebrow')} title={t('classes.title')} copy={t('classes.copy')} />

      <Panel
        title={t('classes.yearFilter')}
        actions={
          <div className="class-year-filter">
            <Select
              aria-label={t('classes.yearFilter')}
              value={selectedValue}
              onChange={(event) => setYearFilter(event.target.value)}
              disabled={loading && !data}
            >
              <option value="all">{t('classes.allYears')}</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {yearLabel(year, format)}
                  {Number(year.is_current) === 1 ? ` · ${t('classes.currentYear')}` : ''}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {loading ? <LoadingBlock rows={6} /> : null}
        {error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!loading && !error && groups.length === 0 ? (
          <EmptyState title={t('classes.emptyTitle')} copy={t('classes.emptyCopy')} />
        ) : null}
        {!loading && !error && groups.length > 0 ? (
          <div className="class-year-groups">
            {groups.map((group) => (
              <section key={group.id} className="class-year-group" aria-labelledby={`class-year-${group.id}`}>
                <div className="class-year-heading">
                  <h2 id={`class-year-${group.id}`} className="class-year-title">
                    {yearLabel(group.year, format)}
                  </h2>
                  {Number(group.year.is_current) === 1 ? (
                    <Badge tone="success">{t('classes.currentYear')}</Badge>
                  ) : null}
                  <span className="muted">{t('classes.showing', { count: format.formatInteger(group.count) })}</span>
                </div>
                {group.grades.map((grade) => (
                  <section
                    key={grade.id}
                    className="class-grade-group"
                    aria-labelledby={`class-grade-${group.id}-${grade.id}`}
                  >
                    <h3 id={`class-grade-${group.id}-${grade.id}`} className="class-grade-title">
                      {grade.name}
                    </h3>
                    <div className="class-grid">
                      {grade.classes.map((entry) => (
                        <ClassCard key={entry.id} entry={entry} year={group.year} />
                      ))}
                    </div>
                  </section>
                ))}
              </section>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function ClassCard({ entry, year }) {
  const { t } = useTranslation();
  const format = useFormat();
  const grade = localizedGrade(entry, format.language);
  const overCapacity = entry.active_students > entry.capacity;
  const atCapacity = entry.active_students === entry.capacity;

  return (
    <article className={`class-card${overCapacity ? ' class-card-over' : ''}`} data-class-id={entry.id}>
      <div className="class-card-head">
        <p className="eyebrow">{grade}</p>
        <h4 className="class-card-title">{t('classes.className', { name: entry.name })}</h4>
        <p className="class-card-year muted">{yearLabel(year, format)}</p>
      </div>

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
        {entry.unassigned_subject_count > 0 ? (
          <Badge tone="warning">
            <AlertTriangle size={13} aria-hidden="true" />
            {t('classes.unassignedWarning', { count: format.formatInteger(entry.unassigned_subject_count) })}
          </Badge>
        ) : null}
      </div>

      <dl className="class-facts">
        <div className="class-fact">
          <dt>{t('classes.gradeLevel')}</dt>
          <dd>{grade}</dd>
        </div>
        <div className="class-fact">
          <dt>{t('classes.academicYear')}</dt>
          <dd>{yearLabel(year, format)}</dd>
        </div>
        <div className="class-fact class-fact-wide">
          <dt>{t('classes.homeroomTeacher')}</dt>
          <dd>{entry.homeroom_teacher_name || t('classes.noHomeroomTeacher')}</dd>
        </div>
        <div className="class-fact">
          <dt>{t('classes.activeStudents')}</dt>
          <dd>
            {t('classes.occupancy', {
              active: format.formatInteger(entry.active_students),
              capacity: format.formatInteger(entry.capacity),
            })}
          </dd>
        </div>
        <div className="class-fact">
          <dt>{t('classes.inactiveStudents')}</dt>
          <dd>{format.formatInteger(entry.inactive_students)}</dd>
        </div>
        <div className="class-fact">
          <dt>{t('classes.subjects')}</dt>
          <dd>{format.formatInteger(entry.subject_count)}</dd>
        </div>
        <div className="class-fact">
          <dt>{t('classes.unassignedSubjects')}</dt>
          <dd>{format.formatInteger(entry.unassigned_subject_count)}</dd>
        </div>
        <div className="class-fact">
          <dt>{t('classes.attendanceRate')}</dt>
          <dd>{entry.attendance_rate === null ? t('classes.notRecorded') : format.formatPercent(entry.attendance_rate)}</dd>
        </div>
      </dl>
    </article>
  );
}
