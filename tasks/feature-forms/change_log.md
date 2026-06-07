# Feature: Forms — change log

> Hosted signup forms so agencies can grow their clients' contact lists
> organically. Each form has a public URL (`/f/{slug}`), a configurable
> set of fields (email + optional first/last name V1), and auto-adds
> submitters to a designated list with proper dedup, suppression check,
> and honeypot bot protection.
>
> References:
> - [tasks/feature-contacts-lists/](../feature-contacts-lists/) — the
>   Contact + List + ListContact models this builds on
> - [tasks/feature-send-hardening/change_log.md](../feature-send-hardening/change_log.md)
>   — the Suppression table forms must respect
> - [doc/architecture/auth-tenancy.md](../../doc/architecture/auth-tenancy.md)
>   — public-route conventions (`/u`, `/e`, and now `/f`)

---

## Status: ✅ Done — V1 shipped

Plan-doc estimated 2-3 days; implemented in one focused pass. Full
backend + frontend + change_log update. Manual E2E test pending (just
needs to create a form, copy URL, submit in incognito).

### What landed (file-by-file)

**Backend (sendmymail-backend)**:

- `prisma/schema.prisma` — 1 new enum (`FormStatus`), 2 new models
  (`Form`, `FormSubmission`), 4 reverse relations (Agency, Client,
  List, Contact).
- `prisma/migrations/20260607075050_forms_foundation/migration.sql`
  — 2 new tables + 1 enum + 5 indexes + 5 FK constraints.
- `src/lib/form-slug.ts` (new, ~120 lines) — `validateSlug`,
  `slugify`, `suggestSlug`, `generateUniqueSlug`. Strict regex
  (lowercase + digits + single hyphens, no edge hyphens), 26-entry
  reserved-words list (`u`, `e`, `f`, `api`, `admin`, etc.). Auto-suffix
  `-2`, `-3`, … on collision with `random hex` fallback at 50 attempts.
- `src/routes/public-forms.ts` (new, ~220 lines) — 2 public endpoints
  at `/f`:
  - `GET /f/:slug/config` — form display config for client-side
    rendering. Returns `{ notFound: true }` for archived; full config
    for active and paused (frontend uses status to decide what to
    render).
  - `POST /f/:slug/submit` — full submission pipeline (honeypot →
    consent → rate limit → suppression → contact upsert → list-contact
    upsert → submission row → counter increment). All inside one
    `$transaction`. Always returns 200 with `ok: true/false` — never
    leaks specifics.
- `src/routes/forms.ts` (new, ~270 lines) — 5 admin endpoints
  (list / get / create / update / archive). Cursor-paginated list.
  Slug validation + collision check on create + update. List
  archive-state check before form points at it. Soft archive (sets
  `archived: true` + `status: 'paused'`).
- `src/server.ts` — mounts `formsRouter` at
  `/v1/clients/:clientId/forms` + `publicFormsRouter` at `/f`.

**Frontend (this repo)**:

- `src/lib/api/forms.ts` (new, ~125 lines) — typed wrappers + 6 types
  (`Form`, `FormSummary`, `FormSubmissionRow`, `FormDetailResponse`,
  `FormCreateBody`, `FormUpdateBody`).
- `src/lib/api/publicForms.ts` (new, ~55 lines) — typed wrappers for
  the public endpoints + discriminated `ConfigResponse` (ok+config
  vs notFound).
- `src/hooks/useForms.ts` (new, ~55 lines) — cursor-paginated list +
  archive action.
- `src/components/forms/FormRenderer.tsx` (new, ~180 lines) — the
  shared form UI used by BOTH the editor preview AND the public
  hosted page. Theming via CSS custom property `--form-brand` set
  inline from the form's brandColor. Three render states: active form,
  thank-you, unavailable (paused/missing).
- `src/pages/forms/FormsList.tsx` (new, ~190 lines) — list page with
  card grid. Each card: status pill, name, copy-URL row,
  submission count, target list chip, kebab menu with edit + archive
  (click-again-to-confirm pattern).
- `src/pages/forms/FormEditor.tsx` (new, ~290 lines) — create + edit
  modes share component. Side-by-side: config form on left, live
  preview on right. Preview reuses FormRenderer with `interactive: false`.
  4 config sections: Basics (name/list/slug), Public copy
  (headline/subheadline/button/thank-you), Fields (first/last name
  toggles), Compliance (consent), Theming (brand color with swatch).
- `src/pages/forms/FormDetail.tsx` (new, ~210 lines) — header with
  status pill + copy-URL + actions (refresh, pause/activate, archive,
  edit). 4 stat cards (Submissions / New contacts / Duplicates /
  Target list). Recent submissions list with ✨/↻ icons distinguishing
  new vs duplicate.
- `src/pages/forms/index.tsx` (rewrite) — replaces placeholders;
  exports the 3 new real pages.
- `src/pages/public/HostedForm.tsx` (new, ~115 lines) — public
  `/f/:slug` page outside AppShell. Fetches config → renders
  FormRenderer with interactive=true. 4 states: loading, loaded,
  paused, notFound.
- `src/router/index.tsx` — replaced Forms.{List,Builder} mapping
  with Forms.{List,Editor,Detail}; +HostedForm lazy import; +3 new
  admin routes (/new, /:formId, /:formId/edit — admin gating on
  the editor routes); +1 public route (`/f/:slug`).
