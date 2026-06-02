/* Shared API client — fetch wrapper that:
   - prepends VITE_BACKEND_URL
   - attaches Bearer JWT from localStorage
   - parses backend error shape { error: { code, message, field? }, request_id }
   - swaps localStorage JWT if backend returns X-Refreshed-Token header
   - throws a typed ApiError on non-2xx so call sites can catch with field info

   All new code uses this; existing axios call sites in MJML editor stay as-is. */

import { getJwt, setJwt, clearJwt } from './jwt';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  code: string;
  field?: string;
  details?: unknown;
  requestId?: string;

  constructor(status: number, code: string, message: string, opts?: { field?: string; details?: unknown; requestId?: string }) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = opts?.field;
    this.details = opts?.details;
    this.requestId = opts?.requestId;
  }
}

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Skip auth — for /signup /login /forgot etc. before there's a JWT. */
  skipAuth?: boolean;
  /** Surface 401s to the caller instead of auto-clearing + redirecting. */
  rawAuthErrors?: boolean;
}

/* Listener so the auth slice can react to "JWT got refreshed on the wire". */
let onJwtRefresh: ((jwt: string) => void) | null = null;
export function registerJwtRefreshListener(fn: (jwt: string) => void): void {
  onJwtRefresh = fn;
}

let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export async function apiCall<T = unknown>(path: string, opts: ApiCallOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!opts.skipAuth) {
    const jwt = getJwt();
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'omit',
  });

  // If backend reissued the JWT mid-flight, swap it in
  const refreshed = res.headers.get('X-Refreshed-Token');
  if (refreshed) {
    setJwt(refreshed);
    onJwtRefresh?.(refreshed);
  }

  // 204 No Content → return null cast as T
  if (res.status === 204) return null as T;

  // Parse JSON (every backend response should be JSON, success or error)
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; field?: string; details?: unknown }; request_id?: string })?.error;
    const code    = err?.code ?? 'request_failed';
    const message = err?.message ?? `Request failed (${res.status})`;

    // Auto-handle 401 unless caller opted out
    if (res.status === 401 && !opts.rawAuthErrors) {
      clearJwt();
      onUnauthorized?.();
    }

    throw new ApiError(res.status, code, message, {
      field:    err?.field,
      details:  err?.details,
      requestId:(json as { request_id?: string })?.request_id,
    });
  }

  return json as T;
}
