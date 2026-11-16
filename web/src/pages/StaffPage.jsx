import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  KeyValue,
  LoadingBlock,
  Modal,
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
import { usePagedApi } from '../lib/usePagedApi.js';
import { useFormat } from '../lib/format.js';

export default function StaffPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { reload: refresh } = useReference();
  const [search, setSearch] = useState('');
  const [teacherOnly, setTeacherOnly] = useState('');
  const [status, setStatus] = useState('active');
  const params = useMemo(
    () => ({
      search: search || undefined,
      isTeacher: teacherOnly === '' ? undefined : teacherOnly === 'true',
      status: status || undefined,
    }),
    [search, teacherOnly, status],
  );
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/staff', params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const fields = useMemo(
    () => [
      { name: 'firstName', label: t('people.firstName'), required: true, span: 'half' },
      { name: 'lastName', label: t('people.lastName'), required: true, span: 'half' },
      { name: 'employeeNumber', label: t('people.employeeNumber'), span: 'half' },
      { name: 'gender', label: t('people.gender', { defaultValue: 'Gender' }), type: 'select', span: 'half', options: [
        { value: 'female', label: t('people.female', { defaultValue: 'Female' }) },
        { value: 'male', label: t('people.male', { defaultValue: 'Male' }) },
      ] },
      { name: 'dateOfBirth', label: t('people.dateOfBirth'), type: 'date', span: 'half' },
      { name: 'hireDate', label: t('people.hireDate'), type: 'date', span: 'half' },
      { name: 'phone', label: t('settings.phone'), span: 'half' },
      { name: 'email', label: t('settings.email'), type: 'email', span: 'half' },
      { name: 'address', label: t('settings.address'), span: 'full' },
      { name: 'qualification', label: t('people.qualification'), span: 'half' },
      { name: 'specialization', label: t('people.specialization'), span: 'half' },
      { name: 'nameFa', label: t('people.nameFa'), span: 'half' },
      { name: 'namePs', label: t('people.namePs'), span: 'half' },
      { name: 'isTeacher', label: t('people.isTeacher'), type: 'checkbox' },
    ],
    [t],
  );

  async function submit(payload) {
    if (editing) await api.put(`/staff/${editing.id}`, payload);
    else await api.post('/staff', payload);
    reload();
    refresh();
    notify('people.saved');
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('people.eyebrow')}
        title={t('people.staff')}
        copy={t('people.staffCopy')}
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
      />

      <Panel title={t('people.staff')}>
        <FilterBar>
          <SearchField value={search} onChange={setSearch} placeholder={t('people.searchStaffPlaceholder', { defaultValue: 'Search staff by name or employee number' })} />
          <Select value={teacherOnly} onChange={(event) => setTeacherOnly(event.target.value)}>
            <option value="">{t('common.all')}</option>
            <option value="true">{t('people.teachersOnly', { defaultValue: 'Teachers only' })}</option>
            <option value="false">{t('people.nonTeachers', { defaultValue: 'Non-teaching staff' })}</option>
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t('common.all')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="archived">{t('status.archived')}</option>
          </Select>
        </FilterBar>
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={items}
          onRowClick={(row) => setDetailId(row.id)}
          columns={[
            {
              key: 'staff',
              label: t('people.staffMember'),
              render: (row) => (
                <span className="person-cell">
                  <Avatar name={`${row.first_name} ${row.last_name}`} size="sm" />
                  <span>
                    <strong>{row.first_name} {row.last_name}</strong>
                    <span className="muted person-sub">{row.employee_number}</span>
                  </span>
                </span>
              ),
            },
            { key: 'specialization', label: t('people.specialization') },
            { key: 'phone', label: t('settings.phone') },
            { key: 'email', label: t('settings.email') },
            { key: 'is_teacher', label: t('people.isTeacher'), render: (row) => (Number(row.is_teacher) ? <Badge tone="info">{t('people.teacher', { defaultValue: 'Teacher' })}</Badge> : '—') },
            { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row) => (
                <div className="inline-actions">
                  <Button variant="quiet" size="sm" onClick={(event) => { event.stopPropagation(); setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>
                  <Button variant="quiet" size="sm" onClick={(event) => { event.stopPropagation(); setDetailId(row.id); }}>{t('common.view')}</Button>
                </div>
              ),
            },
          ]}
          empty={<EmptyState title={t('common.noResults')} copy={t('common.noResultsHint')} />}
        />
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />
      </Panel>

      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={fields}
        initialValues={editing ? { ...editing, hireDate: editing.hire_date, dateOfBirth: editing.date_of_birth, isTeacher: Boolean(editing.is_teacher) } : { isTeacher: false }}
        onSubmit={submit}
      />

      <StaffDetailModal staffId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function StaffDetailModal({ staffId, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const load = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      const response = await api.get(`/staff/${staffId}`);
      setDetail(response.data.data);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    if (staffId) load();
    else setDetail(null);
  }, [staffId, load]);

  async function createAccount(payload) {
    await api.post(`/accounts/staff/${staffId}`, payload);
    setAccountOpen(false);
    await load();
    notify('people.accountCreated');
  }

  return (
    <Modal
      open={Boolean(staffId)}
      onOpenChange={(value) => !value && onClose()}
      title={detail ? `${detail.first_name} ${detail.last_name}` : t('people.staffMember')}
      description={detail?.employee_number}
      size="lg"
    >
      {loading || !detail ? <LoadingBlock rows={6} /> : (
        <div className="detail-stack">
          <div className="profile-banner">
            <Avatar name={`${detail.first_name} ${detail.last_name}`} size="lg" />
            <div className="profile-copy">
              <div className="inline-actions">
                <Badge status={detail.status} />
                {Number(detail.is_teacher) ? <Badge tone="info">{t('people.teacher', { defaultValue: 'Teacher' })}</Badge> : null}
              </div>
              <h2 className="profile-name">{detail.first_name} {detail.last_name}</h2>
              <p className="muted">{detail.specialization || detail.qualification || '—'}</p>
            </div>
          </div>

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">{t('people.profile')}</TabsTrigger>
              <TabsTrigger value="assignments">{t('timetable.assignments')}</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <KeyValue
                columns={2}
                items={[
                  { label: t('people.employeeNumber'), value: detail.employee_number },
                  { label: t('people.hireDate'), value: format.formatDate(detail.hire_date) },
                  { label: t('people.qualification'), value: detail.qualification || '—' },
                  { label: t('people.specialization'), value: detail.specialization || '—' },
                  { label: t('settings.phone'), value: detail.phone || '—' },
                  { label: t('settings.email'), value: detail.email || '—' },
                  { label: t('settings.address'), value: detail.address || '—' },
                  { label: t('people.account'), value: detail.user ? <Badge status="active">{detail.user.email}</Badge> : <Badge status="archived">{t('people.noAccount')}</Badge> },
                ]}
              />
            </TabsContent>
            <TabsContent value="assignments">
              {(detail.assignments ?? []).length === 0 ? <p className="muted">{t('timetable.noLessons')}</p> : (
                <div className="record-list">
                  {detail.assignments.map((assignment) => (
                    <div className="record-row" key={assignment.id}>
                      <div className="record-main">
                        <strong>{assignment.subject_code} — {assignment.subject_name}</strong>
                        <span className="muted">{assignment.grade_number ? `Grade ${assignment.grade_number}` : ''} {assignment.section_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="detail-footer">
            {!detail.user && Number(detail.is_teacher) ? (
              <Button variant="quiet" size="sm" onClick={() => setAccountOpen(true)}>{t('people.createAccount')}</Button>
            ) : null}
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>

          <EntityFormModal
            open={accountOpen}
            onOpenChange={setAccountOpen}
            title={t('people.createAccount')}
            fields={[
              { name: 'email', label: t('settings.email'), type: 'email', required: true },
              { name: 'password', label: t('auth.password'), type: 'password', span: 'half' },
              { name: 'roleSlug', label: t('nav.roles'), type: 'select', span: 'half', options: [{ value: 'teacher', label: t('people.teacher', { defaultValue: 'Teacher' }) }], defaultValue: 'teacher' },
            ]}
            initialValues={{ roleSlug: 'teacher' }}
            onSubmit={createAccount}
          />
        </div>
      )}
    </Modal>
  );
}
