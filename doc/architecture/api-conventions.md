# API conventions — shared HTTP contract

> 🔌 Every endpoint defined in the per-feature impl docs follows these
> conventions by default. If an endpoint needs to deviate, document it inline
> in the feature doc and *say why*.

## 1. Base URL & environment

```
Base URL:  ${VITE_BACKEND_URL}          // e.g. https://api.sendmymail.io
Versioned: ${VITE_BACKEND_URL}/v1/...   // every resource lives under /v1
```

All requests go through a single client wrapper (the existing pattern in [src/api/renderTemplate.ts](../../src/api/renderTemplate.ts) — generalize it for V1). The wrapper attaches headers, handles errors, and supports `AbortSignal`.

## 2. Headers

Every authenticated request:

```
Authorization: Bearer <jwt>          # from localStorage['sendmymail_jwt']
Content-Type:  application/json      # for JSON bodies (omit for multipart)
Accept:        application/json
X-Idempotency-Key: <uuid>            # only on POST/PUT for non-idempotent ops (see §6)
```

**No `X-Agency-Id` header.** The agency is encoded in the JWT (`agency_id` claim). The server enforces tenancy from the token — clients never assert their agency.

**Client-scoping (`:clientId`)** comes from the URL path, not a header. Every client-scoped endpoint takes the client id as a path segment: `/v1/clients/:clientId/contacts`, not `/v1/contacts?clientId=...`.

## 3. Request conventions

| Method | Use for | Idempotent? | Body |
|---|---|---|---|
| `GET` | reads | yes | none — use query string |
| `POST` | creates, actions (`/send`, `/test`, `/verify-dns`) | no — see §6 | JSON body |
| `PUT` / `PATCH` | full / partial update | yes (when the same body is replayed) | JSON body — `PATCH` for sparse updates |
| `DELETE` | deletes | yes | none |

**Query parameters** use snake_case (matches what the backend already returns): `?page_size=25&cursor=abc&filter[status]=active`.

**Bodies** use snake_case (same reason). The frontend translates to camelCase at the API client boundary (one place to convert), so React code stays camelCase.

## 4. Response shapes

### Success — list

```json
{
  "data": [ { ... }, { ... } ],
  "page": {
    "next_cursor": "eyJpZCI6...",   // null when no more pages
    "prev_cursor": null,
    "total":       1240             // optional; only when cheap to compute
  }
}
```

### Success — single resource

```json
{
  "data": { "id": "cnt_...", "email": "...", ... }
}
```

### Success — action (no resource returned)

```
HTTP 204 No Content
```

### Error — every non-2xx

```json
{
  "error": {
    "code":    "contact_already_exists",     // stable, machine-readable
    "message": "A contact with this email already exists.",   // human, en-US
    "field":   "email",                       // optional — for form-level errors
    "details": { "existing_id": "cnt_..." }   // optional — extra context
  },
  "request_id": "req_01J..."
}
```

**Status codes used:**

| Code | When |
|---|---|
| `200` | Successful read or update with response body |
| `201` | Resource created — body includes the new resource under `data` |
| `204` | Successful action / delete with no body |
| `400` | Malformed request — invalid JSON, missing required field |
| `401` | No JWT / expired JWT — client should redirect to `/login` |
| `403` | JWT valid but the user can't do this (role / scope) — show a permission message, don't redirect |
| `404` | Resource doesn't exist OR exists in a different agency (we never leak existence) |
| `409` | Conflict — duplicate, state machine violation (e.g. send-twice) |
| `422` | Validation failed — `error.field` populated |
| `429` | Rate limited — see `Retry-After` header |
| `5xx` | Server error — surface a generic "something went wrong" toast, log to Sentry |

## 5. Pagination — cursor by default

Cursor-based for everything that can grow unboundedly (contacts, campaigns, activity log, etc.). The cursor is opaque — the client never parses it; it just passes whatever `next_cursor` came back.

```
GET /v1/clients/:clientId/contacts?page_size=25
→ { data: [...], page: { next_cursor: "abc", prev_cursor: null } }

GET /v1/clients/:clientId/contacts?page_size=25&cursor=abc
→ { data: [...], page: { next_cursor: "def", prev_cursor: "xyz" } }
```

**When offset pagination is OK:** small, bounded lists (≤ a few hundred rows) like team members, integration list, lists-of-lists. Use `?page=2&page_size=25` and accept that the total is computed.

## 6. Idempotency — required for actions that move money or send mail

Any `POST` whose retry could cause a duplicate side-effect MUST include an `X-Idempotency-Key` header (UUID v4 generated client-side). The server stores `(key, response)` for 24 hours and returns the same response if the same key is replayed.

**Endpoints that require it:**

- `POST /v1/clients/:clientId/campaigns/:id/send`
- `POST /v1/clients/:clientId/campaigns/:id/test-send`
- `POST /v1/billing/payments`
- `POST /v1/integrations/:platform/connect` (some platforms charge for connect attempts)

Endpoints that don't (creates, reads, deletes) — skip the header.

## 7. Rate limiting

Standard headers on every response:

```
X-RateLimit-Limit:     1000        # per window
X-RateLimit-Remaining: 982
X-RateLimit-Reset:     1715723400  # unix timestamp when remaining refills
```

On `429` the server also sends `Retry-After: <seconds>`. The API client wrapper handles retry with exponential backoff for `GET`s and surfaces a toast for non-idempotent calls — it does *not* auto-retry sends or payments.

## 8. File uploads — direct-to-storage

The frontend never uploads files through the API server. The pattern is:

```
1. POST /v1/uploads/sign  { kind: "csv" | "image", filename, content_type, byte_size }
   → { upload_url, fields, asset_id, expires_at }

2. POST to upload_url with the file (S3 / Cloudflare R2 presigned)

3. POST /v1/clients/:clientId/contacts/import  { asset_id, ... }
   → { import_id, status: "queued" }
```

Frontend tracks long-running operations (`import`, `flow_backfill`, `campaign_send`) via short polls (3s → 10s backoff) on the operation id, *not* WebSockets — keep V1 simple.

## 9. Caching, ETags, `If-None-Match`

Read endpoints return `ETag` + `Cache-Control: private, max-age=0, must-revalidate`. The API client wrapper sends `If-None-Match` on revalidation reads, expects `304 Not Modified` when unchanged. RTK Query handles this transparently when the wrapper is configured for it.

## 10. Webhooks — receiving (not sending)

For inbound webhooks from integrations (WooCommerce sync, Stripe billing, ESP delivery events), the backend exposes endpoints under `/v1/webhooks/:source/:agency_id`. The frontend never touches these — flagged here so feature impl docs know not to define them.

## 11. Versioning

`/v1` is the only published version for V1 of the app. Breaking changes ship as `/v2` and run alongside `/v1` for at least one quarter. Non-breaking additions go straight into `/v1`.

## 12. Things the conventions don't cover (add when needed)

- **Server-Sent Events / WebSockets** — deferred. If a feature genuinely needs server-push (live campaign progress, collaborative editing), spec it in the feature doc and add a §13 here.
- **GraphQL** — V1 is REST-only. Don't introduce a second API style.
- **Per-resource search** — every list endpoint accepts `?q=<text>`. Define what fields it searches in the feature doc.
