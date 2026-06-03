/* Typed wrapper for GET /v1/agencies/overview — the single payload that
   powers /dashboard. Cached 60s server-side per (agency_id, user_id). */

import { apiCall } from './client';

export type AgencyPlan = 'trial' | 'starter' | 'growth' | 'scale';
export type ClientStatus = 'trial' | 'active' | 'paused' | 'archived';

export interface OverviewKpi {
  value: number | null;
  change_30d: number | null;
  available: boolean;
}

export interface OverviewPayload {
  greeting: {
    name: string;
    date_iso: string;
  };
  kpis: {
    active_clients: OverviewKpi;
    emails_sent:    OverviewKpi;
    open_rate:      OverviewKpi;
    revenue:        OverviewKpi & { currency: 'NPR' };
  };
  sending_chart: {
    available: boolean;
    series: Array<{ date_iso: string; sent: number; opened: number }> | null;
  };
  deliverability: {
    available: boolean;
    score: number | null;
    gmail_inbox_rate: number | null;
    hard_bounce_rate: number | null;
    complaint_rate: number | null;
  };
  plan_usage: {
    plan: AgencyPlan;
    sent_this_month: number;
    monthly_quota: number;
  };
  top_clients: Array<{
    id: string;
    name: string;
    avatar_color: string | null;
    status: ClientStatus;
    last_activity_iso: string | null;
    last_campaign_subject: string | null;
    open_rate: number | null;
    revenue: number | null;
  }>;
}

export function getOverview() {
  return apiCall<{ data: OverviewPayload }>('/v1/agencies/overview');
}
