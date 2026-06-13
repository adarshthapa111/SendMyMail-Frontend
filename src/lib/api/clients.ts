/* Typed wrappers for the /v1/clients endpoints. */

import { apiCall } from './client';

export type ClientStatus = 'trial' | 'active' | 'paused' | 'archived';

/* Brand kit (feature-client-brand-kit V1) — per-client brand the email
   editor's section composites read at drop time. All optional; null
   falls back to neutral defaults (see blocks/library/brandKit.ts). */
export interface ClientBrandSocial {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  avatarColor: string | null;
  status: ClientStatus;
  brandPrimary: string | null;
  brandFont: string | null;
  brandLogoUrl: string | null;
  brandAddress: string | null;
  brandSocial: ClientBrandSocial | null;
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
  brandPrimary?: string | null;
  brandFont?: string | null;
  brandLogoUrl?: string | null;
  brandAddress?: string | null;
  brandSocial?: ClientBrandSocial | null;
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
