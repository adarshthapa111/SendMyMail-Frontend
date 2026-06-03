/* Typed wrappers for /v1/clients/:clientId/contacts/imports.
   ──────────────────────────────────────────────────────────
   The POST endpoint is multipart/form-data — our normal apiCall wrapper
   sends JSON, so we drop down to raw fetch for the upload (still attaches
   the Bearer JWT manually). list + getById use the standard apiCall path. */

import { apiCall, ApiError } from './client';
import { getJwt } from './jwt';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export type ImportJobStatus = 'pending' | 'parsing' | 'importing' | 'done' | 'failed';

export type StandardField = 'email' | 'firstName' | 'lastName' | 'phone' | 'city' | 'birthday';
export type MappingTarget = StandardField | 'skip' | `custom:${string}`;
export type ColumnMapping = Record<string, MappingTarget>;

export interface ImportJob {
  id: string;
  clientId: string;
  listId: string | null;
  status: ImportJobStatus;
  rejectedReason: string | null;
  filename: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  importedRows: number;
  skippedRows: number;
  rejectedRows: number;
  columnMapping: ColumnMapping;
  errors: Array<{ row: number; email?: string; reason: string }> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

/* Upload a CSV. Returns the freshly-created ImportJob (status: 'pending').
   The frontend then polls getImport(jobId) every ~1s for progress. */
export async function uploadImport(
  clientId: string,
  body: { file: File; listId?: string | null; columnMapping: ColumnMapping; consentText: string },
): Promise<{ data: { job: ImportJob } }> {
  const fd = new FormData();
  fd.append('file', body.file);
  if (body.listId) fd.append('listId', body.listId);
  fd.append('columnMapping', JSON.stringify(body.columnMapping));
  fd.append('consentText', body.consentText);

  const jwt = getJwt();
  const url = `${BASE_URL}/v1/clients/${encodeURIComponent(clientId)}/contacts/imports`;
  const res = await fetch(url, {
    method: 'POST',
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    body: fd,
    credentials: 'omit',
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; field?: string } })?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'request_failed',
      err?.message ?? `Upload failed (${res.status})`,
      { field: err?.field },
    );
  }
  return json as { data: { job: ImportJob } };
}

export function listImports(clientId: string) {
  return apiCall<{ data: { items: ImportJob[] } }>(
    `/v1/clients/${encodeURIComponent(clientId)}/contacts/imports`,
  );
}

export function getImport(clientId: string, jobId: string) {
  return apiCall<{ data: { job: ImportJob } }>(
    `/v1/clients/${encodeURIComponent(clientId)}/contacts/imports/${encodeURIComponent(jobId)}`,
  );
}
