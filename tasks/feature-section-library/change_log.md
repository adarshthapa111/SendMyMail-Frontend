# Feature: Section library + two-level palette (MailerLite-style)

> The "soo easy to create" gap vs MailerLite isn't polish — it's that
> MailerLite sells **pre-designed sections** ("Logo + Navigation",
> "Extended blog feature") while we sell LEGO bricks (Text, Button).
> This PR adds a library of ~15 fully-styled section composites and
> reworks the palette into MailerLite's two-level layout: a slim
> category rail + a flyout panel with **live mini-previews** of each
> section.
>
> Frontend-only. Zero backend changes. Zero tree/operations changes —
> a composite is just a factory that returns a bigger subtree.

## Status: ✅ Done — 2026-06-12

---

## Plan

### 1. Registry extension (`blocks/registry.ts`, `blocks/categories.ts`)

- `BlockDef` gains `kind: 'element' | 'section-composite'`.
  Elements render as icon tiles (current behavior); composites render
  as live mini-previews in the flyout.
- `PaletteGroup` widens to the rail categories:
  `elements · layout · header · hero · features · gallery · cta · footer`.
  Old groups (content/media/advanced) merge into `elements` —
  8 primitives is one comfortable tile grid, and MailerLite does the
  same ("Elements" is one rail entry).
- Drop semantics UNCHANGED: every composite is `category: 'section'`
  so `CONTAINER_ACCEPTS` and the auto-wrap rule in EditorBody work
  as-is.

### 2. Section factories (`blocks/library/*.ts`, pure TS)

One file per rail category, multiple factories per file (precedent:
`blocks/sections.ts`). All composites use neutral, email-safe styling
(Helvetica stack, near-black ink, gray placeholders as inline SVG
data-URIs) so they look clean in any brand context.

| File | Factories |
|---|---|
| `library/headers.ts` | logo only · logo + nav links · logo + button |
| `library/heroes.ts` | image-bg hero + CTA · headline hero (no image) · image-top hero |
| `library/features.ts` | feature row (img + text) · double blog cards · 3-step features |
| `library/galleries.ts` | 2×2 grid · 3-across row |
| `library/cta.ts` | centered CTA · banner CTA (tinted bg) |
| `library/footers.ts` | simple footer (social + unsubscribe) · full footer (nav + social + legal) |

15 composites + the existing basic `mj-hero` block moves into the
`hero` group.

### 3. Two-level palette (`components/palette/`)

- `Palette.tsx` becomes the orchestrator: search box on top, then
  **CategoryRail** (slim vertical list: icon + label + count) +
  **Flyout** (panel that opens to the right of the rail, overlaying
  the canvas edge — canvas does NOT reflow).
- `components/palette/CategoryRail.tsx` — rail entries; active state.
- `components/palette/Flyout.tsx` — panel: elements show the icon
  tile grid; composites show stacked preview cards (label + live
  mini-render). Esc / X / re-click closes. Drag start auto-closes the
  flyout so the canvas is visible while dragging.
- `components/palette/SectionPreview.tsx` — pure presentational
  mini-renderer: walks an `IMjmlNode` subtree and renders an
  approximation at 600px wide inside a `transform: scale()` wrapper
  (~0.45). No hooks, no dnd, no selection — display only. Handles the
  tags the library uses (section/column/text/image/button/divider/
  spacer/social/navbar/hero); unknown tags render as a gray bar.
- Styles mirrored at `styles/components/palette/*.module.scss`.
- localStorage: `sendmymail-palette-category` (active rail entry).
  The old `sendmymail-palette-groups` collapse key is obsolete.

### 4. What does NOT change

- Drag data shape (`PaletteDragData`) — flyout cards emit the same
  `{source:'palette', blockId, category, label}`.
- DropZone, EditorBody.onDragEnd, tree ops, idPathCache — untouched.
- Inspector — composites decompose into ordinary nodes once dropped;
  every piece is editable with the existing inspectors.

