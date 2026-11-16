import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Badge,
  Button,
  ConfirmModal,
  DataTable,
  FilterBar,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';

const tabs = [
  ['years', 'academic.years'],
  ['semesters', 'academic.semesters'],
  ['grades', 'academic.grades'],
  ['sections', 'academic.sections'],
  ['subjects', 'academic.subjects'],
  ['curriculum', 'academic.curriculum'],
  ['rooms', 'academic.rooms'],
  ['departments', 'academic.departments'],
  ['holidays', 'academic.holidays'],
];

export default function AcademicPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('years');

  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('academic.eyebrow')} title={t('academic.title')} copy={t('academic.copy')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="tabs-scroll">
          {tabs.map(([value, key]) => (
            <TabsTrigger key={value} value={value}>{t(key)}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="years"><YearsTab /></TabsContent>
        <TabsContent value="semesters"><SemestersTab /></TabsContent>
        <TabsContent value="grades"><GradesTab /></TabsContent>
        <TabsContent value="sections"><SectionsTab /></TabsContent>
        <TabsContent value="subjects"><SubjectsTab /></TabsContent>
        <TabsContent value="curriculum"><CurriculumTab /></TabsContent>
        <TabsContent value="rooms"><RoomsTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="holidays"><HolidaysTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useRefreshReferences() {
  const { reload } = useReference();
  return reload;
}

function YearsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const refresh = useRefreshReferences();
  const { data, loading, error, reload } = useApi('/academic-years');
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'label', label: t('academic.label'), required: true, span: 'half', placeholder: '2027–2028' },
    { name: 'startDate', label: t('academic.startDate'), type: 'date', required: true, span: 'half' },
    { name: 'endDate', label: t('academic.endDate'), type: 'date', required: true, span: 'half' },
    { name: 'isCurrent', label: t('academic.isCurrent'), type: 'checkbox', span: 'half' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/academic-years/${editing.id}`, payload);
    else await api.post('/academic-years', payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.years')}
      actions={
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={15} /> {t('common.add')}
        </Button>
      }
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'label', label: t('academic.label'), render: (row) => <strong>{row.label}</strong> },
          { key: 'start_date', label: t('academic.startDate'), render: (row) => format.formatDate(row.start_date) },
          { key: 'end_date', label: t('academic.endDate'), render: (row) => format.formatDate(row.end_date) },
          { key: 'status', label: t('common.status'), render: (row) => (Number(row.is_current) ? <Badge status="active" /> : null) },
          {
            key: 'actions',
            label: t('common.actions'),
            align: 'end',
            render: (row) => (
              <Button variant="quiet" size="sm" onClick={(event) => { event.stopPropagation(); setEditing(row); setOpen(true); }}>
                {t('common.edit')}
              </Button>
            ),
          },
        ]}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={fields}
        initialValues={editing ? { ...editing, isCurrent: Boolean(editing.is_current) } : { isCurrent: false }}
        onSubmit={submit}
      />
    </Panel>
  );
}

function SemestersTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, currentYear, reload: refresh } = useReference();
  const [yearId, setYearId] = useState(currentYear?.id ?? '');
  const effectiveYear = yearId || currentYear?.id;
  const { data, loading, error, reload } = useApi(`/academic-years/${effectiveYear}`, { enabled: Boolean(effectiveYear) });
  const rows = data?.semesters ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'number', label: t('academic.semesterNumber'), type: 'number', required: true, span: 'half', min: 1, max: 4 },
    { name: 'name', label: t('academic.semesterName'), span: 'half' },
    { name: 'startDate', label: t('academic.startDate'), type: 'date', required: true, span: 'half' },
    { name: 'endDate', label: t('academic.endDate'), type: 'date', required: true, span: 'half' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/academic-years/${effectiveYear}/semesters/${editing.id}`, payload);
    else await api.post(`/academic-years/${effectiveYear}/semesters`, payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.semesters')}
      actions={
        <div className="inline-actions">
          <Select value={effectiveYear ?? ''} onChange={(event) => setYearId(Number(event.target.value))}>
            {years.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
          </Select>
          <Button size="sm" disabled={!effectiveYear} onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus size={15} /> {t('common.add')}
          </Button>
        </div>
      }
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'number', label: '#', width: 60 },
          { key: 'name', label: t('academic.semesterName'), render: (row) => <strong>{row.name}</strong> },
          { key: 'start_date', label: t('academic.startDate'), render: (row) => format.formatDate(row.start_date) },
          { key: 'end_date', label: t('academic.endDate'), render: (row) => format.formatDate(row.end_date) },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => (
              <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>
                {t('common.edit')}
              </Button>
            ),
          },
        ]}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={fields}
        initialValues={editing ?? { number: rows.length + 1 }}
        onSubmit={submit}
      />
    </Panel>
  );
}

