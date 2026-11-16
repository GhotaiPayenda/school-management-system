import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeDollarSign, ReceiptText, Wallet } from 'lucide-react';
import {
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
  StatCard,
} from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';
import { useFormat } from '../lib/format.js';

export default function PortalFeesPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const childrenRequest = useApi('/portal/children');
  const children = childrenRequest.data?.items ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!selectedId && children.length > 0) setSelectedId(children[0].id);
  }, [children, selectedId]);

  const activeChild = children.find((child) => Number(child.id) === Number(selectedId)) ?? children[0] ?? null;
  const overview = useApi(`/portal/children/${activeChild?.id}/overview`, { enabled: Boolean(activeChild?.id) });
  const invoices = overview.data?.invoices ?? [];

  const filtered = useMemo(
    () => invoices.filter((invoice) => !status || invoice.status === status),
    [invoices, status],
  );
  const totals = useMemo(() => {
    return invoices.reduce(
      (sum, invoice) => ({
        billed: sum.billed + Number(invoice.total ?? 0),
        paid: sum.paid + Number(invoice.paid_total ?? 0),
        balance: sum.balance + Number(invoice.balance ?? 0),
        open: sum.open + (Number(invoice.balance) > 0 && invoice.status !== 'void' ? 1 : 0),
      }),
      { billed: 0, paid: 0, balance: 0, open: 0 },
    );
  }, [invoices]);

  if (childrenRequest.error) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.fees')} />
        <ErrorState error={childrenRequest.error} onRetry={childrenRequest.reload} />
      </div>
    );
  }

  if (childrenRequest.loading) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.fees')} />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('portal.eyebrow')} title={t('portal.fees')} copy={t('portal.feesCopy')} />
        <EmptyState title={t('portal.noChildren')} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('portal.eyebrow')}
        title={t('portal.fees')}
        copy={t('portal.feesCopy')}
        actions={children.length > 1 ? (
          <Select value={activeChild?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.firstName} {child.lastName}</option>
            ))}
          </Select>
        ) : <Badge tone="forest">{activeChild?.firstName} {activeChild?.lastName}</Badge>}
      />

      {overview.error ? <ErrorState error={overview.error} onRetry={overview.reload} /> : null}

      {overview.loading || !overview.data ? <LoadingBlock rows={6} /> : (
        <>
          <section className="kpi-grid">
            <StatCard label={t('portal.outstanding')} value={format.formatCurrency(totals.balance)} tone="terracotta" icon={Wallet} />
            <StatCard label={t('finance.billed')} value={format.formatCurrency(totals.billed)} tone="ink" icon={ReceiptText} />
            <StatCard label={t('finance.collected')} value={format.formatCurrency(totals.paid)} tone="forest" icon={BadgeDollarSign} />
            <StatCard label={t('finance.invoices')} value={format.formatInteger(totals.open)} hint={t('status.open')} tone="brass" />
          </section>

          <Panel title={t('finance.invoices')}>
            <FilterBar>
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">{t('common.all')}</option>
                {['issued', 'partially_paid', 'paid', 'overdue', 'void'].map((value) => (
                  <option key={value} value={value}>{t(`status.${value}`)}</option>
                ))}
              </Select>
            </FilterBar>
            <DataTable
              rows={filtered}
              columns={[
                { key: 'invoice_number', label: t('finance.invoiceNumber'), render: (row) => <strong>{row.invoice_number}</strong> },
                { key: 'billing_period', label: t('finance.billingPeriod'), render: (row) => format.formatMonth(row.billing_period) },
                { key: 'due_date', label: t('finance.dueDate'), render: (row) => format.formatDate(row.due_date) },
                { key: 'total', label: t('finance.billed'), render: (row) => format.formatCurrency(row.total) },
                { key: 'paid_total', label: t('finance.paidTotal'), render: (row) => format.formatCurrency(row.paid_total) },
                { key: 'balance', label: t('finance.balance'), render: (row) => <strong>{format.formatCurrency(row.balance)}</strong> },
                { key: 'status', label: t('people.status'), render: (row) => <Badge status={row.status} /> },
              ]}
              empty={<EmptyState title={t('portal.noFees')} />}
            />
          </Panel>

          <Panel title={t('portal.child')}>
            <div className="result-summary">
              <div>
                <span className="muted">{t('portal.child')}</span>
                <strong>{activeChild.firstName} {activeChild.lastName}</strong>
              </div>
              <div>
                <span className="muted">{t('people.section')}</span>
                <strong>{activeChild.gradeName} — {activeChild.sectionName}</strong>
              </div>
              <div>
                <span className="muted">{t('admissions.academicYear')}</span>
                <strong>{activeChild.academicYearLabel}</strong>
              </div>
              <div>
                <span className="muted">{t('portal.outstanding')}</span>
                <strong>{format.formatCurrency(activeChild.outstanding)}</strong>
              </div>
            </div>
            <p className="muted">{t('portal.feesNote', { defaultValue: 'Payments are recorded by the school finance office. Contact the office if a payment is missing.' })}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
