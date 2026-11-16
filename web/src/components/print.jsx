import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { useSchool } from '../providers/AppProviders.jsx';
import { Button } from './ui.jsx';

/**
 * Marks the document while a printable dialog is open, so browser printing only
 * emits the sheet and never the application shell behind the dialog.
 */
export function usePrintMode(active) {
  useEffect(() => {
    if (!active) return undefined;
    document.body.classList.add('has-print-sheet');
    return () => document.body.classList.remove('has-print-sheet');
  }, [active]);
}

export function PrintHeader({ title, meta, school: explicitSchool }) {
  const { school: cachedSchool } = useSchool();
  const school = explicitSchool || cachedSchool || {};
  const logo = school.logoUrl || (school.logo_path ? '/api/v1/settings/logo' : null);
  const contact = [school.phone, school.email].filter(Boolean).join(' · ');

  return (
    <header className="print-head">
      <div className="print-brand">
        {logo ? <img className="print-logo" src={logo} alt="" /> : <span className="brand-mark" aria-hidden="true">M</span>}
        <div>
          <h2 className="print-school">{school.name || 'Meridian Academy'}</h2>
          {school.address ? <p className="print-contact">{school.address}</p> : null}
          {contact ? <p className="print-contact">{contact}</p> : null}
        </div>
      </div>
      <div className="print-doc">
        <p className="eyebrow">{title}</p>
        {meta ? <p className="print-contact">{meta}</p> : null}
      </div>
    </header>
  );
}

export function PrintFooter({ items = [] }) {
  const { t } = useTranslation();
  const lines = items.length > 0 ? items : [{ label: t('print.signature') }];

  return (
    <footer className="print-foot">
      {lines.map((item) => (
        <div className="print-sign" key={item.label}>
          <span>{item.value || '\u00A0'}</span>
          <small>{item.label}</small>
        </div>
      ))}
    </footer>
  );
}

export function PrintButton({ label, ...props }) {
  const { t } = useTranslation();
  return (
    <Button variant="quiet" size="sm" onClick={() => window.print()} {...props}>
      <Printer size={15} /> {label || t('common.print')}
    </Button>
  );
}
