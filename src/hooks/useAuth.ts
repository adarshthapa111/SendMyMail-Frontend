import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setAuthed, clearAuth } from '../store/slices/authSlice';
import { clearJwt, setJwt } from '../lib/api/jwt';
import * as authApi from '../lib/api/auth';

/* The one auth API components use. Hides Redux + JWT plumbing. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, user, agency } = useAppSelector((s) => s.auth);

  /* Used by the Login page. Doesn't show a toast itself — the page wraps the call
     in withFormToast(). Doesn't flip status to 'authenticating' either — the form's
     own submitting state covers the loading UI; flipping the slice would cause the
     Public guard to unmount the form mid-click. */
  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setJwt(res.data.jwt);
    dispatch(setAuthed({ user: res.data.user, agency: res.data.agency }));
    return res.data;
  }, [dispatch]);

  /* Logout shows its own loading → success toasts since it's triggered from
     a menu item (no Button with loading prop to surface progress). */
  const logout = useCallback(async () => {
    const id = toast.loading('Signing out…');
    try { await authApi.logout(); } catch { /* best effort — JWT still gets cleared */ }
    clearJwt();
    dispatch(clearAuth());
    toast.success('Signed out', { id });
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  /* Used after signup / verify / workspace-setup / invite-accept — JWT was already stored
     by the API client (or the page); this just syncs the Redux slice. */
  const hydrate = useCallback((payload: { user: authApi.AuthUser; agency: authApi.AuthAgency }) => {
    dispatch(setAuthed(payload));
  }, [dispatch]);

  /* feature-profile-settings V1 — refetch /me to sync any user edits
     (avatar / name / etc.) made elsewhere. Used after PATCH /me so the
     topbar avatar + name reflect new values app-wide. Agency stays
     attached from the same response so we keep the existing slice
     shape intact. */
  const refetchMe = useCallback(async () => {
    const res = await authApi.me();
    dispatch(setAuthed({ user: res.data.user, agency: res.data.agency }));
    return res.data;
  }, [dispatch]);

  return { status, user, agency, login, logout, hydrate, refetchMe };
}
