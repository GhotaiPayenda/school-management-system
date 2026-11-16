import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from './useApi.js';

export function usePagedApi(path, params, { perPage = 25, enabled = true } = {}) {
  const [page, setPage] = useState(1);
  const paramsKey = JSON.stringify(params ?? {});
  const query = useMemo(
    () => ({ ...(params ?? {}), page, pageSize: perPage }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey, page, perPage],
  );

  useEffect(() => {
    setPage(1);
  }, [paramsKey, perPage]);

  const request = useApi(path, { params: query, enabled });
  const items = request.data?.items ?? [];
  const pagination = request.data?.pagination ?? {
    page,
    perPage,
    total: items.length,
    pages: 1,
  };

  return {
    ...request,
    items,
    pagination,
    page,
    setPage,
    perPage,
  };
}

export function useReloadable(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(loader)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught) => {
        if (active) setError(caught);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return { data, setData, loading, error, reload };
}

export function useDownload() {
  const [busy, setBusy] = useState(null);
  return { busy, setBusy };
}
