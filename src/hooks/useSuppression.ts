import { useCallback, useEffect, useState } from 'react';
import {
  listSuppressions,
  addSuppression as apiAdd,
  removeSuppression as apiRemove,
  type Suppression,
} from '../lib/api/suppression';
import { ApiError } from '../lib/api/client';

export function useSuppression(clientId: string | null) {
  const [items,      setItems]      = useState<Suppression[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search,     setSearch]     = useState('');

  const fetchPage = useCallback(async (opts: { cursor?: string; search?: string; reset?: boolean } = {}) => {
    if (!clientId) return;
    try {
      const res = await listSuppressions(clientId, {
        cursor: opts.cursor,
        search: opts.search,
        limit:  50,
      });
      setItems((prev) => opts.reset ? res.data.items : [...prev, ...res.data.items]);
      setNextCursor(res.data.nextCursor);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : 'Failed to load suppression list');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  /* Initial fetch + when search changes. */
  useEffect(() => {
    if (!clientId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void fetchPage({ search, reset: true });
  }, [clientId, search, fetchPage]);

  const loadMore = useCallback(() => {
    if (nextCursor) void fetchPage({ cursor: nextCursor, search });
  }, [nextCursor, search, fetchPage]);

  const add = useCallback(async (email: string, note?: string) => {
    if (!clientId) throw new Error('No client');
    const res = await apiAdd(clientId, { email, note });
    setItems((prev) => [res.data.suppression, ...prev]);
    return res.data.suppression;
  }, [clientId]);

  const remove = useCallback(async (id: string) => {
    if (!clientId) throw new Error('No client');
    /* Optimistic — feature-perceived-performance V1. */
    let removed: Suppression | undefined;
    let removedIndex = -1;
    setItems((prev) => {
      removedIndex = prev.findIndex((s) => s.id === id);
      if (removedIndex >= 0) removed = prev[removedIndex];
      return prev.filter((s) => s.id !== id);
    });
    try {
      await apiRemove(clientId, id);
    } catch (err) {
      if (removed && removedIndex >= 0) {
        const restore = removed;
        const idx = removedIndex;
        setItems((prev) => {
          const next = [...prev];
          next.splice(idx, 0, restore);
          return next;
        });
      }
      throw err;
    }
  }, [clientId]);

  return {
    items, loading, error,
    nextCursor, hasMore: !!nextCursor,
    loadMore,
    search, setSearch,
    add, remove,
  };
}
