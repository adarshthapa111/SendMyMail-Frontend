/* Typed wrappers for the public /f/:slug endpoints. No auth, no /v1
   prefix — these are the URLs that recipients of marketing emails or
   forms-link-in-bio click. */

import { apiCall } from './client';

export interface PublicFormConfig {
  slug:             string;
  name:             string;
  headline:         string | null;
  subheadline:      string | null;
  buttonText:       string;
  thankYouMessage:  string;
  collectFirstName: boolean;
  collectLastName:  boolean;
  brandColor:       string | null;
  requireConsent:   boolean;
  consentText:      string | null;
  agencyName:       string;
  status:           'active' | 'paused';
}

export type ConfigResponse =
  | { ok: true; config: PublicFormConfig }
  | { ok: false; notFound: true };

interface BackendConfigResponse {
  data: PublicFormConfig | { notFound: true };
}

export interface SubmissionBody {
  email:       string;
  first_name?: string;
  last_name?:  string;
  consent?:    boolean;
  honeypot?:   string;
}

export interface SubmissionResponse {
  ok:               boolean;
  thankYouMessage?: string;
  message?:         string;
}

export async function getFormConfig(slug: string): Promise<ConfigResponse> {
  const res = await apiCall<BackendConfigResponse>(
    `/f/${encodeURIComponent(slug)}/config`,
  );
  if ('notFound' in res.data) return { ok: false, notFound: true };
  return { ok: true, config: res.data };
}

export async function submitForm(slug: string, body: SubmissionBody): Promise<SubmissionResponse> {
  const res = await apiCall<{ data: SubmissionResponse }>(
    `/f/${encodeURIComponent(slug)}/submit`,
    { method: 'POST', body },
  );
  return res.data;
}
