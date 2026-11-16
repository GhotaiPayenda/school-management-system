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

const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeApiError(error);
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();

    // The development PHP server serves one request at a time. A burst of
    // reference-data requests can occasionally reset a connection, so retry
    // safe reads before surfacing a network error to the page.
    if (
      config &&
      ['get', 'head'].includes(method) &&
      RETRYABLE_STATUSES.has(normalized.status) &&
      (config.__retryCount ?? 0) < 2
    ) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      return new Promise((resolve) => {
        window.setTimeout(resolve, 250 * config.__retryCount);
      }).then(() => api(config));
    }

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
