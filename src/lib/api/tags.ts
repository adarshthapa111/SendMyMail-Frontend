/* Typed wrapper for /v1/clients/:clientId/tags (read-only).
   Tags are auto-created server-side when applied to a contact. */

import { apiCall } from './client';

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export function listTags(clientId: string) {
  return apiCall<{ data: { items: Tag[] } }>(
    `/v1/clients/${encodeURIComponent(clientId)}/tags`,
  );
}
