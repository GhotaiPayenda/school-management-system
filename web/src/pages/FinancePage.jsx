import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeDollarSign, FileDown, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import { useReference } from '../providers/ReferenceProvider.jsx';
import { useToast } from '../providers/AppProviders.jsx';
import { EntityFormModal } from '../components/forms.jsx';
import {
  Alert,
  Badge,
  Button,
  ConfirmModal,
  DataTable,
  EmptyState,
  ErrorState,
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
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { usePagedApi } from '../lib/usePagedApi.js';
import { currentMonthIso, todayIso, useFormat } from '../lib/format.js';
import { downloadFile } from '../lib/download.js';
import { PrintButton, PrintFooter, PrintHeader, usePrintMode } from '../components/print.jsx';

export default function FinancePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');
  return (
    <div className="page-stack">
      <PageHeader eyebrow={t('finance.eyebrow')} title={t('finance.title')} copy={t('finance.copy')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="tabs-scroll">
          <TabsTrigger value="overview">{t('finance.overview')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('finance.invoices')}</TabsTrigger>
          <TabsTrigger value="payments">{t('finance.payments')}</TabsTrigger>
          <TabsTrigger value="fees">{t('finance.feeStructures')}</TabsTrigger>
          <TabsTrigger value="arrears">{t('finance.arrears')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="fees"><FeeStructuresTab /></TabsContent>
        <TabsContent value="arrears"><ArrearsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function monthStart() {
  return `${currentMonthIso()}-01`;
}

function OverviewTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const { data, loading, error, reload } = useApi('/finance/summary', { params: { from, to } });
  const { data: arrears } = useApi('/finance/arrears');
  const daily = data?.daily ?? [];
  const methods = data?.methods ?? [];
  const buckets = arrears?.buckets ?? {};

  return (
    <div className="page-stack">
      <FilterBar>
        <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={t('common.from')} />
        <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={t('common.to')} />
      </FilterBar>
      {loading ? <LoadingBlock rows={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : data ? (
        <>
          <section className="kpi-grid">
            <StatCard label={t('finance.netCollected')} value={format.formatCurrency(data.netCollected)} hint={t('finance.collected')} tone="forest" icon={Wallet} />
            <StatCard label={t('finance.billed')} value={format.formatCurrency(data.billed)} tone="ink" icon={ReceiptText} />
            <StatCard label={t('finance.outstanding')} value={format.formatCurrency(data.outstanding)} tone="terracotta" icon={BadgeDollarSign} />
            <StatCard label={t('finance.refunded')} value={format.formatCurrency(data.refunded)} hint={`${format.formatInteger(data.paymentCount)} ${t('finance.payments')}`} tone="brass" icon={Wallet} />
          </section>
          <div className="dashboard-grid">
            <Panel title={t('finance.collectionByDay')}>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} tickFormatter={(value) => String(value).slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} formatter={(value) => [format.formatCurrency(value), t('finance.netCollected')]} />
                    <Bar dataKey="total" fill="var(--forest)" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title={t('finance.buckets')}>
              <KeyValue
                columns={2}
                items={[
                  { label: t('finance.current'), value: format.formatCurrency(buckets.current ?? 0) },
                  { label: t('finance.days1to30'), value: format.formatCurrency(buckets['1-30'] ?? 0) },
                  { label: t('finance.days31to60'), value: format.formatCurrency(buckets['31-60'] ?? 0) },
                  { label: t('finance.days61to90'), value: format.formatCurrency(buckets['61-90'] ?? 0) },
                  { label: t('finance.days90plus'), value: format.formatCurrency(buckets['90+'] ?? 0) },
                  { label: t('finance.totalOutstanding'), value: <strong>{format.formatCurrency(arrears?.totalOutstanding ?? 0)}</strong> },
                ]}
              />
            </Panel>
            <Panel title={t('finance.methods')}>
              <ul className="method-list">
                {methods.map((row) => (
                  <li key={row.method}>
                    <span>{t(`finance.${row.method === 'bank_transfer' ? 'bankTransfer' : row.method === 'mobile_money' ? 'mobileMoney' : row.method}`)}</span>
                    <strong>{format.formatCurrency(row.total)}</strong>
                    <span className="muted">{format.formatInteger(row.count)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InvoicesTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const { years, sections, grades, currentYear } = useReference();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [year, setYear] = useState(currentYear?.id ?? '');
  const params = useMemo(
    () => ({ search: search || undefined, status: status || undefined, billingPeriod: period || undefined, academicYearId: year || undefined }),
    [search, status, period, year],
  );
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/invoices', params);
  const [viewing, setViewing] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  async function generate(payload) {
    const body = {
      academicYearId: Number(payload.academicYearId),
      billingPeriod: payload.billingPeriod,
      gradeLevelId: payload.gradeLevelId ? Number(payload.gradeLevelId) : undefined,
      sectionId: payload.sectionId ? Number(payload.sectionId) : undefined,
    };
    const response = await api.post('/invoices/generate', body);
    setGenerateOpen(false);
    reload();
    notify('finance.generated', 'success', { created: response.data.data.created, skipped: response.data.data.skipped });
  }

  return (
    <Panel
      title={t('finance.invoices')}
      actions={
        <div className="inline-actions">
          <Button variant="quiet" size="sm" onClick={() => downloadFile('/finance/export/invoices', { params, filename: 'invoices.csv' })}>
            <FileDown size={15} /> {t('finance.exportInvoices')}
          </Button>
          <Button size="sm" onClick={() => setGenerateOpen(true)}><Plus size={15} /> {t('finance.generateInvoices')}</Button>
        </div>
      }
    >
      <FilterBar>
        <SearchField value={search} onChange={setSearch} placeholder={t('common.search')} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {['issued', 'partially_paid', 'paid', 'void'].map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}
        </Select>
        <input className="input" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label={t('finance.billingPeriod')} />
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
        onRowClick={(row) => setViewing(row.id)}
        columns={[
          { key: 'invoice_number', label: t('finance.invoiceNumber'), render: (row) => <strong>{row.invoice_number}</strong> },
          { key: 'student', label: t('people.student'), render: (row) => `${row.first_name} ${row.last_name}` },
          { key: 'billing_period', label: t('finance.billingPeriod'), render: (row) => format.formatMonth(row.billing_period) },
          { key: 'total', label: t('finance.balance'), render: (row) => format.formatCurrency(row.total) },
          { key: 'paid_total', label: t('finance.paidTotal'), render: (row) => format.formatCurrency(row.paid_total) },
          { key: 'balance', label: t('finance.balance'), render: (row) => <strong>{format.formatCurrency(row.balance)}</strong> },
          { key: 'status', label: t('people.status'), render: (row) => <Badge status={Number(row.is_overdue) && row.status !== 'paid' ? 'overdue' : row.status} /> },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => <Button variant="quiet" size="sm" onClick={(event) => { event.stopPropagation(); setViewing(row.id); }}>{t('common.view')}</Button>,
          },
        ]}
        empty={<EmptyState title={t('finance.noInvoices')} copy={t('finance.generateHint')} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />

      <EntityFormModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title={t('finance.generateInvoices')}
        description={t('finance.generateHint')}
        fields={[
          { name: 'academicYearId', label: t('admissions.academicYear'), type: 'select', required: true, span: 'half', options: years.map((item) => ({ value: item.id, label: item.label })) },
          { name: 'billingPeriod', label: t('finance.billingPeriod'), type: 'month', required: true, span: 'half' },
          { name: 'gradeLevelId', label: t('academic.grades'), type: 'select', span: 'half', options: grades.map((item) => ({ value: item.id, label: item.name })) },
          { name: 'sectionId', label: t('people.section'), type: 'select', span: 'half', options: sections.map((item) => ({ value: item.id, label: `${item.grade_name ?? `Grade ${item.grade_number}`} — ${item.name}` })) },
        ]}
        initialValues={{ academicYearId: currentYear?.id, billingPeriod: currentMonthIso() }}
        onSubmit={generate}
      />

      <InvoiceModal invoiceId={viewing} onClose={() => setViewing(null)} onChanged={reload} />
    </Panel>
  );
}

function InvoiceModal({ invoiceId, onClose, onChanged }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { notify } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const load = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) load();
    else setInvoice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  async function pay(payload) {
    const key = crypto.randomUUID();
    const response = await api.post('/payments', {
      invoiceId: Number(invoiceId),
      amount: Number(payload.amount),
      method: payload.method,
      paidAt: payload.paidAt || undefined,
    }, { headers: { 'Idempotency-Key': key } });
    setPaymentOpen(false);
    await load();
    onChanged?.();
    notify(response.data.data.replayed ? 'finance.paymentReplayed' : 'finance.paymentSaved', 'success');
  }

  async function discount(payload) {
    await api.post(`/invoices/${invoiceId}/discounts`, {
      type: payload.type,
      reason: payload.reason,
      value: Number(payload.value),
      note: payload.note || undefined,
    });
    setDiscountOpen(false);
    await load();
    onChanged?.();
    notify('finance.discountSaved', 'success');
  }

  async function charge(payload) {
    await api.post(`/invoices/${invoiceId}/charges`, {
      description: payload.description,
      amount: Number(payload.amount),
    });
    setChargeOpen(false);
    await load();
    onChanged?.();
    notify('finance.chargeSaved', 'success');
  }

  async function voidInvoice() {
    await api.post(`/invoices/${invoiceId}/void`, { reason: t('finance.voidInvoice') });
    setVoiding(false);
    await load();
    onChanged?.();
    notify('finance.invoiceVoided', 'success');
  }

  return (
    <Modal open={Boolean(invoiceId)} onOpenChange={(value) => !value && onClose()} title={invoice?.invoice_number || t('finance.invoice')} description={invoice ? `${invoice.first_name} ${invoice.last_name} · ${format.formatMonth(invoice.billing_period)}` : ''} size="lg">
      {loading || !invoice ? <LoadingBlock rows={7} /> : (
        <div className="detail-stack">
          <div className="inline-actions">
            <Badge status={invoice.is_overdue && invoice.status !== 'paid' ? 'overdue' : invoice.status} />
            <span className="muted">{t('finance.dueDate')}: {format.formatDate(invoice.due_date)}</span>
          </div>
          <div className="result-summary">
            <div><span className="muted">{t('finance.subtotal')}</span><strong>{format.formatCurrency(invoice.subtotal)}</strong></div>
            <div><span className="muted">{t('finance.discount')}</span><strong>{format.formatCurrency(invoice.discount_total)}</strong></div>
            <div><span className="muted">{t('finance.paidTotal')}</span><strong>{format.formatCurrency(invoice.paid_total)}</strong></div>
            <div><span className="muted">{t('finance.balance')}</span><strong>{format.formatCurrency(invoice.balance)}</strong></div>
          </div>

          <h3 className="section-title">{t('finance.items')}</h3>
          <table className="result-table">
            <thead><tr><th>{t('finance.chargeDescription')}</th><th>{t('finance.kind')}</th><th>{t('finance.value')}</th></tr></thead>
            <tbody>
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id}><td>{item.description}</td><td>{t(`finance.${item.kind === 'one_time' ? 'oneTime' : item.kind === 'per_semester' ? 'perSemester' : 'monthly'}`, { defaultValue: item.kind })}</td><td>{format.formatCurrency(item.amount * (item.quantity ?? 1))}</td></tr>
              ))}
            </tbody>
          </table>

          {(invoice.discounts ?? []).length > 0 ? (
            <>
              <h3 className="section-title">{t('finance.discount')}</h3>
              <div className="record-list">
                {invoice.discounts.map((row) => (
                  <div className="record-row" key={row.id}>
                    <div className="record-main"><strong>{t(`finance.${row.reason}`, { defaultValue: row.reason })}</strong><span className="muted">{row.type} · {format.formatNumber(row.value)}</span></div>
                    <strong>{format.formatCurrency(row.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {(invoice.payments ?? []).length > 0 ? (
            <>
              <h3 className="section-title">{t('finance.payments')}</h3>
              <div className="record-list">
                {invoice.payments.map((row) => (
                  <div className="record-row" key={row.id}>
                    <div className="record-main"><strong>{row.receipt_number}</strong><span className="muted">{format.formatDateTime(row.paid_at)} · {t(`finance.${row.method === 'bank_transfer' ? 'bankTransfer' : row.method === 'mobile_money' ? 'mobileMoney' : row.method}`)}</span></div>
                    <strong>{format.formatCurrency(row.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="detail-footer">
            {invoice.status !== 'void' && invoice.status !== 'paid' ? (
              <>
                <Button size="sm" onClick={() => setPaymentOpen(true)}><Wallet size={15} /> {t('finance.recordPayment')}</Button>
                <Button variant="quiet" size="sm" onClick={() => setDiscountOpen(true)}>{t('finance.addDiscount')}</Button>
                <Button variant="quiet" size="sm" onClick={() => setChargeOpen(true)}>{t('finance.addCharge')}</Button>
                <Button variant="danger" size="sm" onClick={() => setVoiding(true)}>{t('finance.voidInvoice')}</Button>
              </>
            ) : null}
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>

          <EntityFormModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            title={t('finance.recordPayment')}
            description={t('finance.idempotencyHint')}
            fields={[
              { name: 'amount', label: t('finance.payment'), type: 'number', required: true, span: 'half', min: 0, defaultValue: invoice.balance },
              { name: 'method', label: t('finance.method'), type: 'select', required: true, span: 'half', options: [
                { value: 'cash', label: t('finance.cash') },
                { value: 'bank_transfer', label: t('finance.bankTransfer') },
                { value: 'mobile_money', label: t('finance.mobileMoney') },
              ], defaultValue: 'cash' },
              { name: 'paidAt', label: t('finance.issueDate'), type: 'date' },
            ]}
            initialValues={{ amount: invoice.balance, method: 'cash', paidAt: todayIso() }}
            onSubmit={pay}
          />

          <EntityFormModal
            open={discountOpen}
            onOpenChange={setDiscountOpen}
            title={t('finance.addDiscount')}
            fields={[
              { name: 'type', label: t('finance.kind'), type: 'select', required: true, span: 'half', options: [{ value: 'fixed', label: t('finance.value') }, { value: 'percentage', label: '%' }] },
              { name: 'value', label: t('finance.value'), type: 'number', required: true, span: 'half', min: 0 },
              { name: 'reason', label: t('finance.discountReason'), type: 'select', required: true, span: 'half', options: [
                { value: 'scholarship', label: t('finance.scholarship') },
                { value: 'sibling', label: t('finance.sibling') },
                { value: 'staff', label: t('finance.staff') },
                { value: 'other', label: t('finance.other') },
              ] },
              { name: 'note', label: t('admissions.notes'), type: 'textarea', span: 'full' },
            ]}
            initialValues={{ type: 'fixed', reason: 'scholarship' }}
            onSubmit={discount}
          />

          <EntityFormModal
            open={chargeOpen}
            onOpenChange={setChargeOpen}
            title={t('finance.addCharge')}
            fields={[
              { name: 'description', label: t('finance.chargeDescription'), required: true, span: 'full' },
              { name: 'amount', label: t('finance.value'), type: 'number', required: true, min: 0 },
            ]}
            initialValues={{}}
            onSubmit={charge}
          />

          <ConfirmModal
            open={voiding}
            onOpenChange={setVoiding}
            title={t('finance.voidInvoice')}
            body={invoice.invoice_number}
            onConfirm={voidInvoice}
          />
        </div>
      )}
    </Modal>
  );
}

function PaymentsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { studentOptions } = useReference();
  const [student, setStudent] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = useMemo(() => ({ studentId: student || undefined, from: from || undefined, to: to || undefined }), [student, from, to]);
  const { items, pagination, setPage, loading, error, reload } = usePagedApi('/payments', params);
  const [refunding, setRefunding] = useState(null);
  const [receiptId, setReceiptId] = useState(null);

  async function refund(payload) {
    await api.post(`/payments/${refunding.id}/refund`, { amount: Number(payload.amount), reason: payload.reason });
    setRefunding(null);
    reload();
  }

  return (
    <Panel
      title={t('finance.payments')}
      actions={<Button variant="quiet" size="sm" onClick={() => downloadFile('/finance/export/payments', { params, filename: 'payments.csv' })}><FileDown size={15} /> {t('finance.exportPayments')}</Button>}
    >
      <FilterBar>
        <Select value={student} onChange={(event) => setStudent(event.target.value)}>
          <option value="">{t('people.student')}: {t('common.all')}</option>
          {studentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
        <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={t('common.from')} />
        <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={t('common.to')} />
      </FilterBar>
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        rows={items}
        columns={[
          { key: 'receipt_number', label: t('finance.receiptNumber'), render: (row) => <strong>{row.receipt_number}</strong> },
          { key: 'student', label: t('people.student'), render: (row) => `${row.first_name} ${row.last_name}` },
          { key: 'invoice_number', label: t('finance.invoiceNumber') },
          { key: 'method', label: t('finance.method'), render: (row) => t(`finance.${row.method === 'bank_transfer' ? 'bankTransfer' : row.method === 'mobile_money' ? 'mobileMoney' : row.method}`) },
          { key: 'amount', label: t('finance.value'), render: (row) => format.formatCurrency(row.amount) },
          { key: 'paid_at', label: t('finance.issueDate'), render: (row) => format.formatDateTime(row.paid_at) },
          {
            key: 'actions',
            label: '',
            align: 'end',
            render: (row) => (
              <div className="inline-actions">
                <Button variant="quiet" size="sm" onClick={() => setReceiptId(row.id)}>{t('finance.receipt')}</Button>
                {Number(row.refunded_total) < Number(row.amount) ? <Button variant="quiet" size="sm" onClick={() => setRefunding(row)}>{t('finance.refund')}</Button> : null}
              </div>
            ),
          },
        ]}
        empty={<EmptyState title={t('finance.noPayments')} />}
      />
      <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} perPage={pagination.perPage} onPageChange={setPage} />
      <EntityFormModal
        open={Boolean(refunding)}
        onOpenChange={(value) => !value && setRefunding(null)}
        title={t('finance.refund')}
        description={refunding ? `${refunding.receipt_number} · ${format.formatCurrency(refunding.amount)}` : ''}
        fields={[
          { name: 'amount', label: t('finance.value'), type: 'number', required: true, span: 'half', min: 0 },
          { name: 'reason', label: t('finance.refundReason'), type: 'textarea', required: true, span: 'full' },
        ]}
        initialValues={{ amount: refunding ? Number(refunding.amount) - Number(refunding.refunded_total ?? 0) : 0 }}
        onSubmit={refund}
      />
      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </Panel>
  );
}

function ReceiptModal({ paymentId, onClose }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading } = useApi(`/payments/${paymentId}/receipt`, { enabled: Boolean(paymentId) });
  usePrintMode(Boolean(paymentId));
  const payment = data?.payment;

  return (
    <Modal open={Boolean(paymentId)} onOpenChange={(value) => !value && onClose()} title={t('finance.receipt')} description={payment?.receipt_number} size="md">
      {loading || !payment ? <LoadingBlock rows={6} /> : (
        <>
          <div className="print-area print-sheet">
            <PrintHeader
              title={t('finance.receipt')}
              meta={t('finance.receiptFor', { number: payment.receipt_number })}
              school={data.school}
            />
            <div className="result-summary">
              <div><span className="muted">{t('finance.payment')}</span><strong>{format.formatCurrency(payment.amount)}</strong></div>
              <div><span className="muted">{t('finance.method')}</span><strong>{t(`finance.${payment.method === 'bank_transfer' ? 'bankTransfer' : payment.method === 'mobile_money' ? 'mobileMoney' : payment.method}`)}</strong></div>
              <div><span className="muted">{t('finance.issueDate')}</span><strong>{format.formatDateTime(payment.paid_at)}</strong></div>
              <div><span className="muted">{t('finance.balanceAfter')}</span><strong>{format.formatCurrency(data.balanceAfter ?? 0)}</strong></div>
            </div>
            <table className="result-table">
              <tbody>
                <tr><th>{t('people.student')}</th><td>{payment.first_name} {payment.last_name}</td></tr>
                <tr><th>{t('people.admissionNumber')}</th><td>{payment.admission_number}</td></tr>
                <tr><th>{t('finance.invoiceNumber')}</th><td>{payment.invoice_number}</td></tr>
                <tr><th>{t('finance.billingPeriod')}</th><td>{payment.billing_period}</td></tr>
                <tr><th>{t('finance.recordedBy')}</th><td>{payment.recorded_by_name || '—'}</td></tr>
              </tbody>
            </table>
            <p className="report-remark muted">{t('finance.receiptCopy', { defaultValue: 'Thank you. Keep this receipt for your records.' })}</p>
            <PrintFooter items={[{ label: t('print.issuedBy'), value: data.school?.name }]} />
          </div>
          <div className="detail-footer no-print">
            <PrintButton label={t('finance.printReceipt')} />
            <Button variant="quiet" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function FeeStructuresTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { years, grades, currentYear } = useReference();
  const [year, setYear] = useState(currentYear?.id ?? '');
  const { data, loading, error, reload } = useApi('/fee-structures', { params: { academicYearId: year || undefined } });
  const rows = data?.items ?? [];
  const [editor, setEditor] = useState(null);

  return (
    <Panel
      title={t('finance.feeStructures')}
      actions={<div className="inline-actions"><Select value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select><Button size="sm" onClick={() => setEditor({ academicYearId: year, gradeLevelId: '', status: 'active', components: [] })}><Plus size={15} /> {t('common.add')}</Button></div>}
    >
      {error ? <Alert tone="danger">{error.message}</Alert> : null}
      {loading ? <LoadingBlock rows={5} /> : rows.length === 0 ? <EmptyState title={t('finance.noFeeStructures')} /> : (
        <div className="record-list">
          {rows.map((row) => (
            <div className="record-row fee-row" key={row.id}>
              <div className="record-main">
                <strong>{row.grade_name || `Grade ${row.grade_number}`} · {row.academic_year_label}</strong>
                <span className="muted">{(row.components ?? []).map((component) => `${component.name}: ${format.formatCurrency(component.amount)}`).join(' · ')}</span>
              </div>
              <Badge status={row.status} />
              <Button variant="quiet" size="sm" onClick={() => setEditor({ ...row, components: (row.components ?? []).map((component) => ({ ...component, amount: Number(component.amount) })) })}>{t('common.edit')}</Button>
            </div>
          ))}
        </div>
      )}
      <FeeStructureModal state={editor} onClose={() => setEditor(null)} years={years} grades={grades} onSaved={() => { reload(); setEditor(null); }} />
    </Panel>
  );
}

function FeeStructureModal({ state, onClose, years, grades, onSaved }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [form, setForm] = useState(state);
  useEffect(() => setForm(state), [state]);

  if (!form) return null;
  const components = form.components ?? [];

  function setComponent(index, key, value) {
    setForm((current) => ({
      ...current,
      components: current.components.map((component, position) => position === index ? { ...component, [key]: value } : component),
    }));
  }

  async function save(event) {
    event.preventDefault();
    const payload = {
      academicYearId: Number(form.academicYearId),
      gradeLevelId: Number(form.gradeLevelId),
      status: form.status,
      components: components.map((component) => ({
        kind: component.kind,
        name: component.name,
        amount: Number(component.amount),
        semesterNumber: component.kind === 'per_semester' ? Number(component.semester_number || component.semesterNumber || 1) : undefined,
      })),
    };
    if (form.id) await api.put(`/fee-structures/${form.id}`, payload);
    else await api.post('/fee-structures', payload);
    notify('finance.feeStructureSaved', 'success');
    onSaved();
  }

  return (
    <Modal open={Boolean(state)} onOpenChange={(value) => !value && onClose()} title={t('finance.feeStructures')} size="lg">
      <form className="detail-stack" onSubmit={save}>
        <div className="form-grid">
          <label className="field"><span className="field-label">{t('admissions.academicYear')}</span><Select value={form.academicYearId ?? ''} onChange={(event) => setForm({ ...form, academicYearId: event.target.value })} required>{years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></label>
          <label className="field"><span className="field-label">{t('academic.grades')}</span><Select value={form.gradeLevelId ?? ''} onChange={(event) => setForm({ ...form, gradeLevelId: event.target.value })} required><option value="">{t('common.select')}</option>{grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
          <label className="field"><span className="field-label">{t('people.status')}</span><Select value={form.status ?? 'active'} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['draft', 'active', 'archived'].map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}</Select></label>
        </div>
        <div className="section-heading">
          <h3 className="section-title">{t('finance.components')}</h3>
          <Button
            type="button"
            size="sm"
            variant="quiet"
            onClick={() => setForm((current) => ({ ...current, components: [...(current.components ?? []), { kind: 'monthly', name: '', amount: 0, semesterNumber: 1 }] }))}
          >
            <Plus size={15} /> {t('finance.addComponent')}
          </Button>
        </div>
        {components.length === 0 ? <p className="muted">{t('finance.addComponent')}</p> : (
          <div className="record-list">
            {components.map((component, index) => (
              <div className="fee-component-row" key={index}>
                <Select value={component.kind} onChange={(event) => setComponent(index, 'kind', event.target.value)}>
                  <option value="monthly">{t('finance.monthly')}</option>
                  <option value="one_time">{t('finance.oneTime')}</option>
                  <option value="per_semester">{t('finance.perSemester')}</option>
                </Select>
                <Input placeholder={t('finance.componentName')} value={component.name ?? ''} onChange={(event) => setComponent(index, 'name', event.target.value)} required />
                <Input type="number" min="0" placeholder={t('finance.value')} value={component.amount ?? 0} onChange={(event) => setComponent(index, 'amount', event.target.value)} required />
                {component.kind === 'per_semester' ? (
                  <Select value={component.semester_number ?? component.semesterNumber ?? 1} onChange={(event) => setComponent(index, 'semester_number', Number(event.target.value))}>
                    <option value="1">{t('results.semester')} 1</option>
                    <option value="2">{t('results.semester')} 2</option>
                  </Select>
                ) : null}
                <Button type="button" variant="quiet" size="sm" onClick={() => setForm((current) => ({ ...current, components: current.components.filter((_, position) => position !== index) }))}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="detail-footer">
          <Button type="submit" disabled={!form.academicYearId || !form.gradeLevelId || components.length === 0}>{t('common.save')}</Button>
          <Button type="button" variant="quiet" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ArrearsTab() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, loading, error, reload } = useApi('/finance/arrears');
  const rows = data?.items ?? [];
  return (
    <div className="page-stack">
      <section className="kpi-grid">
        <StatCard label={t('finance.totalOutstanding')} value={format.formatCurrency(data?.totalOutstanding ?? 0)} tone="terracotta" />
        {(data?.buckets ? Object.entries(data.buckets) : []).map(([bucket, value]) => (
          <StatCard
            key={bucket}
            label={bucket === 'current' ? t('finance.current') : bucket === '1-30' ? t('finance.days1to30') : bucket === '31-60' ? t('finance.days31to60') : bucket === '61-90' ? t('finance.days61to90') : t('finance.days90plus')}
            value={format.formatCurrency(value)}
            tone="brass"
          />
        ))}
      </section>
      <Panel title={t('finance.arrears')}>
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          rows={rows}
          columns={[
            { key: 'invoice_number', label: t('finance.invoiceNumber'), render: (row) => <strong>{row.invoice_number}</strong> },
            { key: 'student', label: t('people.student'), render: (row) => `${row.first_name} ${row.last_name}` },
            { key: 'billing_period', label: t('finance.billingPeriod'), render: (row) => format.formatMonth(row.billing_period) },
            { key: 'balance', label: t('finance.balance'), render: (row) => <strong>{format.formatCurrency(row.balance)}</strong> },
            { key: 'due_date', label: t('finance.dueDate'), render: (row) => format.formatDate(row.due_date) },
            { key: 'days_overdue', label: t('finance.arrears'), render: (row) => t('finance.daysOverdue', { count: row.days_overdue }) },
          ]}
          empty={<EmptyState title={t('finance.noArrears')} />}
        />
      </Panel>
    </div>
  );
}
