# Feature: Contacts & lists — change log

> The per-client data foundation. Every campaign, flow, form, and report in
> SendMyMail sends to / reads from / filters / segments **contacts**. Without
> this module nothing downstream is usable. Builds on `feature-client-management`
> (clients now exist with real IDs; every contact belongs to one).
>
> References:
> - [doc/implementation_doc/feature-contacts-lists.md](../../doc/implementation_doc/feature-contacts-lists.md)
> - Mockups: [contacts.html](../../doc/mockups/contacts.html) ·
>   [contact_import.html](../../doc/mockups/contact_import.html) ·
>   [contact_detail.html](../../doc/mockups/contact_detail.html) ·
>   [lists.html](../../doc/mockups/lists.html) ·
>   [list_editor.html](../../doc/mockups/list_editor.html) ·
>   [suppression.html](../../doc/mockups/suppression.html)
> - Routes: [routes.md §`/clients/:clientId/contacts...`](../../doc/architecture/routes.md)

---

## Why this comes next

`feature-client-management` shipped clients, but `/clients/:id/contacts` is
still a `Placeholder`. The user just made their first client — the next
thing they want to do is *put people in it*. Without contacts:

- **Campaigns** have nothing to send to (Feature 06 blocked)
- **Forms** have nowhere to deposit signups (Feature 09 blocked)
- **Flows** have no audience trigger (Feature 07 blocked)
- **Reports** have nothing to aggregate (Feature 10 stays empty)

It also unblocks the agency dashboard's `Active clients` to mean something
real — once clients have contacts and sends, the dashboard finally lights up.

---

## V1 scope

