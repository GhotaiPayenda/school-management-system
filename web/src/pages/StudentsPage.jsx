import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { FileDown, FileUp, Plus, Printer, Trash2, UserRound } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfirmModal,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
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
  Textarea,
} from '../components/ui.jsx';
import { usePagedApi } from '../lib/usePagedApi.js';
import { useApi } from '../lib/useApi.js';
import { downloadFile, readFileAsDataUrl } from '../lib/download.js';
import { useFormat } from '../lib/format.js';
import { PrintButton, PrintFooter, PrintHeader, usePrintMode } from '../components/print.jsx';

export default function StudentsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { sections, grades, years, currentYear, reload: refresh } = useReference();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [section, setSection] = useState('');
  const [year, setYear] = useState(currentYear?.id ?? '');
  const params = useMemo(
    () => ({ search: search || undefined, status: status || undefined, sectionId: section || undefined, academicYearId: year || undefined }),
    [search, status, section, year],
  );
  const { items, pagination, page, setPage, loading, error, reload } = usePagedApi('/students', params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [idCardId, setIdCardId] = useState(null);
  const [classListOpen, setClassListOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const studentParam = searchParams.get('studentId');

  useEffect(() => {
    if (studentParam && /^\d+$/.test(studentParam)) setDetailId(Number(studentParam));
  }, [studentParam]);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    if (studentParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('studentId');
      setSearchParams(next, { replace: true });
    }
  }, [studentParam, searchParams, setSearchParams]);

  const fields = useMemo(
    () => [
      { name: 'firstName', label: t('people.firstName'), required: true, span: 'half' },
      { name: 'lastName', label: t('people.lastName'), required: true, span: 'half' },
      { name: 'admissionNumber', label: t('people.admissionNumber'), span: 'half' },
      { name: 'gender', label: t('people.gender', { defaultValue: 'Gender' }), type: 'select', span: 'half', options: [
        { value: 'female', label: t('people.female', { defaultValue: 'Female' }) },
        { value: 'male', label: t('people.male', { defaultValue: 'Male' }) },
      ] },
      { name: 'dateOfBirth', label: t('people.dateOfBirth'), type: 'date', span: 'half' },
      { name: 'phone', label: t('settings.phone'), span: 'half' },
      { name: 'address', label: t('settings.address'), span: 'full' },
      { name: 'nameFa', label: t('people.nameFa'), span: 'half' },
      { name: 'namePs', label: t('people.namePs'), span: 'half' },
      ...(editing
        ? [{ name: 'status', label: t('people.status'), type: 'select', span: 'half', options: ['active', 'archived', 'graduated', 'withdrawn'].map((value) => ({ value, label: t(`status.${value}`) })) }]
        : [{ name: 'sectionId', label: t('people.section'), type: 'select', span: 'half', options: sections.map((item) => ({ value: item.id, label: `${item.grade_name ?? `Grade ${item.grade_number}`} — ${item.name}` })) }]),
    ],
    [editing, sections, t],
  );

  async function submit(payload) {
    if (editing) await api.put(`/students/${editing.id}`, payload);
    else await api.post('/students', payload);
    reload();
    refresh();
    notify('people.saved');
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const csv = await file.text();
      const response = await api.post('/students/import', { csv });
      notify('people.importResult', 'success', { created: response.data.data.created, skipped: response.data.data.skipped.length });
      reload();
      refresh();
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('people.eyebrow')}
        title={t('people.students')}
        copy={t('people.studentsCopy')}
        actions={
          <div className="inline-actions">
            <Button variant="quiet" size="sm" disabled={!section} title={!section ? t('people.classListHint') : undefined} onClick={() => setClassListOpen(true)}>
              <Printer size={15} /> {t('people.classList')}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => downloadFile('/students/export', { filename: 'students.csv' })}>
              <FileDown size={15} /> {t('common.export')}
            </Button>
            <Button variant="quiet" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
              <FileUp size={15} /> {importing ? t('common.saving') : t('common.import')}
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus size={15} /> {t('common.add')}
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
          </div>
        }
      />

      <Panel title={t('people.students')}>
        <FilterBar>
          <SearchField value={search} onChange={setSearch} placeholder={t('people.searchPlaceholder')} />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t('common.all')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="archived">{t('status.archived')}</option>
            <option value="graduated">{t('status.graduated')}</option>
            <option value="withdrawn">{t('status.withdrawn')}</option>
          </Select>
          <Select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="">{t('people.section')}: {t('common.all')}</option>
            {sections.map((item) => <option key={item.id} value={item.id}>{item.grade_name ?? `Grade ${item.grade_number}`} — {item.name}</option>)}
          </Select>
          <Select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">{t('admissions.academicYear')}: {t('common.all')}</option>
            {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
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
              key: 'student',
              label: t('people.student'),
              render: (row) => (
                <span className="person-cell">
                  <Avatar name={`${row.first_name} ${row.last_name}`} size="sm" />
                  <span>
                    <strong>{row.first_name} {row.last_name}</strong>
                    <span className="muted person-sub">{row.admission_number}</span>
                  </span>
                </span>
              ),
            },
            { key: 'grade', label: t('people.grade'), render: (row) => row.grade_name ? `${row.grade_name} — ${row.section_name}` : '—' },
            { key: 'date_of_birth', label: t('people.dateOfBirth'), render: (row) => format.formatDate(row.date_of_birth) },
            { key: 'phone', label: t('settings.phone') },
            { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row) => (
                <div className="inline-actions">
                  <Button variant="quiet" size="sm" onClick={(event) => { event.stopPropagation(); setIdCardId(row.id); }}>{t('people.idCard')}</Button>
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
        initialValues={editing ?? { sectionId: '' }}
        onSubmit={submit}
      />

      <StudentDetailModal studentId={detailId} onClose={closeDetail} onChanged={reload} />
      <IdCardModal studentId={idCardId} onClose={() => setIdCardId(null)} />
      <ClassListModal
        sectionId={section}
        academicYearId={year}
        section={sections.find((item) => Number(item.id) === Number(section))}
        yearLabel={years.find((item) => Number(item.id) === Number(year))?.label}
        onClose={() => setClassListOpen(false)}
        open={classListOpen}
      />
    </div>
  );
}

