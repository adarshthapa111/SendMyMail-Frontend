/* Typed wrappers for the /v1/clients/:cid/suppressions endpoints. */

import { apiCall } from './client';

export type SuppressionReason = 'manual' | 'unsubscribe' | 'hard_bounce' | 'complaint';

export interface Suppression {
  id:        string;
  agencyId:  string;
  email:     string;
  reason:    SuppressionReason;
  note:      string | null;
  createdAt: string;
}

function url(clientId: string, suffix = ''): string {
  return `/v1/clients/${encodeURIComponent(clientId)}/suppressions${suffix}`;
}

export function listSuppressions(
  clientId: string,
  opts: { cursor?: string; limit?: number; search?: string } = {},
) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit)  params.set('limit',  String(opts.limit));
  if (opts.search) params.set('search', opts.search);
  const qs = params.toString();
  return apiCall<{ data: { items: Suppression[]; nextCursor: string | null } }>(
    url(clientId) + (qs ? `?${qs}` : ''),
  );
}

export function addSuppression(clientId: string, body: { email: string; note?: string }) {
  return apiCall<{ data: { suppression: Suppression } }>(
    url(clientId),
    { method: 'POST', body },
  );
}

export function removeSuppression(clientId: string, id: string) {
  return apiCall<void>(
    url(clientId, `/${encodeURIComponent(id)}`),
    { method: 'DELETE' },
  );
}
