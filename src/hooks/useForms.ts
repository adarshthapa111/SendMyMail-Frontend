import { useCallback, useEffect, useState } from 'react';
import {
  listForms,
  archiveForm as apiArchive,
  type FormSummary,
} from '../lib/api/forms';
import { ApiError } from '../lib/api/client';

/* List forms for a client. Cursor-paginated. */
export function useForms(clientId: string | null) {
  const [items,      setItems]      = useState<FormSummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchPage = useCallback(async (opts: { cursor?: string; reset?: boolean } = {}) => {
    if (!clientId) return;
    try {
      const res = await listForms(clientId, { cursor: opts.cursor, limit: 50 });
      setItems((prev) => opts.reset ? res.data.items : [...prev, ...res.data.items]);
      setNextCursor(res.data.nextCursor);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void fetchPage({ reset: true });
  }, [clientId, fetchPage]);

  const loadMore = useCallback(() => {
    if (nextCursor) void fetchPage({ cursor: nextCursor });
  }, [nextCursor, fetchPage]);

  const archive = useCallback(async (formId: string) => {
    if (!clientId) throw new Error('No client');
    /* Optimistic — feature-perceived-performance V1. Capture rollback,
       remove immediately, fire API, restore on error. */
    let removed: FormSummary | undefined;
    let removedIndex = -1;
    setItems((prev) => {
      removedIndex = prev.findIndex((f) => f.id === formId);
      if (removedIndex >= 0) removed = prev[removedIndex];
      return prev.filter((f) => f.id !== formId);
    });
    try {
      await apiArchive(clientId, formId);
    } catch (err) {
      // Rollback: re-insert at original position
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
    nextCursor, hasMore: !!nextCursor, loadMore,
    archive,
    refetch: () => fetchPage({ reset: true }),
  };
}
