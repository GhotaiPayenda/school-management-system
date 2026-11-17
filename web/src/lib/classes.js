export function localizedGrade(entry, language) {
  if (language === 'fa-AF') return entry.grade_name_fa || entry.grade_name;
  if (language === 'ps-AF') return entry.grade_name_ps || entry.grade_name;
  return entry.grade_name;
}

export function yearLabel(year, format) {
  if (!year) return '—';
  if (!format.eastern) return year.label || '—';
  const start = format.formatDate(year.start_date, { year: 'numeric' });
  const end = format.formatDate(year.end_date, { year: 'numeric' });
  return start === end ? start : `${start} – ${end}`;
}
