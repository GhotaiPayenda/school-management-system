import i18n from './index.js';
import { fallbackFor } from './dictionary.js';

export const messages = {
  'auth.invalidCredentials': fallbackFor('auth.invalidCredentials'),
  'auth.tooManyAttempts': fallbackFor('auth.tooManyAttempts'),
  'auth.accountInactive': fallbackFor('auth.accountInactive'),
  'auth.unauthenticated': fallbackFor('auth.unauthenticated'),
  'auth.forbidden': fallbackFor('auth.forbidden'),
  'auth.missingPermission': fallbackFor('auth.missingPermission'),
  'auth.csrfInvalid': fallbackFor('auth.csrfInvalid'),
  'auth.csrfMissing': fallbackFor('auth.csrfMissing'),
  'auth.passwordChangeRequired': fallbackFor('auth.passwordChangeRequired'),
  'auth.emailRequired': fallbackFor('auth.emailRequired'),
  'auth.emailInvalid': fallbackFor('auth.emailInvalid'),
  'auth.passwordRequired': fallbackFor('auth.passwordRequired'),
  'auth.currentPasswordRequired': fallbackFor('auth.currentPasswordRequired'),
  'auth.currentPasswordInvalid': fallbackFor('auth.currentPasswordInvalid'),
  'auth.passwordTooShort': fallbackFor('auth.passwordTooShort'),
  'auth.passwordConfirmationMismatch': fallbackFor('auth.passwordConfirmationMismatch'),
  'auth.passwordMustDiffer': 'Choose a password different from the temporary one.',
  'errors.network': fallbackFor('errors.network'),
  'errors.server': fallbackFor('errors.server'),
  'errors.validation': fallbackFor('errors.validation'),
  'errors.notFound': fallbackFor('errors.notFound'),
  'errors.methodNotAllowed': 'That action is not available.',
};

export function messageFor(key, fallback) {
  if (!key) return fallback || messages['errors.network'];
  const translated = i18n.t(key, { defaultValue: '' });
  return translated || messages[key] || fallback || fallbackFor('common.unknownError');
}