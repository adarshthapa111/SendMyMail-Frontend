# Feature: Templates — change log

> The reusable email designs the campaign builder will send. The MJML
> drag-and-drop editor already exists (`src/components/EditorShell.tsx` +
> `src/store/slices/editorSlice.ts`); what's missing is the persistence
> layer — backend `Template` table + CRUD endpoints, the `/clients/:cid/templates`
> list page, and wiring Save/Load into the existing editor.
>
> References:
> - [doc/implementation_doc/feature-email-builder.md](../../doc/implementation_doc/feature-email-builder.md)
>   — V1 scope, data model, render-at-send-time decision
> - [doc/mockups/templates.html](../../doc/mockups/templates.html) — the card-grid list page
> - [src/components/EditorShell.tsx](../../src/components/EditorShell.tsx) — the existing editor
> - [src/store/slices/editorSlice.ts](../../src/store/slices/editorSlice.ts) — tree state shape
> - [src/tree/types.ts](../../src/tree/types.ts) — `IMjmlNode` shape
> - [src/api/renderTemplate.ts](../../src/api/renderTemplate.ts) — already-shipped `/getHtml` / `/getMjml` server render
> - Existing routes: `/clients/:cid/templates` (list, placeholder) +
>   `/clients/:cid/templates/:templateId/edit` (builder, currently always opens with an empty tree)

---

## Why this is next

Templates is the lowest-effort, highest-leverage unblock. Three reasons:

