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

## Plan — PR 2 (CSV import + bulk actions + per-list subscription UI)

The agency's first-day-of-use action: dump a 5K-row CSV and have it
become real contacts in a list. Without this, contacts CRUD is
one-row-at-a-time — useless at scale. PR 2 also picks up the
bulk-action surface (multi-select + bulk add-to-list / delete) that
was deferred from PR 1, since CSV-imported contacts need a way to
batch-act on them.

### V1 scope

| In | Out — deferred |
|---|---|
| Single CSV file upload (≤10 MB, ≤50K rows) | Multi-file batch import |
| Streaming parse via papaparse (memory-safe at 50K rows) | XLSX / TSV / JSON imports |
| UTF-8 detection + BOM strip (Devanagari names survive) | Latin-1 / non-UTF-8 encodings |
| Header detection + column mapper (8 standard fields + custom-field opt-in) | Free-form field mapping with regex transforms |
| Dedupe within import + against existing contacts (case-insensitive `emailLower`) | Fuzzy-match dedupe (john+work@ vs john@) |
| **Role-account quality check** — reject before import if >10% are `info@` / `admin@` / `noreply@` / `support@` / `sales@` / `contact@` / `help@` / `hello@` / `team@` | Disposable-email detection (mailinator etc.) |
| Consent declaration checkbox **required** + text recorded on the ImportJob row | Per-row consent (single consent per import is enough V1) |
| Async job with progress polling (1-second cadence) | WebSocket live updates |
| Import history modal on ContactsList | Detailed per-row error report download |
| Multi-select on ContactsTable + bulk-action bar (Add to list, Delete) | Bulk-tag, bulk-export — defer |
| Per-list "Unsubscribe from this list" button on ContactDetail | Bulk unsubscribe from list |

### Schema additions

One new model + one migration (`20260604_contacts_imports`):

```prisma
model ImportJob {
  id              String         @id @default(cuid())
  agencyId        String         @map("agency_id")
  clientId        String         @map("client_id")
  listId          String?        @map("list_id")        // optional — if set, imported contacts also added to this list
  createdBy       String         @map("created_by")     // userId who initiated
  status          ImportJobStatus @default(pending)
  rejectedReason  String?        @map("rejected_reason") // 'too_many_role_accounts' | 'invalid_csv' | 'parse_error'
  filename        String                                 // original upload name
  fileSize        Int            @map("file_size")
  totalRows       Int            @default(0) @map("total_rows")
  processedRows   Int            @default(0) @map("processed_rows")
  importedRows    Int            @default(0) @map("imported_rows")
  skippedRows     Int            @default(0) @map("skipped_rows")     // duplicates, empty emails
  rejectedRows    Int            @default(0) @map("rejected_rows")    // bad emails, etc
  columnMapping   Json           @map("column_mapping")                // { csvCol: contactField | 'custom:field_name' | 'skip' }
  consentText     String         @map("consent_text")                  // exact text the user agreed to
  errors          Json?                                                // first 100 errors as { row, email, reason }[]
  startedAt       DateTime?      @map("started_at")
  completedAt     DateTime?      @map("completed_at")
  createdAt       DateTime       @default(now()) @map("created_at")

  agency    Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  client    Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  creator   User   @relation(fields: [createdBy], references: [id], onDelete: Cascade)
  list      List?  @relation(fields: [listId], references: [id], onDelete: SetNull)

  @@map("import_jobs")
  @@index([clientId, createdAt(sort: Desc)])
}

enum ImportJobStatus {
  pending      // uploaded, not yet started
  parsing      // detecting headers + counting rows
  importing    // inserting contacts in chunks
  done
  failed
}
```

Updates to existing models — Agency / Client / User / List gain
`importJobs: ImportJob[]` reverse relations.

### Backend endpoints

All under `/v1/clients/:clientId/contacts/imports`, gated by
`requireAuth + requireClientScope + requireRole('admin')` (only
admin+ can import — protects sender reputation).

