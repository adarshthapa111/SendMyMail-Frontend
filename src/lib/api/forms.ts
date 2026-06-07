/* Typed wrappers for /v1/clients/:clientId/forms — admin CRUD over
   signup forms. The public submission endpoint (/f/:slug/submit) lives
   in publicForms.ts since it doesn't go through normal auth. */

import { apiCall } from './client';

export type FormStatus = 'active' | 'paused';

export interface FormSummary {
  id:              string;
  agencyId:        string;
  clientId:        string;
  listId:          string;
  slug:            string;
  name:            string;
  status:          FormStatus;
  submissionCount: number;
  archived:        boolean;
  createdAt:       string;
  updatedAt:       string;
  list?:           { id: string; name: string };
}

export interface Form extends FormSummary {
  headline:         string | null;
  subheadline:      string | null;
  buttonText:       string;
  thankYouMessage:  string;
  collectFirstName: boolean;
  collectLastName:  boolean;
  brandColor:       string | null;
  requireConsent:   boolean;
  consentText:      string | null;
}

export interface FormSubmissionRow {
  id:           string;
  formId:       string;
  contactId:    string | null;
  email:        string;
  firstName:    string | null;
  lastName:     string | null;
  consentGiven: boolean;
  isNewContact: boolean;
  createdAt:    string;
}

export interface FormDetailResponse {
  form:               Form;
  list:               { id: string; name: string } | null;
  newContactCount:    number;
  recentSubmissions:  FormSubmissionRow[];
}

export interface FormCreateBody {
  name:             string;
  listId:           string;
  slug?:            string;
  headline?:        string;
  subheadline?:     string;
  buttonText?:      string;
  thankYouMessage?: string;
  collectFirstName?: boolean;
  collectLastName?:  boolean;
  brandColor?:      string | null;
  requireConsent?:  boolean;
  consentText?:     string | null;
}

export interface FormUpdateBody {
  name?:             string;
  listId?:           string;
  slug?:             string;
  headline?:         string | null;
  subheadline?:      string | null;
  buttonText?:       string;
  thankYouMessage?:  string;
  collectFirstName?: boolean;
  collectLastName?:  boolean;
  brandColor?:       string | null;
  requireConsent?:   boolean;
  consentText?:      string | null;
  status?:           FormStatus;
  archived?:         boolean;
}

function url(clientId: string, suffix = ''): string {
  return `/v1/clients/${encodeURIComponent(clientId)}/forms${suffix}`;
}

export function listForms(
  clientId: string,
  opts: { cursor?: string; limit?: number; includeArchived?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit)  params.set('limit',  String(opts.limit));
  if (opts.includeArchived) params.set('includeArchived', 'true');
  const qs = params.toString();
  return apiCall<{ data: { items: FormSummary[]; nextCursor: string | null } }>(
    url(clientId) + (qs ? `?${qs}` : ''),
  );
}

export function getForm(clientId: string, formId: string) {
  return apiCall<{ data: FormDetailResponse }>(
    url(clientId, `/${encodeURIComponent(formId)}`),
  );
}

export function createForm(clientId: string, body: FormCreateBody) {
  return apiCall<{ data: { form: Form } }>(
    url(clientId),
    { method: 'POST', body },
  );
}

export function updateForm(clientId: string, formId: string, body: FormUpdateBody) {
  return apiCall<{ data: { form: Form } }>(
    url(clientId, `/${encodeURIComponent(formId)}`),
    { method: 'PATCH', body },
  );
}

export function archiveForm(clientId: string, formId: string) {
  return apiCall<void>(
    url(clientId, `/${encodeURIComponent(formId)}`),
    { method: 'DELETE' },
  );
}