- 5 new SCSS modules (~720 lines total):
  - `src/styles/components/forms/FormRenderer.module.scss` — shared
    card styles with theming
  - `src/styles/components/forms/FormsList.module.scss` — list grid
    + card + menu
  - `src/styles/components/forms/FormEditor.module.scss` — split
    layout + config sections + slug input row + color swatch
  - `src/styles/components/forms/FormDetail.module.scss` — stats row
    + recent submissions list
  - `src/styles/components/public/HostedForm.module.scss` — centered
    full-viewport stage

### Decisions that came up during implementation (vs plan)

| Decision | What | Why |
|---|---|---|
| **Routes already partially wired** | Router had `Forms.List` + `Forms.Builder` pointing at placeholders; replaced with `Forms.List/Editor/Detail` mapping + 3 new admin routes + 1 public route | Earlier shell PRs scaffolded the routing. Cleanup involved renaming `Builder` → `Editor` to match component name and adding the missing `/new` + detail routes. |
| **FormRenderer as the single source of truth** | One component renders preview, public form, thank-you, paused state, and not-found state | Plan said "preview reuses FormRenderer"; ended up making it the ONLY form-rendering surface. Cleaner; less duplication. |
| **Honeypot field renamed** | Input HTML name is `website` (common decoy) but the form payload uses `honeypot` | Bots target common field names; the input's `name` attribute is what bots fill. The internal property name is for code clarity. |
| **Editor headers show "Edits go live immediately"** | Added copy below the editor heading | Without it, users might wonder if they need to "republish" — they don't. The public URL re-fetches config on each load. |
| **Toggle Pause button in detail header, not menu** | Pause/Activate is a primary action with its own button | Plan said "pause / activate / archive controls"; promoted Pause to a header button because it's the most-used non-archive action. |
| **Detail page uses Stat component pattern from CampaignReport** | 4-card hero stats row matching engagement tracking | Visual consistency. Users compare numbers in similar ways across reports. |
| **Submission row icons (✨ new / ↻ dup)** | Used emoji instead of icon components | Visual distinction in a dense list. Both communicate state without taking horizontal space. |
| **Archive cascade on Form → FormSubmission** | Plan said "Cascade"; kept as Cascade | Acceptable V1 (the form is gone, the data is archive-only). V2 polish: soft-delete forms entirely to preserve audit. |
| **Reserved words include all current public roots** | Added `u`, `e`, `f` to defend against future route collisions | If we add more public routes later (e.g. forms embed `/embed/`), we add to the list. |

### Build + lint gates

- Backend `tsc --noEmit`: **clean**
- Backend Prisma migration `20260607075050_forms_foundation`: applied cleanly
- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.90s). Main chunk +~0.9 KB gzipped
  (form-renderer styles + FormRenderer JSX). New `forms` chunk
  bundles into main.
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

### What's NOT verified yet

**Manual E2E test pending** — easy this time, no ngrok needed:

1. `/clients/:cid/lists/new` — create a target list ("Newsletter").
2. `/clients/:cid/forms/new` — create a form pointing at that list.
3. Visit the public URL (or click the "Open in new tab" icon).
4. Submit a real-looking email + first name + consent → see thank-you.
5. Back in `/clients/:cid/forms/:formId` — see "1 submission" stat.
6. Open `/clients/:cid/contacts` — confirm new contact landed.
7. Submit again with same email → see "Duplicates: 1" stat.
8. Pause the form → public URL renders "no longer accepting…"
9. Submit a suppressed email (add via
   `/clients/:cid/suppression` first) → see thank-you on public page,
   but NO submission recorded.
10. Submit 6 times in 1 minute → 6th rate-limited gracefully.

### Known V1 limitations (by design)

- **Hosted page only** — no embed script. Standalone URL works
  everywhere but requires linking out. V2 adds the `<script>`-based
  embed for inline mounting on the customer's website.
- **Built-in fields only** — email + optional first/last name. Custom
  fields (phone, birthday, anything else) is V2.
- **Single opt-in** — submitter is immediately added to the list. No
  email-confirmation step. V2 adds double opt-in (shares the
  unsubscribe-token infrastructure).
- **Honeypot bot protection only** — no CAPTCHA / Turnstile / hCaptcha.
  V2 if spam appears.
- **In-memory rate limit** — Map per server instance. Single-process
  deployment OK; multi-instance needs Redis (which arrives with the
  BullMQ + scheduled sends PR).
- **No bulk submission import** — agencies migrate via the existing
  contact CSV import.
- **No webhook on submission** — V2.
- **No A/B testing** — V3.

### Files at a glance

**Backend (1 modified / 4 new / 1 migration)**:
- Modified: `prisma/schema.prisma`, `src/server.ts`
- New: `src/lib/form-slug.ts`, `src/routes/public-forms.ts`,
  `src/routes/forms.ts`
- Migration: `20260607075050_forms_foundation`

**Frontend (3 modified / 11 new)**:
- Modified: `src/pages/forms/index.tsx`, `src/router/index.tsx`,
  `src/pages/public/HostedForm.tsx` (new) — replaces the placeholder
