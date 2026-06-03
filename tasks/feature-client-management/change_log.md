# Feature: Client management — change log

> The multi-tenant core. One agency manages many clients; every downstream
> feature (campaigns, contacts, templates, reports) is scoped by `client_id`.
> Without create/edit/archive UI, the rest of the product is unreachable.
>
> Reference: [doc/mockups/clients_list.html](../../doc/mockups/clients_list.html),
> [doc/mockups/client_create.html](../../doc/mockups/client_create.html),
> [doc/implementation_doc/feature-client-management.md](../../doc/implementation_doc/feature-client-management.md),
> [doc/architecture/routes.md `/clients` + `/clients/new`](../../doc/architecture/routes.md).
>
> Builds on `feature-agency-dashboard` PR 1 (read path — `GET /v1/clients`,
> `clientsSlice`, `ClientSwitcher` dropdown, `useClientsBootstrap`).

---

## Why this comes before the agency dashboard

PR 1 of `feature-agency-dashboard` shipped the read path. But every
"Create your first client" CTA we ship (in the dashboard, in the empty
`ClientSwitcher`, in the routing of brand-new agencies after workspace setup)
points at `/clients/new` — which is still a `Placeholder`. The dashboard is
**demo-unusable** until a user can actually create a client.

So we promote `feature-client-management` ahead of `feature-agency-dashboard`
PR 2. End state after this feature:

1. New user signs up → verifies → workspace setup → lands on dashboard
2. Dashboard's empty-state CTA → `/clients/new` (real form, not placeholder)
3. User creates their first client → returns to `/clients` list
4. `ClientSwitcher` topbar updates automatically; user can switch / edit / archive
5. **Then** the agency dashboard PR can be built against real client data

The /clients list page also becomes "the client dashboard" — *the* page
where every client lives, with quick actions to switch into each one's
workspace. That's the user's framing and it's the right one: the agency
dashboard is about platform-level metrics; the clients list is about
operational management of clients.

---

## V1 scope

