# fix-card-redesign-and-thumbnails

Two-part polish PR on top of campaigns V1: **real auto-generated email
thumbnails** for templates + **complete visual overhaul** of both
TemplateCard and CampaignCard. Three iterations on the template card
visual (faux preview → real screenshots → phone-frame mockup); single
status-driven rewrite of the campaign card.

## Status: ✅ Done

Shipped end-to-end, build + lint green.

## Why this PR

After campaigns V1 shipped, the templates list page and campaigns list
page both used "settings-page" cards — small logo + name + meta line.
Two user-driven concerns:

1. **"Cards look too basic"** — the visual hierarchy didn't differentiate
   templates from each other, and didn't read as "real designed asset"
   for the email tool.
2. **"Where are the thumbnails?"** — the `Template` model already had a
   `thumbnailUrl` column but nothing generated thumbnails. Cards showed
   generic icons.

This PR addresses both with one cohesive direction: cards reformed as
product showcases, with real email screenshots auto-generated and
hosted on Cloudinary.

---

## Part 1 — Real auto-generated thumbnails

### Architecture

```
USER CLICKS SAVE
  └─ Existing save flow runs (upload images, PATCH, toast "Saved")
     User sees this in ~500ms — flow is unchanged.

BACKGROUND fire-and-forget kicks in:
  └─ void regenerateThumbnail(...)
       ├─ POST tree → /getHtml → compiled HTML            (existing endpoint)
       ├─ Create off-screen <iframe>, position: fixed -10000px
       ├─ doc.write(html) → iframe renders the email
       ├─ Wait: iframe load + document.fonts.ready + all images loaded
       │        (2.5 sec timeout fallback)
       ├─ Resize iframe height = body.scrollHeight (full email visible)
       ├─ html-to-image toPng(iframe.body) → PNG data URL
       ├─ uploadDataUrl(...) → Cloudinary URL              (existing flow)
       ├─ Silent PATCH {{thumbnailUrl: url}} — no toast
       └─ dispatch(upsertTemplate(...)) updates cards-list cache

USER NAVIGATES TO /templates
  └─ Card renders <img src={thumbnailUrl}> — real screenshot.
     Falls back to faux preview if thumbnailUrl is null.
```

### Files (5 modified / 1 new)