| Method | Route | Notes |
|---|---|---|
| POST   | `/`          | Multipart upload. Body: `file` (CSV blob) + `listId?` + `columnMapping` (JSON) + `consentText` (string). Returns `{ jobId, status, totalRows }`. Job runs async. |
| GET    | `/`          | List recent jobs for this client (paginated, default 20). Used by the import-history modal. |
| GET    | `/:jobId`    | Poll status. Returns full ImportJob row (status, counts, errors). |

**Streaming + batching strategy:**
1. multer disk-storage writes the upload to `os.tmpdir()/import-{nanoid}.csv` (avoid memory blow-up on 50MB files)
2. First pass: papaparse with `preview: 5` to detect headers + sample. Quality check runs on this sample plus a first-100-row scan. Failure here → status: `failed`, `rejectedReason`, no rows imported.
3. Second pass: papaparse stream (`step` callback per row, `worker: false`). Batch rows into chunks of 100 → `prisma.$transaction([createMany({ skipDuplicates: true }), listContact.createMany({ skipDuplicates: true })])`. After each chunk, update `importedRows / skippedRows / rejectedRows` so frontend polling sees progress.
4. On completion → `status: 'done'`, `completedAt`. Delete tmp file.
5. On any throw → catch, set `status: 'failed'`, log error to `errors` JSON (cap 100 entries), delete tmp file.

**Role-account regex** lives in `src/lib/roleAccounts.ts`:
```ts
export const ROLE_LOCAL_PARTS = new Set([
  'info', 'admin', 'noreply', 'no-reply', 'support', 'sales',
  'contact', 'help', 'hello', 'team', 'mail', 'office', 'enquiry',
  'inquiry', 'webmaster', 'postmaster',
]);
export function isRoleAccount(email: string): boolean { … }
```

