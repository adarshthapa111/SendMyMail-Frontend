/* Typed wrappers for the /v1/clients/:clientId/templates endpoints. */

import { apiCall } from './client';
import type { IMjmlNode } from '../../tree/types';

/* The persisted tree shape. Sent over the wire as JSON; same shape the
   editor manipulates in Redux, just without the editor-only `_id` / `_meta`
   fields or any `mj-preview` nodes (backend strips them on every write). */
export type TemplateTree = IMjmlNode;

export interface TemplateSummary {
  id: string;
  agencyId: string;
  clientId: string | null;          // null = agency-level (PR 3 territory)
  name: string;
  thumbnailUrl: string | null;
  category: string | null;
  isStarter: boolean;
  archived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Template extends TemplateSummary {
  mjmlSource: TemplateTree;
}

export interface TemplateCreateBody {
  name: string;
  category?: string | null;
  mjmlSource: TemplateTree;
}

export interface TemplateUpdateBody {
  name?: string;
  category?: string | null;
  mjmlSource?: TemplateTree;
  archived?: boolean;
}

function url(clientId: string, suffix = ''): string {
  return `/v1/clients/${encodeURIComponent(clientId)}/templates${suffix}`;
}

export function listTemplates(clientId: string, opts: { includeArchived?: boolean } = {}) {
  const q = opts.includeArchived ? '?includeArchived=true' : '';
  return apiCall<{ data: { items: TemplateSummary[] } }>(url(clientId) + q);
}

export function getTemplate(clientId: string, templateId: string) {
  return apiCall<{ data: { template: Template } }>(url(clientId, `/${encodeURIComponent(templateId)}`));
}

export function createTemplate(clientId: string, body: TemplateCreateBody) {
  return apiCall<{ data: { template: Template } }>(url(clientId), { method: 'POST', body });
}

export function updateTemplate(clientId: string, templateId: string, body: TemplateUpdateBody) {
  return apiCall<{ data: { template: Template } }>(
    url(clientId, `/${encodeURIComponent(templateId)}`),
    { method: 'PATCH', body },
  );
}

export function archiveTemplate(clientId: string, templateId: string) {
  return apiCall<{ data: { template: Template } }>(
    url(clientId, `/${encodeURIComponent(templateId)}`),
    { method: 'DELETE' },
  );
}

export function duplicateTemplate(clientId: string, templateId: string) {
  return apiCall<{ data: { template: Template } }>(
    url(clientId, `/${encodeURIComponent(templateId)}/duplicate`),
    { method: 'POST' },
  );
}

export interface TestSendBody {
  toEmail: string;
  subject?: string;
}

export interface TestSendResult {
  messageId: string;
  to:        string;
  subject:   string;
}

/**
 * Compile the saved template's MJML tree and send it to one address via
 * the backend's Resend transport. Used by the editor's "Send test" flow.
 *
 * Important: the backend reads `mjmlSource` from the database — the caller
 * MUST have saved the template first (which uploads pending Cloudinary
 * images and persists the latest tree). The TestSendDialog component
 * orchestrates save-then-test.
 */
export function testSendTemplate(clientId: string, templateId: string, body: TestSendBody) {
  return apiCall<{ data: TestSendResult }>(
    url(clientId, `/${encodeURIComponent(templateId)}/test-send`),
    { method: 'POST', body },
  );
}
