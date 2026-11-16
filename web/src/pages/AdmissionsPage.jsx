import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Check, Plus, UserRoundCheck, X } from 'lucide-react';
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
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { useFormat } from '../lib/format.js';

export default function AdmissionsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('applicants');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('admissions.eyebrow')} title={t('admissions.title')} copy={t('admissions.copy')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="applicants">{t('admissions.applicants')}</TabsTrigger>
          <TabsTrigger value="enrollments">{t('admissions.enrollments')}</TabsTrigger>
          <TabsTrigger value="promotions">{t('admissions.promotions')}</TabsTrigger>
        </TabsList>
        <TabsContent value="applicants"><ApplicantsTab /></TabsContent>
        <TabsContent value="enrollments"><EnrollmentsTab /></TabsContent>
        <TabsContent value="promotions"><PromotionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicantsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { grades, sections, reload: refresh } = useReference();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const params = useMemo(() => ({ search: search || undefined, status: status || undefined }), [search, status]);
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/applicants', params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [admitting, setAdmitting] = useState(null);
  const [deciding, setDeciding] = useState(null);

  const fields = useMemo(
    () => [
      { name: 'firstName', label: t('people.firstName'), required: true, span: 'half' },
      { name: 'lastName', label: t('people.lastName'), required: true, span: 'half' },
      { name: 'dateOfBirth', label: t('people.dateOfBirth'), type: 'date', span: 'half' },
      { name: 'gender', label: t('people.gender', { defaultValue: 'Gender' }), type: 'select', span: 'half', options: [
        { value: 'female', label: t('people.female', { defaultValue: 'Female' }) },
        { value: 'male', label: t('people.male', { defaultValue: 'Male' }) },
      ] },
      { name: 'guardianName', label: t('people.guardianName'), span: 'half' },
      { name: 'phone', label: t('settings.phone'), span: 'half' },
      { name: 'desiredGradeLevelId', label: t('admissions.desiredGrade'), type: 'select', span: 'half', options: grades.map((grade) => ({ value: grade.id, label: grade.name })) },
      ...(editing ? [{ name: 'status', label: t('people.status'), type: 'select', span: 'half', options: ['applicant', 'admitted', 'rejected', 'withdrawn'].map((value) => ({ value, label: t(`status.${value}`) })) }] : []),
      { name: 'notes', label: t('admissions.notes'), type: 'textarea', span: 'full' },
    ],
    [editing, grades, t],
  );

  async function submit(payload) {
    if (editing) await api.put(`/applicants/${editing.id}`, payload);
    else await api.post('/applicants', payload);
    reload();
    notify('admissions.saved', 'success');
  }

  async function admit(payload) {
    await api.post(`/applicants/${admitting.id}/admit`, payload);
    setAdmitting(null);
    reload();
    refresh();
    notify('admissions.admittedToast', 'success');
  }

  async function decide(applicant, nextStatus) {
    await api.put(`/applicants/${applicant.id}`, { status: nextStatus });
    setDeciding(null);
    reload();
  }

  return (
    <Panel
      title={t('admissions.applicants')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder={t('admissions.searchApplicants', { defaultValue: 'Search applicants by name or phone' })} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {['applicant', 'admitted', 'rejected', 'withdrawn'].map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}
        </Select>
      </FilterBar>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={items}
        columns={[
          { key: 'name', label: t('admissions.applicant'), render: (row) => <strong>{row.first_name} {row.last_name}</strong> },
          { key: 'desired_grade', label: t('admissions.desiredGrade'), render: (row) => row.desired_grade_name || '—' },
          { key: 'guardian_name', label: t('people.guardian') },
          { key: 'phone', label: t('settings.phone') },
          { key: 'created_at', label: t('common.created'), render: (row) => format.formatDate(row.created_at) },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => (
              <div className="inline-actions">
                {row.status === 'applicant' ? (
                  <>
                    <Button size="sm" onClick={() => setAdmitting(row)}><UserRoundCheck size={14} /> {t('admissions.admit')}</Button>
                    <Button variant="quiet" size="sm" onClick={() => decide(row, 'rejected')}><X size={14} /></Button>
                  </>
                ) : null}
                <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>
              </div>
            ),
          },
        ]}
        empty={<EmptyState title={t('admissions.noApplicants')} copy={t('common.noResultsHint')} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />

      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={fields}
        initialValues={editing ?? {}}
        onSubmit={submit}
      />

      <EntityFormModal
        open={Boolean(admitting)}
        onOpenChange={(value) => !value && setAdmitting(null)}
        title={t('admissions.admit')}
        description={`${admitting?.first_name ?? ''} ${admitting?.last_name ?? ''}`.trim()}
        fields={[
          { name: 'admissionNumber', label: t('people.admissionNumber'), span: 'half' },
          { name: 'sectionId', label: t('people.section'), type: 'select', span: 'half', options: sections.map((section) => ({ value: section.id, label: `${section.grade_name ?? `Grade ${section.grade_number}`} — ${section.name}` })) },
        ]}
        initialValues={{}}
        onSubmit={admit}
      />
    </Panel>
  );
}

function EnrollmentsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { sections, years, currentYear, studentOptions, reload: refresh } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('active');
  const params = useMemo(
    () => ({ academicYearId: year || undefined, sectionId: section || undefined, status: status || undefined }),
    [year, section, status],
  );
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/enrollments', params);
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState(null);

  async function enroll(payload) {
    await api.post('/enrollments', payload);
    setOpen(false);
    reload();
    refresh();
  }

  async function transfer(payload) {
    await api.post(`/enrollments/${transferring.id}/transfer`, payload);
    setTransferring(null);
    reload();
    refresh();
  }

  return (
    <Panel
      title={t('admissions.enrollments')}
      actions={<Button size="sm" onClick={() => setOpen(true)}><Plus size={15} /> {t('admissions.enroll')}</Button>}
    >
      <FilterBar>
        <Select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">{t('admissions.academicYear')}: {t('common.all')}</option>
          {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Select value={section} onChange={(event) => setSection(event.target.value)}>
          <option value="">{t('people.section')}: {t('common.all')}</option>
          {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {['active', 'transferred', 'withdrawn', 'graduated'].map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}
        </Select>
      </FilterBar>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={items}
        columns={[
          { key: 'student', label: t('people.student'), render: (row) => <span><strong>{row.first_name} {row.last_name}</strong><span className="muted person-sub">{row.admission_number}</span></span> },
          { key: 'section', label: t('people.section'), render: (row) => `${row.grade_name ?? `Grade ${row.grade_number}`} — ${row.section_name}` },
          { key: 'academic_year_label', label: t('admissions.academicYear') },
          { key: 'started_at', label: t('common.started'), render: (row) => format.formatDate(row.started_at) },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => row.status === 'active' ? (
              <Button variant="quiet" size="sm" onClick={() => setTransferring(row)}><ArrowRightLeft size={14} /> {t('admissions.transfer')}</Button>
            ) : null,
          },
        ]}
        empty={<EmptyState title={t('admissions.noEnrollments')} copy={t('common.noResultsHint')} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />

      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={t('admissions.enroll')}
        fields={[
          { name: 'studentId', label: t('people.student'), type: 'select', required: true, options: studentOptions },
          { name: 'sectionId', label: t('people.section'), type: 'select', required: true, options: sections.map((item) => ({ value: item.id, label: `${item.grade_name ?? `Grade ${item.grade_number}`} — ${item.name}` })) },
        ]}
        initialValues={{}}
        onSubmit={enroll}
      />

      <EntityFormModal
        open={Boolean(transferring)}
        onOpenChange={(value) => !value && setTransferring(null)}
        title={t('admissions.transfer')}
        description={transferring ? `${transferring.first_name} ${transferring.last_name}` : ''}
        fields={[
          { name: 'sectionId', label: t('admissions.newSection'), type: 'select', required: true, options: sections.map((item) => ({ value: item.id, label: `${item.grade_name ?? `Grade ${item.grade_number}`} — ${item.name}` })) },
        ]}
        initialValues={{}}
        onSubmit={transfer}
      />
    </Panel>
  );
}

function PromotionsTab() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { sections, currentYear } = useReference();
  const [sourceSection, setSourceSection] = useState('');
  const [toSection, setToSection] = useState('');
  const [outcome, setOutcome] = useState('promoted');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState(new Set());
  const { data, loading, error, reload } = useApi(`/students`, {
    params: { sectionId: sourceSection || undefined, status: 'active', pageSize: 100 },
    enabled: Boolean(sourceSection),
  });
  const students = data?.items ?? [];

  function toggle(studentId) {
    const next = new Set(selected);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelected(next);
  }

  async function submit(event) {
    event.preventDefault();
    await api.post('/promotions', {
      studentIds: [...selected],
      outcome,
      toSectionId: outcome === 'graduated' ? undefined : Number(toSection),
      academicYearId: currentYear?.id,
      notes: notes || undefined,
    });
    setSelected(new Set());
    setNotes('');
    reload();
    notify('admissions.promotionDone', 'success', { count: selected.size });
  }

  return (
    <Panel title={t('admissions.promotions')} copy={t('admissions.promoteHint')}>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <form className="promotion-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('admissions.fromSection', { defaultValue: 'Current section' })}</span>
            <Select value={sourceSection} onChange={(event) => { setSourceSection(event.target.value); setSelected(new Set()); }}>
              <option value="">{t('common.select')}</option>
              {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
            </Select>
          </label>
          <label className="field">
            <span className="field-label">{t('admissions.outcome')}</span>
            <Select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
              <option value="promoted">{t('status.promoted')}</option>
              <option value="retained">{t('status.retained')}</option>
              <option value="graduated">{t('status.graduated')}</option>
            </Select>
          </label>
          {outcome !== 'graduated' ? (
            <label className="field">
              <span className="field-label">{t('admissions.toSection')}</span>
              <Select value={toSection} onChange={(event) => setToSection(event.target.value)} required>
                <option value="">{t('common.select')}</option>
                {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
              </Select>
            </label>
          ) : null}
          <label className="field">
            <span className="field-label">{t('admissions.notes')}</span>
            <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>

        {sourceSection ? (
          <div className="promotion-students">
            <div className="section-heading">
              <h3 className="section-title">{t('admissions.selectStudents')}</h3>
              <span className="muted">{selected.size} / {students.length}</span>
            </div>
            {loading ? <LoadingBlock rows={4} /> : students.length === 0 ? <p className="muted">{t('common.noResults')}</p> : (
              <div className="checkbox-grid">
                {students.map((student) => (
                  <Checkbox
                    key={student.id}
                    label={`${student.first_name} ${student.last_name} · ${student.admission_number}`}
                    checked={selected.has(student.id)}
                    onChange={() => toggle(student.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : <p className="muted">{t('admissions.chooseSectionHint', { defaultValue: 'Choose a current section to load its students.' })}</p>}

        <div className="detail-footer">
          <Button type="submit" disabled={selected.size === 0 || (outcome !== 'graduated' && !toSection)}>
            <Check size={16} /> {t('admissions.runPromotion', { defaultValue: 'Run promotion' })}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
