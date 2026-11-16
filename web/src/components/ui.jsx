import * as Dialog from '@radix-ui/react-dialog';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { messageFor } from '../i18n/messages.js';
import { statusTranslationKey, statusTone } from '../lib/format.js';

export function Button({ variant = 'primary', size = 'md', className = '', children, type = 'button', ...props }) {
  return (
    <button type={type} className={`button button-${variant} button-${size} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ label, variant = 'quiet', className = '', children, ...props }) {
  return (
    <button type="button" className={`icon-button icon-button-${variant} ${className}`.trim()} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, copy, actions }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {copy ? <p className="page-copy muted">{copy}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, copy, actions, children, className = '', padded = true }) {
  return (
    <section className={`panel ${padded ? 'panel-padded' : ''} ${className}`.trim()}>
      {title || actions ? (
        <div className="panel-header">
          <div>
            {title ? <h2 className="panel-title">{title}</h2> : null}
            {copy ? <p className="panel-copy muted">{copy}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'forest', format }) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <div className="kpi-top">
        <p className="kpi-label">{label}</p>
        {Icon ? (
          <span className="kpi-icon" aria-hidden="true">
            <Icon size={17} />
          </span>
        ) : null}
      </div>
      <p className="kpi-value">{format ? format(value) : value}</p>
      {hint ? <p className="kpi-hint">{hint}</p> : null}
    </article>
  );
}

export function Badge({ tone, status, children, className = '' }) {
  const { t } = useTranslation();
  const resolvedTone = tone || statusTone(status);
  const content = children ?? (status ? t(statusTranslationKey(status)) : null);
  return <span className={`badge badge-${resolvedTone} ${className}`.trim()}>{content}</span>;
}

export function LetterBadge({ letter }) {
  const tone = letter === 'A' ? 'success' : letter === 'B' ? 'info' : letter === 'C' ? 'warning' : letter === 'D' ? 'neutral' : 'danger';
  return <span className={`letter-badge letter-${tone}`}>{letter || '—'}</span>;
}

export function Alert({ tone = 'info', title, children, onClose }) {
  const Icon = tone === 'danger' ? AlertTriangle : tone === 'success' ? Check : AlertTriangle;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon size={17} aria-hidden="true" />
      <div className="alert-copy">
        {title ? <strong>{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {onClose ? (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact = false }) {
  const { t } = useTranslation();
  const text = error ? messageFor(error.messageKey, error.message) : t('common.unknownError');
  return (
    <div className={`state-box state-error ${compact ? 'state-compact' : ''}`.trim()}>
      <span className="state-icon state-icon-danger" aria-hidden="true">
        <AlertTriangle size={20} />
      </span>
      <div>
        <p className="state-title-sm">{text}</p>
        {onRetry ? (
          <Button variant="quiet" size="sm" onClick={onRetry} className="mt-2">
            {t('common.retry')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, copy, action, compact = false }) {
  const { t } = useTranslation();
  return (
    <div className={`state-box state-empty ${compact ? 'state-compact' : ''}`.trim()}>
      <span className="state-icon" aria-hidden="true">
        <Search size={19} />
      </span>
      <div>
        <p className="state-title-sm">{title || t('common.noResults')}</p>
        <p className="muted state-copy-sm">{copy || t('common.noResultsHint')}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function LoadingBlock({ rows = 4 }) {
  const { t } = useTranslation();
  return (
    <div className="loading-block" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} className="skeleton-line" />
      ))}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <span className="spinner" aria-label={label || 'Loading'}>
      <Loader2 size={16} className="spinner-icon" />
    </span>
  );
}

export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`field ${className}`.trim()}>
      {label ? (
        <span className="field-label">
          {label}
          {required ? <span className="field-required"> *</span> : null}
        </span>
      ) : null}
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`input ${className}`.trim()} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <span className="select-wrap">
      <select className={`input select ${className}`.trim()} {...props}>
        {children}
      </select>
      <ChevronDown size={15} className="select-chevron" aria-hidden="true" />
    </span>
  );
}

export function Textarea({ className = '', rows = 4, ...props }) {
  return <textarea className={`input textarea ${className}`.trim()} rows={rows} {...props} />;
}

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`checkbox ${className}`.trim()}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Switch({ label, checked, onCheckedChange, id }) {
  return (
    <div className="switch-row">
      <SwitchPrimitive.Root id={id} className="switch-root" checked={checked} onCheckedChange={onCheckedChange}>
        <SwitchPrimitive.Thumb className="switch-thumb" />
      </SwitchPrimitive.Root>
      {label ? (
        <label htmlFor={id} className="switch-label">
          {label}
        </label>
      ) : null}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, className = '' }) {
  return (
    <span className={`search-field ${className}`.trim()}>
      <Search size={16} className="search-icon" aria-hidden="true" />
      <input className="input search-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value ? (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <X size={14} />
        </button>
      ) : null}
    </span>
  );
}

export function FilterBar({ children, actions }) {
  return (
    <div className="filter-bar">
      <div className="filter-fields">{children}</div>
      {actions ? <div className="filter-actions">{actions}</div> : null}
    </div>
  );
}

export function DataTable({ columns, rows, loading, error, onRetry, empty, rowKey = 'id', onRowClick, footer, className = '' }) {
  const { t } = useTranslation();
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={onRetry} compact />;
  if (!rows || rows.length === 0) {
    return empty || <EmptyState compact />;
  }
  return (
    <div className={`table-wrap ${className}`.trim()}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'end' ? 'cell-end' : undefined} style={column.width ? { width: column.width } : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index}
              className={onRowClick ? 'row-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') onRowClick(row);
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'end' ? 'cell-end' : undefined}>
                  {column.render ? column.render(row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
      <p className="table-mobile-hint">{t('common.showing', { count: rows.length })}</p>
    </div>
  );
}

export function Pagination({ page = 1, pages = 1, total, perPage, onPageChange }) {
  const { t } = useTranslation();
  if (!total || pages <= 1) {
    return total ? <p className="pagination-note">{t('common.showing', { count: total })}</p> : null;
  }
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div className="pagination">
      <p className="pagination-note">{t('common.showingRange', { from, to, total })}</p>
      <div className="pagination-controls">
        <IconButton label={t('common.previous')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ArrowLeft size={16} className="direction-icon" />
        </IconButton>
        <span className="pagination-page">{t('common.pageOf', { page, pages })}</span>
        <IconButton label={t('common.next')} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ArrowRight size={16} className="direction-icon" />
        </IconButton>
      </div>
    </div>
  );
}

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal-content modal-${size}`.trim()} aria-describedby={description ? 'modal-description' : undefined}>
          <div className="modal-header">
            <div>
              <Dialog.Title className="modal-title">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description id="modal-description" className="modal-description muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <IconButton label={t('common.close')}>
                <X size={17} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-footer">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmModal({ open, onOpenChange, title, body, confirmLabel, onConfirm, tone = 'danger', busy = false }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title || t('common.confirmDeleteTitle')}
      description={body || t('common.confirmDeleteBody')}
      size="sm"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? t('common.saving') : confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      <div className={`confirm-mark confirm-${tone}`} aria-hidden="true">
        <AlertTriangle size={22} />
      </div>
    </Modal>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children, className = '' }) {
  return <TabsPrimitive.List className={`tabs-list ${className}`.trim()}>{children}</TabsPrimitive.List>;
}

export function TabsTrigger({ value, children }) {
  return (
    <TabsPrimitive.Trigger value={value} className="tabs-trigger">
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children, className = '' }) {
  return (
    <TabsPrimitive.Content value={value} className={`tabs-content ${className}`.trim()}>
      {children}
    </TabsPrimitive.Content>
  );
}

export function KeyValue({ items, columns = 2 }) {
  return (
    <dl className="key-value-grid" style={{ '--kv-columns': columns }}>
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="key-value">
          <dt>{item.label}</dt>
          <dd>{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, tone = 'forest', label }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress" aria-label={label} role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
      <span className={`progress-fill progress-${tone}`} style={{ width: `${safe}%` }} />
    </div>
  );
}

export function Avatar({ name, size = 'md' }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return <span className={`avatar avatar-${size}`}>{initials || '?'}</span>;
}

export function SectionHeading({ eyebrow, title, actions }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="section-title">{title}</h2>
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}