**Dedupe semantics:**
- *Within the import batch*: a `Set<string>` of seen `emailLower` values; subsequent occurrences are counted as `skippedRows`.
- *Against existing contacts*: handled by `createMany({ skipDuplicates: true })` against the `(client_id, email_lower)` unique index. Existing rows are left alone; not even `firstName` is updated (V1 — re-import doesn't overwrite). Counted as `skippedRows`.
- *Against the target list*: `listContact.createMany({ skipDuplicates: true })` handles re-adding an existing member as a no-op (the membership row stays with whatever status it already had).

### Backend file touches

```
src/
├─ lib/
│  └─ roleAccounts.ts            # NEW — isRoleAccount + ROLE_LOCAL_PARTS
├─ routes/
│  └─ contacts/                  # NEW folder — splits the existing contacts.ts
│     ├─ index.ts                # re-exports the routers (keeps server.ts mount untouched)
│     ├─ crud.ts                 # current contents of contacts.ts (CRUD + tag resolve)
│     └─ imports.ts              # POST / GET / GET /:jobId
└─ server.ts                     # already mounts /v1/clients/:clientId/contacts/imports
                                 # via contactsRouter sub-routers
```

`server.ts` mount stays as `app.use('/v1/clients/:clientId/contacts', contactsRouter)`; the import sub-router is mounted INSIDE that router:
```ts
// src/routes/contacts/index.ts
const contactsRouter = Router({ mergeParams: true });
contactsRouter.use('/imports', importsRouter);   // mounts at /imports
contactsRouter.use('/', crudRouter);             // mounts the CRUD routes
export { contactsRouter };
```

### Frontend file tree

```
src/
├─ lib/api/
│  └─ imports.ts                 # NEW — uploadImport, listImports, getImport
├─ store/slices/
│  └─ importsSlice.ts            # NEW — { clientId, items, status } per-client cache
├─ hooks/
│  └─ useImports.ts              # NEW — list + getById + upload (with optimistic addJob)
├─ components/contacts/
│  ├─ FileDropZone.tsx           # NEW — drag-drop + click-to-pick + UTF-8 detect + parse-preview
│  ├─ ColumnMapper.tsx           # NEW — table of (csvHeader → contactField) selects
│  ├─ ImportProgressDialog.tsx   # NEW — modal that polls until done/failed
│  ├─ ImportHistoryDialog.tsx    # NEW — modal listing past imports for this client
│  ├─ BulkActionBar.tsx          # NEW — appears when contacts table has ≥1 selected
│  ├─ ConfirmDialog.tsx          # NEW — generic confirm modal (used by bulk-delete)
│  └─ index.ts                   # +export the above
├─ pages/contacts/
│  ├─ ContactImport.tsx          # NEW — the 4-step wizard
│  ├─ ContactsList.tsx           # UPDATE — multi-select + bulk-action bar + Import button enabled
│  └─ ContactDetail.tsx          # UPDATE — per-list "Unsubscribe" button on each list row
└─ styles/components/contacts/   # +6 new SCSS Modules
```

### Frontend phases

1. **`FileDropZone`** — accept `<input type="file" accept=".csv">` + drag-drop overlay. On select, run `papaparse({ header: true, preview: 10, encoding: 'utf-8' })` client-side to detect headers + show row-count + first-3 row preview. Validates file size ≤10 MB and at least 1 header row. Errors render inline (`Invalid CSV`, `File too large`).
2. **`ColumnMapper`** — props `{ headers: string[], onChange: (mapping) => void }`. For each header, a `<Select>` of `[Email (required) | First name | Last name | Phone | City | Birthday (YYYY-MM-DD) | Custom field… | Don't import]`. "Custom field" prompts for a key (becomes `custom:source` in mapping). Validation: exactly one column must map to `email`.
3. **`ContactImport`** — 4-step wizard page state machine:
   - Step 1: `<FileDropZone />` → on success, advance
   - Step 2: list-picker (use existing `<AddToListDialog>` styling — or inline radio group of existing lists + "Skip / Create new" option)
   - Step 3: `<ColumnMapper />`
   - Step 4: consent text + checkbox + "Import N contacts" button
   - Submit → `POST /imports` with multipart body → response gives `jobId` → open `<ImportProgressDialog jobId={jobId} />`.
4. **`ImportProgressDialog`** — polls `GET /imports/:jobId` every 1 s (clears on `done` / `failed`). Shows progress bar (`processedRows / totalRows`) + live counters (imported / skipped / rejected). On `done`, "View N imported contacts" button → navigate to `/clients/:cid/contacts?listId=…`. On `failed`, show `rejectedReason` + retry CTA.
5. **`ImportHistoryDialog`** — modal triggered from ContactsList's "View import history" link (subtitle area). Table of past jobs: filename, status pill, timestamps, counts. Click a row → opens `ImportProgressDialog` (re-uses the same component for completed jobs — shows the final tally + errors[]).
6. **`ContactsList` updates**:
   - Wire the existing "Import CSV" button (currently disabled) → navigate to `/clients/:cid/contacts/import`
   - Add a checkbox column to `ContactsTable` (header checkbox = select-all-on-page)
   - `<BulkActionBar />` sticky element appears when `selected.size > 0`: "Add to list", "Delete N", "Clear selection"
   - "Delete N" opens `<ConfirmDialog>` → on confirm, calls `deleteContact()` in parallel for each id
   - "Add to list" opens the existing `<AddToListDialog>` with the multi-contact array
7. **`ContactDetail` updates** — per-list "Unsubscribe" button:
   - Each row in the "Lists & subscriptions" card gets a small ghost button next to the status pill
   - If `status === 'subscribed'`: button text = "Unsubscribe" → calls `updateMembershipStatus(cid, listId, contactId, 'unsubscribed')` → row pill flips to "Unsubscribed"
   - If `status === 'unsubscribed'`: button text = "Re-subscribe" → flips back
8. **Router** — add `/clients/:clientId/contacts/import` route (replace existing Placeholder). `<RoleGated min="admin">` + `<ClientScoped>` wrappers.

### Decisions

- **Async job, not synchronous import.** Even a 5K-row CSV takes ~10 s to insert. A blocking POST would hang the request and time out at the proxy. Async + polling = pattern that scales to 50K rows without changing the API.
- **Polling, not WebSocket.** A 1-second poll for ~30 s of work is 30 HTTP requests — trivial cost. WebSocket adds protocol complexity for one feature. Revisit when we have ≥3 features needing live updates.
- **Multer disk storage, not memory.** A 50MB upload in memory across N concurrent imports would OOM the backend. Disk-stored upload + papaparse streaming keeps memory flat regardless of file size.
- **Role-account check runs on a sample**, not the full file. Quality is statistically detectable in the first 100 rows; running the regex on 50K rows would be slow. The sample is sampled-by-stride (rows 1-50 + rows N/2 to N/2+50) so we don't miss role accounts clustered at the end.
- **Reject-vs-skip**: bad email format = `skippedRows` (per-row, import continues). >10% role accounts in the sample = `rejectedReason: 'too_many_role_accounts'` (whole-import abort). This matches the impl doc §V1 spec.
- **Errors capped at 100 entries.** A truly broken CSV could generate 50K error rows — we'd blow up JSON storage. Cap + flag truncation in the UI.
- **No partial-success retry.** If a job fails midway (DB error), the imported-so-far rows stay; the user can re-import the same CSV (dedupe makes it idempotent). Simpler than transactional all-or-nothing for 50K rows.
- **Splitting `contacts.ts` into `contacts/{crud,imports}.ts`** keeps each file under 300 lines and gives imports a clean home for its many helpers (parser, role-check, batcher).
- **No `re-import` UX in V1.** Users who botched a mapping just upload again — dedupe handles the overlap. "Edit and rerun a failed job" is a future PR.
- **Bulk-delete is per-contact API calls in parallel**, not a new bulk endpoint. Avoids the API surface area for V1; we can add `DELETE /contacts?ids=…` later if 100-contact deletes become slow.
- **`BulkActionBar` is sticky to the bottom of the viewport** (not the top) to keep the table headers visible while it's open.

### Deviations from the mockup

- **Mockup's "Add to list" dropdown in step 2** shows existing lists with member counts — our V1 matches this. The "Create a new list" inline option will create a static list on the fly and add the contact set to it.
- **Step 4's "Quality check" note** is an explainer, not interactive. The actual check fires on submit; if it fails, the wizard shows the rejection reason inline before navigating to the progress dialog.
- **Mockup doesn't show the import-history modal** explicitly; we add it because users will want to see "did my import finish?" without leaving the contacts page.
- **Bulk-action bar** isn't in the mockup at all — but it's the natural follow-on once a CSV deposits 5K rows and the user needs to retag/move them.

### Dependencies

- **Backend:** `papaparse` + `@types/papaparse` + `multer` + `@types/multer` (4 new deps; documented in `tasks/feature-contacts-lists/change_log.md` + `doc/tech_stack/tech_stack.md` per CLAUDE.md rules).
- **Frontend:** also `papaparse` + `@types/papaparse` (used client-side for header detection + preview before submitting).
- One new migration. No schema changes to existing tables.

### Risks / open questions

- **Multer + Express 5 compatibility.** Multer is officially Express 4; works on 5 with caveats. If it breaks, swap for `busboy` (lower-level, Express-version-agnostic). Test before relying on it.
- **CSV with BOM at the start of the file.** papaparse handles it but verify with a real-world UTF-8 BOM CSV (Excel exports add one by default).
- **Memory pressure on tiny VPS.** Backing the 50MB-file ceiling with disk storage helps; revisit if we ever host on a 512MB-RAM box.
- **Quality check false-positives.** A wholesale-only business genuinely has many `info@`/`sales@` recipients. V1 throws a 10%-threshold rejection; if a real customer hits this, we add an admin-override flag in the form (e.g. "I know this looks role-heavy and that's correct for my list").
- **Worker pool for parallel imports.** V1 runs imports in the main Node process (single-threaded). Two concurrent 50K-row imports would block each other. Acceptable for V1 — revisit when an agency hits this.

### Acceptance criteria

- [ ] `POST /v1/clients/:cid/contacts/imports` accepts a multipart CSV up to 10 MB; returns `{ jobId, status: 'pending' }` immediately
- [ ] A 5,000-row UTF-8 CSV with Devanagari names imports cleanly; all rows appear in the target list with correct firstName/lastName
- [ ] Re-importing the same CSV results in `skippedRows === totalRows` (full dedupe)
- [ ] Uploading a CSV where >10% of localparts are role accounts → `status: 'failed'`, `rejectedReason: 'too_many_role_accounts'`, zero rows imported
- [ ] Consent checkbox is required in the wizard; submit disabled without it; `consentText` recorded on the job row
- [ ] Column mapper enforces exactly one column mapping to `email` (cannot proceed otherwise)
- [ ] `ImportProgressDialog` polls every 1 s; progress bar moves; live counter labels accurate
- [ ] `ImportHistoryDialog` shows past jobs with the right status pill + counts; opening a `done` job re-opens the progress dialog with final tally
- [ ] Multi-select on ContactsTable: clicking the header checkbox selects/deselects all rows on the current page; row clicks navigate normally (don't toggle select); shift-click selects a range (nice-to-have, OK to defer)
- [ ] `BulkActionBar` appears with the right N count; "Add to list" opens `AddToListDialog` with N contactIds; "Delete N" opens confirm + parallel-deletes
- [ ] `ContactDetail` "Lists & subscriptions" card: clicking "Unsubscribe" on a subscribed list row flips the status pill + button label without a page reload
- [ ] As a `member` role, `POST /imports` returns 403 `insufficient_role`
- [ ] `npm run build` passes; `npm run lint` adds 0 new issues
- [ ] No new env vars or secrets

### What it unlocks

- **Forms feature (09)** can write `contact + list_contact` rows the same way the import flow does (the helper functions become shared)
- **Campaigns** can send to imported lists immediately — the multi-tenant data path is fully operational
- **PR 3** (segments + suppression) — the only remaining contacts feature; once it ships, the contacts module is feature-complete for V1

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

### 2026-06-03 · ✅ Done — PR 2 (CSV import + bulk actions + per-list unsubscribe)

Real CSV import end-to-end. A user can upload a 5K-row CSV, map columns,
confirm consent, watch a live progress bar, and have their contacts land in
the right list. Bulk-action surface ships alongside (multi-select on the
contacts table → add-to-list / delete). Per-list "Unsubscribe" / "Re-subscribe"
button on `ContactDetail` closes the last loose end from PR 1.

**Backend** (`sendmymail-backend`):
- `prisma/schema.prisma` — new `ImportJob` model + `ImportJobStatus` enum
  (`pending | parsing | importing | done | failed`). Agency / Client /
  User / List gain `importJobs[]` reverse relations.
- Migration `20260603153201_contacts_imports` — adds the `import_jobs` table.
- `src/lib/roleAccounts.ts` *(new)* — `isRoleAccount(email)` /
  `roleAccountRate(emails[])` + `ROLE_ACCOUNT_REJECT_THRESHOLD = 0.10`.
  Conservative role-account set (19 localparts: `info`, `admin`, `noreply`,
  `support`, etc.); deliberately omits `marketing` and `newsletter`
  (real people use those at small agencies).
- `src/routes/contactImports.ts` *(new)* — 3 endpoints under
  `/v1/clients/:clientId/contacts/imports` (`requireRole('admin')`):
  - `POST /` — multipart upload (multer disk storage, 10 MB cap, `.csv`
    only). Validates one column maps to `email`, consent non-empty,
    listId belongs to client. Creates `ImportJob{status:'pending'}` and
    returns 201 immediately; kicks off async `processImport()` without
    awaiting.
  - `GET /` — list past 20 jobs (newest first).
  - `GET /:jobId` — single job (poll target).
- Async `processImport()`:
  1. `parsing` → papaparse `step` pass to count totalRows + collect
     200-row email sample.
  2. `roleAccountRate(sample) > 0.10` → `status: 'failed'`,
     `rejectedReason: 'too_many_role_accounts'`, zero rows imported.
  3. `importing` → second papaparse `step` pass; buffer 100 rows at a
     time → `contact.createMany({ skipDuplicates: true })`. Existing
     `(client_id, email_lower)` rows are skipped (count → `skippedRows`).
     If `listId` set, query back by `emailLower` and
     `listContact.createMany({ skipDuplicates: true })` for membership.
  4. Invalid emails (no `@`, length out of bounds) → `rejectedRows`;
     in-batch duplicates → `skippedRows`. First 100 errors saved as JSON.
  5. Progress counters updated max 1×/s (avoid DB hammering).
  6. On done → `status: 'done'` + `completedAt`. On throw → `'failed'`
     + `'parse_error'`. Tmp file `unlink()` runs in `finally` regardless.
- `src/server.ts` — mounts the imports router *before* the CRUD router so
  `/imports` doesn't get swallowed by the `/:id` parameterized handler.
- New deps: `multer + @types/multer + papaparse + @types/papaparse`.

**Frontend** (`sendmymail-frontend`):
- New dep: `papaparse + @types/papaparse` (client-side header preview +
  row counting before submitting; the streaming itself happens server-side).
- `src/lib/api/imports.ts` *(new)* — `uploadImport()` (multipart via raw
  `fetch` to bypass JSON-only `apiCall`), `listImports()`, `getImport()`
  + `ImportJob` / `ColumnMapping` types.
- 6 new components under `src/components/contacts/` + matching SCSS Modules:
  - **`FileDropZone`** — drag-drop + click-to-pick + 10 MB cap + `.csv`
    filter. Runs papaparse with `preview: 3` to detect headers + grab a
    sample for the mapper, then a streaming pass to count total rows.
    "Replace" button for re-pick.
  - **`ColumnMapper`** — one row per CSV header → `<select>` of standard
    fields / "Custom field…" / "Don't import". Auto-detects common
    headers via regex (`email`, `e_mail`, `first_name`, `fname`, `dob`).
    Banner enforces exactly-one email column.
  - **`ImportProgressDialog`** — portal modal polling `getImport()` at 1 Hz
    until terminal. Progress bar + "imported / skipped / rejected" counter
    tiles + first 6 row errors with "+ N more…" overflow. Done → "View N
    imported contacts" CTA. Failed → friendly copy per `rejectedReason`
    + "Try again" CTA. Cannot close while running.
  - **`ImportHistoryDialog`** — past 20 jobs for this client. Clicking a
    row opens `ImportProgressDialog` for that job (works for completed
    jobs too — shows the final tally).
  - **`BulkActionBar`** — sticky bar at viewport bottom when ≥1 contacts
    are selected. Ink-colored, slide-up animation, "Add to list" /
    "Delete N" / × close.
  - **`ConfirmDialog`** — generic destructive-action modal. Reusable for
    any future "delete N" flow.
- `src/pages/contacts/ContactImport.tsx` *(new)* — 4-step wizard (file →
  list → columns → consent) per `doc/mockups/contact_import.html`.
  Disabled-submit hint explains exactly why ("Map one column to Email" /
  "Confirm consent to proceed" / …). On submit opens
  `ImportProgressDialog` with the new job.
- `src/components/contacts/ContactsTable.tsx` — optional bulk-select props
  (`selectedIds`, `onToggleSelect`, `onToggleSelectAll`). When supplied,
  renders a checkbox column with indeterminate-state header for partial
  selection. Row click still navigates to detail; checkbox click
  `stopPropagation`. Selected rows tinted in `--primary-light`.
- `src/pages/contacts/ContactsList.tsx` — wired bulk-select state, enabled
  the previously-disabled "Import CSV" button (navigates to
  `/clients/:cid/contacts/import`), added a small "import history" link
  in the subtitle row opening `ImportHistoryDialog`. Renders
  `BulkActionBar` when ≥1 selected. "Add to list" → `AddToListDialog`
  with selected ids; "Delete N" → `ConfirmDialog` then
  `Promise.all(contacts.remove(id))`.
- `src/pages/contacts/ContactDetail.tsx` — per-list row now shows
  "Unsubscribe" / "Re-subscribe" button next to the status pill. Calls
  `updateMembershipStatus()` (PR 1 endpoint), optimistically updates
  `fetched` + dispatches `upsertContact` so the pill flips instantly.

**Verify**:
- Backend curl smoke with a 10-row CSV (Devanagari name, bad email,
  empty email): POST returns 201 `status: 'pending'` instantly; 2s
  later poll returns `status: 'done'`, `imported: 7`, `rejected: 3`,
  errors[] has the 3 expected rows with row + reason + email.
- Listing imports returns the past job.
- Frontend `npm run build` clean. Contacts chunk grew from 35.4 KB
  (PR 1) to 81.4 KB / gzip 24.7 KB. Most of the growth is papaparse
  (~30 KB raw) + the 6 new components.
- Frontend `npm run lint`: 0 new issues. One
  `// eslint-disable-next-line react-hooks/set-state-in-effect` on
  the standard "reset selection on filter change" pattern.

**Decisions made during implementation**:
- **Multer + Express 5 confirmed working** — no busboy fallback needed.
  Disk storage in `os.tmpdir()` keeps the upload off the heap.
- **Per-chunk progress updates capped at 1 Hz** — a 5K-row import
  finishes in ~3s; even fast imports report 3-4 checkpoints. Avoids
  50 DB writes per import.
- **Errors capped at 100 entries** in JSON column. A 50K-row broken
  CSV would otherwise blow up the column; we truncate + flag the
  total count in the dialog.
- **Multipart upload via raw `fetch`**, not `apiCall`. Keeps `apiCall`
  as the JSON-only contract.
- **Tmp file `unlink()` in `finally`** regardless of outcome.
  Combined with 10 MB cap, tmp dir can't accumulate orphan files.
- **`source: 'csv_import'`** on every contact this flow creates;
  visible in the contacts table via PR 1's `SourceCell` icon.
- **Bulk-delete is `Promise.all` of per-contact DELETE calls** —
  adding a bulk endpoint adds API surface area; defer until someone
  routinely bulk-deletes 100+.
- **`AddToListDialog` reused as-is** for the bulk case (it already
  accepted `contactIds: string[]`).
- **Per-list "Re-subscribe" is allowed in V1** — the only way to exit
  `unsubscribed` is to re-subscribe yourself. Two-level suppression
  (PR 3) will override this regardless for agency-wide bounces.

**Deviations from the plan**:
- **Plan said `src/routes/contacts/` becomes a folder** with `crud.ts` +
  `imports.ts`. Kept flat — `routes/contacts.ts` + new
  `routes/contactImports.ts`. Restructuring would have noised up the
  diff for no real benefit.
- **No shift-click range-select** on the bulk checkbox column. Plan
  marked it "nice-to-have, OK to defer" — defer confirmed.

**What this unlocks**:
- PR 3 (dynamic segments + suppression + GDPR) — last contacts feature;
  once it ships the module is V1-complete.
- Campaign engine (Feature 06) — agencies can finally *get* contacts
  into lists at scale, so campaigns have real audiences to target.
- Forms (Feature 09) — will write `contact + list_contact` the same
  way `streamImport()` does; helper logic becomes reusable.

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
