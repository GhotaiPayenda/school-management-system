import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { buildResources, languages } from './dictionary.js';

export const supportedLanguages = languages;

export function languageMeta(code) {
  return languages.find((language) => language.code === code) ?? languages[0];
}

export function storedLanguage() {
  if (typeof window === 'undefined') return 'en';
  const value = window.localStorage.getItem('meridian.language');
  return languages.some((language) => language.code === value) ? value : 'en';
}

export function applyDocumentLanguage(code) {
  if (typeof document === 'undefined') return;
  const meta = languageMeta(code);
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
}

const initial = storedLanguage();

i18n.use(initReactI18next).init({
  resources: buildResources(),
  lng: initial,
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLanguage(initial);

export async function changeLanguage(code) {
  const meta = languageMeta(code);
  await i18n.changeLanguage(meta.code);
  applyDocumentLanguage(meta.code);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('meridian.language', meta.code);
    window.dispatchEvent(new CustomEvent('meridian:language-changed', { detail: meta }));
  }
}

export default i18n;