**Backend (1 modified)**:
- `sendmymail-backend/src/routes/templates.ts` — Zod `updateBody` accepts
  `thumbnailUrl: z.url().max(2000).nullable().optional()`. PATCH handler
  diffs + writes it like the other fields. Audit logs only that it
  changed (URL itself isn't useful in audit).

**Frontend (5 modified, 1 new)**:
- `src/lib/thumbnails/generateThumbnail.ts` (new, ~135 lines) —
  `generateThumbnailUrl(tree) → Promise<string | null>`. All failures
  swallowed; returns null so callers stay fire-and-forget.
- `src/lib/api/templates.ts` — `TemplateUpdateBody.thumbnailUrl?` added.
- `src/components/templates/useSaveTemplate.ts` — after the success
  toast, fires `void regenerateThumbnail(...)`. Background pipeline does
  generation → silent PATCH → cache update. All errors swallowed.
- `package.json` + `package-lock.json` — new dep `html-to-image`
  (MIT, ~10 KB gzipped).

### Why browser-side + Cloudinary (not Puppeteer-on-backend)

| Option | Tradeoff |
|---|---|
| **Browser-side (chosen)** | Uses idle compute the user already has. Zero backend infra. Free Cloudinary tier carries storage. |
| Puppeteer on backend | Adds ~150 MB Chromium to Docker images. Slower boot. Backend CPU cost. |
| Third-party screenshot service | ~$15/month. Vendor lock-in. |

### Cost reality

Each thumbnail is ~30-80 KB PNG. Free Cloudinary tier (25 GB / 25 GB
bandwidth) carries:

- **Storage**: 25 GB ÷ 50 KB avg = **~500,000 thumbnails**
- **Bandwidth**: ~16,000 list page views/month before quota

Effectively free at any plausible scale.

### Failure modes (silent — thumbnails are decorative)

| Failure | Behavior |
|---|---|
| Cloudinary down during upload | `generateThumbnailUrl` throws → caught → null. Template's existing `thumbnailUrl` (or null) unchanged. Card shows previous thumbnail OR faux preview. |
| Backend `/getHtml` errors | Same — null. |
| `html-to-image` fails on some CSS edge case | Same — null. |
| User closes tab mid-generation | Browser cancels async chain. Next save tries again. |

User is never blocked. Faux-preview fallback ensures every card still
renders.

### Caveats (intentional V1)

- **Templates pre-this-PR show faux preview** until first save (no
  backfill job V1).
- **Email-client rendering ≠ Chromium** — screenshot looks like a
  modern webmail client. Outlook desktop's quirks aren't captured.
  Acceptable for a card preview.
- **External hot-linked images may not appear** in screenshots due to
  iframe CORS. Cloudinary URLs (the common case after image upload)
  load fine.

---

## Part 2 — Card visual overhauls

### Templates card — three iterations to the final design

#### Iteration A — Faux email preview (shipped first)

Replaced the small icon-on-flat-gradient with a faux email mockup:
category-tinted brand bar, content stripes that vary by category
(promos got image + CTA, newsletters got paragraph stripes, etc.),
brand-color glow on hover. Cards finally read as "this is an email
design", not "this is a settings entry".

#### Iteration B — Real thumbnails added

Once Part 1's pipeline shipped, the card swapped in real screenshots
when `template.thumbnailUrl` was set; faux preview became the fallback
for templates that hadn't been resaved yet. `object-position: top
center` so the email header (the recognizable part) is always visible.

#### Iteration C — Phone-frame mockup (final)

User feedback: "current card layout looks too basic, find a premium
design from Dribbble / Behance / real products". Researched 6 distinct
directions (Vercel-style stripe, Phone-frame mockup, Figma Community
hover-reveal, Notion editorial, Apple multi-shadow, Linear sharp
minimal). User picked the phone-frame mockup — the email rendered
inside an iPhone bezel on a soft warm-tinted stage, with 3D tilt on
hover.

```
┌────────────────────────────────────────┐
│  ┌─ stage (radial brand-tinted) ────┐ ⋮│  ← kebab fades in on hover
│  │   ╭───────────────╮              │  │
│  │   │  ═════         │   ← dyn island
│  │   ├───────────────┤              │  │
│  │   │  email preview │              │  │
│  │   │  (top-anchored)│              │  │
│  │   │      ── ── ── │   ← home bar │  │
│  │   ╰───────────────╯              │  │
│  └───────────────────────────────────┘  │
├────────────────────────────────────────┤
│  Welcome to Khukri          STARTER     │
│  ● welcome  ·  Edited 2 days ago        │
└────────────────────────────────────────┘
```

**Premium signals** the final card carries:

| Element | What it does |
|---|---|
| **iPhone bezel** | Warm near-black (#1a1814), 28px radius, dynamic-island notch, home bar — built in pure CSS, no SVG |
| **Soft tinted stage** | Radial gradient warmed with category brand color; warms further on hover |
| **3D tilt on hover** | `rotate3d(1, -0.2, 0, 6deg)` — phone appears to lift toward the viewer |
| **Multi-layer shadows** | Inner bezel highlight + ambient + drop + brand-tinted glow on hover (4-layer stack) |
| **Brand color identity** | Per-category color (welcome=blue, promo=red, newsletter=emerald, …) drives stage tint + hover glow + category dot + Starter pill |
| **Footer hierarchy** | Big name + Starter pill (if applicable), brand-color dot + capitalized category + relative time |
| **Top-anchored thumbnail** | `object-position: top center` so the email header (banner / logo) is always the first thing seen, not the middle of paragraph stripes |
| **Bottom fade** | Long emails don't cut off harshly — gradient overlay at screen bottom |
| **Kebab on hover only** | Frosted-glass background (blur 8px), opacity 0 at rest, slides in on hover/focus |

### Campaigns card — single status-driven rewrite

The campaigns list had the same basic-feeling cards. Rewrote to
**status-driven internal layouts**: each campaign status renders a
different body, but the frame stays consistent so cards remain
comparable at a glance.

```
DRAFT (muted grey strip)        SENDING (terra strip, spinner spins)
┌──────────────────────────┐   ┌──────────────────────────┐
│ ✏ DRAFT     Started 2h   │   │ ⟳ SENDING    In progress │
│                          │   │                          │
│ Untitled campaign        │   │ Spring promo launch      │
│                          │   │                          │
│ 2 of 5 steps Continue → │   │ 847 of 1,200 sent   70% │
│ ████░░░░░░░               │   │ ███████████████░░░░░    │
└──────────────────────────┘   └──────────────────────────┘

SENT (green strip)              FAILED (red strip)
┌──────────────────────────┐   ┌──────────────────────────┐
│ ✓ SENT       4 days ago  │   │ ⚠ FAILED      1h ago     │
│                          │   │                          │
│ Dashain offer            │   │ Test campaign            │
│                          │   │                          │
│  5,234   5,234    12     │   │   0      12       12     │
│   sent recipients failed │   │  sent  failed   total    │
└──────────────────────────┘   └──────────────────────────┘
```

| Element | What it does |
|---|---|
| **Colored status strip on top** | `data-status` attribute drives `--status` custom property; strip background, icon color, hover halo all derived from it |
| **Draft body** | Wizard progress (X of 5 steps complete) + animated progress bar + "Continue editing →" affordance |
| **Sending body** | Live progress bar matching the report page (sentCount/totalRecipients) + percentage. Spinner icon spins via CSS keyframes. |
| **Sent body** | Tabular figures: sent count, recipients, failed (only if >0). Big numerals, uppercase labels. |
| **Failed body** | Same tabular figures but with failed prominent (red), sent muted |
| **Hover halo** | Brand-tinted by status (green for sent, red for failed, terra for sending) |

### Campaign wizard Step 4 — fix the thumbnail picker

Step 4 (Pick a template) showed the FULL template middle in each card
because the thumbnail `<img>` lacked `object-position: top center`. With
long emails cropped into a 4/3 box at default `center center`, users saw
paragraph stripes from the middle — no header, no branding.

Fixes in [src/styles/components/campaigns/CampaignWizard.module.scss](src/styles/components/campaigns/CampaignWizard.module.scss):

- **`object-position: top center`** — show email header
- **Bottom fade overlay** — matches TemplateCard treatment
- Card radius 12 → 8px, grid min 180 → 200px (slightly bigger pickable cards)
- Selected ring strengthened: `box-shadow: 0 0 0 1px var(--primary)` adds a 2-layer highlight
- Subtle hover shadow added

Result: Step 4 cards look like a mini, picker-version of the
TemplateCard. Same top-anchored thumbnail, same fade, same aesthetic.

---

## Files changed (this PR)

### Backend (1 modified)
- `sendmymail-backend/src/routes/templates.ts` — `thumbnailUrl` on PATCH Zod schema + handler.

### Frontend (8 modified, 1 new, +1 dep)

**Modified:**
- [src/components/templates/TemplateCard.tsx](src/components/templates/TemplateCard.tsx) — rewrite (phone-frame structure)
- [src/components/campaigns/CampaignCard.tsx](src/components/campaigns/CampaignCard.tsx) — rewrite (status-driven body components)
- [src/components/templates/useSaveTemplate.ts](src/components/templates/useSaveTemplate.ts) — fire-and-forget thumbnail pipeline
- [src/lib/api/templates.ts](src/lib/api/templates.ts) — `TemplateUpdateBody.thumbnailUrl`
- [src/styles/components/templates/TemplateCard.module.scss](src/styles/components/templates/TemplateCard.module.scss) — full rewrite (phone bezel, stage, 3D tilt)
- [src/styles/components/campaigns/CampaignCard.module.scss](src/styles/components/campaigns/CampaignCard.module.scss) — full rewrite (status-driven layouts)
- [src/styles/components/campaigns/CampaignWizard.module.scss](src/styles/components/campaigns/CampaignWizard.module.scss) — Step 4 thumbnail picker fix
- `package.json` + `package-lock.json` — `html-to-image` dep

**New (1):**
- [src/lib/thumbnails/generateThumbnail.ts](src/lib/thumbnails/generateThumbnail.ts) — the thumbnail pipeline

### Total
- ~600 lines added across SCSS rewrites
- ~250 lines added in component rewrites
- ~135 lines for the thumbnail pipeline
- 1 new dep, ~10 KB gzipped

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Thumbnail generation** | Browser-side, html-to-image, fire-and-forget at save | Zero backend infra. Uses user's idle compute. Free Cloudinary tier carries storage. |
| **Thumbnail timing** | After save, in background. User sees Save toast immediately. | Save flow latency stays unchanged. Thumbnail lands ~1-3 sec later silently. |
| **Failure UX** | Silent — falls back to faux preview | Thumbnails decorative. Toast "thumbnail generation failed" would annoy. |
| **Template card aesthetic** | Phone-frame mockup with 3D tilt | User picked from 6 researched options. Most "real product showcase" feel. |
| **Category brand colors** | 8 fixed mappings (welcome=blue, promo=red, etc.) + default | Faux preview AND phone-frame stage AND hover glow all derive from this. Single source of truth in `brandFor()`. |
| **Campaign card aesthetic** | Status-driven internal layouts | Each status (draft/sending/sent/failed) carries different info needs. Layouts adapt to the info. Pills + uniform shape weren't carrying meaning. |
| **Step 4 picker style** | Mini version of TemplateCard | Consistency between list page and campaign template picker. Top-anchored, faded, brand-matched. |
| **Thumbnail aspect ratio** | iPhone-realistic 9:18 (160 × 280px) | True iPhone proportions for product-showcase feel. Tall cards trade density for premium. |
| **Phone bezel implementation** | Pure CSS (no SVG, no images) | Smaller bundle, themeable via tokens, easy to tweak |
| **3D tilt** | `rotate3d(1, -0.2, 0, 6deg)` on hover | Subtle enough to feel premium, not gimmicky. Card has `perspective: 1000px` to enable. |

---

## Edge cases

| Case | Behavior |
|---|---|
| Template with no thumbnail yet | Faux preview inside the phone screen — brand bar + content strips suggesting category |
| Template thumbnailUrl returns 404 | Browser shows broken-image icon inside the phone screen. Future polish: `onError` fallback to faux preview |
| Very long email (3000+ px tall) | `object-position: top center` shows top; bottom fade hides hard cut |
| Very short email (just a button) | `object-fit: cover` stretches to fill the phone screen; top-anchored so headers visible |
| User saves rapidly (multiple thumbnails in flight) | Each save spawns its own thumbnail pipeline. Last PATCH wins; intermediate URLs may be orphaned in Cloudinary but harmless. Could dedupe with a debounce later. |
| Browser denies iframe writing (rare CSP) | Try/catch returns null. Faux preview stays. |
| Cloudinary preset rejects upload (quota, type, etc.) | `uploadDataUrl` throws → caught → null. |
| Mobile / touch device | Hover effects don't fire; cards look fine resting. 3D tilt skipped. |

---

## Build + lint

- Backend `tsc --noEmit`: clean
- Frontend `tsc -b --noEmit`: clean
- Frontend `npm run build`: clean (1.70s). Builder chunk unchanged.
  Main chunk grew ~6 KB gzipped for the new thumbnail pipeline +
  html-to-image dep.
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

---

## Out of scope (clean follow-ups)

| Item | Effort | When |
|---|---|---|
| **Backfill thumbnails for existing templates** (one-time script that renders + uploads) | ~2h | After user request — most templates regenerate on next save anyway |
| **Manual thumbnail override** (let users upload a custom image) | ~3h | When users have brand assets they prefer over auto-generated |
| **Lazy generation on-view** | ~2h | If users complain about pre-existing templates always showing faux preview |
| **Backend Puppeteer-based generation** | ~1 day | If browser-side fails too often (haven't seen it yet) |
| **Phone frame variants** (Android, iPad) | ~1h | Visual variety; nice-to-have |
| **Card variants** for sent campaigns showing open rate / click rate | ~3h | After webhook ingestion lands (V2-b in feature-campaigns) |
| **Animated thumbnails** (GIF / WebM of the email scrolling) | ~6h | Polish bonus |

---

## Iteration history (for posterity)

This card took 3 visual iterations to land:

1. **Iter A — Faux preview** (Linear-ish category-tinted content strips)
   - Shipped, user feedback: "still feels too basic"
2. **Iter B — Real thumbnails + bigger / less rounded**
   - Card grew from 156px to 220px tall, radius 14 → 8
   - Real screenshots wired up
   - User feedback: "want premium UX, find from Dribbble"
3. **Iter C — Phone-frame mockup with 3D tilt** (final)
   - Researched 6 distinct directions
   - User picked the phone-frame
   - Built with pure CSS, multi-layer shadows, 3D perspective

The faux preview survived as the fallback inside the phone screen
when no real thumbnail exists yet. The visual learning across all
three iterations: **brand colors carry through every layer** — the
category color shows up in the dot, the Starter pill, the stage tint,
the faux preview bar, the hover glow. One source of truth
(`brandFor()`), eight derived effects.