function GradesTab() {
  const { t } = useTranslation();
  const refresh = useRefreshReferences();
  const { data, loading, error, reload } = useApi('/grade-levels');
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'number', label: t('academic.gradeNumber'), type: 'number', required: true, span: 'half', min: 1, max: 12 },
    { name: 'name', label: t('academic.gradeName'), span: 'half' },
    { name: 'nameFa', label: 'نام (دری)', span: 'half' },
    { name: 'namePs', label: 'نوم (پښتو)', span: 'half' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/grade-levels/${editing.id}`, payload);
    else await api.post('/grade-levels', payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.grades')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'number', label: '#', width: 64 },
          { key: 'name', label: t('academic.gradeName'), render: (row) => <strong>{row.name}</strong> },
          { key: 'name_fa', label: 'دری' },
          { key: 'name_ps', label: 'پښتو' },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={fields}
        initialValues={editing ?? {}}
        onSubmit={submit}
      />
    </Panel>
  );
}

function SectionsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, grades, teacherOptions, currentYear, reload: refresh } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const [grade, setGrade] = useState('');
  const { data, loading, error, reload } = useApi('/sections', { params: { academicYearId: year || undefined, gradeLevelId: grade || undefined, pageSize: 100 } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = useMemo(() => [
    { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
    { name: 'gradeLevelId', label: t('academic.grades'), type: 'select', required: true, span: 'half', options: grades.map((item) => ({ value: item.id, label: item.name || `Grade ${item.number}` })) },
    { name: 'name', label: t('academic.sectionName'), required: true, span: 'half', placeholder: 'A' },
    { name: 'capacity', label: t('academic.capacity'), type: 'number', span: 'half', min: 1 },
    { name: 'homeroomTeacherId', label: t('academic.homeroomTeacher'), type: 'select', span: 'full', options: teacherOptions },
  ], [t, years, grades, teacherOptions]);

  async function submit(payload) {
    if (editing) await api.put(`/sections/${editing.id}`, payload);
    else await api.post('/sections', payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.sections')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <FilterBar>
        <Select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Select value={grade} onChange={(event) => setGrade(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
      </FilterBar>
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'grade_name', label: t('academic.grades'), render: (row) => row.grade_name || `Grade ${row.grade_number}` },
          { key: 'name', label: t('academic.sectionName'), render: (row) => <strong>{row.name}</strong> },
          { key: 'academic_year_label', label: t('admissions.academicYear') },
          { key: 'homeroom', label: t('academic.homeroomTeacher'), render: (row) => row.homeroom_first_name ? `${row.homeroom_first_name} ${row.homeroom_last_name}` : '—' },
          { key: 'occupancy', label: t('academic.occupancy'), render: (row) => `${format.formatInteger(row.occupancy ?? 0)} / ${format.formatInteger(row.capacity)}` },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={editing ? fields.filter((field) => !['academicYearId', 'gradeLevelId'].includes(field.name)) : fields}
        initialValues={editing ? { ...editing, homeroomTeacherId: editing.homeroom_teacher_id ?? '' } : { academicYearId: currentYear?.id, capacity: 30 }}
        onSubmit={submit}
      />
    </Panel>
  );
}

function SubjectsTab() {
  const { t } = useTranslation();
  const { departments, reload: refresh } = useReference();
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useApi('/subjects', { params: { search: search || undefined, pageSize: 200 } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'code', label: t('academic.subjectCode'), required: true, span: 'half' },
    { name: 'name', label: t('academic.subjectName'), required: true, span: 'half' },
    { name: 'nameFa', label: 'نام (دری)', span: 'half' },
    { name: 'namePs', label: 'نوم (پښتو)', span: 'half' },
    { name: 'departmentId', label: t('academic.departments'), type: 'select', required: true, span: 'half', options: departments.map((item) => ({ value: item.id, label: item.name })) },
    { name: 'hasExam', label: t('academic.hasExam'), type: 'checkbox', span: 'half', defaultValue: true },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/subjects/${editing.id}`, payload);
    else await api.post('/subjects', payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.subjects')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <FilterBar><input className="input" placeholder={t('common.search')} value={search} onChange={(event) => setSearch(event.target.value)} /></FilterBar>
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'code', label: t('academic.subjectCode'), render: (row) => <strong>{row.code}</strong> },
          { key: 'name', label: t('academic.subjectName') },
          { key: 'department_name', label: t('academic.departments') },
          { key: 'has_exam', label: t('academic.hasExam'), render: (row) => (Number(row.has_exam) ? <Badge tone="info">{t('common.yes', { defaultValue: 'Yes' })}</Badge> : '—') },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={fields}
        initialValues={editing ? { ...editing, hasExam: Number(editing.has_exam) === 1 } : { hasExam: true }}
        onSubmit={submit}
      />
    </Panel>
  );
}

function CurriculumTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, grades, subjects, currentYear, reload: refresh } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const [grade, setGrade] = useState('');
  const { data, loading, error, reload } = useApi('/curriculum', { params: { academicYearId: year || undefined, gradeLevelId: grade || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [copyTo, setCopyTo] = useState('');

  const fields = [
    { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
    { name: 'gradeLevelId', label: t('academic.grades'), type: 'select', required: true, span: 'half', options: grades.map((item) => ({ value: item.id, label: item.name })) },
    { name: 'subjectId', label: t('academic.subjects'), type: 'select', required: true, span: 'half', options: subjects.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` })) },
    { name: 'weeklyPeriods', label: t('academic.weeklyPeriods'), type: 'number', span: 'half', min: 0, defaultValue: 4 },
    { name: 'isElective', label: t('academic.isElective'), type: 'checkbox' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/curriculum/${editing.id}`, { weeklyPeriods: payload.weeklyPeriods, isElective: payload.isElective });
    else await api.post('/curriculum', payload);
    reload();
    refresh();
  }

  async function remove(row) {
    await api.delete(`/curriculum/${row.id}`);
    reload();
    refresh();
  }

  async function copy() {
    await api.post('/curriculum/copy', { fromAcademicYearId: Number(copyFrom), toAcademicYearId: Number(copyTo) });
    setCopyOpen(false);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.curriculum')}
      actions={
        <div className="inline-actions">
          <Select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
          <Select value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Button variant="quiet" size="sm" onClick={() => setCopyOpen(true)}>{t('academic.copyCurriculum')}</Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>
        </div>
      }
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'grade_name', label: t('academic.grades') },
          { key: 'subject_name', label: t('academic.subjects'), render: (row) => <strong>{row.subject_code} — {row.subject_name}</strong> },
          { key: 'weekly_periods', label: t('academic.weeklyPeriods'), render: (row) => format.formatInteger(row.weekly_periods) },
          { key: 'is_elective', label: t('academic.isElective'), render: (row) => (Number(row.is_elective) ? t('common.yes', { defaultValue: 'Yes' }) : '—') },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => (
              <div className="inline-actions">
                <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>
                <Button variant="quiet" size="sm" onClick={() => remove(row)} aria-label={t('common.delete')}><Trash2 size={14} /></Button>
              </div>
            ),
          },
        ]}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={editing ? fields.filter((field) => ['weeklyPeriods', 'isElective'].includes(field.name)) : fields}
        initialValues={editing ? { ...editing, isElective: Number(editing.is_elective) === 1 } : { academicYearId: currentYear?.id, weeklyPeriods: 4, isElective: false }}
        onSubmit={submit}
      />
      <EntityFormModal
        open={copyOpen}
        onOpenChange={setCopyOpen}
        title={t('academic.copyCurriculum')}
        description={t('academic.copyCurriculumHint')}
        fields={[
          { name: 'fromAcademicYearId', label: t('academic.fromYear'), type: 'select', required: true, options: years.map((item) => ({ value: item.id, label: item.label })) },
          { name: 'toAcademicYearId', label: t('academic.toYear'), type: 'select', required: true, options: years.map((item) => ({ value: item.id, label: item.label })) },
        ]}
        initialValues={{ fromAcademicYearId: copyFrom || currentYear?.id, toAcademicYearId: copyTo }}
        onSubmit={async (payload) => {
          setCopyFrom(payload.fromAcademicYearId);
          setCopyTo(payload.toAcademicYearId);
          await api.post('/curriculum/copy', payload);
          reload();
          refresh();
        }}
      />
    </Panel>
  );
}

function RoomsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const refresh = useRefreshReferences();
  const { data, loading, error, reload } = useApi('/rooms', { params: { pageSize: 100 } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'name', label: t('academic.roomName'), required: true, span: 'half' },
    { name: 'capacity', label: t('academic.capacity'), type: 'number', span: 'half', min: 1 },
    { name: 'building', label: t('academic.building'), span: 'full' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/rooms/${editing.id}`, payload);
    else await api.post('/rooms', payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.rooms')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'name', label: 'Room', render: (row) => <strong>{row.name}</strong> },
          { key: 'building', label: t('academic.building') },
          { key: 'capacity', label: t('academic.capacity'), render: (row) => format.formatInteger(row.capacity) },
          { key: 'status', label: t('common.status'), render: (row) => <Badge status={row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
      />
      <EntityFormModal open={open} onOpenChange={setOpen} title={editing ? t('common.edit') : t('common.add')} fields={fields} initialValues={editing ?? { capacity: 30 }} onSubmit={submit} />
    </Panel>
  );
}

function DepartmentsTab() {
  const { t } = useTranslation();
  const refresh = useRefreshReferences();
  const { data, loading, error, reload } = useApi('/departments', { params: { pageSize: 100 } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'name', label: t('academic.departmentName'), required: true, span: 'half' },
    { name: 'nameFa', label: 'نام (دری)', span: 'half' },
    { name: 'namePs', label: 'نوم (پښتو)', span: 'half' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/departments/${editing.id}`, payload);
    else await api.post('/departments', payload);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('academic.departments')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'name', label: t('academic.departmentName'), render: (row) => <strong>{row.name}</strong> },
          { key: 'name_fa', label: 'دری' },
          { key: 'name_ps', label: 'پښتو' },
          { key: 'status', label: t('common.status'), render: (row) => <Badge status={row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
      />
      <EntityFormModal open={open} onOpenChange={setOpen} title={editing ? t('common.edit') : t('common.add')} fields={fields} initialValues={editing ?? {}} onSubmit={submit} />
    </Panel>
  );
}

function HolidaysTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data, loading, error, reload } = useApi('/holidays', { params: { academicYearId: year || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fields = [
    { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, options: years.map((item) => ({ value: item.id, label: item.label })) },
    { name: 'date', label: t('attendance.date'), type: 'date', required: true },
    { name: 'label', label: t('academic.holidayLabel'), required: true },
  ];

  async function submit(payload) {
    await api.post('/holidays', payload);
    reload();
  }

  return (
    <Panel
      title={t('academic.holidays')}
      actions={
        <div className="inline-actions">
          <Select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">{t('common.all')}</option>
            {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
          <Button size="sm" onClick={() => setOpen(true)}><Plus size={15} /> {t('common.add')}</Button>
        </div>
      }
    >
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'date', label: t('attendance.date'), render: (row) => <strong>{format.formatDate(row.date)}</strong> },
          { key: 'label', label: t('academic.holidayLabel') },
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
        body={deleting ? `${format.formatDate(deleting.date)} — ${deleting.label}` : ''}
        onConfirm={async () => {
          await api.delete(`/holidays/${deleting.id}`);
          setDeleting(null);
          reload();
        }}
      />
    </Panel>
  );
}
