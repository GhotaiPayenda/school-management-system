import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { api, toErrorPayload } from '../api/client.js';
import { useToast } from '../providers/AppProviders.jsx';
import { Alert, Button, Checkbox, Field, Input, LoadingBlock, PageHeader, Panel, Select } from '../components/ui.jsx';
import { readFileAsDataUrl } from '../lib/download.js';
import { messageFor } from '../i18n/messages.js';

const days = [
  { value: 6, key: 'day.saturday', label: 'Saturday' },
  { value: 0, key: 'day.sunday', label: 'Sunday' },
  { value: 1, key: 'day.monday', label: 'Monday' },
  { value: 2, key: 'day.tuesday', label: 'Tuesday' },
  { value: 3, key: 'day.wednesday', label: 'Wednesday' },
  { value: 4, key: 'day.thursday', label: 'Thursday' },
  { value: 5, key: 'day.friday', label: 'Friday' },
];

const empty = {
  name: '',
  address: '',
  phone: '',
  email: '',
  currency: 'AFN',
  timezone: 'Asia/Kabul',
  default_language: 'en',
  default_theme: 'light',
  date_calendar: 'gregorian',
  principal_name: '',
  principal_title: 'Principal',
  invoice_due_day: 5,
  fine_daily_rate: 5,
  lost_processing_fee: 100,
  student_loan_limit: 2,
  student_loan_days: 14,
  staff_loan_limit: 5,
  staff_loan_days: 30,
  per_period_attendance: 0,
  teachingDays: [6, 0, 1, 2, 3, 4],
  logoUrl: null,
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoData, setLogoData] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/settings')
      .then((response) => {
        if (!active) return;
        const data = response.data.data;
        setForm({
          ...empty,
          ...data,
          teachingDays: data.teachingDays ?? [6, 0, 1, 2, 3, 4],
          per_period_attendance: data.per_period_attendance ? 1 : 0,
        });
      })
      .catch((caught) => {
        if (active) setError(toErrorPayload(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const daySet = useMemo(() => new Set(form.teachingDays?.map(Number) ?? []), [form.teachingDays]);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day) {
    const next = new Set(daySet);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    set('teachingDays', [...next]);
  }

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setLogoData(dataUrl);
    setPreview(dataUrl);
    setRemoveLogo(false);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        currency: form.currency,
        timezone: form.timezone,
        default_language: form.default_language,
        default_theme: form.default_theme,
        date_calendar: form.date_calendar,
        principal_name: form.principal_name,
        principal_title: form.principal_title,
        invoice_due_day: Number(form.invoice_due_day),
        fine_daily_rate: Number(form.fine_daily_rate),
        lost_processing_fee: Number(form.lost_processing_fee),
        student_loan_limit: Number(form.student_loan_limit),
        student_loan_days: Number(form.student_loan_days),
        staff_loan_limit: Number(form.staff_loan_limit),
        staff_loan_days: Number(form.staff_loan_days),
        per_period_attendance: Boolean(form.per_period_attendance),
        teaching_days: form.teachingDays,
      };
      if (logoData) payload.logo_data = logoData;
      if (removeLogo) payload.remove_logo = true;
      const response = await api.put('/settings', payload);
      const updated = response.data.data;
      setForm({ ...empty, ...updated, teachingDays: updated.teachingDays ?? [], per_period_attendance: updated.per_period_attendance ? 1 : 0 });
      setLogoData(null);
      setRemoveLogo(false);
      setPreview(null);
      notify('settings.saved');
    } catch (caught) {
      setError(toErrorPayload(caught));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} />
        <LoadingBlock rows={8} />
      </div>
    );
  }

  const logoSrc = preview || (!removeLogo && form.logoUrl ? `${form.logoUrl}?v=${form.updated_at || ''}` : null);

  return (
    <form className="page-stack" onSubmit={save}>
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        copy={t('settings.copy')}
        actions={
          <Button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? t('common.saving') : t('common.saveChanges')}
          </Button>
        }
      />

      {error ? <Alert tone="danger">{messageFor(error.messageKey, error.message)}</Alert> : null}

      <div className="settings-layout">
        <Panel title={t('settings.general')}>
          <div className="form-grid">
            <Field label={t('settings.schoolName')} required className="field-full">
              <Input value={form.name} onChange={(event) => set('name', event.target.value)} required />
            </Field>
            <Field label={t('settings.address')} className="field-full">
              <Input value={form.address ?? ''} onChange={(event) => set('address', event.target.value)} />
            </Field>
            <Field label={t('settings.phone')}>
              <Input value={form.phone ?? ''} onChange={(event) => set('phone', event.target.value)} />
            </Field>
            <Field label={t('settings.email')}>
              <Input type="email" value={form.email ?? ''} onChange={(event) => set('email', event.target.value)} />
            </Field>
            <Field label={t('settings.principalName')}>
              <Input value={form.principal_name ?? ''} onChange={(event) => set('principal_name', event.target.value)} />
            </Field>
            <Field label={t('settings.principalTitle')}>
              <Input value={form.principal_title ?? ''} onChange={(event) => set('principal_title', event.target.value)} />
            </Field>
          </div>

          <div className="logo-row">
            <div className="logo-preview">
              {logoSrc ? <img src={logoSrc} alt={form.name} /> : <span>M</span>}
            </div>
            <div>
              <p className="field-label">School logo</p>
              <p className="muted state-copy-sm">PNG, JPEG, WebP, or GIF up to 2 MB.</p>
              <div className="inline-actions">
                <Button variant="quiet" size="sm" type="button" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={15} />
                  {t('common.upload')}
                </Button>
                {logoSrc ? (
                  <Button
                    variant="quiet"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setLogoData(null);
                      setPreview(null);
                      setRemoveLogo(true);
                    }}
                  >
                    <Trash2 size={15} />
                    {t('common.delete')}
                  </Button>
                ) : null}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={handleLogo} />
            </div>
          </div>
        </Panel>

        <Panel title={t('settings.academic')}>
          <div className="form-grid">
            <Field label={t('settings.defaultLanguage')}>
              <Select value={form.default_language} onChange={(event) => set('default_language', event.target.value)}>
                <option value="en">{t('settings.english')}</option>
                <option value="fa-AF">{t('settings.dari')}</option>
                <option value="ps-AF">{t('settings.pashto')}</option>
              </Select>
            </Field>
            <Field label={t('settings.defaultTheme')}>
              <Select value={form.default_theme} onChange={(event) => set('default_theme', event.target.value)}>
                <option value="light">{t('settings.light')}</option>
                <option value="dark">{t('settings.dark')}</option>
              </Select>
            </Field>
            <Field label={t('settings.dateCalendar')}>
              <Select value={form.date_calendar} onChange={(event) => set('date_calendar', event.target.value)}>
                <option value="gregorian">{t('settings.gregorian')}</option>
                <option value="solar_hijri">{t('settings.solarHijri')}</option>
              </Select>
            </Field>
            <Field label={t('settings.timezone')}>
              <Select value={form.timezone} onChange={(event) => set('timezone', event.target.value)}>
                {['Asia/Kabul', 'Asia/Karachi', 'Asia/Tehran', 'UTC'].map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </Select>
            </Field>
            <div className="field field-full">
              <span className="field-label">{t('settings.teachingDays')}</span>
              <div className="checkbox-grid">
                {days.map((day) => (
                  <Checkbox
                    key={day.value}
                    label={t(day.key, { defaultValue: day.label })}
                    checked={daySet.has(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                ))}
              </div>
              <span className="field-hint">Afghanistan uses Saturday through Thursday.</span>
            </div>
            <div className="field field-full">
              <span className="field-label">{t('settings.attendance')}</span>
              <Checkbox
                label={t('settings.perPeriodAttendance')}
                checked={Boolean(form.per_period_attendance)}
                onChange={(event) => set('per_period_attendance', event.target.checked ? 1 : 0)}
              />
            </div>
          </div>
        </Panel>

        <Panel title={t('settings.finance')}>
          <div className="form-grid">
            <Field label={t('settings.currency')}>
              <Input value={form.currency ?? 'AFN'} maxLength={3} onChange={(event) => set('currency', event.target.value.toUpperCase())} />
            </Field>
            <Field label={t('settings.invoiceDueDay')}>
              <Input type="number" min="1" max="28" value={form.invoice_due_day} onChange={(event) => set('invoice_due_day', event.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel title={t('settings.library')}>
          <div className="form-grid">
            <Field label={t('settings.fineDailyRate')}>
              <Input type="number" min="0" step="0.01" value={form.fine_daily_rate} onChange={(event) => set('fine_daily_rate', event.target.value)} />
            </Field>
            <Field label={t('settings.lostProcessingFee')}>
              <Input type="number" min="0" step="0.01" value={form.lost_processing_fee} onChange={(event) => set('lost_processing_fee', event.target.value)} />
            </Field>
            <Field label={t('settings.studentLoanLimit')}>
              <Input type="number" min="1" value={form.student_loan_limit} onChange={(event) => set('student_loan_limit', event.target.value)} />
            </Field>
            <Field label={t('settings.studentLoanDays')}>
              <Input type="number" min="1" value={form.student_loan_days} onChange={(event) => set('student_loan_days', event.target.value)} />
            </Field>
            <Field label={t('settings.staffLoanLimit')}>
              <Input type="number" min="1" value={form.staff_loan_limit} onChange={(event) => set('staff_loan_limit', event.target.value)} />
            </Field>
            <Field label={t('settings.staffLoanDays')}>
              <Input type="number" min="1" value={form.staff_loan_days} onChange={(event) => set('staff_loan_days', event.target.value)} />
            </Field>
          </div>
        </Panel>
      </div>
    </form>
  );
}