1. **The editor is already built.** The hardest part of "templates" — the MJML
   drag-drop editor with tree + canvas + inspector + history — exists. PR 1
   is mostly plumbing (schema + 5 endpoints + 1 list page + wiring save/load
   into the editor's existing Redux slice).
2. **It unblocks campaigns.** A campaign sends *a template* to *a list*. Until
   templates can persist, the campaign engine has nothing to point at.
3. **Visible product progress.** Users currently can't see the editor at all
   from the new app (the route works but lands on an empty tree every
   time, nothing saves). Shipping persistence makes the editor real.

---

## Honest scope of what we can show today

Mapping the [templates.html](../../doc/mockups/templates.html) mockup to
what's actually buildable in V1:

| Mockup element | Data needed | V1 strategy |
|---|---|---|
| Template card grid | Template rows for this client | ✅ Real (PR 1) |
| Thumbnail | Rendered HTML screenshot of the design | ❌ V1 uses a category icon (`IconConfetti`, `IconGift`, `IconNews`, etc.) — real bitmap thumbnails defer to V1.5 |
| "Welcome to Khukri" + "Welcome · 2 days ago" | name + category + updatedAt | ✅ Real |
| "Starter" badge | `isStarter: true` flag on agency-level templates | ⚠ Schema field exists from PR 1; starter library populated in PR 2 |
| `Client / Agency / Starter library` filter tabs | Per-template ownership | PR 1 ships only the "All / Client" axis. Agency-level + Starter library land in PR 2. |
| "+ New template" button | POST endpoint | ✅ Real (PR 1) — opens a small "name + category" modal, then navigates to the builder |
| Click card → builder | GET single + load tree into editor | ✅ Real (PR 1) |
| Inside the builder: Save / Auto-save | PATCH endpoint | ✅ Real (PR 1) |
| Send-test button inside the builder | Postmark integration | ❌ Deferred to PR 3 |
| Merge tags work in preview | Resolver against contact fields | ❌ Deferred to PR 3 |
| Brand-colour swap when an agency template is opened for a client | Brand-color injection at load | ❌ Deferred to PR 2 |

**V1 ship goal**: agency creates a client → opens `/clients/:cid/templates` →
sees their (empty or populated) grid → clicks "New template" → names it
"Welcome email" → builder opens with a fresh tree → designs it → click Save
→ row updates → returns to the grid → can click the card again later and
see their work intact.

**Out of scope for the whole feature (per impl-doc §V1)**: third-party
embedded editors (Unlayer), 200+ template library, AI content, marketplace,
AMP for Email. None of those land V1 anyway.

---

## Scope — split into 4 PRs

PR 1 used to be "Foundation" — but the existing MJML editor is on the
old gray-and-white system, not the warm editorial theme that the rest of
the app uses. Migrating the editor to the warm theme is a **bounded
visual-only change** that should land cleanly *before* persistence work,
so the foundation PR doesn't entangle theming with logic.

### PR 1 — Editor theme migration *(this PR — the focus)*

Pure SCSS / token migration. No logic changes, no schema, no API. Turns
the editor surface (Toolbar, Palette, Inspector, Canvas chrome, Email
Settings Bar, Preview Modal, canvas drag/drop visuals) from the legacy
Google-blue + neutral-gray palette into the warm editorial palette
(terra `--color-primary` accents, cream `--color-bg`, ink-on-cream text).

| Layer | What |
|---|---|
| Stylesheets | Replace **~99 hardcoded values across 7 stylesheets** with `var(--color-*)` token references + token-aware shadows + radii. |
| Components | No JSX changes expected unless a className landed on the wrong element; almost certainly zero. |
| Canvas overlays | Drag chip, drop zones, selection toolbar, floating text toolbar — currently use blue tints — re-token to terra. |
| Modal backdrop | `PreviewModal` overlay — match the rest of the app's modal convention. |
| Acceptance | Side-by-side comparison: every element that used to be Google-blue now reads as terra; canvas BG matches the cream `--color-bg`; no hardcoded `#xxxxxx` left in any editor stylesheet (grep is the gate). |

**Acceptance** ([full list below](#acceptance-criteria-pr-1-theme-migration)):
open the existing `/edit` route, navigate around, drag a block onto the
canvas — every chrome surface reads as warm theme. Editor functionality
is unchanged; logic is untouched.

### PR 2 — Foundation (persistence) *(formerly PR 1)*

The "make the editor real" PR. Schema + CRUD + list page + builder
integration. A single client can now design and save templates.

| Layer | What |
|---|---|
| Schema | New `Template` model + migration. One table. |
| Backend | 6 endpoints under `/v1/clients/:clientId/templates` — list, get-by-id, create, update, archive, duplicate. |
| Frontend API | `src/lib/api/templates.ts` — typed wrappers. |
| Frontend slice | `src/store/slices/templatesSlice.ts` — per-client cache (matches contactsSlice / listsSlice pattern). |
| Frontend hook | `src/hooks/useTemplates.ts` — list + CRUD. |
| Frontend page | Real `TemplatesList` (replaces Placeholder) — card grid + filter tabs + "+ New template" modal + per-card kebab (rename / duplicate / archive). |
| Frontend components | `TemplateCard`, `TemplateFormDialog` (create + rename), `TemplatesEmptyState`. |
| Builder integration | `Builder.tsx` reads `:templateId` from URL → fetches the template → dispatches a new `loadTemplate(tree)` editor-slice action → user edits → "Save" Toolbar button POSTs the stripped tree back via PATCH. Dirty-state guard warns on navigation away. Subject + preheader are NOT persisted (see Decisions below — they're campaign-level, not template-level). |

Lands on top of PR 1's themed editor, so the entire user flow
(`/templates` grid → "+ New template" modal → `/edit` builder) reads as
one consistent warm-theme experience.

### PR 3 — Starters + agency-level + brand-colour swap *(formerly PR 2)*

| Layer | What |
|---|---|
| Backend | Seed script for 8 starter templates (Welcome / Newsletter / Promo / Order confirmation / Abandoned cart / Birthday / Re-engagement / Festive). All `clientId: null, isStarter: true`. GET endpoint returns these alongside the client's own templates, with the `Starter library` filter exposing them separately. |
| Backend | Brand-colour token in starter templates — `{{brand_color}}` placeholder swapped at load-time (server-side or in the GET response transformer) using the active client's `avatarColor`. |
| Frontend | `Agency` + `Starter library` filter tabs become functional. Starter templates render with a `Starter` purple badge per the mockup. Cloning a starter into a client-level template (one-click). |
| Quality | Each of the 8 starters tested in Gmail / Outlook 2016+ / Apple Mail per the impl-doc acceptance criteria. Festive includes Devanagari (verifies font + encoding). |

### PR 4 — Test-send + merge tags *(formerly PR 3)*

| Layer | What |
|---|---|
| Backend | `POST /v1/clients/:cid/templates/:id/test-send` — renders template → resolves merge tags against a fake contact (or the caller's profile) → sends via **Postmark** (NOT customer SES, to protect their reputation). |
| Backend | Merge-tag resolver — `{{first_name\|fallback}}`, `{{email}}`, `{{custom.field_name}}` with safe fallbacks (never "Hi ,"). |
| Frontend | Test-send button in the builder Toolbar + recipient-email modal. Token sidebar showing available merge tags + insert-on-click. |

---

## Detailed plan — PR 1 (Editor theme migration)

This is the one we implement first. PR 2 / PR 3 / PR 4 each get their
own Planning entry when we start them.

### Goal

Move every editor surface off the legacy gray-and-white + Google-blue
palette and onto the warm editorial tokens that the rest of the app
already uses. After PR 1, navigating from `/clients/:cid/templates`
(warm) into `/templates/:id/edit` (currently cold) reads as one
continuous design language.

### Audit — what the editor uses today

Grep across the 7 editor stylesheets shows **~99 hardcoded color
occurrences**, distilled to **~25 unique values**. Top offenders by
count:

| Hardcoded | Count | Role in editor | Target token |
|---|---|---|---|
| `#ffffff` | 17 | Toolbar bg, Inspector bg, Palette card bg | `var(--color-card)` |
| `#e4e6eb` | 15 | All borders, dividers between sections | `var(--color-line)` |
| `#1a73e8` | 14 | **The editor's blue accent** — selected state outline, primary CTA, focused inputs, drop-zone hover | `var(--color-primary)` (terra) |
| `#1a1a1a` | 12 | Body text, headings | `var(--color-ink)` |
| `#65676b` | 8 | Secondary text, label captions | `var(--color-muted)` |
| `#f0f2f5` | 7 | Button hover, subtle bg fills | `var(--color-surface)` |
| `#d2d4d8` | 5 | Stronger borders (input outlines, hover borders) | `var(--color-line-strong)` |
| `#f7f8fa` | 3 | Editor shell bg, palette bg | `var(--color-bg)` (cream) |
| `#d11a2a` | 3 | Destructive (delete-block confirm) | `var(--color-red)` |
| `#8a8d91` | 3 | Disabled text | `var(--color-soft)` |
| `#1765c0` | 2 | Primary CTA hover | `var(--color-primary-dark)` |
| `#f0f6ff` | 1 | Selected-block fill tint | `var(--color-primary-light)` |
| `#ffe5e7` + `#f5c2c7` | 3 | Destructive-confirm bg | `var(--color-red-bg)` |
| `rgba(26,115,232, .15/.20/.30/.40)` | 6 | Blue-tinted ring/glow on focus, drop zones | `color-mix(in srgb, var(--color-primary) {15/20/30/40}%, transparent)` |
| `rgba(0,0,0, .06/.08/.18/.25/.35)` | 5 | Shadows on lifted surfaces | `var(--shadow-sm)` / `var(--shadow-md)` / `var(--shadow-lg)` (or `color-mix` against `--color-ink`) |
| `rgba(15,18,25,.55)` | 1 | `PreviewModal` backdrop | Match other app modals — likely `rgba(43,38,32,0.55)` or token via `color-mix` |
| `rgba(255,255,255,.05)` | 1 | A hover tint somewhere (likely a dark-bg button) — re-check on theme | Re-token in context |

The blue → terra mapping is the most consequential decision (see
[Decisions](#decisions-pr-1) below).

### Files touched

7 stylesheets confirmed via grep + the canvas helpers under `src/canvas/`
that have their own styles. Audit revealed these are all CSS modules
referenced by editor components — no other surfaces affected.

```
src/styles/components/
├─ EditorShell.module.css           ( 2 hardcoded values)
├─ Toolbar.module.css               (19 hardcoded values)
├─ Palette.module.css               (20 hardcoded values)
├─ Inspector.module.css             (14 hardcoded values)
├─ Canvas.module.css                ( 0 hardcoded — already clean, just layout)
├─ EmailSettingsBar.module.css      ( 8 hardcoded values)
└─ PreviewModal.module.css          (36 hardcoded values — the biggest single file; modal + backdrop + form controls)

src/canvas/
├─ DropZone.tsx (+ its scoped styles, likely inline or in module.css → audit)
├─ DragChip.tsx
├─ ContentEditable.tsx
├─ FloatingTextToolbar.tsx
└─ SelectionToolbar.tsx
```

For each `src/canvas/*` file we'll grep for hardcoded values + inline
style props — anything blue / gray gets re-tokened the same way.

### Phases (sequential to keep the editor visually coherent at every commit)

1. **Audit pass** — re-run the grep with the actual `--color-*` token
   prefix (the tokens in `src/index.css` use `--color-` not bare `--`).
   Confirm every offender; cross-check `src/canvas/` for inline styles.
   No code changes yet.

2. **EditorShell + Toolbar** (the chrome) — these are what the user
   sees first. Land them first so even half-done the rest of the
   editor reads as "in progress on this theme" not "broken."
   - `EditorShell.module.css`: shell bg → `--color-bg`, body color
     → `--color-ink`.
   - `Toolbar.module.css`: bg → `--color-card`, border → `--color-line`,
     icon buttons hover → `--color-surface`, separators → `--color-line`,
     active state → `--color-primary-light` with `--color-primary` text.

3. **EmailSettingsBar** — the small bar under the toolbar with
   subject/from/preheader inputs. 8 values, ~5min.

4. **Palette** — the left sidebar with draggable block tiles. 20
   values. Each block tile: bg `--color-card`, border `--color-line`,
   hover-bg `--color-primary-light`, hover-border `--color-primary`,
   icon color `--color-primary-ink`. Group headings → `--color-soft`
   uppercase letter-spaced.

5. **Inspector** — the right sidebar with the attribute form. 14
   values. Form-control styling — labels `--color-muted`, inputs
   `--color-card` bg / `--color-line` border / `--color-primary`
   focus-ring + 15% color-mix glow.

6. **Canvas** + canvas overlays — `Canvas.module.css` is already clean
   (0 hardcoded); the work is in `src/canvas/*` components:
   - `DropZone` — outline + fill on hover use blue tints today. Map to
     `--color-primary` outline + `color-mix(in srgb, --color-primary
     20%, transparent)` fill.
   - `DragChip` — the floating tile that follows the cursor while
     dragging. Card-like; just re-token bg + shadow + text.
   - `SelectionToolbar` — the floating action bar (duplicate / delete /
     move) that appears over the selected node. Currently dark-grey
     pill; consider `--color-ink` bg + `#fff` text, or `--color-card`
     bg + `--color-ink` text with a strong shadow. Pick whichever reads
     cleaner against the cream canvas.
   - `FloatingTextToolbar` — the floating bold/italic/link bar.
     Same call as SelectionToolbar.
   - `ContentEditable` — focus outline + selection tint → terra.

7. **PreviewModal** — biggest single file (36 hardcoded values).
   Backdrop, modal frame, segmented "Desktop / Mobile" toggle,
   the iframe container, the close button. The backdrop should
   match the app's other modals — `rgba(43,38,32,0.55)` or
   `color-mix(in srgb, var(--color-ink) 55%, transparent)`.

8. **Verify** — grep for `#[0-9a-fA-F]\{3,8\}` across all editor
   stylesheets; should return zero hits. Manual walkthrough below.

### Token mapping decisions {#decisions-pr-1}

- **`#1a73e8` (the blue) → `var(--color-primary)` (terra) everywhere.**
  The editor's blue served as the universal action/selection/focus
  color — that's the same job terra does in our warm theme. Using
  indigo (the secondary) would split the visual language across
  surfaces and confuse "what's the primary action color in this app?"

- **`color-mix` for all blue-tinted rgba's.** Six occurrences of
  `rgba(26,115,232, X)` at different opacities. Two ways to handle:
  - **(A)** Add opacity-baked tokens to `src/index.css` (e.g.
    `--color-primary-15`, `-30`, `-40`). Pro: cheap, no browser-support
    consideration. Con: tokens proliferate.
  - **(B)** Use `color-mix(in srgb, var(--color-primary) 30%, transparent)`
    inline. Pro: one CSS approach, no new tokens. Con: needs Chrome 111+
    / Safari 16.2+ / Firefox 113+ — fine for our target browsers,
    every dev machine is current.
  → **Going with (B)**. Cleaner, no token sprawl.

- **`color-mix` for shadow tints too.** Same reasoning — instead of
  `rgba(0,0,0,0.06)` use `color-mix(in srgb, var(--color-ink) 6%,
  transparent)` so shadows pick up the warm ink tone instead of pure
  black. Subtle but noticeable.

- **`SelectionToolbar` + `FloatingTextToolbar` chrome**: today they're
  dark-grey rounded pills. Two valid options on the warm theme:
  - **(α)** Keep "dark on cream" feel: `--color-ink` bg + `#fff` icons.
    Reads as authoritative; high contrast with the canvas.
  - **(β)** Light: `--color-card` bg + `--color-ink` icons + strong
    shadow. Reads as floating UI; matches other floating menus in the
    app (ClientSwitcher dropdown).
  → **Going with (α)**. The selection toolbar needs to draw the eye
  immediately; dark-on-cream stands out more than light-on-cream.
  Same call for FloatingTextToolbar (matches its sibling).

- **Modal backdrop** for `PreviewModal`: match `ContactFormDialog` /
  `ClientFormDialog` — those use `color-mix(in srgb, var(--color-ink)
  55%, transparent)` per the rest of the app. Use the same here for
  consistency.

- **`Canvas.module.css` stays as-is** beyond a maybe-tweaked bg.
  Already 0 hardcoded values; pure layout. The canvas inner bg
  (where the rendered email sits) should remain white (`--color-card`)
  because that's the "paper" the email lives on, contrasting with
  the cream editor surround.

- **Don't touch component JSX.** This PR is stylesheet-only.
  If we discover a className landed on the wrong element during
  the audit, fix it — but no new components, no Redux changes,
  no logic.

- **No new tokens added.** The audit confirms every editor value
  maps to an existing `--color-*` token or to a `color-mix` of one.
  If we discover a genuine gap (very unlikely), add it to
  [doc/theme/theme.md](../../doc/theme/theme.md) in the same change
  per CLAUDE.md's rule.

### Audit checklist after PR 1 {#acceptance-criteria-pr-1-theme-migration}

Visual walkthrough (any modern desktop browser, dev mode):

- [ ] **Toolbar**: surface reads as warm card (off-white, not blue-tinged
  Google white). Icon buttons hover to `--color-surface`. Active /
  selected state uses terra (`--color-primary-light` fill with
  `--color-primary` text).
- [ ] **EmailSettingsBar**: input borders are warm `--color-line`;
  focused input ring is terra at 20% mix; subject/preheader labels
  read as `--color-muted`.
- [ ] **Palette**: block tiles bg is `--color-card`; hover state lights
  up with `--color-primary-light` bg + terra border + terra icon.
  Group headers (`LAYOUT`, `CONTENT`, `STRUCTURE`, etc.) are
  `--color-soft` uppercase with letter-spacing.
- [ ] **Canvas surround**: the area around the email body is cream
  (`--color-bg`); the email body itself stays white (`--color-card`).
- [ ] **Drop zones**: dragging a block from the palette → drop zones
  light up with terra outline + 20%-mix terra fill — not blue.
- [ ] **Selection**: clicking a block on the canvas shows the
  SelectionToolbar (the floating duplicate/delete/move bar) — it's a
  dark `--color-ink` pill with white icons.
- [ ] **Text editing**: double-clicking text shows the FloatingTextToolbar
  — same dark-pill treatment. Inline text selection is terra-tinted.
- [ ] **Inspector**: right sidebar form controls have `--color-line`
  borders; focus state shows terra ring; section headings are
  `--color-ink`; help text is `--color-soft`.
- [ ] **PreviewModal**: backdrop matches the rest of the app's
  modal overlay tone; segmented Desktop/Mobile toggle uses the warm
  segmented-button style (terra active state); close button is
  warm-themed.
- [ ] **Destructive states**: "Delete block" confirm uses
  `--color-red` text on `--color-red-bg` bg — not the old `#d11a2a` /
  `#ffe5e7`.
- [ ] **Disabled controls**: text uses `--color-soft`, not
  `#8a8d91`.

Code gates (the hard checks):

- [ ] `grep -rE "#[0-9a-fA-F]{3,8}" src/styles/components/{EditorShell,Toolbar,Palette,Inspector,EmailSettingsBar,PreviewModal,Canvas}.module.css` returns **zero matches**.
- [ ] Same grep across `src/canvas/**/*.tsx` returns zero (no inline `style={{ color: '#xxx' }}`).
- [ ] `grep -rE "rgba\(26, *115, *232" src/` returns zero (all blue
  rgba's gone).
- [ ] `grep -rE "rgba\(0, *0, *0, *0\." src/` returns zero or only
  references in non-editor files (shadows on the warm theme should
  use `--color-ink` mixes, not pure black).
- [ ] `npm run build` clean.
- [ ] `npm run lint` adds 0 new issues.
- [ ] Existing editor functionality unchanged: insert block, drag-move,
  duplicate, delete, undo/redo, inline-edit text, attribute changes
  via inspector, preview modal opens + renders, history bounded to 50.
  All identical behavior, just re-themed.

### Risks / open questions — PR 1

- **`color-mix` browser support**: Chrome 111 (Mar 2023), Safari 16.2
  (Dec 2022), Firefox 113 (May 2023). All within our target window;
  every dev machine + every real user we care about is current. If we
  ever need older support, opacity-baked tokens (option A above) are
  the fallback.
- **Sticky cached editor bundle in dev**: changing tokens can show
  stale styles until a hard reload. Document in the PR description.
- **Scope creep into editor JSX**: tempting to "fix this one weird
  layout thing" while we're in there. We don't. PR 1 is
  stylesheet-only; non-style fixes go to a follow-up.
- **Color contrast on the warm theme**: terra on cream needs WCAG AA
  verification for any small text. The audit pass will check; the
  warm theme docs already verify this for the rest of the app.
- **`SelectionToolbar` legibility**: dark-on-cream is the call but it
  contrasts hard. If the reviewer thinks it's too loud, switch to
  light treatment per option (β) above.

### What this unlocks

- **PR 2 (Foundation)** lands on a themed editor — the whole
  `/templates` → builder flow reads as one design language from day 1.
- **All future editor work** (PR 3 starters, PR 4 test-send + merge tag
  sidebar, the campaign builder integration) inherits the warm theme
  for free. No "we'll re-theme later" debt.
- **The theme.md doc gains a tested editor section** — if we find any
  gaps the editor surfaces (e.g. "we needed a slightly darker terra for
  the active toolbar state"), they get added to the canonical theme
  doc.

---

## Detailed plan — PR 2 (Foundation)

Lands after PR 1. PR 3 + PR 4 each get their own Planning entry when
we start them.

### Schema additions

One new model + one migration (`20260603_templates_foundation`):

```prisma
model Template {
  id           String   @id @default(cuid())
  agencyId     String   @map("agency_id")
  clientId     String?  @map("client_id")           // null = agency-level reusable (PR 3 territory; nullable now to avoid a future migration)
  name         String                                // ≤120 chars — internal label, NOT the email subject
  mjmlSource   Json     @map("mjml_source")          // serialized IMjmlNode tree, post-strip (no _id, no _meta, no mj-preview)
  thumbnailUrl String?  @map("thumbnail_url")        // null in V1; reserved for V1.5 real thumbnails
  category     String?                                // free-text V1 ('welcome', 'promo', 'newsletter', etc.) — enum in V2
  isStarter    Boolean  @default(false) @map("is_starter")  // seeded library; client-created templates never set this
  archived     Boolean  @default(false)              // soft-delete, like clients
  createdBy    String?  @map("created_by")           // null when the creating user gets deleted (SetNull)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  agency  Agency  @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  client  Client? @relation(fields: [clientId], references: [id], onDelete: Cascade)
  creator User?   @relation(fields: [createdBy], references: [id], onDelete: SetNull)

  @@map("templates")
  @@index([agencyId])
  @@index([clientId, archived, updatedAt(sort: Desc)])  // hot path: GET /clients/:cid/templates ordered by recency
  @@index([agencyId, isStarter])                         // PR 3's starter lookup
}
```

**No `subject` column.** Subject (and preheader) are envelope metadata
set per-send. They belong to `Campaign` (Feature 06), not `Template`.
See [Decisions](#decisions) below.

Updates to existing models — `Agency` / `Client` / `User` gain
`templates: Template[]` reverse relations.

**Why JSON not TEXT for `mjmlSource`?** The editor manipulates an
`IMjmlNode` tree (`{ tagName, attributes, content, children }`), not raw
MJML markup. Storing JSON lets us load directly into the editor without a
parse step. The server's `/getHtml` already accepts this tree shape and
compiles MJML+HTML from it. Storing raw MJML would force an extra
parse/serialize cycle on every load and ties us to a specific MJML library.

### Backend endpoints

All under `/v1/clients/:clientId/templates`. Auth: `requireAuth() + requireClientScope`.
Mutations gated by `requireRole('admin')`.

| Method | Path | Role | Notes |
|---|---|---|---|
| `GET` | `/` | any | List non-archived templates for this client + agency-level starters/reusables (clientId IS NULL). Sorted by `updatedAt DESC`. Response shape strips the heavy `mjmlSource` field for list view — only single GET returns it. |
| `GET` | `/:id` | any | Full template including `mjmlSource`. 404 on out-of-scope (never leak). |
| `POST` | `/` | admin | Create. Body: `{ name, category?, mjmlSource? }`. If `mjmlSource` is omitted, server returns a fresh `newTemplate()` tree (mirrors what the FE editor uses). |
| `PATCH` | `/:id` | admin | Update. Body: any subset of `{ name, category, mjmlSource, archived }`. Strips editor-only fields (`_id`, `_meta`) AND any `mj-preview` nodes before persisting (preheader is campaign-level, not template-level). |
| `DELETE` | `/:id` | admin | Soft-archive (sets `archived: true`). |
| `POST` | `/:id/duplicate` | admin | Deep-clones the template under the same client with " (copy)" suffix; the clone is never `isStarter`. |

### Response shapes

```ts
// GET /v1/clients/:cid/templates — list view (no mjmlSource for payload weight)
{ data: { items: TemplateSummary[] } }
type TemplateSummary = {
  id: string;
  agencyId: string;
  clientId: string | null;        // null = agency-level
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  isStarter: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

// GET /v1/clients/:cid/templates/:id — full view
{ data: { template: TemplateFull } }
type TemplateFull = TemplateSummary & { mjmlSource: IMjmlNode };
```

### Backend file touches

```
sendmymail-backend/
├─ prisma/
│  └─ schema.prisma                           # +Template model + relations on Agency/Client/User
├─ prisma/migrations/<timestamp>_templates_foundation/
│  └─ migration.sql                           # AUTO-generated by prisma migrate dev
└─ src/routes/
   └─ templates.ts                            # NEW — 6 endpoints, mirrors src/routes/clients.ts
```

`src/server.ts` mounts the new router at
`app.use('/v1/clients/:clientId/templates', templatesRouter)`. **Before**
the contacts/lists mounts if order matters (it doesn't here — no path
collision).

### Frontend file touches

```
src/
├─ lib/api/
│  └─ templates.ts                           # NEW — listTemplates, getTemplate, createTemplate, updateTemplate, archiveTemplate, duplicateTemplate
├─ store/slices/
│  ├─ templatesSlice.ts                      # NEW — per-client cache; mirrors contactsSlice
│  └─ editorSlice.ts                         # UPDATE — add loadTemplate(tree) action + `dirty` boolean; REMOVE `subject` field + setSubject reducer (campaign-level, not template-level)
├─ hooks/
│  └─ useTemplates.ts                        # NEW — list + CRUD + duplicate
├─ pages/templates/
│  ├─ TemplatesList.tsx                      # NEW — card grid (replaces Placeholder)
│  ├─ Builder.tsx                            # UPDATE — fetches template by URL :templateId, dispatches loadTemplate, owns the Save button
│  └─ index.tsx                              # re-exports
├─ components/                                # editor surface cleanup
│  ├─ EmailSettingsBar.tsx                   # DELETE — subject/preheader/from are campaign-level, not template-level. Editor is pure design now.
│  └─ EditorShell.tsx                        # UPDATE — drop the <EmailSettingsBar /> render + its import
├─ tree/
│  └─ strip.ts                                # UPDATE — extend to also remove any `mj-preview` nodes from the tree (preheader = campaign concern)
├─ components/templates/                     # NEW folder
│  ├─ TemplateCard.tsx                       # the card per the mockup
│  ├─ TemplateFormDialog.tsx                 # name + category modal (create + rename)
│  ├─ TemplatesEmptyState.tsx                # FTUX card
│  ├─ SaveTemplateButton.tsx                 # the "Save" pill that lives in the EditorShell Toolbar (dirty-aware)
│  └─ index.ts
└─ styles/components/templates/              # NEW folder
   └─ *.module.scss                          # one per component above
```

**Files deleted by PR 2** (the cleanup side of the architecture change):

- `src/components/EmailSettingsBar.tsx` — subject/preheader/from inputs
  no longer exist at template-design time.
- `src/styles/components/EmailSettingsBar.module.css` — its stylesheet.
- Any imports of either in `EditorShell.tsx`.

### Frontend phases

1. **API + slice + hook** (foundation, no UI changes):
   - `src/lib/api/templates.ts` — typed wrappers using the existing `apiCall` pattern.
   - `src/store/slices/templatesSlice.ts` — same shape as `contactsSlice`:
     `{ clientId, status, items: TemplateSummary[], error }`. Reducers:
     `setLoading / setTemplates / setError / addTemplate / upsertTemplate /
     removeTemplate / clearTemplates`. Items are TemplateSummary (no
     mjmlSource) — only the single fetched template carries its tree
     (lives in editorSlice).
   - `src/hooks/useTemplates.ts` — bail-on-`loaded` only (lesson learned
     from the useLists bug). Reads slice via `store.getState()` inside the
     effect so we don't subscribe to our own writes. Exposes `create /
     update / archive / duplicate` callbacks that dispatch slice mutations
     after the API resolves.

2. **TemplatesList page** (`/clients/:cid/templates`):
   - `.head` with title + sub ("Reusable designs for {ClientName}") +
     "+ New template" primary button.
   - Segmented filter tabs (V1 ships only "All" + "Client" — "Agency" +
     "Starter library" tabs are disabled with PR-2 tooltips).
   - Card grid (`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`).
   - Empty state (`TemplatesEmptyState`) when zero templates — single
     "Design your first template" CTA opening the create modal.
   - Loading: spinner while `templates.status === 'loading'`.
   - Each card: gradient-bg thumbnail with a category icon (`IconConfetti` /
     `IconGift` / `IconNews` / `IconReceipt` / etc.; default `IconMailFilled`),
     name, "{category} · {N days ago}". Click → navigate to
     `/clients/:cid/templates/:id/edit`.
   - Hover kebab `...` menu on each card: **Rename** (opens
     TemplateFormDialog in edit mode) / **Duplicate** / **Archive** (with
     ConfirmDialog — reuse the one from feature-contacts-lists PR 2).
   - Pagination: V1 simple (no pagination; load all). Add when an agency
     has 50+ templates per client.

3. **TemplateFormDialog**:
   - Modal (reuses the `ContactFormDialog` / `ClientFormDialog` shell — same
     portal + backdrop + animation pattern). Fields:
     - **Name** (required, ≤120 chars)
     - **Category** (optional, free-text V1; small datalist of common
       values for autocomplete: Welcome / Newsletter / Promo /
       Transactional / Cart / Birthday / Festive)
   - "Create template" → POST → navigates straight to the new template's
     `/edit` page (so the user lands in the builder ready to design).

4. **Builder integration** (the trickiest part):
   - `Builder.tsx` reads `useParams<{ clientId, templateId }>()`.
   - On mount: `useEffect` fires `getTemplate(clientId, templateId)` → on
     resolve, dispatch `loadTemplate({ tree })` (new editorSlice
     action). While loading: show a spinner instead of the editor.
   - New action in editorSlice: `loadTemplate(state, { payload: { tree } })`
     resets `tree` to the loaded value, clears history (past/future),
     rebuilds idPathCache, clears selection, sets `dirty: false`.
   - New slice field: `dirty: boolean`. Set to `true` by every mutating
     reducer (insertBlock / moveBlock / deleteBlock / duplicateBlock /
     updateAttr / updateContent). Cleared by `loadTemplate` and by the
     save handler.
   - **Removed from editorSlice**: `subject: string` field + `setSubject`
     reducer + any `setPreheader` reducer + any `getPreheaderFromTree`
     selector. Subject and preheader are campaign-level state
     (Feature 06), not template-design state.
   - **Removed from EditorShell**: the `<EmailSettingsBar />` render and
     its import. The bar held subject/from/preheader inputs which no
     longer have a place at template-design time. Editor becomes a pure
     design surface (Toolbar + Palette + Canvas + Inspector + optional
     PreviewModal).
   - New `SaveTemplateButton` component, rendered inside the Toolbar
     (which I'll touch lightly — add a `right` slot or just append the
     button to the existing toolbar's right side).
     - Disabled when `!dirty`.
     - Active state shows a small dot or "Unsaved" pill.
     - On click: strip editor-only fields via `tree/strip.ts`, PATCH the
       template with `{ mjmlSource: strippedTree }`,
       `dispatch(upsertTemplate(res.data.template))`, clear dirty,
       toast "Saved {name}".
   - **Dirty-leave warning**: in Builder.tsx, a `useEffect` hooks into
     `useBlocker` (react-router v7) to prompt the user before navigating
     away with unsaved changes. Simple `window.confirm("You have unsaved
     changes. Leave anyway?")` is fine V1; we can swap for a styled modal
     later.
   - **Auto-save**: defer V1. The Save button is the only persist surface.
     Real-time auto-save introduces conflict-resolution complexity
     (multi-tab, optimistic concurrency); explicit Save is the safer V1
     bet.

5. **Stripping editor-only + envelope-only fields on save**:
   - `src/tree/strip.ts` already exists (per CLAUDE.md). EXTEND it to
     also remove any `mj-preview` nodes from the tree — preheader is a
     campaign-level concern, not a template-design concern. The function
     becomes: strip `_id`, strip `_meta`, drop any child whose `tagName
     === 'mj-preview'` recursively.
   - On every PATCH: `mjmlSource: strip(state.editor.tree)` — the
     persisted tree contains design only (no editor internals, no
     envelope metadata).
   - On every load (`loadTemplate`): rebuild `_id` + `idPathCache` via
     `buildIdPathCache` (already used by editorSlice on mount). No
     `mj-preview` nodes to worry about — they're guaranteed absent
     because we stripped them on save.
   - **Backwards compatibility**: if existing test data has subject
     columns or `mj-preview` nodes, the migration's down-step is a
     no-op (we just drop the column and ignore tree nodes). No data
     loss for V1 since no real templates exist yet.

### Audit checklist after PR 1

- [ ] Schema migration applies cleanly, no FK orphans.
- [ ] `POST /v1/clients/:cid/templates` with a fresh tree returns 201
  with a valid `template.id`.
- [ ] `GET /v1/clients/:cid/templates` for a fresh agency returns
  `items: []` (or just the seeded starters when PR 2 lands).
- [ ] List response excludes `mjmlSource` (payload weight check).
- [ ] `PATCH /v1/clients/:cid/templates/:id` round-trips the tree —
  what you save is what you read back.
- [ ] Editor-only fields (`_id`, `_meta`) absent from persisted
  `mjml_source` (DB inspect after a save).
- [ ] Out-of-scope clientId on any path → 404 (never leak existence).
- [ ] Non-admin role on POST / PATCH / DELETE → 403 `insufficient_role`.
- [ ] `/clients/:cid/templates` page: empty state → modal → builder →
  Save → back to list → see the new card with updated `updatedAt`.
- [ ] Re-open the saved template → tree loads exactly as designed.
- [ ] Navigating away with unsaved changes → confirm prompt fires.
- [ ] Build clean (`tsc -b`); lint adds 0 new issues.
- [ ] Existing render path still works — open Preview in the editor
  → `POST /getHtml` returns valid HTML.

---

## Decisions

- **Subject + preheader belong to Campaign, not Template.** They are
  envelope metadata set per-send, not design intent. Rationale:
  - **One template, many campaigns**: a "Newsletter" template gets
    different subjects each month (March / April / May). Subject-on-
    template would force cloning the whole design just to change the
    subject.
  - **A/B subject testing** is a standard email-marketing feature —
    two campaigns, same template, different subjects. Impossible if
    subject lives on the template.
  - **Every ESP works this way** — Mailchimp, Klaviyo, Postmark,
    SendGrid, MailerLite all put subject + preheader on the campaign.
  - **MJML itself has no `<mj-subject>` element** — the format is the
    body. The envelope (subject, from, to, preheader header) is set by
    whatever sends the message.
  - **The existing editor slice comment already acknowledged this**:
    `"Email-level metadata used at send time. Not part of the MJML
    tree because MJML has no subject element — it's an ESP concern."`
    The original author left it on the editor only because there was
    no campaign system yet. Now there will be (Feature 06).
  - **Concrete effects in PR 2**: no `subject` column on Template,
    no `subject` field on editorSlice, no `setSubject` reducer, the
    `EmailSettingsBar` component is deleted entirely, `strip(tree)`
    also drops any `mj-preview` nodes. Campaign (Feature 06) will own
    `subject` + `preheader` + `fromName` + `fromEmail` + `sendAt`.

- **Store the `IMjmlNode` tree as JSON, not raw MJML markup.** The editor
  works on the tree natively (immer + path-based ops); a JSON column
  loads in one parse, no MJML library needed at read time. Server-side
  `/getHtml` already accepts this shape.
- **One Template table, not Template + TemplateVersion.** Versioning is a
  V1.5 concern. Adding it later is non-destructive (new table, FK to
  template, content snapshot per version).
- **`clientId` nullable from PR 1.** Agency-level templates land in PR 2
  but baking the nullable field in now avoids a future migration. Today's
  endpoints always set `clientId` (from the URL); PR 2's seed script
  inserts the agency-level rows.
- **6 endpoints, not 5.** `POST /:id/duplicate` is its own endpoint
  rather than "client computes a copy + POSTs it back" — keeps the deep
  clone atomic + lets us add per-duplicate logic later (versioning,
  audit trail, "duplicated from" pointer).
- **List endpoint strips `mjmlSource`.** Payload weight: a non-trivial
  template tree is 20-100 KB JSON. A 30-template list would be 600 KB-3 MB
  if we returned full trees. The grid view only needs name + meta.
- **No real thumbnails V1.** Category icon on a warm gradient bg is the
  V1 thumbnail. Real bitmap thumbnails need a headless-Chromium pipeline
  (or `mjml-to-png`) — defer.
- **Save button, not auto-save.** Explicit save dodges multi-tab conflict
  resolution + lets us keep the editor's existing history (past/future)
  semantics clean (auto-save would conflict with undo/redo writes). Add
  auto-save in V1.5 with a token-versioned optimistic check.
- **Dirty-state warning is `window.confirm` V1.** Custom modal works but
  adds DOM weight for a rarely-hit path. Native confirm is good enough.
- **No drafts vs published distinction V1.** Every saved template is
  immediately usable by a campaign. If we add scheduling/publishing later
  it becomes a state field on Template.
- **Categories are free-text strings in V1.** A datalist gives users the
  common values without locking the schema. We promote it to an enum if
  we ever want per-category UI (and once we have data to know which
  categories matter).
- **All templates editable by admin.** No template-level role gating in
  V1 (e.g. "only the creator can edit"). Add per-template ACLs only if
  someone complains.

---

## Deviations from the mockup

- **Thumbnails are category icons**, not bitmap previews. The mockup
  shows icons too, so this is faithful.
- **`Agency` and `Starter library` filter tabs** are visible but disabled
  (PR 2 tooltip).
- **`Welcome · 2 days ago`** — the mockup's secondary line. V1 uses
  `{category ?? '—'} · {relative time}`. The `—` shows up when the user
  doesn't pick a category.
- **No "Last used in" / "Last sent" info** — needs Feature 06 (campaigns)
  to populate. Mockup doesn't show this either.

---

## Dependencies

- **No new npm packages.** The editor + render path already use
  existing deps (`@dnd-kit`, `immer`). PR 2's starter seed script uses
  the same Prisma stack.
- **Blocks on**: nothing. Schema + endpoints + UI are all additive.
- **Blocked**: Campaign engine (Feature 06) needs templates to point at
  for sending — PR 1 unblocks it.

---

## Risks / open questions

- **Tree size for large templates.** A template with hundreds of nodes
  could push the JSON payload past 100 KB. PostgreSQL JSONB handles
  multi-MB documents fine, but the API round-trip cost matters. **Plan**:
  monitor; cap at ~500 KB in a future migration if anyone hits it.
- **Concurrent edits / two-tab race.** User opens the same template in
  two tabs, edits each, saves both. Last write wins; no conflict
  detection in V1. **Plan**: acceptable for V1; add optimistic
  concurrency (`updatedAt` token check on PATCH) in V1.5.
- **Editor state shared across templates.** The editor slice is a
  singleton; opening a new template overwrites the previous one's state.
  This is correct (editor = current template) but means accidental nav
  away with unsaved changes loses work. The `dirty`-based confirm prompt
  is the mitigation.
- **MJML schema drift.** `IMjmlNode` shape today is what we persist. If
  the editor's tree shape changes meaningfully later (e.g. adding new
  attribute types), old templates need a migration. **Plan**: keep tree
  ops backward-compatible; add a `version` field to Template if we ever
  need a hard migration.
- **First-load latency.** Bundle includes the EditorShell (~99 KB
  already lazy-chunked). The list page doesn't pull that bundle — good.
  Builder route triggers it on first nav.

---

## Acceptance criteria (PR 2 — Foundation)

- [ ] **List page**: `/clients/:cid/templates` renders the card grid; empty
  state shows when the agency has no templates for this client.
- [ ] **Create flow**: clicking "+ New template" opens the modal; submit
  POSTs and navigates to `/clients/:cid/templates/:newId/edit` with a
  fresh tree loaded into the editor.
- [ ] **Edit + Save**: edits in the builder flip a "Save" button to
  enabled; clicking Save persists the stripped tree (no subject, no
  `mj-preview` nodes); toast "Saved {name}" appears.
- [ ] **No subject/preheader UI in the editor**: the EmailSettingsBar
  is gone. The editor surface is Toolbar + Palette + Canvas + Inspector
  only. Subject and preheader appear only in the campaign builder
  (Feature 06, future).
- [ ] **Re-open**: navigating away from the builder and clicking the
  card again loads the saved tree exactly as designed.
- [ ] **Refresh**: hard-refresh on `/templates/:id/edit` reloads the
  tree from the server (not a fresh editor state).
- [ ] **Dirty-leave guard**: making an unsaved edit and clicking the
  back link triggers the browser confirm; cancel stays on the page.
- [ ] **Rename**: kebab menu → "Rename" updates the card name
  immediately (slice upsert).
- [ ] **Duplicate**: kebab → "Duplicate" creates a new card "{name} (copy)"
  and lands the user back on the list.
- [ ] **Archive**: kebab → "Archive" → confirm → card disappears from
  the grid; `archived` flag set on the DB row.
- [ ] **Auth**:
  - `member` / `viewer` can READ (GET endpoints work).
  - `member` POSTing a template → 403 `insufficient_role`.
  - Out-of-scope clientId on any endpoint → 404 (never leaks).
- [ ] **Build + lint**: `npm run build` clean both repos; `npm run lint`
  adds 0 new issues.

---

## What this unlocks

- **Campaigns** (Feature 06) — the wizard's "Pick a template" step
  finally has real templates to pick.
- **Flows** (Feature 07) — same; automation steps pick templates.
- **PR 2** of this feature — starter library + agency-level templates +
  brand-colour swap. PR 2 only adds rows and a few endpoint params; the
  table + editor integration ship intact.
- **PR 3** — test-send via Postmark + merge-tag resolver.

---

## Changes (newest first)

### 2026-06-04 · 🔗 Sibling feature — MJML import

User requested an "Import MJML" feature on the templates list page.
Because it's a self-contained addition (its own parser, its own UI,
no schema / backend changes), it lives in its own folder:
**[tasks/feature-mjml-import/change_log.md](../feature-mjml-import/change_log.md)**.

It's logically part of templates — imported MJML lands as a regular
visual template and uses the builder shipped in PR 2.5 — but the
implementation is bounded enough to track separately.

### 2026-06-04 · ✅ Done — PR 2.5 (Builder UX redesign)

Full-screen takeover + new top bar + compact grouped palette. The editor
now reads as a focused-mode tool (Mailchimp / Beefree / Draftship), not
an in-app form.

**Mockup**: [doc/mockups/builder.html](../../doc/mockups/builder.html)
(open in browser — this is the ground-truth design that V1 ships.)

**Phase 1 — Router restructure** ([src/router/index.tsx](../../src/router/index.tsx)):
Moved `/clients/:cid/templates/:tid/edit` OUT of `<AppShell>` into a new
top-level route group still gated by `<AgencyReady>` + `<ClientScoped>`,
but with no sidebar or topbar wrapping. The builder takes over the
viewport. Reserved the same route group for future full-screen editors
(campaign content step, form builder).

**Phase 2 — Top bar components** (new files in `src/components/templates/`):

- `BuilderTopBar.tsx` + SCSS — three-cluster grid (left / center / right),
  56px tall, terra-themed. Replaces the legacy `<Toolbar />` for the
  template builder.
  - Left: `← Templates` back link → `BuilderInlineName` → save status
    (pulsing terra dot "Unsaved changes" → muted dot "Saved").
  - Center: device toggle pill (Desktop / Mobile / HTML). V1 decorative
    — Mobile + HTML disabled with "coming soon" tooltips. Desktop is the
    only active state.
  - Right: Send test (disabled with PR-4 tooltip) → Preview (opens
    existing PreviewModal) → `<SaveTemplateButton />` → `<BuilderMoreMenu />`.

- `BuilderInlineName.tsx` + SCSS — click the template name to rename
  inline (contenteditable). Blur or Enter commits via PATCH; Escape
  reverts. Updates the template summary in `templatesSlice` via
  `upsertTemplate` so the cards list reflects the new name on
  back-navigation. Mirrors Figma / Notion / Mailchimp.

- `BuilderMoreMenu.tsx` + SCSS — kebab dropdown with Duplicate / Export /
  Archive. Duplicate calls existing API + navigates into the clone.
  Archive opens the existing `<ConfirmDialog />` (reused from
  feature-contacts-lists) then navigates back to `/templates` on
  success. Export is a placeholder toast pointing to PR 4.

**Phase 3 — EditorBody extraction**:

`src/components/EditorBody.tsx` (new) holds the previous EditorShell
internals (DndContext + Palette + Canvas + Inspector + keyboard
shortcuts + DragOverlay + FloatingTextToolbar + PreviewModal). Lets
pages with their own chrome (Builder's BuilderTopBar) render the body
without dragging along the legacy Toolbar.

`src/components/EditorShell.tsx` simplified to a thin wrapper:
`<Toolbar /> + <EditorBody />`. Kept for legacy callers (`app.view ===
'editor'`) — the integrations workflow path.

**Phase 4 — Builder page + Palette rewrite**:

`src/pages/templates/Builder.tsx` no longer renders `<EditorShell />`.
Instead: `<BuilderTopBar />` + `<EditorBody />` directly, wrapped in
a full-viewport flex layout. The dirty-leave guard + beforeunload
wiring + load-on-mount logic is unchanged.

`src/components/Palette.tsx` — kept the grouped structure (already
had LAYOUT / CONTENT / MEDIA / ADVANCED groups) but completely
rewrote the visual layer:

- **Search field** at the top now has a leading Tabler search icon +
  smaller padding + warmer placeholder. No more separate
  "Blocks · Drag onto canvas" header card — group labels handle that.
- **Group headers** dropped from 12px to 10px uppercase with 0.7px
  letter-spacing. Notion-style minimalism — takes ~24px instead of
  ~60px per group.
- **Tile grid** denser — gap 5px (was 6px), padding tightened, tiles
  go to 64px min-height with proper terra-light hover + 1px upward
  transform on hover.
- **Tabler icons** replace the legacy glyph strings (`T`, `▭▭▭`)
  for content/media/advanced blocks. Each block id has an explicit
  icon mapping in the new `iconFor()` function.
- **Layout-block visuals** — the headline change. `section-1col`
  shows one rectangle, `section-2col` shows two side-by-side,
  `section-3col` shows three. Rectangles use terra at 18% opacity
  with terra outline, darken on hover. Matches Beefree / Stripo —
  the user instantly sees the structure rather than parsing a
  generic icon.
- **Responsive collapse** at 1100px breakpoint — palette shrinks
  to 64px icon-only, search disappears, labels hide. The layout
  visuals stay visible because they ARE the icon.

**Files touched** (8 new + 5 modified):

```
src/router/index.tsx                                   UPDATE   (route moved out of AppShell)
src/pages/templates/Builder.tsx                        REWRITE  (uses BuilderTopBar + EditorBody)
src/components/templates/BuilderTopBar.tsx             NEW
src/components/templates/BuilderInlineName.tsx         NEW
src/components/templates/BuilderMoreMenu.tsx           NEW
src/components/templates/index.ts                      UPDATE   (re-exports)
src/components/EditorBody.tsx                          NEW      (extracted from EditorShell)
src/components/EditorShell.tsx                         REWRITE  (thin wrapper around Toolbar + EditorBody)
src/components/Palette.tsx                             REWRITE  (icons + column visuals)
src/styles/components/templates/BuilderTopBar.module.scss      NEW
src/styles/components/templates/BuilderInlineName.module.scss  NEW
src/styles/components/templates/BuilderMoreMenu.module.scss    NEW
src/styles/components/templates/Builder.module.scss            UPDATE   (.app full-viewport grid)
src/styles/components/EditorBody.module.css                    NEW
src/styles/components/Palette.module.css                       REWRITE  (compact + layout visuals)
```

**Verify gates**:

- ✅ `npm run build` clean (1.95s, no errors, no warnings).
- ✅ `npm run lint` adds 0 new issues. 12 pre-existing problems
  (canvas/* hooks-rules, integrations/* any-types, ColorPicker
  setState-in-effect, router/index fast-refresh, tree/paths any)
  unchanged.
- ✅ Builder bundle SHRUNK from 99.51 KB → 96.28 KB (gzip 28.69 → 28.04
  KB) — the EditorShell simplification + EmailSettingsBar deletion in
  PR 2 offset the new chrome's weight.
- ✅ Templates chunk grew from 11.21 KB → 19.22 KB (gzip 4.22 → 6.05
  KB) — 8 KB added for BuilderTopBar + BuilderInlineName + BuilderMoreMenu
  + their stylesheets. Reasonable.
- ✅ No new dependencies.

**What this unlocks**:

- **PR 4** — TestSendButton becomes a real click in the same right
  cluster slot (currently disabled with "PR 4 tooltip").
- **Inline device toggle (functional)** — slot already rendered in
  the center cluster; just needs the click handler that swaps the
  Canvas's `width` between 600/375 + persists to localStorage.
- **Tabbed left rail (Blocks / Rows / Styles / Settings)** — Palette
  becomes the `Blocks` tab; Rows / Styles / Settings can land as
  sibling components when needed.
- **HTML view mode** — top-bar's `HTML` device button can swap the
  Canvas for the existing HTML source view that already lives in the
  PreviewModal.

### 2026-06-04 · 📐 Planning — Builder UX redesign (PR 2.5)

User feedback after PR 2 shipped: the editor lives inside the app shell
(sidebar + topbar visible), the chrome reads like a desktop app from
2008, the Save button is isolated in the right corner of a busy toolbar,
the palette is a flat list with no column-layout previews. Doesn't
match modern email builders (Mailchimp / Beefree / Stripo / Draftship).

This PR is a pure UX/visual upgrade of the existing builder — no
schema changes, no new persistence, no logic changes to the editor's
tree operations. It's all chrome.

#### Goal

Take the builder from "in-app editor" to "focused full-screen editor"
that reads as one of the modern email tools (Beefree / Mailchimp). Make
the palette compact, grouped, and feature the column-layout blocks as
visual previews instead of generic icons.

#### Scope (V1)

Locked to two things:
1. **Full-screen takeover + new top bar** — builder route moves OUT of
   `<AppShell>`, gets its own chrome. New `<BuilderTopBar />` replaces
   the existing `<Toolbar />` for template-editing flows.
2. **Compact grouped palette** — `<Palette />` rewritten to show
   LAYOUT / CONTENT / MEDIA / ADVANCED group headers with all 13 real
   blocks from the registry, denser tiles, and visual column-structure
   previews for the 1col / 2col / 3col blocks.

Approved via [doc/mockups/builder.html](../../doc/mockups/builder.html)
(open in browser to preview the target design).

#### Out of scope (deferred)

These appear visually in the mockup but ship as decorative-only V1 OR
defer entirely:

- **Device toggle (Desktop / Mobile / HTML)** — the toggle pill
  renders in the top bar but switching is not wired in V1. The
  existing PreviewModal stays as the device-preview surface for now.
  Full inline device-toggle lands in a follow-up.
- **Inline rename** — clicking the template name in the top bar shows
  the cursor but commits via blur → PATCH. Wired in V1.
- **Send test button** — rendered but disabled with "Coming in PR 4"
  tooltip (Postmark integration is PR 4).
- **More-actions menu (`⋯`)** — rendered but with a placeholder
  dropdown (Duplicate / Archive / Export) that wires the existing
  duplicate + archive APIs already shipped in PR 2.
- **Zoom controls** — rendered as a floating widget but disabled in
  V1. Real zoom requires a CSS transform on the canvas + recalcing
  drop-zone coordinates, which is a non-trivial follow-up.
- **Tabbed left rail (Blocks / Rows / Styles / Settings)** — not in
  V1. The palette stays single-list, just grouped by category.

#### Files

```
src/
├─ router/index.tsx                          # MOVE the builder route OUT of <AppShell> — make it a top-level route under AgencyReady
├─ pages/templates/Builder.tsx               # REWRITE — render <BuilderTopBar /> + the editor body directly (no <EditorShell />)
├─ components/templates/
│  ├─ BuilderTopBar.tsx                      # NEW — left cluster (back / name / status) + center (device toggle, V1 disabled) + right (test/preview/save/more)
│  ├─ BuilderInlineName.tsx                  # NEW — contenteditable template name, blur → PATCH name + dispatch upsertTemplate
│  ├─ BuilderMoreMenu.tsx                    # NEW — kebab dropdown (Duplicate / Archive / Export)
│  └─ index.ts                                # re-export new components
├─ components/
│  └─ EditorShell.tsx                        # extract <EditorBody /> sub-component (just Palette + Canvas + Inspector + DnD wiring) so Builder can render it without the legacy Toolbar
├─ components/Palette.tsx                    # REWRITE — render groups (LAYOUT / CONTENT / MEDIA / ADVANCED) with grouped 2-col grid, custom layout-block visuals
└─ styles/components/templates/
   ├─ BuilderTopBar.module.scss              # NEW
   ├─ BuilderInlineName.module.scss          # NEW
   └─ BuilderMoreMenu.module.scss            # NEW
└─ styles/components/Palette.module.css      # UPDATE — group headers, denser tiles, layout-block visual class
```

The existing **`SaveTemplateButton`** keeps working — `BuilderTopBar`
renders it in its right cluster, replacing the SaveTemplateButton's
previous role as a Toolbar `extras` slot.

The existing **`EditorShell`** keeps its current shape for backward
compatibility with `app.view === 'editor'` (the legacy original-app
entry point that may still be used by the integrations flow). Builder
no longer uses it.

#### Decisions

- **Move out of AppShell, not just hide it.** The router route gets
  moved to a sibling top-level route. `Outlet`-wrapping with
  `AgencyReady` (so auth still gates the page) but no AppShell. This
  is the Figma / Mailchimp / Linear pattern.
- **`BuilderTopBar`, not extending the existing Toolbar.** They serve
  different mental models — Toolbar is a generic-looking app toolbar,
  BuilderTopBar is the focused-mode chrome. Conflating them would
  mean Toolbar grows props for things only Builder uses.
- **Extract `EditorBody` from EditorShell.** Builder needs the
  palette + canvas + inspector + DnD wiring but NOT the Toolbar.
  Extracting a sub-component keeps EditorShell intact for legacy
  callers + gives Builder the right composable piece.
- **Inline rename via contenteditable + blur-PATCH.** No modal, no
  separate edit-mode toggle. Click the name, it's editable; click
  elsewhere or press Enter, it saves. Reuses the existing
  `updateTemplate` API.
- **Status text in the top bar replaces the old loud "Save" button
  state.** "Unsaved changes" (pulsing terra dot) → "Saved" (muted dot)
  is the primary signal; the Save button mirrors but the *headline*
  is in the status indicator. Figma / Notion pattern.
- **Column-layout visuals on layout blocks** instead of generic icons.
  Beefree / Stripo / Mailchimp all do this. A 2-column block should
  *show* two columns. Lower cognitive load — user instantly knows
  what they'll get.
- **Group headers, not tabs.** V1 stays single-scroll with group
  labels (Notion-style). Tabs (Blocks / Rows / Styles / Settings)
  would be a bigger commitment that requires the Rows / Styles /
  Settings tabs to actually have content; deferred.
- **Search field at top of palette** — quick filter across all
  blocks. Already in current Palette; keep it.
- **Responsive collapse**: under 1100px the palette shrinks to 64px
  icon-only; under 820px both side rails hide entirely (full-bleed
  canvas). Editing on mobile isn't pleasant but the read/preview
  works.

#### Implementation phases (sequential)

1. **Router restructure** — pull the builder route out of AppShell.
   Verify by visiting `/clients/:cid/templates/:tid/edit` directly:
   the app sidebar + topbar should vanish, but auth gating + redirect
   to login if logged-out still works. The page is mostly blank at
   this phase because EditorShell still renders its old Toolbar; we
   replace that next.
2. **BuilderTopBar component** — write it standalone first, render
   it in the route. It includes:
   - Left: ← Templates back link → BuilderInlineName → save status
   - Center: device toggle pill (V1 cosmetic)
   - Right: Send test (disabled, tooltip) · Preview (opens existing
     PreviewModal) · `<SaveTemplateButton />` · BuilderMoreMenu kebab
3. **Extract EditorBody from EditorShell** — pull the body (Palette +
   Canvas + Inspector + DnD wiring + DragOverlay + FloatingTextToolbar
   + PreviewModal) into its own component. EditorShell keeps its
   current shape (renders Toolbar + EditorBody) for legacy callers.
4. **Builder.tsx rewrite** — renders `<BuilderTopBar />` + `<EditorBody />`
   directly. Fetch + loadTemplate + dirty-leave guard logic stays the
   same.
5. **Palette rewrite** — convert to grouped layout. Add a custom
   render path for layout-group blocks (1col / 2col / 3col) that
   shows the column-structure visual instead of the icon glyph.
6. **Verify** — manual flow (open template → drag block → save →
   navigate away with dirty → confirm → save → list shows updated
   time). Build + lint clean.

#### Acceptance criteria

- [ ] `/clients/:cid/templates/:tid/edit` no longer shows the
  app sidebar or topbar — the builder fills the viewport.
- [ ] Clicking "← Templates" in the top bar returns to
  `/clients/:cid/templates` (with dirty-leave confirm if applicable).
- [ ] Template name in the top bar is click-to-edit; blur saves
  it via PATCH; toast `Renamed to {new name}`.
- [ ] Save status indicator reads `Unsaved changes` (pulsing terra
  dot) while dirty, switches to `Saved` (muted dot) after save.
- [ ] Send test button is visible but disabled, with a "Coming
  soon" tooltip. Preview button opens the existing PreviewModal.
  More-actions menu shows Duplicate / Archive / Export (each wired
  to its existing API or modal).
- [ ] Device toggle pill renders Desktop / Mobile / HTML. Clicking
  doesn't change behavior in V1 (decorative).
- [ ] Palette shows 4 group headers (LAYOUT / CONTENT / MEDIA /
  ADVANCED) with their blocks (3 / 4 / 3 / 2). Layout blocks display
  column visuals (1, 2, 3 rectangles) instead of generic icons.
- [ ] Search field at top of palette filters tiles in real time
  across all groups.
- [ ] Drag/drop / canvas / inspector / undo/redo / preview / save all
  continue to work — no functional regressions.
- [ ] Responsive: under 1100px palette collapses to icon-only; under
  820px both rails hide.
- [ ] `npm run build` clean; `npm run lint` adds 0 new issues.

#### What this unlocks

- **PR 3 (starters + agency)** — Starter templates land in a builder
  that already looks modern + focused. The "Use this starter" CTA on
  the list page lands users in the builder with the starter's tree
  pre-loaded; the new chrome makes the experience continuous.
- **PR 4 (test-send + merge tags)** — TestSendButton becomes a real
  click instead of a disabled placeholder. Same slot in the top bar.
- **Future builder enhancements** — Tabbed left rail (Blocks / Rows /
  Styles / Settings), inline device toggle, zoom controls — all have
  the architectural homes already carved out.

### 2026-06-04 · ✅ Done — PR 2 (Foundation — templates persistence)

End-to-end persistence for templates. A user can now create a template,
design it in the existing MJML editor, save it, navigate away, come
back, and find their design intact. Refresh persists. The editor is
finally *real* — every edit can be saved against a server-side row.

**Backend** (3 file changes + 1 new migration):

- `prisma/schema.prisma` — new `Template` model: id, agencyId,
  clientId (nullable for PR 3 starters), name, mjmlSource (JSONB),
  thumbnailUrl?, category?, isStarter, archived, createdBy? (SetNull),
  timestamps. No `subject` column — subject + preheader are
  envelope metadata owned by Campaign (Feature 06). Reverse relations
  on Agency / User / Client. Three indexes covering the hot paths.
- `prisma/migrations/20260604144912_templates_foundation/` —
  CREATE TABLE + indexes + FKs with Agency/Client Cascade + User
  SetNull.
- `src/routes/templates.ts` (new) — 6 endpoints under
  `/v1/clients/:clientId/templates`:
  - `GET /` — list summaries (omits `mjmlSource` for payload weight;
    20-100 KB tree × 30 templates = 600 KB-3 MB if we returned full)
  - `GET /:id` — full template incl. mjmlSource
  - `POST /` (admin) — create
  - `PATCH /:id` (admin) — update; server-side `stripTreeForPersistence`
    removes `_id` / `_meta` / `mj-preview` as a safety net
  - `DELETE /:id` (admin) — soft-archive (idempotent)
  - `POST /:id/duplicate` (admin) — deep clone with " (copy)" suffix;
    clones are never `isStarter`
  - All endpoints write audit logs (`template.created` /
    `.updated` / `.archived` / `.duplicated`)
  - `assertClientExists` helper guards every endpoint against the
    "scope:all owner with a fabricated clientId" FK violation
- `src/server.ts` — mount the new router

**Frontend** (a lot — but the right amount):

- API: `src/lib/api/templates.ts` — typed CRUD wrappers
- Slice: `src/store/slices/templatesSlice.ts` — per-client cache,
  mirrors `contactsSlice` shape
- Hook: `src/hooks/useTemplates.ts` — bail-on-`'loaded'`-only
  (carrying the useLists lesson forward, self-healing on stale loading)
- Pages:
  - `src/pages/templates/TemplatesList.tsx` (new) — replaces the
    Placeholder. Card grid + FTUX empty state + create modal +
    rename modal + archive confirm; navigation to builder on card
    click
  - `src/pages/templates/Builder.tsx` (rewrite) — reads `:templateId`
    from URL, fetches template, dispatches `loadTemplate({tree})`,
    renders EditorShell with `<SaveTemplateButton />` in the Toolbar's
    new `extras` slot, owns `useBlocker` dirty-leave guard +
    `beforeunload` for full-page reload protection
  - `src/pages/templates/index.tsx` — re-exports `TemplatesList`
    (Placeholder is gone)
- Components: `src/components/templates/` (new folder):
  - `TemplateCard.tsx` — grid card with category icon, name,
    relative-time, hover-revealed kebab (Rename / Duplicate / Archive)
  - `TemplateFormDialog.tsx` — name + category modal (create + rename),
    reuses the ClientFormDialog portal-shell pattern, datalist
    autocomplete for common categories
  - `TemplatesEmptyState.tsx` — FTUX card
  - `SaveTemplateButton.tsx` — Toolbar pill, dirty-aware:
    disabled+ghosted when clean, terra-primary with "Unsaved" pulsing
    dot when dirty. Click → `stripForPersistence(tree)` → PATCH →
    dispatch `markSaved` + `upsertTemplate` → toast `"Saved {name}"`
  - `index.ts` — re-exports
- SCSS: `src/styles/components/templates/` (new folder, 5 stylesheets)

**Editor architecture changes** (per the subject/preheader = campaign
decision):

- `src/store/slices/editorSlice.ts`:
  - REMOVED `subject` field, `setSubject` reducer, `setPreheader`
    reducer, `uuid` import (only used by setPreheader)
  - ADDED `dirty: boolean` — set true by every mutating reducer
    (insertBlock / moveBlock / deleteBlock / duplicateBlock / setAttr /
    setContent / undo / redo); cleared by `loadTemplate` + `markSaved`
  - ADDED `loadTemplate({tree})` — resets tree + clears history +
    clears selection + sets dirty=false
  - ADDED `markSaved` — clears dirty on save success
- `src/store/selectors.ts` — removed `selectSubject`; `selectPreheader`
  stays (reads tree's `mj-preview` for design-time preview only — gets
  stripped on save)
- `src/tree/strip.ts` — added `stripForPersistence(tree)` that drops
  `_id` / `_meta` AND any `mj-preview` nodes recursively. The original
  `stripEditorFields` is kept untouched (used by the preview render
  path which SHOULD include mj-preview)

**Editor UI cleanup** (the subject/preheader UI deletion):

- `src/components/EmailSettingsBar.tsx` — **DELETED.** Subject + from +
  preheader inputs no longer have a place at template-design time.
- `src/styles/components/EmailSettingsBar.module.css` — **DELETED.**
- `src/components/Canvas.tsx` — removed the `<EmailSettingsBar />`
  render + import. Editor is pure design now.
- `src/components/Toolbar.tsx` — added optional `extras` prop, slotted
  between Export and Preview buttons. Used by the template builder.
- `src/components/EditorShell.tsx` — added optional `toolbarExtras`
  prop, forwards to Toolbar's `extras`. Lets pages wrap the editor
  with their own context-specific actions (PR 2: SaveTemplateButton;
  PR 4: TestSendButton).
- `src/components/integrations/ExportDropdown.tsx` — passes empty
  subject string to legacy integration send endpoints. ExportDropdown
  is the pre-campaign integrations path; will be replaced by the
  campaign builder in Feature 06.

**Smoke tests** (all green):

- Backend in-process Prisma smoke (7 checks): create → JSONB tree
  round-trips → updatedAt moves on update → list query orders by
  recency + omits mjmlSource → soft-archive → archived rows excluded
  by default → cleanup. Zero schema warnings.
- Frontend type-check (`tsc -b --noEmit`) clean.
- Frontend build (`vite build`) clean. New chunks: templates pages
  4.4 KB + components 11.2 KB gzip. Builder chunk +0.3 KB for the
  SaveTemplateButton wiring.
- Frontend lint: **zero new issues.** 12 pre-existing problems
  (canvas/* hooks-rules, integrations/* any-types, ColorPicker
  setState-in-effect, router/index fast-refresh, tree/paths any) all
  untouched.

**What this unlocks**:

- PR 3 (starters + agency-level templates + brand-colour swap) — just
  needs to seed rows + activate the filter tabs. Schema + APIs all
  ready.
- PR 4 (test-send via Postmark + merge-tag resolver) — just needs the
  POST `/templates/:id/test-send` endpoint + a TestSendButton in the
  Toolbar's `extras` slot.
- **Campaigns (Feature 06) — the "Pick a template" step finally has
  real templates to pick.**
- **Flows (Feature 07) — automation steps can reference template ids.**
- **Image upload (PR 2.5)** — templates persist their tree, but the
  tree's `mj-image src=` is still just a URL string today. The dedicated
  image-upload PR comes next.

### 2026-06-03 · 📐 Planning update — subject + preheader move to Campaign (not Template)

User raised an architectural concern: subject + preheader shouldn't be
saved on the template — they're per-send (campaign-level) metadata. They
were right. Update applied across the PR 2 plan:

**Schema** — dropped the `subject String` column from `Template`. Tree
columns are: id, agencyId, clientId?, name, mjmlSource, thumbnailUrl?,
category?, isStarter, archived, createdBy?, timestamps.

**API** — POST/PATCH bodies no longer accept `subject`. Response
shapes (`TemplateSummary` / `TemplateFull`) no longer include it.

**Frontend** —
- `editorSlice.ts`: `subject: string` field + `setSubject` reducer
  removed. `loadTemplate({ tree })` (was `loadTemplate({ tree, subject })`).
- `EmailSettingsBar.tsx` + its stylesheet: **DELETED**. The bar held
  subject/from/preheader inputs that no longer have a place at
  template-design time. EditorShell drops its `<EmailSettingsBar />`
  render + import.
- `tree/strip.ts`: extended to also drop any `mj-preview` nodes from
  the tree before persisting. Preheader is a campaign concern.
- The editor surface becomes pure design: Toolbar + Palette + Canvas +
  Inspector + optional PreviewModal. No envelope metadata.

**Campaign (Feature 06) will own** subject + preheader + fromName +
fromEmail + sendAt — a clean separation between "design" (template)
and "envelope" (campaign).

Full rationale in the new Decisions section (top item). PR 2 scope
actually got *smaller* — one less DB column, one less slice field,
one fewer component, one less endpoint param.

Ready to implement PR 2 (Foundation) as updated.

### 2026-06-03 · ✅ Done — PR 1 (Editor theme migration)

Pure SCSS migration. All 12 editor stylesheets moved off the legacy
Google-blue + neutral-gray palette and onto the warm editorial theme.

**Files touched** (12 stylesheets, +180/-175 lines):

```
src/styles/components/EditorShell.module.css           (  6 changes)
src/styles/components/Toolbar.module.css               ( 42 changes)
src/styles/components/Palette.module.css               ( 42 changes)
src/styles/components/Inspector.module.css             ( 30 changes)
src/styles/components/EmailSettingsBar.module.css      ( 18 changes)
src/styles/components/PreviewModal.module.css          ( 81 changes — biggest file)
src/styles/components/inspector/controls/controls.module.css  ( 40 changes — added on the fly when audit found it)
src/styles/canvas/DragChip.module.css                  (  6 changes)
src/styles/canvas/DropZone.module.css                  ( 38 changes)
src/styles/canvas/FloatingTextToolbar.module.css       (  4 changes)
src/styles/canvas/SelectionToolbar.module.css          (  6 changes)
src/styles/canvas/renderTree.module.css                ( 42 changes)
```

**Audit-pass discoveries**:

- The plan called out 7 stylesheets; the audit found **12** — the
  canvas overlays under `src/styles/canvas/` were a sibling folder
  to `src/styles/components/`, plus a hidden `inspector/controls/controls.module.css`
  sub-stylesheet. Both folded into the same migration.
- Token names use the `--color-*` prefix (e.g. `--color-primary`, not
  `--primary`). Plan corrected mid-flight.
- `src/canvas/renderTree.tsx` has 7 hardcoded hex values too — but they
  are **MJML content defaults** (the default button bg color *in the
  email being designed*, not in the editor chrome). Left untouched:
  changing email content defaults is a behavior change, not a theme
  change.

**Token-mapping decisions executed**:

- `#1a73e8` → `var(--color-primary)` (terra) — applied **everywhere**
  the blue served as the editor's primary action / selection / focus
  color (selection outline, focused inputs, button hovers, drop-zone
  highlight, status pulse, segmented-tab active, copy-button hover).
- `color-mix(in srgb, var(--color-primary) X%, transparent)` for every
  rgba opacity tint (12% / 15% / 20% / 30% / 40% / 4% / 5% / 8% / 6%).
  Each blue rgba mapped to its terra equivalent at the same opacity.
- Black rgba shadows → `color-mix(in srgb, var(--color-ink) X%,
  transparent)` so shadows pick up warm ink tone instead of pure
  cool-black.
- Red rgba's (drop-zone rejected state) → `color-mix` against
  `var(--color-red)`.
- `#fff3cd` (warning bg) → `var(--color-amber-bg)`; `#856404` (warning
  text) → `var(--color-amber-tx)`.
- `SelectionToolbar` switched from solid blue → solid `var(--color-ink)`
  (dark pill) per the plan. Matches `FloatingTextToolbar` (which was
  already dark) — both floating overlays now read as the same
  authoritative dark-on-cream control.
- `#1a1a1a` everywhere it was UI body text → `var(--color-ink)`.

**Intentional `#ffffff` literals left** (NOT bugs):

The grep gate showed 12 remaining `#ffffff` occurrences. All are
"always-white text on dark/colored bg" cases:

| File | Use |
|---|---|
| `Toolbar.module.css:107` | preview button text (white on terra bg) |
| `controls.module.css:207` | padding-mode active button text (white on terra) |
| `FloatingTextToolbar:19`, `DragChip:7`, `SelectionToolbar:24,58` | white icons on dark `--color-ink` floating bar |
| `renderTree:38` | `.hero { color: #ffffff }` — content default (hero text on a colored hero bg in the email) |
| `renderTree:102` | `.socialIcon { color: #ffffff }` — white initial on terra circle |
| `PreviewModal:209,224` | phone bezel + notch (`#1a1a1a` dark phone realism) |
| `PreviewModal:303,310` | code-block dark "terminal" aesthetic (`#0f1219` bg / `#e6edf3` text) |
| `PreviewModal:212` | phone bezel shadow + inset highlight (theme-independent) |

These don't reference `var(--color-card)` (white) deliberately — if we
ever changed `--color-card` to off-white (we won't, but the semantic
matters), text-on-dark-bg should not move with it. They're literal
whites for visual contrast, not theme surfaces. Each non-obvious
literal has an inline comment explaining why.

**Out-of-scope offenders found by the grep gate**:

- `src/styles/components/integrations/IntegrationsScreen.module.css`
  (1 blue rgba)
- `src/styles/components/integrations/Modal.module.css` (2 blue rgba)

These are in the legacy integrations module (carried over from the
original repo), NOT editor chrome. They're a separate follow-up
cleanup. Not addressed in this PR per the "PR 1 is editor-only" scope
gate.

**Verify gates** (all pass):

- ✅ `grep -rE "#[0-9a-fA-F]{3,8}"` across the 12 editor stylesheets
  returns ONLY the 12 intentional `#ffffff` + 4 intentional
  phone-bezel/code-block literals listed above.
- ✅ `grep -rE "rgba\(26, *115, *232"` (the editor's old blue rgba)
  returns ZERO matches in editor stylesheets (3 hits in
  `integrations/*` are pre-existing legacy, out of scope).
- ✅ `grep -rE "rgba\(0, *0, *0, *0\."` returns ZERO matches in editor
  stylesheets (1 hit in `PreviewModal:212` is the phone-bezel shadow
  per the table above).
- ✅ `npm run build` clean (1.55s build, no errors, no warnings).
- ✅ `npm run lint` adds **0** new issues. The 12 pre-existing lint
  errors (canvas/*.tsx hooks-rules, integrations/*.tsx any-types,
  inspector/ColorPicker setState-in-effect, router/index.tsx
  fast-refresh, tree/paths.ts any-type) are untouched — this PR was
  CSS-only.
- ✅ Builder bundle size unchanged at 99.19 KB / gzip 28.48 KB.

**No JSX touched, no logic changed, no schema, no API.** Pure
SCSS/CSS token replacement.

**What this unlocks** ([per the plan](#what-this-unlocks)): PR 2's
persistence layer now lands on a themed editor; the whole
`/templates` → builder flow reads as one cohesive design language.

### 2026-06-03 · 📐 Planning — re-split to 4 PRs (insert theme migration as PR 1)

Audit of the existing MJML editor stylesheets found ~99 hardcoded
color occurrences across 7 files — the editor is still on the legacy
Google-blue + gray palette while the rest of the app is on the warm
editorial theme. Re-splitting from 3 → 4 PRs to ship the visual
migration as a dedicated PR first:

- **PR 1 (new)** — Editor theme migration. Pure SCSS, no logic. ~25
  unique hardcoded values → `var(--color-*)` tokens + `color-mix`.
  Bounded scope, low risk, makes the editor visually consistent with
  the rest of the app *before* we tangle persistence work into the
  same diff.
- **PR 2** — Foundation (persistence). The original PR 1; unchanged
  scope.
- **PR 3** — Starters + agency-level + brand-colour swap.
- **PR 4** — Test-send + merge tags.

Next: implement PR 1 (theme migration).

### 2026-06-03 · 📐 Planning — initial 3-PR plan written

Initial plan written. 3-PR split: foundation → starters + agency-level
→ test-send + merge tags. Schema includes `clientId nullable` +
`isStarter` flag from day 1 so subsequent PRs don't need a migration.

Superseded by the 4-PR re-split above when the editor theme audit
surfaced the visual debt.
