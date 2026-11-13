export const messages = {
  'auth.invalidCredentials': 'Email or password is incorrect.',
  'auth.tooManyAttempts': 'Too many sign-in attempts. Try again later.',
  'auth.accountInactive': 'This account is inactive. Ask a Super Admin for help.',
  'auth.unauthenticated': 'Your session has ended. Sign in again.',
  'auth.forbidden': 'You do not have permission to do that.',
  'auth.missingPermission': 'You do not have permission to open that screen.',
  'auth.csrfInvalid': 'The security token expired. Refresh the page and try again.',
  'auth.csrfMissing': 'Your session is missing. Refresh the page and try again.',
  'auth.passwordChangeRequired': 'Change your temporary password before continuing.',
  'auth.emailRequired': 'Enter your email address.',
  'auth.emailInvalid': 'Enter a valid email address.',
  'auth.passwordRequired': 'Enter your password.',
  'auth.currentPasswordRequired': 'Enter your current password.',
  'auth.currentPasswordInvalid': 'Your current password is incorrect.',
  'auth.passwordTooShort': 'Use at least 8 characters.',
  'auth.passwordConfirmationMismatch': 'The two passwords do not match.',
  'auth.passwordMustDiffer': 'Choose a password different from the temporary one.',
  'errors.network': 'The server could not be reached. Check that the API is running.',
  'errors.server': 'The server hit an unexpected problem. Try again.',
  'errors.validation': 'Check the highlighted fields and try again.',
  'errors.notFound': 'That screen does not exist.',
  'errors.methodNotAllowed': 'That action is not available.',
};

export function messageFor(key, fallback) {
  return messages[key] || fallback || 'Something went wrong. Try again.';
}
