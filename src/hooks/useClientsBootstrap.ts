import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLoading, setClients, setError, clearClients } from '../store/slices/clientsSlice';
import { listClients } from '../lib/api/clients';
import { ApiError } from '../lib/api/client';
import { readActiveClientId, writeActiveClientId } from './useClients';

/* Loads the agency's client list as soon as the user is `authed` + verified
   + agency-setup-complete (the prerequisites for /v1/clients to return 200).
   Clears the list whenever the user becomes anonymous (logout / 401).

   Mounted once at the App root next to useBootstrapAuth. */
export function useClientsBootstrap(): void {
  const dispatch = useAppDispatch();
  const authStatus       = useAppSelector((s) => s.auth.status);
  const emailVerified    = useAppSelector((s) => s.auth.user?.emailVerified ?? false);
  const setupComplete    = useAppSelector((s) => s.auth.agency?.setupComplete ?? false);
  const clientsStatus    = useAppSelector((s) => s.clients.status);

  useEffect(() => {
    // Drop the list as soon as the user signs out (or the slice gets cleared by a 401)
    if (authStatus === 'anonymous' && clientsStatus !== 'idle') {
      dispatch(clearClients());
      writeActiveClientId(null);
      return;
    }

    // Only fetch when the user is fully ready AND we haven't fetched yet this session
    if (authStatus !== 'authed') return;
    if (!emailVerified || !setupComplete) return;
    if (clientsStatus !== 'idle') return;

    dispatch(setLoading());
    listClients()
      .then((res) => {
        const restoredActiveId = readActiveClientId();
        dispatch(setClients({ items: res.data.items, restoredActiveId }));
      })
      .catch((err) => {
        // 401s already cleared the JWT + auth slice via the global handler;
        // surface anything else as a slice error.
        if (err instanceof ApiError && err.status === 401) return;
        const msg = err instanceof Error ? err.message : 'Failed to load clients';
        dispatch(setError(msg));
      });
  }, [authStatus, emailVerified, setupComplete, clientsStatus, dispatch]);
}
