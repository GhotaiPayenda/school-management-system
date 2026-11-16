import { useCallback, useEffect, useRef, useState } from 'react';
import { api, toErrorPayload } from '../api/client.js';

export function useApi(path, options = {}) {
  const { params, enabled = true, deps = [] } = options;
  const [data, setData] = useState(options.initialData ?? null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const paramsKey = params ? JSON.stringify(params) : '';
  const depsKey = JSON.stringify(deps);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    api
      .get(path, params ? { params } : undefined)
      .then((response) => {
        if (active) setData(response.data.data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, enabled, version, depsKey]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { data, loading, error, reload, setData };
}

export async function fetchAll(path, params = {}) {
  const response = await api.get(path, { params });
  return response.data.data;
}

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}