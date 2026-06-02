/* JWT storage + decode helpers — frontend side.
   The backend signs JWTs and re-verifies on every request.
   On the client we just store the token + base64-decode the payload for routing
   decisions (is email_verified? is agency_setup? what's the role?).
   We DO NOT trust client-side decode for security — only for UX. */

const STORAGE_KEY = 'sendmymail_jwt';

export interface AuthClaims {
  sub: string;
  agency_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  scope: { type: 'all' } | { type: 'clients'; ids: string[] };
  email_verified: boolean;
  agency_setup: boolean;
  iat: number;
  exp: number;
  jti: string;
}

export function getJwt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setJwt(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* localStorage disabled (Safari private browsing, etc.) — fail silently for now */
  }
}

export function clearJwt(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow */
  }
}

/* Decode the JWT payload (the middle part). No signature verification — that's
   the server's job. Returns null if the token is malformed or expired. */
export function decodeJwt(token: string | null = getJwt()): AuthClaims | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    // base64url → base64 → JSON
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '=='.slice(0, (4 - (padded.length % 4)) % 4));
    const claims = JSON.parse(json) as AuthClaims;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null; // expired
    return claims;
  } catch {
    return null;
  }
}
