import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listSendingDomains,
  addSendingDomain as apiAdd,
  checkSendingDomain as apiCheck,
  deleteSendingDomain as apiDelete,
  type SendingDomain,
} from '../lib/api/sendingDomains';
import { ApiError } from '../lib/api/client';

/* Sending-domains hook. Loads on mount + polls pending domains every
   30s (Resend can take that long for DNS to propagate). Polling stops
   automatically once all domains are verified or failed. */

const POLL_INTERVAL_MS = 30_000;

export function useSendingDomains() {
  const [items,   setItems]   = useState<SendingDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await listSendingDomains();
      setItems(res.data.items);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : 'Failed to load sending domains');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void refetch();
  }, [refetch]);

  /* Poll while any domain is pending. Stops when all verified/failed. */
  useEffect(() => {
    const hasPending = items.some((d) => d.status === 'pending');
    const stop = () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    if (hasPending && pollRef.current === null) {
      pollRef.current = window.setInterval(() => { void refetch(); }, POLL_INTERVAL_MS);
    } else if (!hasPending) {
      stop();
    }
    return stop;
  }, [items, refetch]);

  const add = useCallback(async (name: string) => {
    const res = await apiAdd({ name });
    setItems((prev) => [res.data.domain, ...prev]);
    return res.data.domain;
  }, []);

  const check = useCallback(async (id: string) => {
    const res = await apiCheck(id);
    setItems((prev) => prev.map((d) => d.id === id ? res.data.domain : d));
    return res.data.domain;
  }, []);

  const remove = useCallback(async (id: string) => {
    /* Optimistic — feature-perceived-performance V1. Card disappears
       immediately; rolls back on error. */
    let removed: SendingDomain | undefined;
    let removedIndex = -1;
    setItems((prev) => {
      removedIndex = prev.findIndex((d) => d.id === id);
      if (removedIndex >= 0) removed = prev[removedIndex];
      return prev.filter((d) => d.id !== id);
    });
    try {
      await apiDelete(id);
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
  }, []);

  return { items, loading, error, refetch, add, check, remove };
}