function IdCardModal({ studentId, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi(`/students/${studentId}`, { enabled: Boolean(studentId) });
  usePrintMode(Boolean(studentId));
  const enrollment = data?.enrollments?.find((row) => row.status === 'active');
  const guardian = data?.guardians?.[0];

  return (
    <Modal open={Boolean(studentId)} onOpenChange={(value) => !value && onClose()} title={t('people.idCard')} description={data ? `${data.first_name} ${data.last_name}` : ''} size="sm">
      {loading || !data ? <LoadingBlock rows={4} /> : (
        <>
          <div className="print-area">
            <div className="id-card">
              <div className="id-card-side">
                <span className="brand-mark" aria-hidden="true">M</span>
                <span>{t('app.shortName', { defaultValue: 'Meridian' })}</span>
              </div>
              <div className="id-card-body">
                <p className="eyebrow">{t('people.idCard')}</p>
                <h3>{data.first_name} {data.last_name}</h3>
                <span className="id-card-number">{data.admission_number}</span>
                <p>{enrollment ? `${enrollment.grade_name} — ${enrollment.section_name}` : '—'}</p>
                <p>{enrollment?.academic_year_label || ''}</p>
                <p>{t('people.dateOfBirth')}: {format.formatDate(data.date_of_birth)}</p>
                {guardian ? <p>{t('people.guardian')}: {guardian.first_name} {guardian.last_name} · {guardian.phone || ''}</p> : null}
                <p className="id-card-footer">{t('people.idCardFooter')}</p>
              </div>
            </div>
          </div>
          <div className="detail-footer no-print">
            <PrintButton />
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ClassListModal({ open, sectionId, academicYearId, section, yearLabel, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi('/students', {
    params: {
      sectionId: sectionId || undefined,
      academicYearId: academicYearId || undefined,
      status: 'active',
      pageSize: 100,
    },
    enabled: Boolean(open && sectionId),
  });
  usePrintMode(open && Boolean(sectionId));
  const rows = data?.items ?? [];
  const sectionLabel = section
    ? `${section.grade_name ?? `Grade ${section.grade_number}`} — ${section.name}`
    : '';

  return (
    <Modal open={open} onOpenChange={(value) => !value && onClose()} title={t('people.classList')} description={sectionLabel} size="lg">
      {loading || !data ? <LoadingBlock rows={8} /> : (
        <>
          <div className="print-area print-sheet">
            <PrintHeader
              title={t('people.classList')}
              meta={[sectionLabel, yearLabel, t('people.studentCount', { value: format.formatInteger(rows.length) })].filter(Boolean).join(' · ')}
            />
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('people.admissionNumber')}</th>
                  <th>{t('people.student')}</th>
                  <th>{t('people.gender')}</th>
                  <th>{t('people.dateOfBirth')}</th>
                  <th>{t('settings.phone')}</th>
                  <th>{t('people.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{format.formatInteger(index + 1)}</td>
                    <td className="mono">{row.admission_number}</td>
                    <td><strong>{row.first_name} {row.last_name}</strong></td>
                    <td>{row.gender ? t(`people.${row.gender}`) : '—'}</td>
                    <td>{format.formatDate(row.date_of_birth)}</td>
                    <td>{row.phone || '—'}</td>
                    <td>{t(`status.${row.status}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PrintFooter items={[{ label: t('people.teacher', { defaultValue: 'Teacher' }) }, { label: t('print.signature') }]} />
          </div>
          <div className="detail-footer no-print">
            <PrintButton />
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function StudentDetailModal({ studentId, onClose, onChanged }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { sections, studentOptions, reload: refresh } = useReference();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [siblingOpen, setSiblingOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const open = Boolean(studentId);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await api.get(`/students/${studentId}`);
      setDetail(response.data.data);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) load();
    else setDetail(null);
  }, [studentId, load]);

  async function addGuardian(payload) {
    await api.post(`/students/${studentId}/guardians`, payload);
    setGuardianOpen(false);
    await load();
    notify('people.guardianSaved');
  }

  async function addSibling(payload) {
    await api.post(`/students/${studentId}/siblings`, payload);
    setSiblingOpen(false);
    await load();
  }

  async function createAccount(payload) {
    await api.post(`/accounts/student/${studentId}`, payload);
    setAccountOpen(false);
    await load();
    notify('people.accountCreated');
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await api.post('/documents', { entityType: 'student', entityId: Number(studentId), fileName: file.name, dataUrl });
      await load();
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function removeGuardian(guardian) {
    await api.delete(`/students/${studentId}/guardians/${guardian.id}`);
    setRemoving(null);
    await load();
    onChanged?.();
  }

  const currentEnrollment = detail?.enrollments?.find((row) => row.status === 'active');
  const attendance = detail?.attendance ?? {};
  const attendanceTotal = attendance.reduce?.((sum, row) => sum + Number(row.total), 0) ?? 0;
  const present = attendance.find?.((row) => row.status === 'present')?.total ?? 0;

  return (
    <Modal open={open} onOpenChange={(value) => !value && onClose()} title={detail ? `${detail.first_name} ${detail.last_name}` : t('people.student')} description={detail?.admission_number} size="xl">
      {loading || !detail ? <LoadingBlock rows={7} /> : (
        <div className="detail-stack">
          <div className="profile-banner">
            <Avatar name={`${detail.first_name} ${detail.last_name}`} size="lg" />
            <div className="profile-copy">
              <div className="inline-actions">
                <Badge status={detail.status} />
                {currentEnrollment ? <Badge tone="info">{currentEnrollment.grade_name} — {currentEnrollment.section_name}</Badge> : null}
              </div>
              <h2 className="profile-name">{detail.first_name} {detail.last_name}</h2>
              <p className="muted">{detail.admission_number} · {detail.academic_year_label || currentEnrollment?.academic_year_label || ''}</p>
            </div>
          </div>

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">{t('people.profile')}</TabsTrigger>
              <TabsTrigger value="guardians">{t('people.guardians')}</TabsTrigger>
              <TabsTrigger value="enrollments">{t('people.enrollmentHistory')}</TabsTrigger>
              <TabsTrigger value="documents">{t('people.documents')}</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <KeyValue
                columns={3}
                items={[
                  { label: t('people.grade'), value: currentEnrollment ? `${currentEnrollment.grade_name} — ${currentEnrollment.section_name}` : '—' },
                  { label: t('people.dateOfBirth'), value: format.formatDate(detail.date_of_birth) },
                  { label: t('people.gender', { defaultValue: 'Gender' }), value: detail.gender || '—' },
                  { label: t('settings.phone'), value: detail.phone || '—' },
                  { label: t('settings.email'), value: detail.user?.email || '—' },
                  { label: t('settings.address'), value: detail.address || '—' },
                  { label: t('people.attendance'), value: `${format.formatInteger(present)} / ${format.formatInteger(attendanceTotal)}` },
                  { label: t('people.siblings'), value: format.formatInteger(detail.siblings?.length ?? 0) },
                  { label: t('people.account'), value: detail.user ? <Badge status="active">{detail.user.email}</Badge> : <Badge status="archived">{t('people.noAccount')}</Badge> },
                ]}
              />
            </TabsContent>
            <TabsContent value="guardians">
              <div className="section-heading">
                <h3 className="section-title">{t('people.guardians')}</h3>
                <Button size="sm" onClick={() => setGuardianOpen(true)}><Plus size={15} /> {t('people.addGuardian')}</Button>
              </div>
              {(detail.guardians ?? []).length === 0 ? <p className="muted">{t('people.noGuardians')}</p> : (
                <div className="record-list">
                  {detail.guardians.map((guardian) => (
                    <div className="record-row" key={guardian.id}>
                      <UserRound size={17} aria-hidden="true" />
                      <div className="record-main">
                        <strong>{guardian.first_name} {guardian.last_name}</strong>
                        <span className="muted">{guardian.relationship} · {guardian.phone || '—'}</span>
                      </div>
                      {Number(guardian.is_primary) ? <Badge tone="brass">{t('people.primaryGuardian')}</Badge> : null}
                      <Button variant="quiet" size="sm" onClick={() => setRemoving(guardian)}><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="enrollments">
              <div className="section-heading">
                <h3 className="section-title">{t('people.enrollmentHistory')}</h3>
                <Button size="sm" onClick={() => setSiblingOpen(true)}><Plus size={15} /> {t('people.addSibling')}</Button>
              </div>
              {(detail.enrollments ?? []).length === 0 ? <p className="muted">{t('people.noEnrollments')}</p> : (
                <div className="record-list">
                  {detail.enrollments.map((row) => (
                    <div className="record-row" key={row.id}>
                      <div className="record-main">
                        <strong>{row.grade_name} — {row.section_name}</strong>
                        <span className="muted">{row.academic_year_label} · {format.formatDate(row.started_at)}</span>
                      </div>
                      <Badge status={row.status} />
                    </div>
                  ))}
                </div>
              )}
              <div className="section-heading">
                <h3 className="section-title">{t('people.siblings')}</h3>
              </div>
              {(detail.siblings ?? []).length === 0 ? <p className="muted">{t('people.noSiblings')}</p> : (
                <div className="record-list">
                  {detail.siblings.map((sibling) => (
                    <div className="record-row" key={sibling.id}>
                      <div className="record-main">
                        <strong>{sibling.first_name} {sibling.last_name}</strong>
                        <span className="muted">{sibling.admission_number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="documents">
              <div className="section-heading">
                <h3 className="section-title">{t('people.documents')}</h3>
                <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}><FileUp size={15} /> {uploading ? t('common.saving') : t('common.upload')}</Button>
                <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" hidden onChange={uploadDocument} />
              </div>
              {(detail.documents ?? []).length === 0 ? <p className="muted">{t('people.noDocuments')}</p> : (
                <div className="record-list">
                  {detail.documents.map((document) => (
                    <div className="record-row" key={document.id}>
                      <div className="record-main">
                        <strong>{document.original_name}</strong>
                        <span className="muted">{format.formatBytes(document.size)} · {format.formatDate(document.created_at)}</span>
                      </div>
                      <Button variant="quiet" size="sm" onClick={() => downloadFile(`/documents/${document.id}`, { filename: document.original_name })}>
                        <FileDown size={14} /> {t('common.download')}
                      </Button>
                      <Button variant="quiet" size="sm" onClick={async () => { await api.delete(`/documents/${document.id}`); await load(); }}><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="detail-footer">
            {!detail.user ? <Button variant="quiet" size="sm" onClick={() => setAccountOpen(true)}>{t('people.createAccount')}</Button> : null}
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>

          <EntityFormModal
            open={guardianOpen}
            onOpenChange={setGuardianOpen}
            title={t('people.addGuardian')}
            fields={[
              { name: 'firstName', label: t('people.firstName'), required: true, span: 'half' },
              { name: 'lastName', label: t('people.lastName'), required: true, span: 'half' },
              { name: 'phone', label: t('settings.phone'), span: 'half' },
              { name: 'email', label: t('settings.email'), type: 'email', span: 'half' },
              { name: 'address', label: t('settings.address'), span: 'full' },
              { name: 'occupation', label: t('people.occupation'), span: 'half' },
              { name: 'relationship', label: t('people.relationship'), span: 'half', defaultValue: 'guardian' },
              { name: 'isPrimary', label: t('people.primaryGuardian'), type: 'checkbox' },
            ]}
            initialValues={{}}
            onSubmit={addGuardian}
          />

          <EntityFormModal
            open={siblingOpen}
            onOpenChange={setSiblingOpen}
            title={t('people.addSibling')}
            fields={[{ name: 'siblingId', label: t('people.siblingId'), type: 'select', required: true, options: studentOptions.filter((option) => option.value !== Number(studentId)) }]}
            initialValues={{}}
            onSubmit={addSibling}
          />

          <EntityFormModal
            open={accountOpen}
            onOpenChange={setAccountOpen}
            title={t('people.createAccount')}
            fields={[
              { name: 'email', label: t('settings.email'), type: 'email', required: true },
              { name: 'password', label: t('auth.password'), type: 'password', span: 'half' },
              { name: 'roleSlug', label: t('nav.roles'), type: 'select', span: 'half', options: [
                { value: 'student', label: t('nav.portal') },
                { value: 'guardian', label: t('people.guardian') },
              ], defaultValue: 'student' },
            ]}
            initialValues={{ roleSlug: 'student' }}
            onSubmit={createAccount}
          />

          <ConfirmModal
            open={Boolean(removing)}
            onOpenChange={(value) => !value && setRemoving(null)}
            title={t('common.confirmDeleteTitle')}
            body={removing ? `${removing.first_name} ${removing.last_name}` : ''}
            onConfirm={() => removeGuardian(removing)}
          />
        </div>
      )}
    </Modal>
  );
}
