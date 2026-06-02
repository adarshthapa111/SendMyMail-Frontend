import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAuthed, clearAuth, setAuthenticating } from '../store/slices/authSlice';
import { getJwt, decodeJwt, clearJwt } from '../lib/api/jwt';
import { me } from '../lib/api/auth';
import {
  registerJwtRefreshListener,
  registerUnauthorizedHandler,
  ApiError,
} from '../lib/api/client';

/* Called once at app mount. If a JWT exists in localStorage:
     1. Decode the claims (no signature check; just expiry sanity)
     2. If valid, mark slice as 'authenticating' and call /me to fetch fresh user/agency
     3. If expired or invalid, clear it
   Also wires the global handlers for "JWT got refreshed mid-flight" and "any 401". */
export function useBootstrapAuth(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Global handler: when any apiCall response includes X-Refreshed-Token,
    // the api/client already stored it — we just need to know in case we want
    // to re-hydrate (defer to next /me; for now no-op).
    registerJwtRefreshListener((_jwt) => {
      // optional: dispatch a re-hydrate. For V1 the JWT swap is enough.
    });

    // Global handler: any 401 clears the slice. The api/client already cleared the JWT
    // and the AppRouter's <AuthOnly> guard will then redirect to /login.
    registerUnauthorizedHandler(() => {
      dispatch(clearAuth());
    });

    // On mount: if a JWT exists, hydrate user/agency from /me
    const token = getJwt();
    if (!token) return;
    const claims = decodeJwt(token);
    if (!claims) {
      clearJwt();
      return;
    }

    dispatch(setAuthenticating());
    me()
      .then((res) => {
        dispatch(setAuthed({ user: res.data.user, agency: res.data.agency }));
      })
      .catch((err) => {
        // Already cleared by the 401 handler if it was a 401; for any other error
        // just leave the user as anonymous
        if (!(err instanceof ApiError) || err.status !== 401) {
          clearJwt();
          dispatch(clearAuth());
        }
      });
  }, [dispatch]);
}
