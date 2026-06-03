/* Typed wrappers for the /v1/clients endpoints. */

import { apiCall } from './client';

export type ClientStatus = 'trial' | 'active' | 'paused' | 'archived';

export interface Client {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  avatarColor: string | null;
  status: ClientStatus;
  createdAt: string;   // ISO
}

export interface ClientCreateBody {
  name: string;
  domain?: string | null;
  avatarColor?: string | null;
}

export interface ClientUpdateBody {
  name?: string;
  domain?: string | null;
  avatarColor?: string | null;
  /* Only used by the "Restore" action to flip archived → active. Other
     status transitions aren't exposed in the UI today. */
  status?: 'trial' | 'active' | 'paused';
}

export function listClients(opts: { includeArchived?: boolean } = {}) {
  const q = opts.includeArchived ? '?includeArchived=true' : '';
  return apiCall<{ data: { items: Client[] } }>(`/v1/clients${q}`);
}

export function getClient(id: string) {
  return apiCall<{ data: { client: Client } }>(`/v1/clients/${encodeURIComponent(id)}`);
}

export function createClient(body: ClientCreateBody) {
  return apiCall<{ data: { client: Client } }>('/v1/clients', { method: 'POST', body });
}

export function updateClient(id: string, body: ClientUpdateBody) {
  return apiCall<{ data: { client: Client } }>(`/v1/clients/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export function archiveClient(id: string) {
  return apiCall<{ data: { client: Client } }>(`/v1/clients/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
