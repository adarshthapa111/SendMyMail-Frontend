/* Typed wrappers around the auth endpoints. UI components call these,
   they DON'T call apiCall() directly. Keeps the URL strings in one place. */

import { apiCall } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  emailVerified: boolean;
  avatarUrl?: string | null;
  /* Profile fields (feature-profile-settings V1) */
  jobTitle?:    string | null;
  bio?:         string | null;
  phone?:       string | null;
  createdAt?:   string;
  lastLoginAt?: string | null;
}

export interface UpdateMeBody {
  name?:      string;
  avatarUrl?: string | null;
  jobTitle?:  string | null;
  bio?:       string | null;
  phone?:     string | null;
}

export interface AuthAgency {
  id: string;
  name: string;
  country?: string;
  plan?: string;
  setupComplete: boolean;
  trialEndsAt?: string | null;
  billingEmail?: string;
}

export interface AuthSuccess {
  data: {
    user: AuthUser;
    agency: AuthAgency;
    jwt: string;
  };
}

interface JwtOnly {
  data: { jwt: string; [k: string]: unknown };
}

/* ─── Email / password flows ──────────────────────────────────────────── */

export function signup(body: { name: string; email: string; password: string }) {
  return apiCall<AuthSuccess>('/v1/auth/signup', { method: 'POST', body, skipAuth: true });
}

export function verifyCode(body: { code: string }) {
  return apiCall<JwtOnly>('/v1/auth/verify', { method: 'POST', body });
}

export function login(body: { email: string; password: string }) {
  return apiCall<AuthSuccess>('/v1/auth/login', { method: 'POST', body, skipAuth: true, rawAuthErrors: true });
}

export function logout() {
  return apiCall<null>('/v1/auth/logout', { method: 'POST' });
}

export function forgot(body: { email: string }) {
  return apiCall<{ ok: true }>('/v1/auth/forgot', { method: 'POST', body, skipAuth: true });
}

export function reset(token: string, body: { password: string }) {
  return apiCall<{ ok: true }>(`/v1/auth/reset/${encodeURIComponent(token)}`, { method: 'POST', body, skipAuth: true });
}

export function me() {
  return apiCall<{ data: { user: AuthUser; agency: AuthAgency } }>('/v1/auth/me');
}

/* PATCH /v1/auth/me — feature-profile-settings V1.
   Only PATCH-included fields are written. Returns the updated user
   (no agency — agency wasn't touched). */
export function updateMe(body: UpdateMeBody) {
  return apiCall<{ data: { user: AuthUser } }>('/v1/auth/me', {
    method: 'PATCH',
    body,
  });
}

export function workspaceSetup(body: { name: string; country: string; billingEmail: string }) {
  return apiCall<{ data: { agency: AuthAgency; jwt: string } }>('/v1/agencies/me', { method: 'POST', body });
}

/* ─── Invitations (public side — used by /invite/:token pages) ────────── */

export interface InvitationContext {
  agencyName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  inviteeEmail: string;
  role: 'admin' | 'member' | 'viewer';
  scope: { type: 'all' } | { type: 'clients'; ids: string[] };
  note: string | null;
  expiresAt: string;
}

export function getInvitation(token: string) {
  return apiCall<{ data: InvitationContext }>(`/v1/auth/invitations/${encodeURIComponent(token)}`, { skipAuth: true });
}

export function acceptInvitation(token: string, body: { name: string; password: string }) {
  return apiCall<AuthSuccess>(`/v1/auth/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST', body, skipAuth: true });
}
