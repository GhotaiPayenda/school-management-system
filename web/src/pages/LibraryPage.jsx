import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Undo2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  Select,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { useFormat } from '../lib/format.js';
import { downloadFile } from '../lib/download.js';

export default function LibraryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('titles');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('library.eyebrow')} title={t('library.title')} copy={t('library.copy')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="titles">{t('library.titles')}</TabsTrigger>
          <TabsTrigger value="copies">{t('library.copies')}</TabsTrigger>
          <TabsTrigger value="loans">{t('library.loans')}</TabsTrigger>
          <TabsTrigger value="fines">{t('library.fines')}</TabsTrigger>
        </TabsList>
        <TabsContent value="titles"><TitlesTab /></TabsContent>
        <TabsContent value="copies"><CopiesTab /></TabsContent>
        <TabsContent value="loans"><LoansTab /></TabsContent>
        <TabsContent value="fines"><FinesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TitlesTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('active');
  const params = useMemo(() => ({ search: search || undefined, category: category || undefined, status: status || undefined }), [search, category, status]);
  const { items, pagination, setPage, loading, error, reload, data } = usePagedApi('/library/titles', params);
  const categories = data?.categories ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'title', label: t('library.bookTitle'), required: true, span: 'half' },
    { name: 'author', label: t('library.author'), span: 'half' },
    { name: 'isbn', label: t('library.isbn'), span: 'half' },
    { name: 'category', label: t('library.category'), span: 'half' },
    { name: 'publisher', label: t('library.publisher'), span: 'half' },
    ...(editing ? [{ name: 'status', label: t('people.status'), type: 'select', span: 'half', options: ['active', 'archived'].map((value) => ({ value, label: t(`status.${value}`) })) }] : []),
    { name: 'description', label: t('common.description', { defaultValue: 'Description' }), type: 'textarea', span: 'full' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/library/titles/${editing.id}`, payload);
    else await api.post('/library/titles', payload);
    setOpen(false);
    reload();
    notify('library.titleSaved');
  }

  return (
    <Panel
      title={t('library.titles')}
      actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button>}
    >
      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder={t('common.search')} />
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{t('library.category')}: {t('common.all')}</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
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
        columns={[
          { key: 'title', label: t('library.bookTitle'), render: (row) => <strong>{row.title}</strong> },
          { key: 'author', label: t('library.author') },
          { key: 'category', label: t('library.category') },
          { key: 'isbn', label: t('library.isbn') },
          { key: 'available', label: t('library.availableCopies'), render: (row) => `${format.formatInteger(row.available_copies)} / ${format.formatInteger(row.total_copies)}` },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
        empty={<EmptyState title={t('library.noTitles')} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />
      <EntityFormModal open={open} onOpenChange={setOpen} title={editing ? t('common.edit') : t('common.add')} fields={fields} initialValues={editing ?? {}} onSubmit={submit} />
    </Panel>
  );
}

function CopiesTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const [titleId, setTitleId] = useState('');
  const [status, setStatus] = useState('');
  const { data: titleData } = useApi('/library/titles', { params: { pageSize: 100 } });
  const titles = titleData?.items ?? [];
  const { data, loading, error, reload } = useApi('/library/copies', { params: { titleId: titleId || undefined, status: status || undefined } });
  const rows = data?.items ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'titleId', label: t('library.bookTitle'), type: 'select', required: true, span: 'half', options: titles.map((item) => ({ value: item.id, label: item.title })) },
    { name: 'accessionNumber', label: t('library.accession'), required: true, span: 'half' },
    { name: 'barcode', label: t('library.barcode'), span: 'half' },
    { name: 'replacementCost', label: t('library.replacementCost'), type: 'number', span: 'half', min: 0 },
    ...(editing ? [{ name: 'status', label: t('people.status'), type: 'select', span: 'half', options: ['available', 'on_loan', 'lost', 'damaged', 'archived'].map((value) => ({ value, label: t(`status.${value}`) })) }] : []),
    { name: 'conditionNote', label: t('library.condition'), type: 'textarea', span: 'full' },
  ];

  async function submit(payload) {
    if (editing) await api.put(`/library/copies/${editing.id}`, payload);
    else await api.post('/library/copies', payload);
    setOpen(false);
    reload();
    notify('library.copySaved');
  }

  return (
    <Panel
      title={t('library.copies')}
      actions={<div className="inline-actions"><Select value={titleId} onChange={(event) => setTitleId(event.target.value)}><option value="">{t('library.bookTitle')}: {t('common.all')}</option>{titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select><Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> {t('common.add')}</Button></div>}
    >
      <FilterBar>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {['available', 'on_loan', 'lost', 'damaged', 'archived'].map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}
        </Select>
      </FilterBar>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={rows}
        columns={[
          { key: 'accession_number', label: t('library.accession'), render: (row) => <strong>{row.accession_number}</strong> },
          { key: 'title', label: t('library.bookTitle') },
          { key: 'author', label: t('library.author') },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
          { key: 'replacement_cost', label: t('library.replacementCost'), render: (row) => format.formatCurrency(row.replacement_cost) },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>{t('common.edit')}</Button>,
          },
        ]}
        empty={<EmptyState title={t('library.noCopies')} />}
      />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('common.edit') : t('common.add')}
        fields={editing ? fields.filter((field) => !['titleId', 'accessionNumber'].includes(field.name)) : fields}
        initialValues={editing ?? {}}
        onSubmit={submit}
      />
    </Panel>
  );
}

function LoansTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { studentOptions, staffOptions } = useReference();
  const [status, setStatus] = useState('open');
  const [overdue, setOverdue] = useState('');
  const params = useMemo(() => ({ status: status || undefined, overdue: overdue || undefined }), [status, overdue]);
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/library/loans', params);
  const { data: copyData, reload: reloadCopies } = useApi('/library/copies', { params: { status: 'available' } });
  const copies = copyData?.items ?? [];
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState(null);
  const [renewing, setRenewing] = useState(null);

  const borrowerOptions = [
    ...studentOptions.map((item) => ({ value: `student:${item.value}`, label: `${t('people.student')}: ${item.label}` })),
    ...staffOptions.map((item) => ({ value: `staff:${item.value}`, label: `${t('people.staffMember')}: ${item.label}` })),
  ];

  async function issue(payload) {
    const [borrowerType, borrowerId] = String(payload.borrower).split(':');
    await api.post('/library/loans', {
      copyId: Number(payload.copyId),
      borrowerType,
      borrowerId: Number(borrowerId),
      dueAt: payload.dueAt || undefined,
    });
    setOpen(false);
    reload();
    reloadCopies();
    notify('library.loanSaved');
  }

  async function returnLoan(payload) {
    const response = await api.post(`/library/loans/${returning.id}/return`, {
      returnedAt: payload.returnedAt || undefined,
      condition: payload.condition,
      damageFee: payload.condition === 'damaged' ? Number(payload.damageFee || 0) : undefined,
    });
    setReturning(null);
    reload();
    reloadCopies();
    notify(response.data.data.fine ? 'library.returnedWithFine' : 'library.returned', 'success');
  }

  async function renew(payload) {
    await api.post(`/library/loans/${renewing.id}/renew`, { days: Number(payload.days) });
    setRenewing(null);
    reload();
  }

  return (
    <Panel
      title={t('library.loans')}
      actions={
        <div className="inline-actions">
          <Button variant="quiet" size="sm" onClick={() => downloadFile('/library/loans/export', { params, filename: 'loans.csv' })}>{t('common.export')}</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus size={15} /> {t('library.issueLoan')}</Button>
        </div>
      }
    >
      <FilterBar>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="open">{t('library.openLoans')}</option>
          <option value="returned">{t('status.returned')}</option>
          <option value="lost">{t('status.lost')}</option>
          <option value="all">{t('common.all')}</option>
        </Select>
        <Select value={overdue} onChange={(event) => setOverdue(event.target.value)}>
          <option value="">{t('common.all')}</option>
          <option value="1">{t('library.overdue')}</option>
        </Select>
      </FilterBar>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={items}
        columns={[
          { key: 'title', label: t('library.bookTitle'), render: (row) => <strong>{row.title}</strong> },
          { key: 'accession_number', label: t('library.accession') },
          { key: 'borrower', label: t('library.borrower'), render: (row) => row.borrower ? `${row.borrower.first_name} ${row.borrower.last_name}` : '—' },
          { key: 'issued_at', label: t('library.issuedAt'), render: (row) => format.formatDate(row.issued_at) },
          { key: 'due_at', label: t('library.dueAt'), render: (row) => <span className={Number(row.overdue) ? 'text-danger' : ''}>{format.formatDate(row.due_at)}</span> },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={Number(row.overdue) && row.status === 'open' ? 'overdue' : row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => row.status === 'open' ? (
              <div className="inline-actions">
                <Button variant="quiet" size="sm" onClick={() => setReturning(row)}><Undo2 size={14} /> {t('library.returnLoan')}</Button>
                {row.renewal_count < 1 ? <Button variant="quiet" size="sm" onClick={() => setRenewing(row)}><RefreshCw size={14} /> {t('library.renew')}</Button> : null}
              </div>
            ) : null,
          },
        ]}
        empty={<EmptyState title={t('library.noLoans')} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />
      <EntityFormModal
        open={open}
        onOpenChange={setOpen}
        title={t('library.issueLoan')}
        fields={[
          { name: 'copyId', label: t('library.selectCopy'), type: 'select', required: true, span: 'half', options: copies.map((copy) => ({ value: copy.id, label: `${copy.accession_number} — ${copy.title}` })) },
          { name: 'borrower', label: t('library.borrower'), type: 'select', required: true, span: 'half', options: borrowerOptions },
          { name: 'dueAt', label: t('library.dueAt'), type: 'date', span: 'half' },
        ]}
        initialValues={{}}
        onSubmit={issue}
      />
      <EntityFormModal
        open={Boolean(returning)}
        onOpenChange={(value) => !value && setReturning(null)}
        title={t('library.returnLoan')}
        description={returning ? `${returning.title} · ${returning.borrower?.first_name ?? ''} ${returning.borrower?.last_name ?? ''}` : ''}
        fields={[
          { name: 'returnedAt', label: t('library.returnedAt'), type: 'date' },
          { name: 'condition', label: t('library.condition'), type: 'select', options: [
            { value: 'ok', label: t('library.conditionOk') },
            { value: 'damaged', label: t('library.conditionDamaged') },
            { value: 'lost', label: t('library.conditionLost') },
          ], defaultValue: 'ok' },
          { name: 'damageFee', label: t('library.fineAmount'), type: 'number', min: 0 },
        ]}
        initialValues={{ condition: 'ok', returnedAt: new Date().toISOString().slice(0, 10) }}
        onSubmit={returnLoan}
      />
      <EntityFormModal
        open={Boolean(renewing)}
        onOpenChange={(value) => !value && setRenewing(null)}
        title={t('library.renew')}
        description={renewing?.title}
        fields={[{ name: 'days', label: t('library.days'), type: 'number', min: 1, max: 60, defaultValue: 14 }]}
        initialValues={{ days: 14 }}
        onSubmit={renew}
      />
    </Panel>
  );
}

function FinesTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const [settled, setSettled] = useState('0');
  const { data, loading, error, reload } = useApi('/library/fines', { params: { settled: settled || undefined } });
  const rows = data?.items ?? [];
  const [waiving, setWaiving] = useState(null);
  const openTotal = rows.filter((row) => !Number(row.settled)).reduce((sum, row) => sum + Number(row.amount), 0);

  async function waive(payload) {
    await api.post(`/library/fines/${waiving.id}/waive`, payload);
    setWaiving(null);
    reload();
    notify('library.fineWaived');
  }

  async function settle(row) {
    await api.post(`/library/fines/${row.id}/settle`);
    reload();
    notify('library.fineSettledToast');
  }

  async function transfer(row) {
    await api.post(`/library/fines/${row.id}/transfer`);
    reload();
    notify('library.fineTransferred');
  }

  return (
    <div className="page-stack">
      <section className="kpi-grid">
        <StatCard label={t('library.fines')} value={format.formatCurrency(openTotal)} hint={`${format.formatInteger(rows.filter((row) => !Number(row.settled)).length)} ${t('status.open')}`} tone="terracotta" />
        <StatCard label={t('finance.totalOutstanding')} value={format.formatCurrency(rows.reduce((sum, row) => sum + Number(row.amount), 0))} tone="brass" />
      </section>
      <Panel
        title={t('library.fines')}
        actions={<Select value={settled} onChange={(event) => setSettled(event.target.value)}><option value="">{t('common.all')}</option><option value="0">{t('status.open')}</option><option value="1">{t('status.paid')}</option></Select>}
      >
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          columns={[
            { key: 'borrower', label: t('library.borrower'), render: (row) => row.borrower ? `${row.borrower.first_name} ${row.borrower.last_name}` : '—' },
            { key: 'title', label: t('library.bookTitle'), render: (row) => `${row.title} · ${row.accession_number}` },
            { key: 'reason', label: t('attendance.reason'), render: (row) => t(`library.reason${row.reason === 'late' ? 'Late' : row.reason === 'lost' ? 'Lost' : 'Damaged'}`, { defaultValue: row.reason }) },
            { key: 'amount', label: t('library.fineAmount'), render: (row) => format.formatCurrency(row.amount) },
            { key: 'settled', label: t('people.status'), render: (row) => Number(row.settled) ? <Badge status="paid" /> : <Badge status="open" /> },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row) => !Number(row.settled) ? (
                <div className="inline-actions">
                  <Button variant="quiet" size="sm" onClick={() => settle(row)}>{t('library.settle')}</Button>
                  <Button variant="quiet" size="sm" onClick={() => setWaiving(row)}>{t('library.waive')}</Button>
                  {row.borrower_type === 'student' ? <Button variant="quiet" size="sm" onClick={() => transfer(row)}>{t('library.transferToInvoice')}</Button> : null}
                </div>
              ) : row.invoice_number ? <Badge tone="info">{row.invoice_number}</Badge> : null,
            },
          ]}
          empty={<EmptyState title={t('library.noFines')} />}
        />
        <EntityFormModal
          open={Boolean(waiving)}
          onOpenChange={(value) => !value && setWaiving(null)}
          title={t('library.waive')}
          description={waiving ? `${waiving.title} · ${format.formatCurrency(waiving.amount)}` : ''}
          fields={[{ name: 'reason', label: t('library.waiveReason'), type: 'textarea', required: true }]}
          initialValues={{}}
          onSubmit={waive}
        />
      </Panel>
    </div>
  );
}