- **Create** a client — name + slug (auto-generated from name) + brand color (preset palette) + optional domain + optional default from-name + optional default from-email
- **List** clients — sortable rows with name, status, created date, "Open" action (already partially shipped by PR 1's read path — list page UI is in this PR)
- **Edit** a client — same fields as create, except slug is immutable (URL stability)
- **Archive** a client — soft delete via `status: 'archived'`. Hard delete deferred for billing-dispute protection (per impl doc §V1 scope)
- **Switcher refresh** — `ClientSwitcher` reflects mutations immediately (new client appears, archived client disappears, renamed client shows new name)

**Out of scope** (deferred to later features):
- Client portal access (V2)
- Per-client member permissions (handled by `UserClientScope` table — invitations PR ships its own UI)
- Cross-client reporting (Feature 10 reporting/analytics)
- Client groups / tags (V2)
- Status filtering tabs ("Healthy / Watch / Setup" in the mockup) — these depend on Feature 10 event data, so V1 ships only "All / Active / Archived" filters
- Search input — V1 renders the input but it's a no-op until we have ≥20 clients to bother (skip the bug surface area)
- Sorting controls (Last activity / Contacts / Billing) — V1 sorts `createdAt DESC` only

---

## Scope — single PR

This is one cohesive PR. Splitting backend mutations from frontend UI
would leave the FE broken between merges (the "Add client" button would
crash). Better to ship the whole capability atomically.

| Layer | What |
|---|---|
| Backend | 4 endpoints on `clientsRouter` — `POST /` (create), `GET /:id` (single read), `PATCH /:id` (update), `DELETE /:id` (soft-archive). Audit log on every mutation. Slug auto-generation with collision retry. |
| Frontend API | Extend `src/lib/api/clients.ts` with `createClient` / `getClient` / `updateClient` / `archiveClient` |
| Frontend Redux | Extend `clientsSlice` with `addClient` / `updateClient` / `removeClient` reducers — UI updates instantly after each mutation (no full refetch) |
| Frontend pages | Real `ClientsList`, `ClientCreate`, new `ClientEdit` (replaces the 3 placeholders) |
| Frontend route | Add `/clients/:clientId/edit` to `router/index.tsx` |
| Components | `src/components/clients/`: `ClientForm` (shared by Create + Edit), `BrandColorPicker`, `ClientsTable`, `ArchiveDialog` |
| Styles | One SCSS Module per component under `src/styles/components/clients/` |
| FTUX | `/clients` list shows a warm empty state when zero clients (editorial pitch + "Add your first client" big button) |

---

## Backend

### `POST /v1/clients` — create

**Auth:** `requireAuth()` + `requireRole('admin')` — owner / admin only.

**Body** (zod-validated):
```ts
{
  name:        string,         // 1..100, required
  slug?:       string,         // 1..40, kebab-case [a-z0-9-]+; auto-generated if missing
  domain?:     string | null,  // any valid-looking hostname; full DNS check defers to feature-sending-domain-verification
  avatarColor?:string | null,  // hex #RRGGBB from the preset palette
}
```

**Slug strategy** (revised — slug is server-managed, not exposed in V1):
- Slug is **always auto-generated server-side** from `name` (no slug field in the request body or the form, matching `client_create.html`).
- `slugify(name)` — lowercase, ASCII-only, `[^a-z0-9]+` → `-`, trim leading/trailing `-`, max 40 chars.
- **Fallback** — if `slugify(name)` produces empty (e.g. non-Latin name like "खुकुरी मसला"), use `client-${nanoid(6)}`. Slug is a URL key; it doesn't have to be meaningful.
- **No collision retry.** On `(agency_id, slug)` unique conflict → `409 { error: { code: 'name_taken', field: 'name', message: 'A client with this name already exists — try a different name' } }`. User-facing error references *name* (not slug), since users never see the slug in the form. Honest UX over silent renaming.

**Response:**
```ts
201 { data: { client: Client } }   // same shape as listClients items
```

**Audit:** `client.created` with `metadata: { client_id, name, slug }`.

### `GET /v1/clients/:id` — single

**Auth:** `requireAuth()` + scope check (member/viewer must have access via `UserClientScope`; admin/owner with `scope: 'all'` always allowed).

**404 — not 403 — on out-of-scope.** Never leak that the client exists in another agency, even to the wrong user (mirrors `requireClientScope` middleware's intent).

**Response:** `200 { data: { client: Client } }`.

### `PATCH /v1/clients/:id` — update

**Auth:** `requireAuth()` + `requireRole('admin')` + scope check.

**Body:**
```ts
{
  name?:        string,   // 1..100
  domain?:      string | null,
  avatarColor?: string | null,
  // slug is immutable in V1 — changing it would break campaign URLs
}
```

**Response:** `200 { data: { client: Client } }`.

**Audit:** `client.updated` with `metadata: { client_id, changes: { ...diff } }`.

### `DELETE /v1/clients/:id` — soft-archive

**Auth:** `requireAuth()` + `requireRole('admin')` + scope check.

Sets `status = 'archived'`. The client disappears from `GET /v1/clients`
(which already filters `status != 'archived'`) and from the topbar
switcher. Downstream features (campaigns, contacts) keep their data — only
the *visibility* of the client changes.

**Response:** `200 { data: { client: Client } }` (returning the archived
client so the FE can confirm + remove from slice).

**Audit:** `client.archived` with `metadata: { client_id, name }`.

### Implementation notes (backend)

- All 4 handlers go in **`src/routes/clients.ts`** (extends the file shipped by `feature-agency-dashboard` PR 1).
- **Slug generator** — small helper `src/lib/slug.ts` *(new)* — exposes `slugify(name): string` + `withCollisionSuffix(base, n): string`. Pure functions, easy to unit test once we have tests.
- **No schema migration** — the existing `Client` model has every field we need.
- **Avatar color** stored as `#RRGGBB`. The mockup's preset palette: `#1D9E75`, `#D85A30`, `#534AB7`, `#D4537E`, `#378ADD`, `#BA7517`. If `avatarColor` is null on read, the FE falls back to the same default-gradient logic the `ClientSwitcher` already uses.
- **Transactions** — `POST` + `PATCH` + `DELETE` each wrap the Prisma write + audit log in `prisma.$transaction([...])` so a partial failure leaves no orphan audit row.
- **Default `status`** for new clients = `active` (the schema's default `trial` is meant for free-tier accounts, not new clients of paying agencies; we'll revisit if billing model changes).

---

## Frontend

### File touches

```
src/
├─ lib/api/clients.ts             # extend with create/get/update/archive
├─ store/slices/clientsSlice.ts   # add addClient / updateClient / removeClient reducers
├─ pages/clients/
│  ├─ index.tsx                   # re-export ClientsList, ClientCreate, ClientEdit
│  ├─ ClientsList.tsx             # NEW — table page + filter tabs + create CTA
│  ├─ ClientCreate.tsx            # NEW — form page (replaces Placeholder)
│  └─ ClientEdit.tsx              # NEW — form page with "Archive" button
├─ components/clients/            # NEW folder
│  ├─ ClientForm.tsx              # shared by Create + Edit — controlled inputs, validation, slug preview
│  ├─ BrandColorPicker.tsx        # 6-swatch picker
│  ├─ ClientsTable.tsx            # the row-based list
│  ├─ ClientRow.tsx               # one row with avatar, name, status pill, "Open" action
│  ├─ ArchiveDialog.tsx           # confirmation dialog before archive
│  └─ ClientsEmptyState.tsx       # FTUX warm card for zero-client agencies
├─ styles/components/clients/     # NEW folder
│  └─ *.module.scss               # one per component above
├─ router/index.tsx               # wire /clients/:clientId/edit
└─ hooks/useClients.ts            # add convenience selectors (no API change)
```

### Frontend API additions (`src/lib/api/clients.ts`)

```ts
export interface ClientCreateBody {
  name: string;
  slug?: string;
  domain?: string | null;
  avatarColor?: string | null;
}
export interface ClientUpdateBody {
  name?: string;
  domain?: string | null;
  avatarColor?: string | null;
}

export function createClient(body: ClientCreateBody)
  { return apiCall<{ data: { client: Client } }>('/v1/clients', { method: 'POST', body }); }

export function getClient(id: string)
  { return apiCall<{ data: { client: Client } }>(`/v1/clients/${id}`); }

export function updateClient(id: string, body: ClientUpdateBody)
  { return apiCall<{ data: { client: Client } }>(`/v1/clients/${id}`, { method: 'PATCH', body }); }

export function archiveClient(id: string)
  { return apiCall<{ data: { client: Client } }>(`/v1/clients/${id}`, { method: 'DELETE' }); }
```

### Slice additions (`src/store/slices/clientsSlice.ts`)

```ts
addClient(state, { payload }: PayloadAction<Client>) {
  state.items.unshift(payload);    // newest at top — matches API's createdAt DESC order
  // do NOT auto-switch — let the page navigate explicitly
},
updateClient(state, { payload }: PayloadAction<Client>) {
  const i = state.items.findIndex((c) => c.id === payload.id);
  if (i >= 0) state.items[i] = payload;
},
removeClient(state, { payload: id }: PayloadAction<string>) {
  state.items = state.items.filter((c) => c.id !== id);
  if (state.activeClientId === id) state.activeClientId = state.items[0]?.id ?? null;
},
```

### Phase 1 · Backend mutations

1. Add `slugify` + `withCollisionSuffix` to `src/lib/slug.ts`.
2. Extend `clientsRouter` with the 4 handlers above (POST / GET-by-id / PATCH / DELETE).
3. Zod schemas for create/update bodies.
4. Audit log writes (`client.created`, `client.updated`, `client.archived`).
5. Curl smoke: create → list → get-by-id → update → list → archive → list (confirm archived hidden).

### Phase 2 · Frontend list page (`/clients`)

6. **`ClientsList.tsx`** — page composition:
   - Page header: `<Heading>All clients</Heading>` + subtitle (count) + "Add client" primary button → `/clients/new`
   - Filter tabs: `All` / `Active` / `Archived` (last one shows archived clients via a separate API call — defer until V1.5 if not needed for testing)
   - V1 simplification: just show **All** (which already excludes archived) — single tab, no segment switcher
   - `ClientsTable` with rows for every client in the slice
   - Empty state: `<ClientsEmptyState />` when `items.length === 0`
7. **`ClientRow.tsx`** — avatar (gradient from `avatarColor`) + name + slug + status pill + created date + "Open" link → `/clients/:id/dashboard`.
8. **`ClientsEmptyState.tsx`** — warm hero card with: icon, headline ("Add your first client"), sub-copy ("Each client gets its own contacts, campaigns, and sending domain"), big primary CTA → `/clients/new`.
9. Wire the table to `useClients().items` — re-renders automatically when slice mutates.

### Phase 3 · Frontend create page (`/clients/new`)

10. **`ClientForm.tsx`** — shared controlled form. Props: `{ initial?, onSubmit, submitLabel, submitting }`.
    Fields (matches `client_create.html` — NO slug input):
    - `name` (required) — text input. Slug is auto-generated server-side; no preview shown.
    - `brandColor` — `<BrandColorPicker />`
    - `domain` (optional) — text input with helper "Don't have it yet? You can add it later"
    - (Defer `fromName` / `fromEmail` to feature-sending-domain-verification — not in the schema yet)
11. **`BrandColorPicker.tsx`** — 6 swatches per the mockup. Click → highlight + write to form state. Default = first swatch.
12. **`ClientCreate.tsx`** — page wrapper. "Back to clients" link → `/clients`. Renders `<ClientForm submitLabel="Create client" onSubmit={onCreate} />`. On submit:
    - `withFormToast` wrapping `createClient()`
    - On success → `dispatch(addClient(res.data.client))` + toast "Client created" + `navigate('/clients')` (or to the new client's `/clients/:id/dashboard` — pick the destination that's least dead-end-y once that page is real)
13. **Validation:**
    - Name required (`name.length >= 1`)
    - Show backend `409 name_taken` as a field error on the *name* input ("A client with this name already exists — try a different name")
    - (No client-side slug validation — slug is invisible to the user)

### Phase 4 · Frontend edit page (`/clients/:clientId/edit`)

14. Add route to `router/index.tsx`: `{ path: '/clients/:clientId/edit', element: <RoleGated min="admin"><ClientScoped>{withSuspense(<Clients.Edit />)}</ClientScoped></RoleGated> }` — `ClientScoped` ensures the URL clientId is in user's scope, `RoleGated` enforces admin-or-owner.
15. **`ClientEdit.tsx`** — page wrapper. Uses `useParams<{clientId: string}>()`. Reads client from `useClients().items` (already in slice; no need to refetch). If client not in slice (deep-link before bootstrap), call `getClient(clientId)`.
16. Renders `<ClientForm initial={client} submitLabel="Save changes" onSubmit={onSave} />` — slug input is **disabled** here (immutable).
17. Separate **danger zone** card below the form: "Archive this client" + danger-styled button → opens `<ArchiveDialog />`.
18. **`ArchiveDialog.tsx`** — confirmation modal. Body: "This will hide *Khukri Spices* from your switcher and dashboard. All data (campaigns, contacts, sends) is preserved — you can ask support to restore it later." Two buttons: Cancel, "Yes, archive client". On confirm → `withFormToast` wrapping `archiveClient()` → `dispatch(removeClient(id))` → navigate to `/clients`.

### Phase 5 · Polish

19. **Switcher auto-update** — already works for free (slice mutates → `useClients()` re-reads → switcher re-renders). Verify after Phase 2-4 ships.
20. **Toast wording** — match the editorial voice: "Created **Khukri Spices**" (not "Client created successfully"). Tracks the auth-page tone.
21. **Brand color fallback** — `getColorGradient(hex)` helper builds a 150deg linear-gradient from the hex (lighter at top, darker at bottom) so the avatar still looks branded even with just one stored color. Used by `ClientSwitcher`, `ClientRow`, the future agency-dashboard client-health list, etc. Lives in `src/lib/clientColor.ts`.
22. **Skeleton rows** in `ClientsTable` while `clients.status === 'loading'`.
23. **Mobile breakpoint** — table collapses to a single-column card list at `≤860px`. Status pill stays visible; secondary metadata stacks underneath.

---

## Acceptance criteria

- [ ] `POST /v1/clients` with `{ name }` → returns `201` with full client object, auto-generated slug
- [ ] `POST /v1/clients` with duplicate name → returns `409 { error: { code: 'name_taken', field: 'name' } }`
- [ ] `POST /v1/clients` with non-Latin name (e.g. "खुकुरी मसला") → succeeds, slug is `client-{nanoid(6)}`
- [ ] `POST /v1/clients` as `member` → returns `403 insufficient_role`
- [ ] `GET /v1/clients/:id` on an out-of-scope client → returns `404 not_found` (never leaks existence)
- [ ] `PATCH /v1/clients/:id` updates returnable fields; slug is ignored if sent
- [ ] `DELETE /v1/clients/:id` sets status to `archived`; subsequent `GET /v1/clients` excludes the row
- [ ] Audit log has one row per mutation with the right `action` + `actor_user_id` + `metadata`
- [ ] `/clients` page renders the real list; "Add client" button → `/clients/new` works
- [ ] `/clients/new` shows the real form; submitting creates the client and updates the topbar switcher
- [ ] `/clients/:id/edit` shows the form pre-filled; saving updates the row in place; "Archive" → dialog → confirms → switcher updates
- [ ] Empty agency: `/clients` shows the warm `<ClientsEmptyState />`, not an empty table
- [ ] `<ClientSwitcher />` reflects every create / update / archive without a page refresh
- [ ] After archiving the *active* client, switcher falls back to the next available client (or empty CTA if none)
- [ ] Direct URL `/clients/abc123/edit` (where `abc123` isn't accessible) → redirects to `/clients` (via `ClientScoped`)
- [ ] `npm run build` passes; `npm run lint` adds 0 new issues
- [ ] Full end-to-end smoke: signup → verify → workspace setup → "Add your first client" CTA → create → returns to `/clients` showing 1 client → topbar switcher shows the new client

---

## Decisions

- **Slug is server-managed and never exposed in V1.** The form has no slug field (mockup doesn't either). On `name` collision the backend returns `409 name_taken` referencing the name field; the user picks a different name and retries. Honest UX over silently making `khukri-spices-2`. We can expose slug-editing later if power users ask.
- **Slug is immutable after create** (no PATCH on slug). Changing it would break any URL someone bookmarked / shared / embedded — way out of scope for V1.
- **Soft-archive only, no hard-delete in V1.** Per impl doc §V1 scope, the rationale is billing-dispute protection. Hard delete is a support-ticket operation, not a self-serve action.
- **No `fromName` / `fromEmail` on Client in V1.** The schema doesn't have them yet; they belong in `feature-sending-domain-verification` which manages the whole DKIM/SPF + sender-identity flow. Mockup shows them but they're aspirational.
- **No "Open" → client dashboard navigation in V1** — that page is still a `Placeholder`. The list row's "Open" link works but lands on the placeholder. Will become real with the per-client dashboard PR.
- **Slice mutations instead of refetch.** After every backend mutation, dispatch the matching reducer (`addClient` / `updateClient` / `removeClient`) and trust the response payload. No `listClients()` refetch — keeps the UI snappy and avoids race conditions during rapid edits.
- **`ClientForm` is one component shared by Create + Edit**, not two near-identical forms. Saves ~150 lines of code and means a field added to one is added to both.
- **Filter tabs deferred.** The mockup shows "All / Healthy / Watch / Setup" but three of those depend on Feature 10 event data. V1 ships just one tab labelled "All". Adding tabs back is a paint-only change later.
- **Search input deferred.** V1 doesn't render it. Re-evaluate at ≥20 clients per agency.

---

## Deviations from the mockup

- **Filter tabs collapsed to "All"** (Healthy / Watch / Setup need Feature 10 metrics).
- **Search input** removed for V1.
- **Sort controls** ("Last activity / Contacts / Billing") removed for V1 — sorted by `createdAt DESC` server-side. Mockup's sort dropdown becomes paint-only when reporting lands.
- **Stat columns** ("38.1% open", "रू 1.2L revenue") removed from rows — these need Feature 10. Each row in V1 shows: avatar + name/slug + status pill + created date + "Open" button.
- **"Export"** button (top-right) removed for V1.

---

## Dependencies

- No new npm packages.
- Builds on `feature-agency-dashboard` PR 1's clients slice, hook, and bootstrap.
- Uses existing UI primitives: `Heading`, `Text`, `Field`, `Input`, `Button`, `Pill`, `Card`, `Spinner`.

---

## Risks / open questions

- **What if the agency has 100+ clients?** Pagination deferred. V1 returns all clients in one response — fine up to a few hundred. Pagination ships when we have a user with that many.
- **Slug collisions for non-Latin script names** — handled. `slugify("खुकुरी मसला")` produces `''` after ASCII-only filter; backend falls back to `client-${nanoid(6)}`.
- **Empty-state UX after archiving the last client.** When the user archives the only remaining client, the switcher falls back to the "Add your first client" CTA — but the user is mid-workflow. We toast "Archived" then navigate them back to `/clients` which shows the empty state. Acceptable for V1; revisit if anyone complains.
- **Race condition: two admins create clients with the same name simultaneously.** Postgres's `(agency_id, slug)` unique constraint catches it; whoever loses the insert race gets `409 name_taken` and re-tries with a different name. No retry loop to worry about.

---

## What it unlocks

After this lands:
- **`feature-agency-dashboard` PR 2** (the dashboard page itself) becomes implementable — real clients to display, real "How your clients are doing" row, working empty-state CTA.
- **`feature-contacts-lists`** can start — needs `client_id` scope to exist.
- **`feature-campaign-engine`** can start — same.
- The end-to-end demo (`signup → verify → setup → create client → see in dashboard`) finally works.

---

## Changes (newest first)

### 2026-06-02 · ✅ Done — full CRUD shipped

End-to-end create / read / update / archive working. The Khukri Spices →
edit → archive loop runs cleanly against the dev DB.

**Backend** (`sendmymail-backend`):
- `src/lib/slug.ts` *(new)* — `slugify(name)` (NFKD-normalize, strip
  combining marks, lowercase, ASCII-only, kebab-case, ≤40 chars) +
  `randomSlug()` fallback (`client-${nanoid(6)}`) for empty results (non-Latin
  names, emoji-only). Unit-tested against 6 cases — all pass.
- `src/routes/clients.ts` — extended with 4 mutation handlers:
  - `POST /v1/clients` (owner/admin) — auto-generates slug; on
    `(agency_id, slug)` unique conflict catches Prisma `P2002` →
    `409 { code: 'name_taken', field: 'name' }`.
  - `GET /v1/clients/:id` — `loadClientOr404` helper centralizes the
    scope+existence check (404 on out-of-scope, never leak existence).
  - `PATCH /v1/clients/:id` (owner/admin) — zod `.strict()` rejects unknown
    keys including `slug` (immutable). Audit log records a diff.
  - `DELETE /v1/clients/:id` (owner/admin) — idempotent soft-archive
    (re-archiving a row is a no-op, returns the same payload).
- Every mutation writes one row to `audit_log` (`client.created`,
  `client.updated`, `client.archived`) with metadata + IP + UA via the
  existing `writeAudit` helper.

**Frontend** (`sendmymail-frontend`):
- `src/lib/api/clients.ts` — added `getClient` / `createClient` /
  `updateClient` / `archiveClient` + their typed body interfaces.
- `src/store/slices/clientsSlice.ts` — added `addClient` / `upsertClient` /
  `removeClient` reducers. `removeClient` falls back the active client to
  the next available one (or `null` for empty agencies).
- `src/lib/clientColor.ts` *(new)* — 6-swatch `BRAND_COLORS` palette,
  `clientGradient(hex)` (builds a 150deg `linear-gradient` lightened-top /
  darkened-bottom), `clientInitials(name)` (first letters of first 2 words),
  `FALLBACK_GRADIENT` for null avatarColor.
- `src/components/clients/` *(new)* — 6 components with matching SCSS
  Modules under `src/styles/components/clients/`:
  - `BrandColorPicker` — accessible 6-swatch radiogroup, selected swatch
    gets an ink ring + ring offset.
  - `ClientForm` — shared by Create + Edit. Fields: name, brand color,
    domain. No slug input (matches mockup; slug is server-managed).
  - `ClientsTable` + `ClientRow` — single-card grid with avatar / name+slug /
    status pill / created date / chevron. Whole row is the click target
    (navigates to `/clients/:id/edit`). Responsive — collapses to two-line
    layout at ≤720px (created-date hides).
  - `ClientsEmptyState` — FTUX hero card (terra circle icon, headline, lede,
    big primary CTA). Mirrors the editorial tone of the auth pages.
  - `ArchiveDialog` — portal-mounted modal with backdrop, ESC + click-outside
    to close, body-scroll lock, `pop` + `fadeIn` animations, danger-variant
    confirm button.
- `src/components/shell/ClientSwitcher.tsx` — refactored to use
  `clientGradient` + `clientInitials` from `clientColor.ts`. Dropped the
  local fallback constant + helper functions (now centralized).
- `src/pages/clients/` — split into 3 files:
  - `ClientsList.tsx` — page header (count subtitle) + `ClientsTable` (or
    `ClientsEmptyState` when zero); loading spinner during slice bootstrap.
  - `ClientCreate.tsx` — back link + form Card; on success dispatches
    `addClient` + `setActive(newId)` so the topbar switcher immediately
    shows the new client; navigates to `/clients`.
  - `ClientEdit.tsx` — back link + form Card pre-filled; on save dispatches
    `upsertClient`; **danger zone** card below the form with "Archive
    {name}" button → `ArchiveDialog`. On archive confirm: `archiveClient`
    API → `dispatch(removeClient)` → toast → navigate to `/clients`. Sends
    only the fields that actually changed on PATCH (diff-aware).
  - `index.tsx` — re-exports for the lazy router.
- `src/router/index.tsx` — added the `Clients.Edit` lazy import and the
  new route `/clients/:clientId/edit` gated by
  `<RoleGated min="admin"><ClientScoped>...`.

**Verify** (curl smoke against dev backend):
1. List empty → `200 { items: [] }`
2. Create "Khukri Spices" → `201` with slug `khukri-spices`, status `active`
3. Re-create same name → `409 { code: 'name_taken', field: 'name' }` with the
   user-facing message
4. GET /:id → returns the client
5. PATCH name+color → returns updated client; slug unchanged (immutable)
6. Create non-Latin name "खुकुरी मसला" → `201` with fallback slug
   `client-bhifmo`
7. DELETE /:id → returns `status: 'archived'`
8. List again → archived hidden, non-Latin client remains

**Build:** `tsc -b` + `vite build` clean. `clients-*.js` chunk grew from
0.4 KB (read-path only) to 10.2 KB (full CRUD) — about right for 3 pages +
6 components.

**Lint:** 0 new issues. The 11 pre-existing issues (`canvas/*`,
`inspector/*`, `integrations/*`, `tree/paths.ts`, `router/index.tsx`) are
all in untouched files.

**Deviations from the plan (recorded for honesty):**
- Plan said `archive` would use `prisma.$transaction([update, audit])` — in
  practice the existing `writeAudit` helper is already fire-and-forget +
  errors are logged, so wrapping in a transaction would actually be worse
  (audit failure would roll back the archive). Kept the existing pattern.
- Plan mentioned mobile breakpoint for the table at ≤860px; built it at
  ≤720px instead — matches the existing AppShell breakpoint better.
- Plan said active-client fallback to "the next available" on archive;
  implemented as "the first remaining" (same thing for V1 since there's
  no notion of "preferred fallback").

### 2026-06-02 · 📐 Planning

Plan written. Single-PR scope (backend mutations + frontend list/create/edit
all in one cohesive build). Promoted ahead of `feature-agency-dashboard` PR 2
because the dashboard's "Create your first client" CTA was dead-ending at a
placeholder — pivot recommended by the user and accepted.

Next: implement, then revisit the dashboard PR with real client data to display.
