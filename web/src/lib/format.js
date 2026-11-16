import { useTranslation } from 'react-i18next';

const EASTERN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toEasternDigits(value) {
  return String(value).replace(/\d/g, (digit) => EASTERN_DIGITS[Number(digit)]);
}

function localeFor(language) {
  if (language === 'fa-AF') return 'fa-AF';
  if (language === 'ps-AF') return 'ps-AF';
  return 'en-GB';
}

function dateLocale(language) {
  if (language === 'fa-AF') return 'fa-AF-u-ca-persian';
  if (language === 'ps-AF') return 'ps-AF-u-ca-persian';
  return 'en-GB';
}

function parseDate(value, dateOnly = false) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T12:00:00Z');
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
    return new Date(value + '-01T12:00:00Z');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (dateOnly) return parsed;
  return parsed;
}

export function useFormat() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const locale = localeFor(language);
  const eastern = language !== 'en';

  function decorate(text) {
    return eastern ? toEasternDigits(text) : text;
  }

  function formatNumber(value, options = {}) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      ...options,
    }).format(number);
    return decorate(formatted);
  }

  function formatInteger(value) {
    return formatNumber(value, { maximumFractionDigits: 0 });
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AFN',
      currencyDisplay: 'code',
      maximumFractionDigits: 2,
    }).format(number);
    return decorate(formatted);
  }

  function formatPercent(value, digits = 1) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    return decorate(
      new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
      }).format(number / 100),
    );
  }

  function formatDate(value, options = { dateStyle: 'medium' }) {
    const date = parseDate(value, true);
    if (!date) return '—';
    return decorate(
      new Intl.DateTimeFormat(dateLocale(language), {
        calendar: eastern ? 'persian' : 'gregory',
        ...options,
      }).format(date),
    );
  }

  function formatDateShort(value) {
    return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(value) {
    return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatMonth(value) {
    if (!value) return '—';
    if (/^\d{4}-\d{2}$/.test(value)) {
      return formatDate(value + '-01', { month: 'long', year: 'numeric' });
    }
    return formatDate(value, { month: 'long', year: 'numeric' });
  }

  function formatTime(value) {
    if (!value) return '—';
    if (/^\d{2}:\d{2}/.test(value)) {
      const [hour, minute] = value.split(':').map(Number);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return decorate(
        new Intl.DateTimeFormat(dateLocale(language), {
          hour: 'numeric',
          minute: '2-digit',
        }).format(date),
      );
    }
    return formatDate(value, { timeStyle: 'short' });
  }

  function formatBytes(value) {
    if (!value) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(value);
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${formatNumber(size, { maximumFractionDigits: 1 })} ${units[unit]}`;
  }

  return {
    language,
    locale,
    eastern,
    formatNumber,
    formatInteger,
    formatCurrency,
    formatPercent,
    formatDate,
    formatDateShort,
    formatDateTime,
    formatMonth,
    formatTime,
    formatBytes,
  };
}

export function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function statusTranslationKey(status) {
  return `status.${status ?? 'unknown'}`;
}

export function gradeTranslationKey(letter) {
  if (!letter) return 'grade.Fail';
  return `grade.${letter === 'F' ? 'Fail' : letter}`;
}

export function statusTone(status) {
  switch (status) {
    case 'active':
    case 'present':
    case 'paid':
    case 'available':
    case 'published':
    case 'admitted':
    case 'promoted':
    case 'settled':
      return 'success';
    case 'absent':
    case 'rejected':
    case 'lost':
    case 'void':
    case 'damaged':
    case 'retained':
      return 'danger';
    case 'late':
    case 'overdue':
    case 'issued':
    case 'partially_paid':
    case 'draft':
    case 'applicant':
    case 'on_loan':
      return 'warning';
    case 'excused':
    case 'returned':
    case 'graduated':
    case 'transferred':
    case 'withdrawn':
    case 'archived':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function personName(row) {
  if (!row) return '—';
  if (row.name) return row.name;
  const first = row.first_name ?? row.firstName ?? '';
  const last = row.last_name ?? row.lastName ?? '';
  const full = `${first} ${last}`.trim();
  return full || row.title || '—';
}