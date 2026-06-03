/* Typed wrappers for /v1/clients/:clientId/lists. */

import { apiCall } from './client';

export type ListType = 'static' | 'dynamic';
export type ListMembershipStatus = 'subscribed' | 'unsubscribed' | 'pending';

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  type: ListType;
  archived: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListCreateBody {
  name: string;
  description?: string | null;
  type?: ListType;          // V1 only `static` is accepted; `dynamic` 400s
}

export interface ListUpdateBody {
  name?: string;
  description?: string | null;
  archived?: boolean;
}

const base = (clientId: string) => `/v1/clients/${encodeURIComponent(clientId)}/lists`;

export function listLists(clientId: string, includeArchived = false) {
  const q = includeArchived ? '?includeArchived=true' : '';
  return apiCall<{ data: { items: ContactList[] } }>(`${base(clientId)}${q}`);
}

export function getList(clientId: string, listId: string) {
  return apiCall<{ data: { list: ContactList } }>(`${base(clientId)}/${encodeURIComponent(listId)}`);
}

export function createList(clientId: string, body: ListCreateBody) {
  return apiCall<{ data: { list: ContactList } }>(base(clientId), { method: 'POST', body });
}

export function updateList(clientId: string, listId: string, body: ListUpdateBody) {
  return apiCall<{ data: { list: ContactList } }>(
    `${base(clientId)}/${encodeURIComponent(listId)}`,
    { method: 'PATCH', body },
  );
}

export function archiveList(clientId: string, listId: string) {
  return apiCall<{ data: { list: ContactList } }>(
    `${base(clientId)}/${encodeURIComponent(listId)}`,
    { method: 'DELETE' },
  );
}

/* Membership */

export function addContactsToList(clientId: string, listId: string, contactIds: string[]) {
  return apiCall<{ data: { added: number } }>(
    `${base(clientId)}/${encodeURIComponent(listId)}/contacts`,
    { method: 'POST', body: { contactIds } },
  );
}

export function removeContactFromList(clientId: string, listId: string, contactId: string) {
  return apiCall<{ data: { removed: number } }>(
    `${base(clientId)}/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(contactId)}`,
    { method: 'DELETE' },
  );
}

export function updateMembershipStatus(
  clientId: string,
  listId: string,
  contactId: string,
  status: ListMembershipStatus,
) {
  return apiCall<{ data: { membership: { listId: string; contactId: string; status: ListMembershipStatus } } }>(
    `${base(clientId)}/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(contactId)}`,
    { method: 'PATCH', body: { status } },
  );
}