- New TS: 2 API clients, 1 hook, 4 pages (FormsList, FormEditor,
  FormDetail, HostedForm), 1 component (FormRenderer)
- New SCSS: 5 modules

---

## Original planning sections below (unchanged):

---

## Why this is next

After engagement tracking + send hardening, the product can mail real
recipients and measure results. But every contact has to be **imported
manually via CSV** today — there's no way for agencies to grow their
clients' lists organically.

Forms close that gap. With this PR:

- Agency builds a form in the dashboard ("Khukri Newsletter signup")
- Agency shares the URL: `https://app.sendmymail.io/f/khukri-newsletter`
- Anyone with that URL submits their email
- Contact auto-creates + lands in the designated list
- Future campaigns to that list reach them

For agencies whose clients have a website, this is critical.
For agencies whose clients only have social media, the hosted URL
becomes the "subscribe" link in their bio.

---

## Scope

### IN V1

**Hosted form pages** — single delivery mode:

- Public URL: `https://app/f/{slug}` (e.g. `/f/khukri-newsletter`)
- Full-page React route, no AppShell, no auth
- Renders a clean centered card with the form
- Fully self-contained — no embed script V1

**Form configuration:**

- Internal name (for the agency UI list)
- Public URL slug (must be unique per-agency, kebab-case, validated)
- Headline + sub-headline (the public copy)
- Submit button text (custom CTA)
- Thank-you message (shown after submission)
- Optional brand color (hex; defaults to agency primary)
- 1 required field: **email**
- 2 optional toggles: collect `first_name`, collect `last_name`
- Required: pick a Client + a List (submissions auto-add here)
- Optional consent checkbox (with custom consent text — for GDPR)

**Submission flow:**

- POST endpoint validates: format + honeypot + rate limit + suppression
- Dedup by `(agencyId, email)` — existing contact updated, NOT
  duplicated
- UPSERT `ListContact` (status: `subscribed`)
- INSERT `FormSubmission` audit row with IP + UA
- Respects agency suppression list silently (returns success, doesn't
  reveal suppression)
- Honeypot field for bot protection
- Per-IP rate limit (5 submissions / minute)

**Form management UI:**

- `/clients/:cid/forms` — list forms (admin)
- `/clients/:cid/forms/new` — create wizard
- `/clients/:cid/forms/:id/edit` — edit config
- `/clients/:cid/forms/:id` — detail page with submission count +
  recent submissions
- Copy-shareable public URL on detail page
- Pause / activate / archive controls

### OUT V1 (deferred follow-ups)