### 5. Out of scope (later phases)

- Per-client brand kit (Phase 2) — factories will read it when it exists.
- Saved blocks (Phase 3, backlog V2-e).
- Searching INSIDE preview content.

---

## Done

Shipped per plan, plus three mid-build user requests: hover-to-open,
a premium rail redesign, and two extra categories (Table, Video).
Verified end-to-end with headless-Chrome screenshots of the live
builder. tsc clean · build clean (+1.2 KB gz) · lint at the 12-problem
pre-existing baseline.

### What shipped

**21 pre-designed section composites** across 8 rail categories
(`blocks/library/*.ts` — pure TS factories):

| Category | Composites |
|---|---|
| Header | Logo · Logo + Navigation · Logo + Button · Centered + Navigation |
| Hero | Headline · Image background · Image-top · Split |
| Features | Feature row · Double cards · 3 steps · Announcement · Testimonial · Product cards |
| Gallery | 3 across · 2×2 grid · Captioned images |
| Table | Simple table · Order summary |
| Video | Video thumbnail (play-button SVG, links out) |
| CTA | Centered · Banner · Promo code |
| Footer | Simple · Full |

**Two-level palette** (`components/palette/`):
- `CategoryRail` — icon chips + 14px labels + chevrons, clustered with
  hairline dividers; pinned entry gets accent bar + filled chip.
- `Flyout` — opens on HOVER (260ms leave grace), CLICK pins it open;
  Esc/✕/re-click closes. Elements render as icon tiles; composites as
  borderless full-bleed live previews. Drag start auto-closes the
  flyout. Overlays the canvas (no reflow).
- `SectionPreview` — pure mini-renderer at 600px base scaled via
  `zoom` (so the layout box shrinks too). One cached factory call per
  block id for stable previews; factories re-run at drop time so
  dropped nodes always get fresh `_id`s.

### Decisions locked in
- Tables are HTML `<table>` inside mj-text, NOT mj-table — the canvas
  renderer + text inspector already handle mj-text HTML; mj-table
  would land as an "unknown" block in the editor.
- Old palette groups (content/media/advanced) merged into `elements`.
- The old `sendmymail-palette-groups` collapse key is obsolete; the
  pinned category persists under `sendmymail-palette-category`.
- `BlockDef.kind` (`element` | `section-composite`) controls flyout
  rendering; drop semantics stay 100% on `category`.

### Files
- `src/blocks/categories.ts` — PaletteGroup widened to 10 categories
- `src/blocks/registry.ts` — +21 composites, `kind` field
- `src/blocks/library/{shared,headers,heroes,features,galleries,cta,footers,tables,videos}.ts` — new
- `src/components/Palette.tsx` — rewritten as orchestrator (hover/pin state)
- `src/components/palette/{CategoryRail,Flyout,SectionPreview}.tsx` — new
- `src/styles/components/Palette.module.css` — rewritten
- `src/styles/components/palette/{CategoryRail,Flyout,SectionPreview}.module.scss` — new

### Post-ship fixes (same day, found by E2E drag test + user)

