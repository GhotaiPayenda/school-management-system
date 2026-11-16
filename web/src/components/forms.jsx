import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Field, Input, Modal, Select, Textarea } from './ui.jsx';
import { messageFor } from '../i18n/messages.js';

function schemaFor(fields) {
  const shape = {};
  for (const field of fields) {
    const required = Boolean(field.required);
    if (field.type === 'checkbox') {
      shape[field.name] = z.boolean().optional();
      continue;
    }
    if (field.type === 'number') {
      shape[field.name] = z.preprocess(
        (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
        required ? z.number({ invalid_type_error: 'Enter a number' }) : z.number().optional(),
      );
      continue;
    }
    if (field.type === 'email') {
      shape[field.name] = required
        ? z.string().min(1, 'Required').email('Invalid email')
        : z.union([z.string().email('Invalid email'), z.literal('')]).optional();
      continue;
    }
    if (field.type === 'time') {
      shape[field.name] = required
        ? z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time')
        : z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal('')]).optional();
      continue;
    }
    shape[field.name] = required ? z.string().min(1, 'Required') : z.string().optional();
  }
  return z.object(shape);
}

function defaultsFor(fields, initialValues) {
  const values = {};
  for (const field of fields) {
    const initial = initialValues?.[field.name];
    if (initial !== undefined && initial !== null) {
      values[field.name] = field.type === 'number' ? String(initial) : initial;
    } else if (field.type === 'checkbox') {
      values[field.name] = Boolean(field.defaultValue);
    } else {
      values[field.name] = field.defaultValue ?? '';
    }
  }
  return values;
}

export function EntityFormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues,
  onSubmit,
  submitLabel,
  extra,
  size = 'md',
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => schemaFor(fields), [fields]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(fields, initialValues),
  });
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      form.reset(defaultsFor(fields, initialValues));
      setServerError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  async function handleSubmit(values) {
    setBusy(true);
    setServerError(null);
    const payload = {};
    for (const field of fields) {
      const value = values[field.name];
      if (field.type === 'number') {
        if (value !== '' && value !== undefined && value !== null) payload[field.name] = Number(value);
      } else if (field.type === 'checkbox') {
        payload[field.name] = Boolean(value);
      } else {
        payload[field.name] = value;
      }
    }

    try {
      await onSubmit(payload, form);
      onOpenChange(false);
    } catch (caught) {
      const payloadError = caught?.isNormalized ? caught : caught;
      setServerError(payloadError);
      if (payloadError?.fields) {
        for (const [field, messageKey] of Object.entries(payloadError.fields)) {
          if (fields.some((item) => item.name === field)) {
            form.setError(field, { type: 'server', message: messageFor(messageKey, messageKey) });
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="entity-form" disabled={busy}>
            {busy ? t('common.saving') : submitLabel || t('common.save')}
          </Button>
        </>
      }
    >
      <form id="entity-form" onSubmit={form.handleSubmit(handleSubmit)} className="form-stack" noValidate>
        {serverError ? (
          <Alert tone="danger">{messageFor(serverError.messageKey, serverError.message || t('common.failed'))}</Alert>
        ) : null}
        {extra}
        <div className="form-grid">
          {fields.map((field) => {
            const error = form.formState.errors[field.name]?.message;
            const spanClass = field.span === 'full' ? 'field-full' : field.span === 'half' ? 'field-half' : '';
            if (field.type === 'checkbox') {
              return (
                <div key={field.name} className={`field field-checkbox ${spanClass}`.trim()}>
                  <Checkbox
                    label={field.checkboxLabel || field.label}
                    disabled={field.disabled}
                    {...form.register(field.name)}
                  />
                  {field.hint ? <span className="field-hint">{field.hint}</span> : null}
                  {error ? <span className="field-error">{error}</span> : null}
                </div>
              );
            }
            return (
              <Field key={field.name} label={field.label} hint={field.hint} error={error} required={field.required} className={spanClass}>
                {field.type === 'select' ? (
                  <Select {...form.register(field.name)} disabled={field.disabled}>
                    <option value="">{field.placeholder || t('common.select')}</option>
                    {(field.options || []).map((option) => {
                      const value = typeof option === 'object' ? option.value : option;
                      const label = typeof option === 'object' ? option.label : option;
                      return (
                        <option key={String(value)} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea {...form.register(field.name)} placeholder={field.placeholder} disabled={field.disabled} />
                ) : (
                  <Input
                    type={field.type || 'text'}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                    {...form.register(field.name)}
                  />
                )}
              </Field>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}

export function FormGrid({ children }) {
  return <div className="form-grid">{children}</div>;
}

export function FormActions({ children }) {
  return <div className="form-actions">{children}</div>;
}