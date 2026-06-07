/* Typed wrapper for the public /u/:token endpoint.

   Called from the public Unsubscribe page (NOT inside AppShell, no
   auth). Backend returns 200 always (so email scanners don't flag the
   link as broken). The `data.ok` field carries the actual outcome. */

import { apiCall } from './client';

interface UnsubResponseOk {
  ok:                 true;
  email:              string;       // the address that was unsubscribed
  agencyName:         string;       // for the confirmation page copy
  alreadyUnsubscribed: boolean;     // true on idempotent re-click
}

interface UnsubResponseFail {
  ok:   false;
  code: 'invalid_token';
}

export type UnsubResponse = UnsubResponseOk | UnsubResponseFail;

export function confirmUnsubscribe(token: string) {
  /* Mounted at root (NOT under /v1), so build the URL manually rather
     than letting apiCall append the v1 prefix. */
  return apiCall<{ data: UnsubResponse }>(
    `/u/${encodeURIComponent(token)}`,
  );
}
