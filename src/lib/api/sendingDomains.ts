/* Typed wrappers for the /v1/sending-domains endpoints. */

import { apiCall } from './client';

export type DomainStatus = 'pending' | 'verified' | 'failed';

/** Single DNS record Resend returned. */
export interface DnsRecord {
  record:    string;          // "CNAME" | "TXT" | "MX" | "SPF"
  name:      string;          // hostname
  type:      string;          // record type as Resend reports it
  value:     string;          // value to set
  ttl?:      string | number;
  priority?: number;
  status?:   string;          // per-record verification status
}

export interface SendingDomain {
  id:            string;
  agencyId:      string;
  name:          string;
  resendId:      string | null;
  status:        DomainStatus;
  records:       DnsRecord[];
  verifiedAt:    string | null;
  lastCheckedAt: string | null;
  createdAt:     string;
  updatedAt:     string;
}

export function listSendingDomains() {
  return apiCall<{ data: { items: SendingDomain[] } }>('/v1/sending-domains');
}

export function getSendingDomain(id: string) {
  return apiCall<{ data: { domain: SendingDomain } }>(
    `/v1/sending-domains/${encodeURIComponent(id)}`,
  );
}

export function addSendingDomain(body: { name: string }) {
  return apiCall<{ data: { domain: SendingDomain } }>(
    '/v1/sending-domains',
    { method: 'POST', body },
  );
}

export function checkSendingDomain(id: string) {
  return apiCall<{ data: { domain: SendingDomain } }>(
    `/v1/sending-domains/${encodeURIComponent(id)}/check`,
    { method: 'POST', body: {} },
  );
}

export function deleteSendingDomain(id: string) {
  return apiCall<void>(
    `/v1/sending-domains/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}
