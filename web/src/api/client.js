import axios from 'axios';

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export function getCsrfToken() {
  return csrfToken;
}

function normalizeApiError(error) {
  if (error?.isNormalized) return error;

  const status = error.response?.status ?? 0;
  const payload = error.response?.data?.error;
  const normalized = new Error(
    payload?.message ||
      (status === 0
        ? 'The server could not be reached. Check that the API is running.'
        : 'Something went wrong. Try again.'),
  );

  normalized.isNormalized = true;
  normalized.status = status;
  normalized.code = payload?.code || 'network_error';
  normalized.messageKey = payload?.messageKey || 'errors.network';
  normalized.fields = payload?.fields || {};

  return normalized;
}

export function toErrorPayload(error) {
  const normalized = normalizeApiError(error);

  return {
    status: normalized.status,
    code: normalized.code,
    messageKey: normalized.messageKey,
    message: normalized.message,
    fields: normalized.fields,
  };
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const stateChanging = ['post', 'put', 'patch', 'delete'].includes(method);

  if (stateChanging && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeApiError(error);
    const config = error.config || {};

    if (normalized.status === 401 && !config.skipAuthRedirect) {
      window.dispatchEvent(new CustomEvent('meridian:session-expired'));
    }

    if (normalized.code === 'password_change_required') {
      window.dispatchEvent(new CustomEvent('meridian:password-change-required'));
    }

    return Promise.reject(normalized);
  },
);

export async function refreshCsrf() {
  const response = await api.get('/auth/csrf', { skipAuthRedirect: true });
  setCsrfToken(response.data.data.csrfToken);

  return response.data.data.csrfToken;
}
