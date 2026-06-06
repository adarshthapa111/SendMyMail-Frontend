/* Typed wrappers for the /v1/clients/:clientId/campaigns endpoints. */

import { apiCall } from './client';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type SendStatus     = 'queued' | 'sent' | 'failed';

export interface CampaignSummary {
  id: string;
  agencyId: string;
  clientId: string;
  name: string;
  templateId: string | null;
  listId: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduleAt: string | null;
  archived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign extends CampaignSummary {
  fromName:            string | null;
  fromEmail:           string | null;
  subject:             string | null;
  preheader:           string | null;
  recipientSnapshotAt: string | null;
}

export interface CampaignCreateBody {
  name: string;
}

/* All wizard-step PATCH payloads are partial — each step sends only its
   own fields. The backend Zod schema is `.strict()` so unknown fields
   throw 400 (catches typos early). */
export interface CampaignUpdateBody {
  name?:       string;
  fromName?:   string | null;
  fromEmail?:  string | null;
  subject?:    string | null;
  preheader?:  string | null;
  templateId?: string | null;
  listId?:     string | null;
  archived?:   boolean;
}

export interface SendLogEntry {
  id: string;
  campaignId: string;
  toEmail: string;
  resendMessageId: string | null;
  status: SendStatus;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

function url(clientId: string, suffix = ''): string {
  return `/v1/clients/${encodeURIComponent(clientId)}/campaigns${suffix}`;
}

export function listCampaigns(
  clientId: string,
  opts: { includeArchived?: boolean; status?: CampaignStatus } = {},
) {
  const params = new URLSearchParams();
  if (opts.includeArchived) params.set('includeArchived', 'true');
  if (opts.status)          params.set('status', opts.status);
  const qs = params.toString();
  return apiCall<{ data: { items: CampaignSummary[] } }>(
    url(clientId) + (qs ? `?${qs}` : ''),
  );
}

export function getCampaign(clientId: string, campaignId: string) {
  return apiCall<{ data: { campaign: Campaign } }>(
    url(clientId, `/${encodeURIComponent(campaignId)}`),
  );
}

export function createCampaign(clientId: string, body: CampaignCreateBody) {
  return apiCall<{ data: { campaign: Campaign } }>(
    url(clientId),
    { method: 'POST', body },
  );
}

export function updateCampaign(clientId: string, campaignId: string, body: CampaignUpdateBody) {
  return apiCall<{ data: { campaign: Campaign } }>(
    url(clientId, `/${encodeURIComponent(campaignId)}`),
    { method: 'PATCH', body },
  );
}

export function deleteCampaign(clientId: string, campaignId: string) {
  return apiCall<void>(
    url(clientId, `/${encodeURIComponent(campaignId)}`),
    { method: 'DELETE' },
  );
}

/**
 * Launch the campaign — server snapshots recipients + kicks off the
 * background send loop. Returns immediately with the campaign in
 * `status: 'sending'`. Poll `getCampaign` to see sentCount / failedCount
 * progress.
 */
export function launchCampaign(clientId: string, campaignId: string) {
  return apiCall<{ data: { campaign: Campaign } }>(
    url(clientId, `/${encodeURIComponent(campaignId)}/launch`),
    { method: 'POST', body: {} },
  );
}

export function listCampaignSends(
  clientId: string,
  campaignId: string,
  opts: { cursor?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit)  params.set('limit',  String(opts.limit));
  const qs = params.toString();
  return apiCall<{ data: { sends: SendLogEntry[]; nextCursor: string | null } }>(
    url(clientId, `/${encodeURIComponent(campaignId)}/sends`) + (qs ? `?${qs}` : ''),
  );
}
