/* Typed wrappers for /v1/clients/:clientId/contacts. */

import { apiCall } from './client';

export interface ContactListMembership {
  listId: string;
  listName: string;
  status: 'subscribed' | 'unsubscribed' | 'pending';
}

export interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName:  string | null;
  phone:     string | null;
  city:      string | null;
  birthday:  string | null;          // YYYY-MM-DD
  custom:    Record<string, unknown> | null;
  source:    string | null;          // 'manual' | 'csv_import' | …
  createdAt: string;
  updatedAt: string;
  tags:      string[];               // lowercased tag names
  lists:     ContactListMembership[];
}

export interface ContactCreateBody {
  email:     string;
  firstName?: string | null;
  lastName?:  string | null;
  phone?:     string | null;
  city?:      string | null;
  birthday?:  string | null;
  custom?:    Record<string, unknown> | null;
  tags?:      string[];
  listIds?:   string[];
}

export interface ContactUpdateBody {
  firstName?: string | null;
  lastName?:  string | null;
  phone?:     string | null;
  city?:      string | null;
  birthday?:  string | null;
  custom?:    Record<string, unknown> | null;
  tags?:      string[];
}

export interface ContactListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  listId?: string;
  tag?: string;
}

export interface ContactListResponse {
  data: {
    items: Contact[];
    total: number;
    page: number;
    pageSize: number;
  };
}

function qs(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

const base = (clientId: string) => `/v1/clients/${encodeURIComponent(clientId)}/contacts`;

export function listContacts(clientId: string, params: ContactListParams = {}) {
  return apiCall<ContactListResponse>(`${base(clientId)}${qs({ ...params })}`);
}

export function getContact(clientId: string, contactId: string) {
  return apiCall<{ data: { contact: Contact } }>(`${base(clientId)}/${encodeURIComponent(contactId)}`);
}

export function createContact(clientId: string, body: ContactCreateBody) {
  return apiCall<{ data: { contact: Contact } }>(base(clientId), { method: 'POST', body });
}

export function updateContact(clientId: string, contactId: string, body: ContactUpdateBody) {
  return apiCall<{ data: { contact: Contact } }>(
    `${base(clientId)}/${encodeURIComponent(contactId)}`,
    { method: 'PATCH', body },
  );
}

export function deleteContact(clientId: string, contactId: string) {
  return apiCall<{ data: { id: string } }>(
    `${base(clientId)}/${encodeURIComponent(contactId)}`,
    { method: 'DELETE' },
  );
}