| Item | Why deferred | When |
|---|---|---|
| **Embeddable script** (`<script src="...">` for customer's website) | Adds CORS complexity, iframe theming, mobile-responsive constraints. Hosted URL covers 80% of use cases. | V2 |
| **Custom fields** (phone, birthday, custom text fields) | Schema needs field array model; UI needs field builder. Email + name covers most signups. | V2 |
| **Double opt-in** (send confirmation email → click → add) | Adds email verification flow. V1 = single opt-in. | V2 — share unsubscribe-token infrastructure |
| **Form A/B testing** | Two-variant CTAs, measure conversion. | V3 — needs analytics scaffolding |
| **Custom thank-you redirect URL** | Just show the inline thank-you message V1. | V2 trivial |
| **Field validation rules** (min length, regex, etc.) | Email is validated; name fields trust user input. | V2 |
| **CAPTCHA / hCaptcha / Turnstile** | Honeypot covers most bots V1; CAPTCHA adds vendor dependency. | V2 if spam becomes a problem |
| **Theme customization beyond brand color** | Background image, custom fonts, custom CSS. | V2 |
| **Conditional fields** ("show field B only if field A = X") | Sophisticated; agencies don't ask for this V1. | V3 |
| **Multi-step forms** ("Page 1 of 3") | One screen V1. | V3 |
| **Pop-up / overlay modes** | Embed-mode dependent. | V2 with embed |
| **Trigger a Flow on submission** | Depends on Flows feature (not yet built). | V2 with Flows |
| **Webhook on submission** | "POST to my CRM when someone signs up." | V2 — separate webhooks feature |
| **Submission CSV export** | Agencies can export the list itself. | V2 polish |
| **GDPR consent log per submission** | We record the boolean; full audit trail with timestamps + IP per consent is V2. | V2 compliance |

### Phasing options

If 2-3 days feels too big for one PR:

**Phase 1 (~1.5 days)**: Backend (schema + CRUD + public endpoint) +
basic frontend list/create/edit pages.

**Phase 2 (~1 day)**: Public hosted form page + submission detail UI
+ submission stats.

**Default: ship as ONE PR.** The pieces share so much (the Form model,
the field-config types, the form-to-list routing) that splitting
forces duplication.

---

## Data model

### New backend schema

```prisma
enum FormStatus {
  active   // Accepting submissions
  paused   // Form still renders but rejects submissions with "currently closed"
}

/* Signup form — see feature-forms V1.
   Public URL: APP_URL/f/{slug}
   slug is unique PER AGENCY (`khukri-newsletter` and `bose-newsletter`
   coexist; two agencies could both have `newsletter` slug, no collision
   because URLs are scoped via slug uniqueness within agency space).

   NOTE on slug scope: V1 we keep slugs globally unique to avoid
   needing agency-aware routing on the public endpoint. Slugs become
   like `khukri-newsletter` automatically (agency-name prefix
   suggested by the UI). V2 could move to subdomain routing
   (khukri.sendmymail.io/f/newsletter) if collision becomes a problem. */
model Form {
  id              String     @id @default(cuid())
  agencyId        String     @map("agency_id")
  clientId        String     @map("client_id")
  listId          String     @map("list_id")

  slug            String     @unique           // globally unique V1; URL-safe kebab-case
  name            String                       // internal admin name

  // Public-facing copy
  headline        String?
  subheadline     String?
  buttonText      String     @default("Subscribe") @map("button_text")
  thankYouMessage String     @default("Thanks! We'll be in touch.") @map("thank_you_message")

  // Field toggles (V1: 3 known fields. V2: dynamic field array.)
  collectFirstName Boolean   @default(false) @map("collect_first_name")
  collectLastName  Boolean   @default(false) @map("collect_last_name")

  // Theming
  brandColor      String?    @map("brand_color")  // hex; null → use agency primary

  // Compliance
  requireConsent  Boolean    @default(false) @map("require_consent")
  consentText     String?    @map("consent_text")    // shown next to checkbox

  status          FormStatus @default(active)

  // Denormalized for fast list rendering
  submissionCount Int        @default(0) @map("submission_count")

  archived        Boolean    @default(false)
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt        @map("updated_at")

  agency      Agency           @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  client      Client           @relation(fields: [clientId], references: [id], onDelete: Cascade)
  list        List             @relation(fields: [listId],   references: [id], onDelete: Restrict)
  submissions FormSubmission[]

  @@map("forms")
  @@index([agencyId, archived])
  @@index([clientId, archived])
}

/* Per-submission audit row. One per POST regardless of whether the
   contact already existed (dedup happens at the Contact level). */
model FormSubmission {
  id           String  @id @default(cuid())
  formId       String  @map("form_id")
  contactId    String? @map("contact_id")    // null if email validation failed pre-Contact creation

  email        String                         // canonical (lowercase)
  firstName    String? @map("first_name")
  lastName     String? @map("last_name")

  submittedIp  String? @map("submitted_ip")
  userAgent    String? @map("user_agent") @db.VarChar(500)
  consentGiven Boolean @default(false) @map("consent_given")

  /// True when this submission CREATED the Contact. False when
  /// dedup matched an existing one. Used by the "submission
  /// count" stats to distinguish new signups from duplicates.
  isNewContact Boolean @default(true) @map("is_new_contact")

  createdAt    DateTime @default(now()) @map("created_at")

  form    Form     @relation(fields: [formId],    references: [id], onDelete: Cascade)
  contact Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)

  @@map("form_submissions")
  @@index([formId, createdAt(sort: Desc)])
  @@index([formId, isNewContact])
}
```

**Reverse relations:**
- `Agency.forms       Form[]`
- `Client.forms       Form[]`
- `List.forms         Form[]`
- `Contact.submissions FormSubmission[]`

### Why these shapes

- **Form belongs to ONE List**. Multi-list V2 — most agencies have
  one form per list anyway ("newsletter", "VIP", "abandoned-cart").
- **`slug` globally unique V1**. Lets us serve `/f/{slug}` without
  needing to disambiguate by agency. UI suggests
  `{agency-name}-{form-name}` to avoid collisions.
- **`onDelete: Restrict` on list relation**. Can't delete a List that
  has live forms — would orphan submissions. Force users to archive
  the form first.
- **`isNewContact` boolean** lets us distinguish "5 new signups" from
  "5 form submissions (3 new + 2 dupes who re-submitted)."
- **`submissionCount` denormalized** so the form list page doesn't
  need to COUNT(*) on every render. Incremented atomically with each
  insert.

---

## Backend

### New / modified files

```
prisma/schema.prisma                                (+2 models, +1 enum, +4 reverse relations)
prisma/migrations/<ts>_forms_foundation/migration.sql
src/lib/form-slug.ts                                (new — slug generation + validation)
src/routes/forms.ts                                 (new — admin CRUD endpoints)
src/routes/public-forms.ts                          (new — public GET config + POST submit)
src/server.ts                                       (mount 2 new routers)
```

### Admin endpoints — `/v1/clients/:clientId/forms`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | requireAuth + clientScope | List forms for this client (paginated) |
| `GET` | `/:id` | requireAuth + clientScope | Single form + recent submissions |
| `POST` | `/` | requireRole('admin') + clientScope | Create new form |
| `PATCH` | `/:id` | requireRole('admin') + clientScope | Edit config |
| `DELETE` | `/:id` | requireRole('admin') + clientScope | Archive (soft) |
| `POST` | `/:id/duplicate` | requireRole('admin') + clientScope | Clone an existing form (V1.5 — drop if needed) |

### Public endpoints — `/f/:slug`

Mounted at root (NOT `/v1/`) for short brandable URLs — same convention
as `/u/:token` and `/e/o/:token`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/f/:slug/config` | none | Returns form display config for client-side rendering |
| `POST` | `/f/:slug/submit` | none, rate-limited, CORS | Process submission |

**Config response shape:**
```typescript
{
  slug:               string;
  name:               string;       // for browser tab title
  headline:           string | null;
  subheadline:        string | null;
  buttonText:         string;
  thankYouMessage:    string;
  collectFirstName:   boolean;
  collectLastName:    boolean;
  brandColor:         string | null;
  requireConsent:     boolean;
  consentText:        string | null;
  agencyName:         string;       // for "Powered by" footer
  status:             'active' | 'paused';
}
```

If form not found OR archived OR status='paused':
- 404 on the config endpoint (vs hiding the form entirely)
- The public page UX renders a "This form is no longer accepting
  submissions" state, not a hard 404, so URLs that get shared still
  show something graceful.

**Submission flow:**
```typescript
POST /f/:slug/submit
Body: {
  email:       string;                         // required
  first_name?: string;
  last_name?:  string;
  consent?:    boolean;
  honeypot?:   string;                         // hidden field, bots fill it
}

Pipeline:
1. Resolve form by slug. 404 if missing / archived / status=paused.
2. Check honeypot — if filled, RETURN 200 with thankYou (silent drop,
   bot doesn't know it failed).
3. Rate limit: 5 submissions per IP per minute (in-memory).
4. Validate email format.
5. Validate consent if requireConsent (return 400 if missing).
6. Check suppression: if email is in agency's Suppression list,
   RETURN 200 with thankYou (don't reveal suppression status).
7. Lookup Contact by (agencyId, lowercased email):
     - Found: existing — set isNewContact = false
     - Not found: CREATE Contact (clientId from form, first/last
       names if provided)
8. UPSERT ListContact: status='subscribed', subscribedAt=now.
   (If they were 'unsubscribed', this re-subscribes them — same
    behavior as if an admin re-imported them.)
9. INSERT FormSubmission (with IP, UA, consent state, isNewContact).
10. INCREMENT form.submissionCount in same transaction.
11. RETURN 200 { ok: true, thankYouMessage: form.thankYouMessage }

Failure modes (all return 200 with `ok: false`, never reveal
specifics to potential abusers):
- Form paused: { ok: false, message: 'This form is no longer
  accepting submissions.' }
- Invalid email: { ok: false, message: 'Please enter a valid email.' }
- Missing required consent: { ok: false, message: 'Please confirm.' }
- Rate limited: { ok: false, message: 'Too many submissions.
  Please try again in a moment.' }
```

### Slug rules — `src/lib/form-slug.ts`

```typescript
/* Slug rules:
   - 3-60 chars
   - lowercase letters, digits, hyphens only
   - cannot start or end with hyphen
   - cannot contain consecutive hyphens
   - cannot match reserved words (admin, api, app, www, mail, etc.)

   On create, if user-provided slug collides, append -2 / -3.
   UI also suggests `{agency-name-slug}-{form-name-slug}` as default. */

const RESERVED = new Set(['admin', 'api', 'app', 'www', 'mail',
  'support', 'help', 'static', 'assets', 'config', 'submit', 'u',
  'e', 'auth', 'login', 'signup']);

export function validateSlug(s: string): { ok: true } | { ok: false; error: string };
export function suggestSlug(agencyName: string, formName: string): string;
export async function generateUniqueSlug(base: string): Promise<string>;
```

### Rate limiting

In-memory map: `Map<ip, { count: number; resetAt: number }>`.

Cheap, single-process; for V1 production with multi-instance we'd move
to Redis, but local-process Map covers the entire V1 deployment shape
(single Express server). When we add BullMQ in a future PR, we'll
already have Redis available and can migrate then.

### Performance considerations

- Slug lookup hits a unique index → constant time.
- Contact UPSERT hits `(agencyId, emailLower)` unique index.
- Form submission INSERT is fire-and-forget from the user's perspective
  (we still wait for it, but it's <50ms on indexed inserts).
- Suppression check is one indexed lookup per submission.

At a sustained 100 submissions/second across all forms, backend stays
well within budget. (Realistic load: 10/day across all an agency's
forms.)

---

## Frontend

### New / modified files

```
src/lib/api/forms.ts                                (new — typed CRUD wrappers)
src/lib/api/publicForms.ts                          (new — public config + submit)
src/hooks/useForms.ts                               (new — list with cursor)
src/hooks/useForm.ts                                (new — single form + submissions)

src/pages/forms/FormsList.tsx                       (new — per-client form list)
src/pages/forms/FormEditor.tsx                      (new — create + edit, same component)
src/pages/forms/FormDetail.tsx                      (new — detail + submission stats)

src/pages/public/HostedForm.tsx                     (new — the actual /f/:slug page)

src/components/forms/FormCard.tsx                   (new — list page card)
src/components/forms/FormPreview.tsx                (new — side-by-side preview in editor)
src/components/forms/SubmissionRow.tsx              (new — detail page row)

src/styles/components/forms/*.module.scss           (5 SCSS modules)
src/styles/components/public/HostedForm.module.scss (1 SCSS module)

src/router/index.tsx                                (+4 routes: 3 admin + 1 public)
```

### Routes added

```typescript
// Admin (inside AppShell)
{ path: '/clients/:clientId/forms',              <FormsList />  }
{ path: '/clients/:clientId/forms/new',          <FormEditor /> }    // create mode
{ path: '/clients/:clientId/forms/:formId/edit', <FormEditor /> }    // edit mode
{ path: '/clients/:clientId/forms/:formId',      <FormDetail /> }

// Public (no AppShell, no auth)
{ path: '/f/:slug', <HostedForm /> }
```

### `/clients/:cid/forms` — list page

Match the existing card grid pattern (Campaigns / Templates):

```
┌──────────────────────────────────────────────────────────────┐
│  Forms                          [+ Create form]              │
│  Capture new contacts via embeddable forms.                  │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │ 📝 ACTIVE        │  │ 📝 ACTIVE        │  │ ⏸ PAUSED         │
│  │                  │  │                  │  │                  │
│  │ Newsletter signup│  │ VIP list signup  │  │ Beta wait-list   │
│  │ /f/khukri-news...│  │ /f/khukri-vip... │  │ /f/khukri-beta...│
│  │                  │  │                  │  │                  │
│  │ 247 submissions  │  │ 38 submissions   │  │ 12 submissions   │
│  │ Newsletter list  │  │ VIP list         │  │ Beta list        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘
└──────────────────────────────────────────────────────────────┘
```

Each card: status pill (active/paused), name, public URL (copyable),
submission count, target list name.

### `/clients/:cid/forms/new` — editor

Two-column layout:

```
┌────────────────────────┬────────────────────────┐
│ CONFIG (left)          │ PREVIEW (right)        │
│                        │                        │
│ Internal name          │  ╭──────────────────╮  │
│ [Newsletter signup__]  │  │                  │  │
│                        │  │   📨              │  │
│ Public URL slug        │  │   Subscribe to    │  │
│ /f/[khukri-newsletter] │  │   our newsletter  │  │
│                        │  │                   │  │
│ Add to list            │  │   [email____]     │  │
│ [Newsletter ▾]         │  │   ☑ Consent       │  │
│                        │  │   [Subscribe]     │  │
│ Headline               │  │                   │  │
│ [Subscribe to our..._] │  ╰──────────────────╯  │
│                        │                        │
│ Sub-headline           │  Preview updates as    │
│ [Get tips weekly_____] │  you type.             │
│                        │                        │
│ Button text            │                        │
│ [Subscribe___________] │                        │
│                        │                        │
│ Thank-you message      │                        │
│ [Thanks! We'll...____] │                        │
│                        │                        │
│ Collect first name? ☐  │                        │
│ Collect last name?  ☐  │                        │
│                        │                        │
│ Require consent? ☑     │                        │
│ Consent text           │                        │
│ [I agree to...______]  │                        │
│                        │                        │
│ Brand color (optional) │                        │
│ [#A0522D     ]         │                        │
│                        │                        │
│           [Cancel] [Save form]                  │
└────────────────────────┴────────────────────────┘
```

Preview uses the same components as `/f/:slug` so what you see is
what recipients see.

### `/clients/:cid/forms/:id` — detail page

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to forms                                                │
│                                                                │
│ Newsletter signup                       [Edit]  [Pause]  [···] │
│ /f/khukri-newsletter         📋 Copy URL  ↗ Open in new tab    │
│                                                                │
│ ┌────────────┬────────────┬────────────┬────────────┐         │
│ │   247      │   234      │    13      │   24h      │         │
│ │ submitted  │ new        │ duplicates │ avg signup │         │
│ │            │ contacts   │            │ /day        │         │
│ └────────────┴────────────┴────────────┴────────────┘         │
│                                                                │
│ Recent submissions                                             │
│ ✨ alice@example.com         ● new   2 hours ago              │
│ ↻  bob@khukri.com            ◐ dup   5 hours ago              │
│ ✨ carlos@example.org        ● new   1 day ago                │
│                                              [Load more]       │
└───────────────────────────────────────────────────────────────┘
```

### `/f/:slug` — public hosted form

Outside AppShell, no auth. Centered card, branded with the form's
brand color. Reuses the same component as the FormPreview in the
editor → guarantees consistency.

```
                ┌──────────────────────────┐
                │                          │
                │  📨  KHUKRI SPICES        │
                │                          │
                │  Subscribe to our        │
                │  newsletter              │
                │                          │
                │  Get weekly recipes,     │
                │  cooking tips, and       │
                │  special offers.         │
                │                          │
                │  [email address______]   │
                │  [first name_________]   │
                │                          │
                │  ☑ I agree to receive    │
                │     marketing emails.    │
                │                          │
                │       [Subscribe]        │
                │                          │
                │  Powered by SendMyMail   │
                └──────────────────────────┘
```

Honeypot field is `<input type="text" name="website" tabindex="-1"
style="display:none" autocomplete="off">` — bots fill it; humans never
see it.

On successful submission, swap to a thank-you screen:

```
                ┌──────────────────────────┐
                │                          │
                │       ✅                  │
                │                          │
                │   Thanks! We'll be in    │
                │       touch.             │
                │                          │
                │  Powered by SendMyMail   │
                └──────────────────────────┘
```

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Delivery mode** | Hosted page only V1 | Embed needs CORS + iframe + theme matching. Hosted URL is shareable everywhere (social bio, email signature, QR code) and covers most use cases. |
| **Field configuration** | Email required + 2 toggleable name fields V1 | Custom fields need a field-array schema + a field-builder UI. Two iterations of complexity; covers 95% of signup forms. |
| **Opt-in mode** | Single opt-in V1 | Simpler. Double opt-in shares unsubscribe-token infrastructure but needs an email step. V2 if GDPR markets require. |
| **Form-to-list** | Each form belongs to exactly 1 List | Simpler V1. Multi-list could be V2 but agencies usually create one form per list anyway. |
| **Slug scope** | Globally unique (e.g. `khukri-newsletter`) | Simplest public routing (`/f/:slug`). UI suggests agency-prefix to avoid collisions. V2 could move to subdomain routing if scale demands. |
| **Slug reserved words** | Block `admin`, `api`, `app`, `www`, `mail`, `auth`, `u`, `e`, etc. | Prevent users from claiming routes that conflict with infrastructure URLs. |
| **Public URL prefix** | `/f/{slug}` mounted at root | Same convention as `/u/{token}` and `/e/o/{token}`. Short + brandable. |
| **Bot protection** | Honeypot field V1, no CAPTCHA | Honeypot catches 95% of bots; CAPTCHA adds vendor dependency and friction. V2 if spam appears. |
| **Rate limiting** | 5 submissions per IP per minute, in-memory Map | Single-process deployment V1; Redis when we add BullMQ. |
| **Suppression handling** | If email is suppressed, silently return success (don't reveal suppression list) | Don't help spammers verify email validity. Same pattern as the unsubscribe endpoint's "always 200." |
| **Re-subscribing unsubscribed contacts** | Form submission flips ListContact.status back to 'subscribed' | If someone unsubscribes then voluntarily re-signs-up via the form, respect their explicit choice. Agency-wide Suppression still blocks them (legal escalation). |
| **Failure response** | Always 200 with `ok: false` + safe message — never 4xx | Email validation, paused form, rate limit, missing consent all return 200. Don't help abusers probe state. |
| **GET /f/:slug/config returns 404 when archived** | True | Frontend renders a graceful "form unavailable" state from the 404. |
| **Submission count** | Denormalized on Form (incremented atomically) | Avoids COUNT(*) on every list-page render. Counters drift is acceptable; reconcile job is future-V3 polish. |
| **isNewContact field** | True if submission CREATED a contact; False if dedup matched existing | Lets stats distinguish "5 new signups" from "5 form submissions (3 unique, 2 re-submits)." |
| **Consent state** | Stored per submission as boolean V1 | Full audit log per consent (with text snapshot at submission time, per GDPR) is V2. |
| **Brand color fallback** | If null, use agency's primary token | Avoids requiring color picker for first-time form creation. |
| **Editor preview** | Reuses the public hosted form component | Single source of truth. What you see is what recipients see. |
| **Reserved-words list** | Hardcoded V1 | If we add new public routes (V2 embed, future webhooks), we add to the list. |

---

## Edge cases

| Case | Behavior |
|---|---|
| Submitter is already a contact with no list membership | Contact updated (firstName/lastName from submission if missing); ListContact UPSERT inserts new row. isNewContact: false. |
| Submitter is already on the target list as 'subscribed' | UPSERT no-op (status unchanged). New FormSubmission row. isNewContact: false. |
| Submitter was 'unsubscribed' from the target list | Re-subscribed. Re-subscription is the user's explicit consent. |
| Submitter is in the agency Suppression list | Return success silently. NO Contact created, NO ListContact change, NO submission row. (Optionally: log a soft "would have added" audit event for V2 diagnostics.) |
| Form's target list is deleted | onDelete: Restrict on Form.listId → list can't be deleted while forms exist. Forces archive-first. |
| Slug collision on create | Validation fails BEFORE creation; UI shows "That URL is taken. Try {suggested}." Server auto-appends -2/-3 if user submits anyway via duplicate. |
| Slug matches reserved word | Validation fails with "That URL conflicts with a system route. Please choose another." |
| Form paused while a submitter is loading the page | GET /config returns paused state; the public page renders "This form is no longer accepting submissions." Submission attempts also rejected. |
| Honeypot filled by a bot | 200 OK with thank-you message — bot thinks success. No DB writes. |
| Rate limit hit | 200 OK with `ok: false, message: "Too many submissions. Try again in a moment."` |
| Submission missing email | 200 OK with `ok: false, message: "Please enter a valid email."` |
| Submission with email in invalid format | Same as above. |
| Submission missing required consent | 200 OK with `ok: false, message: "Please confirm to subscribe."` |
| Form deleted while submissions exist | onDelete: Cascade on FormSubmission.formId → submissions go too. Acceptable; the form is gone, the data is archive-only. (Future: soft-delete to preserve audit history.) |
| Concurrent submissions to same form | All UPSERTs are atomic; race-free in Postgres. Two simultaneous signups for the same email collapse into one ListContact UPSERT. |
| Frontend preview shows brand color that's white/light | The submit button text becomes white-on-white. V1 leaves this — V2 picks contrast text color from brand color luminosity. |
| User edits a form's listId mid-flight | Future submissions go to new list. Past submissions stay on the old list. (Submissions don't "migrate.") |
| User archives a form | Public URL returns 404 config → page renders "Form unavailable." Submission count + history preserved on the archived row. |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Admin creates a form via /clients/:cid/forms/new | Form created with status: active, slug unique, default copy applied where missing |
| Admin visits /clients/:cid/forms | List shows all forms with status pill + URL + submission count + target list name |
| Visit public /f/{slug} | Form renders with brand color, fields per config, optional consent checkbox |
| Submit a valid email | Contact created (or matched), added to target list, redirected to thank-you message |
| Submit twice with same email | Second submission shown as "dup" in detail page (isNewContact: false) |
| Submit an unsubscribed contact's email | Re-subscribed to the list (UPSERT) |
| Submit a suppressed contact's email | Thank-you message shown; no DB changes |
| Submit invalid email | Form shows error; no submission recorded |
| Submit with honeypot filled | Thank-you shown; no submission recorded (silent drop) |
| Submit 6 times in 1 minute from same IP | 6th submission rate-limited with friendly error message |
| Edit form headline | /f/{slug} immediately reflects new headline on refresh |
| Pause form | /f/{slug} renders "no longer accepting submissions" message; existing config preserved |
| Archive form | /f/{slug} returns 404-like graceful state; doesn't break submissions stats history |
| Detail page submission stats | Correctly distinguishes new vs duplicate submissions |
| Member-scoped user views forms list | Sees only their accessible clients' forms |
| Non-admin tries to create form | 403 — only admins can create/edit |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Backend `tsc --noEmit` | clean |
| Backend Prisma migration `forms_foundation` | applies cleanly |
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Main chunk ~+8 KB gzipped; new `forms` chunk ~25 KB |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual E2E #1 | Create form, copy URL, submit from incognito → see new contact in list |
| Manual E2E #2 | Submit duplicate email → see "dup" in detail page stats |
| Manual E2E #3 | Submit suppressed email → no DB change, thank-you shown |
| Manual E2E #4 | Rate-limit kicks in at 6th submission |

---

## Implementation order (when authorized)

**Step 1 — Backend foundation (~3h)**
1. Schema: Form + FormSubmission + FormStatus + reverse relations
2. Prisma migration generate + apply
3. `src/lib/form-slug.ts` — validation + reserved words + auto-generate
4. tsc clean check

**Step 2 — Public endpoints (~3h)**
5. `src/routes/public-forms.ts`:
   - `GET /f/:slug/config` — return form config (404 archived/paused)
   - `POST /f/:slug/submit` — full submission pipeline
6. In-memory rate limiter
7. Honeypot check
8. Suppression check
9. Mount at `/f`

**Step 3 — Admin endpoints (~2h)**
10. `src/routes/forms.ts`:
    - GET / + GET /:id + POST / + PATCH /:id + DELETE /:id
11. Zod validation schemas
12. Audit logging
13. Mount at `/v1/clients/:clientId/forms`

**Step 4 — Frontend admin pages (~4h)**
14. API client + 2 hooks
15. FormsList page
16. FormEditor (create + edit modes share component)
17. FormDetail page with submission stats
18. FormCard component
19. SubmissionRow component

**Step 5 — Public hosted form (~2h)**
20. HostedForm.tsx page
21. Reuses the FormPreview component from editor
22. Inline submit + thank-you flip
23. Brand color + responsive layout

**Step 6 — Styles (~2h)**
24. 5 admin SCSS modules
25. 1 public form SCSS module

**Step 7 — Wiring + verification (~1h)**
26. Router updates (4 new routes)
27. Navigation link from client detail page
28. Build + lint
29. Manual E2E
30. Update change_log Done entry

---

## What this unlocks

- **Organic list growth** — agencies' clients can grow lists without
  manual CSV import
- **Shareable URLs** — `/f/khukri-newsletter` lives in social bios,
  QR codes, email signatures, ad campaigns
- **Foundation for Flows** — Form submission becomes a Flow trigger
  (when Flows ships)
- **Beta-customer readiness** — most prospective customers will ask
  "how do people sign up?" — now we have an answer
- **Lead-magnet workflows** — landing page for "subscribe to get the
  free guide" use case

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| V2-a | **Embeddable script** (`<script src=".../forms/abc.js">`) for customer's website | 2-3 days |
| V2-b | **Double opt-in** — confirmation email + verify endpoint | 1 day |
| V2-c | **Custom fields** — phone, birthday, custom text fields, validation rules | 2-3 days |
| V2-d | **CAPTCHA / Turnstile** — when spam becomes a problem | 4-6h |
| V2-e | **Custom thank-you redirect URL** | 2h |
| V2-f | **Form A/B test** — two variants, conversion measurement | 1 day |
| V2-g | **Trigger Flow on submission** — depends on Flows | 4h after Flows ships |
| V2-h | **Webhook on submission** — POST to user's URL | 4h |
| V2-i | **Submission CSV export** | 2h |
| V2-j | **Full GDPR consent log** with timestamps + IP per submission | 1 day |
| V2-k | **Theme customization** — background image, fonts, custom CSS | 1 day |
| V2-l | **Pop-up / overlay modes** (embed-dependent) | 2 days with embed |
| V2-m | **Conditional fields** ("show field B only if field A = X") | 2 days |
| V2-n | **Multi-step forms** ("Page 1 of 3") | 2 days |

---

*Plan locked. Ready to implement when authorized.*
