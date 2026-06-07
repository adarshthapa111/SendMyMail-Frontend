/* Typed wrapper for GET /v1/clients/:id/report — the per-client
   engagement report. Cached server-side 60s per (clientId, range). */

import { apiCall } from './client';

export type ReportRange = '30d' | '90d' | 'all';

export interface ClientReportKpis {
  sent_count:    number;
  unique_opens:  number;
  unique_clicks: number;
  open_rate:     number | null;       // 0.0 - 1.0
  click_rate:    number | null;
  list_growth:   number;              // added - unsubscribed
}

export interface ClientReportTopCampaign {
  id:         string;
  name:       string;
  subject:    string | null;
  sent_at:    string | null;
  sent_count: number;
  open_rate:  number | null;
  click_rate: number | null;
}

export interface ClientReportListHealth {
  total_contacts:     number;
  subscribed_count:   number;
  unsubscribed_count: number;
  suppressed_count:   number;
}

export interface ClientReportPayload {
  client: { id: string; name: string };
  range:  ReportRange;
  kpis:   ClientReportKpis;
  sending_chart: Array<{ date_iso: string; sent: number; opened: number }>;
  top_campaigns: ClientReportTopCampaign[];
  list_health:   ClientReportListHealth;
}

export function getClientReport(clientId: string, range: ReportRange = '30d') {
  const qs = new URLSearchParams({ range }).toString();
  return apiCall<{ data: ClientReportPayload }>(
    `/v1/clients/${encodeURIComponent(clientId)}/report?${qs}`,
  );
}
