import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, AuthAgency } from '../../lib/api/auth';
import { decodeJwt } from '../../lib/api/jwt';

export type AuthStatus = 'anonymous' | 'authenticating' | 'authed';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  agency: AuthAgency | null;
}

/* fix-editor-chrome V1 — deep-link fix. If a non-expired JWT is already
   in localStorage, boot as 'authenticating' instead of 'anonymous'.
   Booting anonymous made every guard redirect to /login on first paint
   (before useBootstrapAuth's /me resolved), so refreshing the browser
   inside any guarded page (e.g. the builder) bounced to /dashboard.
   useBootstrapAuth still owns the real verification via /me. */
const initialState: AuthState = {
  status: decodeJwt() ? 'authenticating' : 'anonymous',
  user: null,
  agency: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /* Set after successful signup/login/verify/setup — JWT already in localStorage. */
    setAuthed(state, action: PayloadAction<{ user: AuthUser; agency: AuthAgency }>) {
      state.status = 'authed';
      state.user = action.payload.user;
      state.agency = action.payload.agency;
    },
    /* Patch parts of the user/agency (e.g. after profile edit or workspace setup). */
    patchUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    patchAgency(state, action: PayloadAction<Partial<AuthAgency>>) {
      if (state.agency) state.agency = { ...state.agency, ...action.payload };
    },
    /* Clear everything — on logout or any 401. */
    clearAuth(state) {
      state.status = 'anonymous';
      state.user = null;
      state.agency = null;
    },
    /* Bootstrap state during /me hydration. */
    setAuthenticating(state) {
      state.status = 'authenticating';
    },
  },
});

export const { setAuthed, patchUser, patchAgency, clearAuth, setAuthenticating } = authSlice.actions;
export default authSlice.reducer;
