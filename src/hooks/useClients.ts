import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActive } from '../store/slices/clientsSlice';
import type { Client } from '../lib/api/clients';

const ACTIVE_CLIENT_KEY = 'sendmymail_active_client';

/* localStorage helpers — kept here (not in clientsSlice) so the slice
   stays pure. The slice owns Redux state; this hook owns the bridge to
   browser persistence. */
export function readActiveClientId(): string | null {
  try { return localStorage.getItem(ACTIVE_CLIENT_KEY); }
  catch { return null; }
}
export function writeActiveClientId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_CLIENT_KEY, id);
    else    localStorage.removeItem(ACTIVE_CLIENT_KEY);
  } catch { /* private mode — drop silently */ }
}

interface UseClientsResult {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  items: Client[];
  active: Client | null;
  activeId: string | null;
  setActive: (id: string | null) => void;
  error: string | null;
}

/* The components-facing API for the clients slice.
   Hides Redux + localStorage plumbing. */
export function useClients(): UseClientsResult {
  const dispatch = useAppDispatch();
  const { status, items, activeClientId, error } = useAppSelector((s) => s.clients);

  const active = useMemo(
    () => items.find((c) => c.id === activeClientId) ?? null,
    [items, activeClientId],
  );

  const setActiveCb = useCallback(
    (id: string | null) => {
      writeActiveClientId(id);
      dispatch(setActive(id));
    },
    [dispatch],
  );

  return {
    status,
    items,
    active,
    activeId: activeClientId,
    setActive: setActiveCb,
    error,
  };
}