1. **Drops from the flyout silently failed** — two stacked causes:
   - The flyout unmounted the instant a drag started (close-on-drag) —
     dnd-kit CANCELS a drag when the active draggable unmounts. Fixed:
     the flyout stays MOUNTED during a palette drag, visually hidden
     (`visibility:hidden`, `useDndMonitor` in Palette freezes the open
     group in `dragGroup` until drag end/cancel).
   - Even with that fixed, section composites were near-undroppable:
     the only zones that accept `category:'section'` are the thin
     body-level gaps; every zone inside an existing section rejected
     them (red hatch). Fixed with **section bubble-up** (MailerLite
     behavior): a section dropped anywhere INSIDE a section inserts at
     body level right after it (EditorBody.onDragEnd reads the
     enclosing section index from the zone's parentPath); DropZone
     shows those zones as valid (blue).
2. **Selection ring on sections read as a gray border** — the 2px
   outward offset detached the ring from full-bleed sections (lines
   above/below + white gap). Sections/heroes/columns now use an INSET
   ring (offset −2px, no radius); leaf blocks keep the offset halo.
3. **No ring on fresh drops** — sections land WITHOUT auto-select
   (ring appears on click only). Leaf elements keep auto-select so
   their inspector opens for immediate editing.
4. **White line between adjacent blocks** — the slim drop-zone strip
   (16px tall, −6px margins) left a 4px visible gap between sections;
   between a dark section and an image it read as a white border.
   Margins now fully cancel the height (−8px) so blocks touch
   seamlessly, matching the compiled email. Hit geometry unchanged.
5. **Image height was not adjustable** (related inspector gap, user
   report) — ImageInspector never exposed mj-image's `height` attr.
   Added a Height field (px-only, empty = auto/aspect-ratio;
   `NumberInput` grew a `placeholder` prop) and the canvas `<img>` now
   applies the attr so the stretch matches the compiled output.
6. **Canvas dropped column padding/background** — gallery gaps showed
   in preview but not canvas. ColumnFrame now applies `padding`
   (+ individual sides), `background-color`, `box-sizing: border-box`.
   Canvas image default padding corrected to mj-image's compile
   default `10px 25px`. Drop-zone gap collapse made body-level only
   (zones inside columns keep their 4px aim gap).
7. **Column gap control** — MJML has no native `gap`; new
   `setColumnGap` reducer writes `padding-left/right = gap ÷ 2` onto
   every child column in ONE undoable step. Surfaced on BOTH
   SectionInspector and ColumnInspector (users click columns, rarely
   sections). Verified live: 24px gap applied across a 3-col gallery.
8. **+4 header/footer variants** (user request) — Navigation only,
   Logo + Social, Minimal footer, Contact footer (CAN-SPAM friendly
   postal address + contact links). 25 composites total.
9. **Invisible scrollbars** — rail + flyout scroll full-height with
   `scrollbar-width: none` / `::-webkit-scrollbar { display: none }`.

Verified end-to-end in headless Chrome: drag Banner CTA → drops next
to the hovered section → appears in canvas → "Unsaved changes" → and
renders in the compiled Preview iframe (`banner text in iframe: 1`).

### Follow-up: monochrome social + richer footers (2026-06-13, user req)
- `blocks/library/socialIcons.ts` — NEW: B&W (single-color) SVG glyphs
  for Instagram, Facebook, TikTok, X as data-URIs. `social()` default is
  now these 4, 18px (was 3 full-color built-ins, 20px), with
  `background-color: transparent` to drop the colored circle.
  Verified live: 4 icons render at 18px, order insta/fb/tiktok/x.
  ⚠ Caveat documented in the file: data-URI SVG renders in editor +
  preview + modern webmail, but Outlook desktop / parts of Gmail block
  it — host PNG versions for production sends.
- Footers: Contact footer gained the social row; new **Link columns**
  footer (3 link columns + brand + social + legal, built on mj-wrapper
  so it's 2 stacked sections in one composite). 5 footer variants total.
- 26 composites total now (was 25).
- `SectionPreview` fixes so the flyout cards match the dropped result:
  (a) `mj-social` renders the real icon `src` images (was gray dots);
  (b) added an `mj-wrapper` case — the Link-columns footer's root is a
  wrapper, so without it that card rendered as the gray "unknown" bar.

### Verify (manual)
1. Hover rail entries → flyout previews each category; move into the
   flyout → stays open; leave both → closes after a beat.
2. Click "Call to action" → pins (accent bar); mouse away → stays.
3. Drag "Order summary" onto the canvas → flyout closes, blue drop
   zones glow, drop inserts a fully-styled section; every inner piece
   (text/image/button) is editable with existing inspectors.
4. Save → preview → compiled HTML matches the composite.
5. Search "logo" → flyout shows matches across categories.