What ships across the 3 PRs of this feature (matches the impl doc's V1 list):

| In | Out — explicitly deferred |
|---|---|
| `contact` with `UNIQUE (client_id, email_lower)` | >10 custom fields per client |
| Standard fields (`email`, `firstName`, `lastName`, `phone`, `city`, `birthday`) | Behavioural segments / predictive scoring |
| Free-text multi-select tags | Cross-list merge / cross-client move |
| **Static lists** (manually maintained) + many-to-many membership | Nested AND/OR groups in segments |
| **Dynamic lists** (rule-based, ≤5 conditions, AND/OR, auto-update) | Heatmaps, geo segments |
| CSV import via **papaparse** — UTF-8 detection, BOM strip, dedupe-on-import, mandatory consent declaration, role-account quality check | Predictive sending time |
| **Per-list subscription status** (`subscribed` / `unsubscribed` / `pending`) | A/B segment splits |
| **Two-level suppression** — `client` (unsub from one client) + `agency` (hard bounce / complaint, applies everywhere) | Cohort retention analysis |
| GDPR right-to-erasure cascading through `list_contact`, `contact_tag`, `events`, `sends` | Contact merging / deduplication of fuzzy matches |
| Custom fields stored as `jsonb` (≤10 per client) | |

---

## Scope — split into 3 PRs

The impl doc covers everything; the build is too big for one PR. Each PR
below leaves the app in a usable state on its own.

### PR 1 — Contacts foundation *(start here)*

| Layer | What |
|---|---|
| Prisma schema | `contact`, `list`, `list_contact` (join), `tag`, `contact_tag` (join) models — full relations + indexes + the `UNIQUE (client_id, email_lower)` constraint. **One migration.** |
| Backend | CRUD endpoints under `/v1/clients/:clientId/*`: contacts (list / get / create / update / soft-delete with GDPR cascade), lists (list / create / update / archive), list-contact membership (add / remove + per-list subscription status), tags (read all + apply / remove). Slugify already exists from feature-client-management. |
| Frontend API | `src/lib/api/contacts.ts` + `src/lib/api/lists.ts` typed wrappers |
| Frontend Redux | Two new slices: `contactsSlice` (per-client cache of currently-viewed list) + `listsSlice` (per-client list of lists). Both keyed by `clientId` so switching clients gracefully drops the wrong-client data. |
| Frontend pages | Real `Contacts` (list page), `ContactDetail`, `Lists` — replacing 3 placeholders |
| Frontend components | `ContactsTable`, `ContactForm` (add/edit modal), `ContactTagInput`, `ListsTable`, `ListForm` |

**Acceptance:** A user can create a client → navigate to its contacts → add a contact via the form → see it in the list → click into the detail page → edit / delete → also see basic lists CRUD working. **No CSV import, no segments, no suppression yet** — all flagged with "Coming in PR 2/3" CTAs where they show in the mockup.

### PR 2 — CSV import + per-list subscription status

| Layer | What |
|---|---|
| Backend | `POST /v1/clients/:clientId/contacts/import` (multipart upload, papaparse streaming, dedupe by `email_lower` within target list, consent declaration recorded, role-account quality check) + `import_job` table for async progress + status |
| Frontend | Real `ContactImport` page (4-step flow per mockup: file upload + drop, list picker, column mapping, consent + quality-check note) + import-history modal on the Contacts page |
| Per-list status | The `list_contact.status` enum (`subscribed` / `unsubscribed` / `pending`) wired into the ContactDetail "Lists & subscriptions" card |

**Acceptance:** A user can upload a 5,000-row CSV with UTF-8 Devanagari names → see the column mapper detect headers → confirm consent → see the import job progress → see all 5,000 contacts appear in the target list. Deduping works (re-importing the same CSV adds zero new contacts).

### PR 3 — Dynamic segments + Suppression + GDPR

| Layer | What |
|---|---|
| Schema | Add `segment` table (rule JSON + cached count) + `suppression` table (2-scope: `client` / `agency`) |
| Backend | Segment rule compiler (≤5 conditions, AND/OR, parameterized SQL — never string-concat) + preview endpoint + suppression CRUD endpoints + the at-send-time suppression filter (this hooks into Feature 06 campaign engine later but the filter logic lives here) |
| Frontend | Real `ListEditor` page (rule builder per `list_editor.html`) + real `Suppression` page (stat-strip + segment filter tabs per `suppression.html`) |
| GDPR | Hard-delete contact endpoint that truly cascades (existing soft-delete from PR 1 becomes hard-delete with confirmation) |

**Acceptance:** A user can create a Dynamic list "VIP buyers" with rule `tag IN (vip) AND city = Kathmandu` → see the live preview count → save → the list auto-updates as new contacts match. Suppression list shows all bounces / complaints / unsubs with per-source provenance. Deleting a contact removes all `list_contact` + `contact_tag` rows.

---

## Detailed plan — PR 1 (Contacts foundation)

This is the one we implement now. PR 2 and PR 3 each get their own
Planning entry when we start them.

### Schema additions

```prisma
model Contact {
  id           String   @id @default(cuid())
  agencyId     String   @map("agency_id")
  clientId     String   @map("client_id")
  email        String                                // preserves case as user typed
  emailLower   String   @map("email_lower")          // for uniqueness + lookups
  firstName    String?  @map("first_name")
  lastName     String?  @map("last_name")
  phone        String?
  city         String?
  birthday     DateTime?                             // date-only; @db.Date
  custom       Json?                                 // ≤10 client-defined fields
  source       String?                               // 'csv_import' | 'manual' | 'form' | 'api' — V1 just label
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt       @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")          // soft-delete in V1; hard-delete in PR 3

  agency       Agency           @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  client       Client           @relation(fields: [clientId], references: [id], onDelete: Cascade)
  listMembers  ListContact[]
  contactTags  ContactTag[]

  @@map("contacts")
  @@unique([clientId, emailLower])                   // the core dedupe rule
  @@index([clientId, deletedAt])
  @@index([clientId, createdAt])
}

model List {
  id          String     @id @default(cuid())
  agencyId    String     @map("agency_id")
  clientId    String     @map("client_id")
  name        String
  description String?                                // optional, ≤200 chars
  type        ListType   @default(static)           // static | dynamic — dynamic.rule JSON ships in PR 3
  archived    Boolean    @default(false)
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt       @map("updated_at")

  agency      Agency        @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  client      Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  members     ListContact[]

  @@map("lists")
  @@index([clientId, archived])
}

enum ListType {
  static
  dynamic
}

model ListContact {
  listId       String   @map("list_id")
  contactId    String   @map("contact_id")
  status       ListMembershipStatus @default(subscribed)
  subscribedAt DateTime @default(now()) @map("subscribed_at")
  unsubscribedAt DateTime? @map("unsubscribed_at")

  list    List    @relation(fields: [listId],    references: [id], onDelete: Cascade)
  contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@id([listId, contactId])
  @@map("list_contacts")
  @@index([contactId])
}

enum ListMembershipStatus {
  subscribed
  unsubscribed                                       // unsubscribed from this list specifically (client-scoped)
  pending                                            // confirmation pending (for double-opt-in, later)
}

model Tag {
  id       String @id @default(cuid())
  clientId String @map("client_id")
  name     String                                    // lowercase, free-text
  color    String?                                   // optional hex, defaults to gray
  createdAt DateTime @default(now()) @map("created_at")

  client      Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  contactTags ContactTag[]

  @@map("tags")
  @@unique([clientId, name])
}

model ContactTag {
  contactId String @map("contact_id")
  tagId     String @map("tag_id")

  contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId],     references: [id], onDelete: Cascade)

  @@id([contactId, tagId])
  @@map("contact_tags")
  @@index([tagId])
}
```

**Migration name:** `20260602_contacts_lists_foundation`. One migration creates all five tables + the join indexes.

### Backend endpoints (PR 1)

All under `/v1/clients/:clientId/...`, all gated by `requireAuth() + requireClientScope` (the existing middleware).

| Method | Route | Notes |
|---|---|---|
| GET    | `/contacts` | Paginated. Query params: `?page=N`, `?pageSize=N` (default 50, max 200), `?search=q` (matches email + first/last name + city), `?listId=X` (filter to one list's members), `?tag=foo`. Returns `{ items, total, page, pageSize }`. Excludes soft-deleted unless `?includeDeleted=true` (admin only). |
| POST   | `/contacts` | Create. Body validated by zod. `email` lowercased into `emailLower` server-side. On unique-conflict `(client_id, email_lower)` → `409 email_taken`. Audit `contact.created`. |
| GET    | `/contacts/:id` | Single. 404 if soft-deleted or out-of-scope. |
| PATCH  | `/contacts/:id` | Update. Email is immutable in V1 (changing breaks dedupe + send history). Audit `contact.updated` with diff. |
| DELETE | `/contacts/:id` | Soft-delete (sets `deletedAt`). Hard-delete with full GDPR cascade lands in PR 3. Audit `contact.deleted`. |
| GET    | `/lists` | All non-archived lists for this client. Includes `memberCount` (subquery). |
| POST   | `/lists` | Create. V1 only `type: 'static'` accepted (`dynamic` returns `501 not_implemented` until PR 3). |
| GET    | `/lists/:listId` | Single, with member count. |
| PATCH  | `/lists/:listId` | Update name / description / archived. |
| DELETE | `/lists/:listId` | Archive (soft). Membership rows stay so we can audit later. |
| POST   | `/lists/:listId/contacts` | Add one or many contacts to the list. Body: `{ contactIds: string[] }`. Idempotent (existing rows are no-ops). |
| DELETE | `/lists/:listId/contacts/:contactId` | Remove from list (deletes the `list_contact` row entirely — true membership removal, distinct from "unsubscribed"). |
| PATCH  | `/lists/:listId/contacts/:contactId` | Update membership status (e.g. flip to `unsubscribed`). |
| GET    | `/tags` | List all tags used by this client. |
| POST   | `/tags` | Create a new tag (auto-creates on first use too — see "Tag UX" decision). |
| POST   | `/contacts/:id/tags` | Apply tags. Body: `{ tags: string[] }` (names; auto-create if missing). |
| DELETE | `/contacts/:id/tags/:tagId` | Remove a tag from a contact. |

**Auth scope:** every handler enforces both `requireClientScope` (URL clientId must be in the user's scope) AND verifies the resource (contact / list / tag) belongs to that client. No cross-client data leaks.

### Frontend file tree

```
src/
├─ lib/api/
│  ├─ contacts.ts                    # NEW — listContacts, getContact, createContact, updateContact, deleteContact, applyTags, removeTag
│  ├─ lists.ts                       # NEW — listLists, getList, createList, updateList, archiveList, addToList, removeFromList, updateMembership
│  └─ tags.ts                        # NEW — listTags, createTag
├─ store/slices/
│  ├─ contactsSlice.ts               # NEW — { clientId, items, total, page, pageSize, search, status }
│  └─ listsSlice.ts                  # NEW — { clientId, items, status }
├─ hooks/
│  ├─ useContacts.ts                 # NEW — paginated query + add/edit/delete + tag mutations
│  └─ useLists.ts                    # NEW — list CRUD + membership
├─ pages/contacts/
│  ├─ index.tsx                      # re-exports (replaces the 6 Placeholders for List/Detail/Lists; Import/ListEditor/Suppression stay as Placeholders until PR 2 & 3)
│  ├─ ContactsList.tsx               # NEW — page with toolbar (segment-tabs by list + search) + table
│  ├─ ContactDetail.tsx              # NEW — back link + profile card + lists card + tags + (timeline = placeholder until Feature 10)
│  └─ ListsList.tsx                  # NEW — table of all lists (static-only in PR 1)
├─ components/contacts/              # NEW folder
│  ├─ index.ts
│  ├─ ContactsTable.tsx              # the data table matching the mockup
│  ├─ ContactsToolbar.tsx            # list-tab filter + search input
│  ├─ ContactsEmptyState.tsx         # FTUX hero card (icon + "No contacts yet — Add one or import a CSV")
│  ├─ ContactForm.tsx                # add/edit modal form (email, names, phone, city, birthday, tags)
│  ├─ ContactFormDialog.tsx          # the modal wrapper around ContactForm
│  ├─ ContactTagInput.tsx            # multi-select chip input — type to create / search
│  ├─ ListsTable.tsx                 # table of lists (matches lists.html static rows only)
│  ├─ ListFormDialog.tsx             # modal to create/rename a static list
│  └─ AddToListDialog.tsx            # picker that adds N selected contacts to a list
└─ styles/components/contacts/       # NEW folder
   └─ *.module.scss                  # one per component above + 1 for ContactsList page + 1 for ContactDetail
```

### Frontend phases (PR 1)

1. **API + slices first** — `contactsApi`, `listsApi`, `tagsApi`, `contactsSlice`, `listsSlice`. Bootstrap hooks fire `listContacts(clientId, {page:1})` + `listLists(clientId)` on mount of the contacts page (NOT app-mount — these are per-client and large).
2. **`ContactsList` page** — `.head` with title + subtitle ("X contacts in Y lists · Z suppressed" — suppressed count shows `—` until PR 3) + `Import CSV` button (disabled in PR 1 — tooltip "Coming in PR 2") + `Add contact` primary button. `ContactsToolbar` shows segment tabs for `All / {each static list}` + search. `ContactsTable` with mockup columns: Email, Name, Tags, Lists, Added, Source. Row click → `/clients/:cid/contacts/:contactId`.
3. **`ContactFormDialog`** — modal triggered by "Add contact"; submits via `createContact`; on success dispatches `addContact` + closes + toasts. The form also handles edit mode (passed `initial={contact}`).
4. **`ContactDetail` page** — back link + head (avatar + name + email + source + added-when) + actions (Edit + Unsubscribe). Two columns:
   - Left: Profile card (kv rows for email/phone/city/birthday/status/tags/source) + Lists & subscriptions card (per-list status pill)
   - Right: Recent activity card — **placeholder** for V1 ("Activity tracking lights up once event ingestion ships — Feature 10")
5. **`ListsList` page** — `.head` + toolbar (segment: All / Static / Dynamic — Dynamic tab shows `0` and is disabled in PR 1) + ListsTable with mockup columns: List, Type, Contacts, Last used in (`—` until Feature 06), Updated.
6. **`AddToListDialog`** — multi-select picker triggered from contact detail (and later from a contacts-table bulk-action bar in PR 2).
7. **Routing** — no router changes needed; the 3 routes (`contacts`, `contacts/:id`, `lists`) already exist as `Placeholder` and we just swap the components.

### Honest empty states (PR 1)

- **No contacts yet** → `ContactsEmptyState` hero (terra icon, "Your first contact" + "Add manually, or import a CSV when PR 2 lands.")
- **No lists yet** → similar empty hero on the lists page
- **`Recent activity` timeline on contact detail** → soft card: *"Sends, opens, clicks, and orders appear here once event ingestion ships. (Feature 10.)"*
- **`Source` column** for V1 → only `manual` or `csv_import` (CSV in PR 2). `WooCommerce` / `form` / `api` light up later.
- **`Suppression` segment tab** → disabled tooltip "Suppression list ships in PR 3"
- **Import CSV button** → disabled tooltip "CSV import ships in PR 2"

---

## Outline — PR 2 (CSV import)

- `npm install papaparse` + `@types/papaparse` (one new dep; documented + justified per CLAUDE.md tech-stack rules)
- Backend: `POST /v1/clients/:clientId/contacts/import` — multipart upload (multer or busboy), pipe into papaparse stream, validate headers, dedupe by `email_lower` within the target list, write to `import_job` table for async progress polling, role-account quality check (reject if >10% are `info@`, `admin@`, etc.)
- Frontend: `ContactImport` page = 4-step flow:
  1. File drop card (UTF-8 detection + BOM strip + row count + column count)
  2. Add-to-list picker (existing list or "create new")
  3. Column mapper (CSV header → contact field; "Don't import" / "Custom field" options)
  4. Consent declaration + quality-check note + import button
- Job progress modal that polls `GET /v1/clients/:cid/contacts/imports/:jobId` for live progress
- ContactsList page gains a small "View import history" button

Per-list subscription status (the `list_contact.status` enum) gets the
real `Unsubscribe from this list` button on contact detail. Today it
falls back to "Subscribed" everywhere.

---

## Outline — PR 3 (Dynamic segments + Suppression + GDPR)

- Schema: `segment` model (id, clientId, listId nullable, rule JSON, cachedCount, cachedAt) + `suppression` model (agencyId, clientId nullable, emailLower, scope enum, reason enum, source, createdAt)
- Segment rule compiler (`src/lib/segmentCompiler.ts` on backend) — accepts the JSON rule shape, compiles to **parameterized** SQL (never string-concat → no injection), enforces ≤5 conditions, AND/OR only (no nested groups in V1)
- `POST /v1/clients/:cid/segments/preview` — returns count + 10-row sample
- Frontend: real `ListEditor` page with the condition builder (matching `list_editor.html`); real `Suppression` page (stat strip + 6-tab filter + table)
- Hard-delete endpoint replaces soft-delete: `DELETE /v1/clients/:cid/contacts/:id?confirm=true` performs GDPR cascade through `list_contact` + `contact_tag` + (Feature 10's) `events` + (Feature 06's) `sends`
- At-send-time suppression filter — a helper `isSuppressed(email, agencyId, clientId)` checked by the campaign engine in Feature 06

---

## Decisions

- **3 PRs not 1.** Splitting at the natural seams (foundation → import → segments+suppression) keeps each diff reviewable. PR 1 alone is shippable — "add contacts one at a time, group into static lists" works for small agencies, and the CSV import is a separable concern.
- **`emailLower` as a separate column** (not just an index on `LOWER(email)`). Cheaper to query against, easier to enforce uniqueness, makes the dedupe rule explicit in the schema. Costs ~1 byte per row.
- **Email is immutable on PATCH.** Changing the email of a contact would orphan their send history + break the unique constraint dance. If a user mistypes, they delete + re-create.
- **Soft-delete in PR 1, hard-delete (GDPR) in PR 3.** Splits the destructive-action surface area into two PRs and lets us add the confirmation UX properly.
- **Tags auto-create on first use.** When a user types `vip` in the tag input and there's no Tag row, we create one. Saves the user from a "manage tags" page in V1.
- **Custom fields = `jsonb` only**, no schema-per-client. The 10-field cap is enforced at the API layer, not the DB. Liftable.
- **`list_contact.status` is per-list**, not per-contact. Respects "newsletter yes, promos no" — central to the impl doc's design.
- **Two-level suppression** is a schema decision baked in from PR 1 even though the table doesn't ship until PR 3 — the `agencyId` + nullable `clientId` columns are the seam. Avoids a future migration.
- **No bulk delete in PR 1.** Single-contact delete only. Bulk-actions (multi-select + bulk add to list / bulk delete) lands in PR 2 alongside CSV import (same UX surface).
- **No "Manage tags" page in V1.** Tags are managed inline on contact rows. A separate page can land later if anyone asks.
- **Per-client paginated cache, not a full agency cache.** `contactsSlice` keys by `clientId`; switching the active client clears the slice. Avoids holding 50K rows for an agency with 8 clients × 6K contacts each.
- **No client-side full-text search yet** — the backend's `?search=q` is the search. Pagination + server-side filter scales to 100K+ contacts; client-side filter doesn't.

---

## Deviations from the mockup

- **`Source` column** populated with only `manual` / `csv_import` in V1. WooCommerce / form / API columns light up with their respective features.
- **Contact-detail KPI tiles** ("Lifetime orders / Total spent / Avg order / Cart abandoned") — hidden in V1. They depend on either WooCommerce integration (deferred) or per-contact event aggregation (Feature 10). Will surface as a row of `EmptyMetric` placeholders when we know the data source.
- **`Recent activity` timeline** — placeholder card until Feature 10 ships event ingestion.
- **`stat-strip` on suppression page** (387 / 142 / 8 / 237 counts) — PR 3 only.
- **`segment-bar`** showing the active filter rule ("`tag = vip AND city = Kathmandu` → 412 contacts") — PR 3.
- **`Newsletter / VIP buyers / Suppressed` filter tabs** in the mockup are list-based; V1 generates these dynamically from the actual lists for this client. If the client has 0 lists, the toolbar shows just "All".

---

## Dependencies

- **PR 1:** no new npm packages. Uses Prisma + existing UI primitives + zod (already installed). One new migration.
- **PR 2:** `papaparse` + `@types/papaparse` + `multer` (or `busboy`) for multipart uploads. New `import_job` table.
- **PR 3:** no new packages. Two new tables (`segment`, `suppression`).

---

## Risks / open questions

- **Pagination at scale.** PR 1 ships `?page` + `?pageSize` (max 200). An agency with 100K contacts will need a different approach (keyset pagination, virtual scrolling). Revisit when anyone exceeds 20K.
- **Email normalization beyond `.toLowerCase()`.** `John+work@gmail.com` and `John@gmail.com` are technically different mailboxes but the same person 90% of the time. V1 treats them as different. If anyone complains, add gmail-dot/plus normalization in a tiny `lib/emailNormalize.ts`.
- **Per-list `subscribed/unsubscribed/pending` vs agency suppression.** The send engine must check BOTH: agency-suppression (hits all) AND list-membership-status (hits this list). PR 3 implements both, but the seam needs to be careful — easy to bug.
- **GDPR erasure during a send.** If a contact deletes themselves mid-send, the campaign queue may already have their email. PR 3 needs to honor erasure on `sends` rows too, not just future sends.
- **Tag rename UX.** PR 1 has no tag-rename. If a user types `KATHMANDU` then later wants it as `kathmandu`, they're stuck creating a new tag + remapping. Tag-edit/delete-with-confirmation is a future PR.

---

## What this unlocks

After all 3 PRs land:
- **Campaigns** (Feature 06) can pick a list to send to
- **Forms** (Feature 09) have somewhere to deposit signups
- **Flows** (Feature 07) have a real audience trigger
- **Reports** (Feature 10) start aggregating per-contact + per-list metrics
- **Agency dashboard** "How your clients are doing" row finally has real numbers
- The end-to-end demo (`signup → workspace → client → import CSV → send first campaign → see report`) is reachable

---

## Changes (newest first)

### 2026-06-03 · ✅ Done — PR 1 (Contacts foundation)

End-to-end contacts CRUD + static lists + tags is shipped. A user can
now go: signup → workspace setup → create client → switch into client →
add contacts manually (with tags + list membership) → see them in a real
data table → click into the detail view → edit / archive → manage lists
on the side. CSV import and dynamic segments remain explicit
"Coming in PR 2/3" CTAs.

**Backend** (`sendmymail-backend`):
- `prisma/schema.prisma` — 5 new models (Contact, List, ListContact, Tag,
  ContactTag) + 2 enums (ListType, ListMembershipStatus). Agency + Client
  relations updated. Two-level suppression seam (`agencyId` + nullable
  `clientId` on Contact) baked in even though the suppression table waits
  for PR 3.
- Migration `20260603131430_contacts_lists_foundation` — one migration,
  five new tables, ten new indexes (including the core
  `UNIQUE (client_id, email_lower)` dedupe rule and
  `UNIQUE (client_id, slug)` equivalent on lists/tags).
- `src/routes/contacts.ts` (new) — `GET / GET /:id / POST / PATCH /:id /
  DELETE /:id` with:
  - Server-side `emailLower = email.toLowerCase()` for case-insensitive
    dedupe (`Aastha.Shrestha@Gmail.COM` matches `aastha.shrestha@gmail.com`).
  - On `(client_id, email_lower)` unique-conflict → `409 email_taken`.
  - Auto-tag resolution via `resolveTags()` helper — accepts raw names,
    normalizes (lowercase, trim, ≤40 chars), find-or-creates Tag rows in
    one transaction, returns ids.
  - `PATCH` accepts a `tags` array with **replace** semantics — wipes
    existing ContactTag rows and re-creates them. Email is immutable
    (omitted from the zod `.strict()` schema).
  - 10-field cap on custom JSON enforced at the API layer.
  - `?search=q` matches email + first/last/city; `?listId=X` filters to
    subscribed members; `?tag=foo` filters to tag-bearers.
  - Pagination `?page` + `?pageSize` (default 50, max 200).
  - Soft-delete (`deletedAt`) — full GDPR cascade lands in PR 3.
  - Every mutation writes one audit_log row (`contact.created`,
    `contact.updated`, `contact.deleted`).
- `src/routes/lists.ts` (new) — list CRUD + membership endpoints:
  - `POST /` rejects `type: 'dynamic'` with `400 not_implemented` (PR 3).
  - `GET /` returns subscribed-member count per list in a single
    `groupBy` round-trip (avoids N+1).
  - `DELETE /:listId` archives (soft) — membership rows kept for audit.
  - `POST /:listId/contacts` adds members (idempotent via
    `skipDuplicates`); validates contact IDs belong to this client
    before insert.
  - `DELETE /:listId/contacts/:contactId` hard-deletes membership row.
  - `PATCH /:listId/contacts/:contactId` flips `status` between
    `subscribed / unsubscribed / pending`; `unsubscribedAt` stamped
    automatically.
- `src/routes/tags.ts` (new) — read-only `GET /` listing for tag
  autocomplete; tags are auto-created server-side via `resolveTags()`
  when applied to a contact.
- `src/server.ts` — mounted the 3 routers at
  `/v1/clients/:clientId/contacts | /lists | /tags`. All use
  `Router({ mergeParams: true })` so `:clientId` propagates from the
  parent path.
- Every route enforces `requireAuth() + requireClientScope` (limited-
  scope users get 404 on out-of-agency clientIds; owners with
  `scope: 'all'` get empty results, never 403 leaks).

**Frontend** (`sendmymail-frontend`):

API layer:
- `src/lib/api/contacts.ts` (new) — typed `listContacts / getContact /
  createContact / updateContact / deleteContact` + `Contact`,
  `ContactCreateBody`, `ContactUpdateBody`, `ContactListResponse`.
- `src/lib/api/lists.ts` (new) — typed `listLists / getList / createList /
  updateList / archiveList / addContactsToList / removeContactFromList /
  updateMembershipStatus` + `ContactList`, body interfaces, enums.
- `src/lib/api/tags.ts` (new) — `listTags()` + `Tag` type.

State + hooks:
- `src/store/slices/contactsSlice.ts` (new) — per-client paginated
  cache `{ clientId, status, items, total, page, pageSize, search,
  listId, tag, error }`. Switching clientId wipes the slice. Reducers
  for setLoading / setPage / setError / setSearch / setListFilter /
  setTagFilter / addContact / upsertContact / removeContact /
  clearContacts.
- `src/store/slices/listsSlice.ts` (new) — per-client list cache
  `{ clientId, status, items, error }` + addList / upsertList /
  removeList / **bumpMemberCount** (used after add/remove member calls
  to keep the count fresh in the topbar / dashboard).
- `src/store/index.ts` — registers both new reducers.
- `src/hooks/useContacts.ts` (new) — fetches a page whenever
  `clientId / page / search / listId / tag` changes (with the
  cancellation pattern to drop stale responses); exposes
  `create / update / remove` mutations that dispatch the matching
  slice reducer after the API call resolves.
- `src/hooks/useLists.ts` (new) — fetches lists on first use per
  clientId; exposes `create / update / archive / addMembers /
  removeMember`. `bumpMemberCount` is dispatched automatically from
  `addMembers` / `removeMember` so the UI count stays correct without
  refetching.

Components (`src/components/contacts/` — 8 files + 8 SCSS Modules):
- `ContactsToolbar` — segmented status filter
  (All + one tab per static list with live member counts) + search
  input matching mockup `.seg` + `.search`.
- `ContactsEmptyState` — FTUX hero card (terra icon, headline, lede,
  primary CTA + disabled "Import CSV" with PR 2 tooltip).
- `ContactsTable` — real `<table>` matching `contacts.html` exactly:
  Email (bold) / Name / Tags (chips, +N more if >3) / Lists / Added
  (relative time: "2 hours ago", "5 days ago", absolute after 8 weeks) /
  Source (icon + label per source enum) / hover-revealed "Open →".
  Mobile breakpoint at ≤920px collapses to email + name + chev.
- `ContactTagInput` — chip multi-select with autocomplete: type → enter/
  comma adds a tag (normalized lowercase + trim), backspace on empty
  removes last, dropdown suggests existing tags + offers "+ Create tag".
- `ContactFormDialog` — portal-mounted modal, ESC + click-outside +
  body-scroll-lock, animations (fadeIn + pop). Shared by Add + Edit;
  in edit mode the email field is readOnly with helper "Email can't
  be changed once a contact is created." Includes a list-picker
  (chips) in create mode so the user can multi-select lists to add
  the contact to in one step.
- `ListsTable` — real `<table>` matching `lists.html`: List (icon +
  name + sub) / Type pill / Contacts count / Last used in (`—`
  until Feature 06) / Updated (date) / hover-revealed Edit pencil.
- `ListFormDialog` — modal for creating + renaming static lists
  (reuses ContactFormDialog SCSS for consistency).
- `AddToListDialog` — picker that adds N contacts to one or more
  lists (supports both single-contact use from the detail page and
  bulk use coming in PR 2). Excludes lists the contact is already
  subscribed to.

Pages (`src/pages/contacts/` — 3 real pages + index barrel):
- `ContactsList` — `.head` (title + count subtitle + `Import CSV`
  disabled-with-PR-2-tooltip + Add contact primary), toolbar,
  empty-state (when total === 0 + no filters), table, minimal
  prev/next pagination when > pageSize.
- `ContactDetail` — back link, hero (avatar + name + email + source +
  added date) + Edit/Delete actions, two-column layout: left column
  has Profile card (kv rows: email/phone/city/birthday/source/tags)
  + Lists & subscriptions card (per-list status pill + "Add to list"
  button); right column has Recent activity card with an honest empty
  state pointing at Feature 10 ("Sends, opens, clicks, and orders
  appear once event ingestion ships"). Cache-first loading via
  useMemo from the slice; fetches from API only on deep-link.
- `ListsList` — `.head` (title + count + "Suppression list"
  disabled-with-PR-3-tooltip + New list primary), table OR empty-
  state, footer Note explaining static vs dynamic.
- `pages/contacts/index.tsx` — re-exports the 3 real pages and keeps
  the 3 still-deferred placeholders (ContactImport / ListEditor /
  Suppression) wrapped in PlaceholderS so the router routes still
  resolve.

**Verify**:

Backend curl smoke chain (against running dev backend on :4000, owner
JWT) ran 12 of 12 paths:
1. Create static list 'Newsletter' → 201
2. Dynamic list → 400 `not_implemented` (PR 3)
3. Create contact "Aastha" with `tags:["VIP", "  Kathmandu  "]` →
   normalized to `["vip", "kathmandu"]`, ListContact row created
4. Duplicate email (different casing) → `409 email_taken`
5. List with `?page=1&pageSize=10` → paginated payload
6. `?search=aastha` → 1 match
7. PATCH with new tags replaces the set, slug-style scalars updated
8. GET /tags returns 3 auto-created rows (kathmandu, vip, loyalty)
9. Soft-delete sets `deletedAt`
10. List excludes the deleted contact
11. Lists list includes `memberCount`
12. Out-of-agency clientId → empty result for `scope: 'all'` owner

Frontend `npm run build` clean:
- `contacts-*.js` chunk: 35.4 KB / gzip 10.0 KB
- `contacts-*.css` chunk: 14.0 KB / gzip 3.2 KB
- The chunk lazy-loads only when a user navigates into a
  `/clients/:id/contacts*` route.

Frontend `npm run lint`:
- Zero new issues in any file touched today.
- One `// eslint-disable-next-line react-hooks/set-state-in-effect`
  on the async-fetch loading-flag pattern in ContactDetail
  (overly strict rule for the standard "fetch on mount, show
  spinner" UX).
- The 11 pre-existing issues (`canvas/*`, `inspector/*`,
  `integrations/*`, `tree/paths.ts`, `router/index.tsx`) remain
  untouched.

**Decisions made during implementation (recorded for honesty)**:

- **`source: 'manual'` always set on POST.** The schema allows null
  but we want every contact to have a clear origin. CSV import will
  set `'csv_import'` in PR 2; forms / API ingest set their own
  values when those features land.
- **Replace-semantics on PATCH `tags`** (instead of separate
  add-tag / remove-tag endpoints). One source of truth, one API
  call per UI submission, no race conditions during rapid edits.
- **`AddToListDialog` issues one call per list** in the loop
  (`addContactsToList(cid, listId, [contactId])` × N). The backend's
  membership endpoint is per-list — we could batch by adding a
  cross-list endpoint, but it's only worth the complexity if users
  routinely add to >5 lists at once.
- **Pagination is prev/next-only V1.** Page numbers + jump-to-page
  controls add complexity for the rare case where someone has
  hundreds of pages of contacts. URL-driven `?page=N` lets the
  back button work normally.
- **`upsertContact` doesn't add to the slice if the contact isn't
  already in the current page.** Adding would disrupt pagination
  ordering. ContactDetail's `setFetched` fills the gap — the
  detail page always shows the freshest data even if it isn't
  in the slice.
- **No bulk-select on the contacts table in V1.** Deferred to PR 2
  along with the CSV import flow (same UX surface for bulk actions).
- **`ContactsList` filter changes write to slice state, not URL.**
  Round-trip via URL is nice but adds complexity. Listeners can
  add it in a follow-up if anyone misses the back-button-restores-
  filter behavior.

**Deviations from the plan (recorded for honesty)**:

- **No "Manage tags" page in V1.** The plan said this was deferred;
  confirmed — tags are only managed inline (typed into
  `ContactTagInput` on contact create/edit). Rename + delete tag
  is future-PR.
- **`ContactDetail` doesn't have the KPI tiles** (Lifetime orders /
  Total spent / Avg order / Cart abandoned) shown in the mockup.
  Those depend on WooCommerce / Feature 10 event data — confirmed
  hidden in V1.
- **`source` enum cells render with manual / csv_import / form /
  woo / api icons.** Only `manual` is produced in PR 1; the others
  light up as their features ship. Icons + labels are wired now to
  avoid a follow-up FE change.

**What this unlocks**:
- PR 2 (CSV import) — schema + API + Redux are ready; just adds the
  `import_job` table + multipart upload endpoint + the 4-step UI.
- PR 3 (segments + suppression) — `suppression` table seam already
  baked in (`agencyId` + nullable `clientId` on Contact); just adds
  the segment compiler + rule UI.
- Campaign engine (Feature 06) — has a real "audience picker"
  target: a list_id. The send loop can read members from
  `list_contacts where status = 'subscribed'`.

### 2026-06-02 · 📐 Planning

Plan written. 3-PR split: foundation → CSV import → segments + suppression.
PR 1 is the focus — schema (5 new models, 1 migration), backend CRUD,
frontend list + detail + lists pages + tags. CSV import and dynamic
segments + suppression are explicitly deferred to PR 2 / PR 3 with
honest "Coming next" CTAs in the UI.

Next: implement PR 1 (Contacts foundation).
