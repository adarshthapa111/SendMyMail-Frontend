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
}

export function listClients() {
  return apiCall<{ data: { items: Client[] } }>('/v1/clients');
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
