# Feature: Editor premium polish (Phase A) — change log

> Closes the "premium feel" gap in the email editor. Two tiers:
>
> **Tier 1 — Interactions** (from [doc/audits/editor-premium-feel.md](../../doc/audits/editor-premium-feel.md)):
> - Floating block toolbar shows on HOVER, not just click
> - Drop zones pulse + invite during drag
> - In-canvas Mobile / Desktop toggle (replaces modal-only flow)
>
> **Tier 2 — UI of the editor surfaces** (added per scoping):
> - **Palette** (left sidebar) — visual tiles + collapsible groups + better breathing
> - **Inspector** (right sidebar) — collapsible sections + better header + slide-in animation
> - **TopBar** — "Saved 2s ago" timestamp + cleaner button hierarchy
> - **Canvas chrome** — subtle backdrop + email-as-card shadow + better selected highlight
>
> Together these make the editor FEEL like a Linear / MailerLite tier
> product, not just a functional MJML compiler.
>
> Frontend-only. Zero backend changes.

---

## Status: ✅ Done — 2026-06-12

Both tiers implemented + a third unplanned round ("fix-editor-chrome")
that came out of a live visual audit against Mailchimp. Verified with
headless-Chrome screenshots of the real builder (deep-linked with a
minted dev JWT), `tsc` clean, `npm run build` clean, lint at the
12-problem pre-existing baseline (0 new).

---

## Done — what actually shipped

### Tier 1 — Interactions
- **Hover-to-show floating toolbar** — `SelectionToolbar` grew a
  `variant='hover'` (subordinate styling, pointer-events off); all 13
  block frames in `renderTree.tsx` render it on hover via the new
  `hoveredId` slice state.
- **Drop zone pulse + invite** — active zones at 28% chrome tint with a
  1.5s pulse; over-state solid; rejected-state red hatching.
- **Mobile/Desktop toggle** — `canvasViewport` slice field; Canvas
  clamps to 375px with a phone bezel; topbar segmented control wired.

### Tier 2 — Editor surfaces
- **Palette** — collapsible groups (chevron + icon + count badge),
  bigger tiles (72px, 8px gap), hover lift + shadow.
- **Inspector** — header redesign (block icon + name + mono tag pill),
  slide-in on selection change, friendly empty state, Delete moved to a
  pinned footer.
- **TopBar** — "Saved · 2s ago" relative time (5s refresh, visibility-
  aware, render-pure), green/pulsing status dot.
- **Canvas chrome** — paper-card email (white, 12px radius, dramatic
  single shadow) on a dot-pattern backdrop.

### Round 3 — fix-editor-chrome (live audit vs Mailchimp)
Driven by screenshots of the running app. Root cause of the "cheap"
feel: terracotta `--color-primary` doubling as tool chrome reads as a
muddy gray-brown hairline on white.
- **New `--color-editor-chrome` token** (vivid blue #2E77F0; dark theme
  #5B96F7; + `-bg` tint) in `src/index.css` ×4 blocks + theme.md §11.
  Used ONLY by editor tool chrome — never product UI.
- **Selection/editing rings → blue**, 2px offset + 3px radius (object,
  not form-field). Social-icon selection too.
- **Old gray hover outlines + `.body` 1px border REMOVED** — the hover
  toolbar is the affordance now; the paper card is the frame.
- **SelectionToolbar → white floating pill** (border, soft shadow,
  28px targets) with a **blue block-name tag** ("Text", "Image") so
  selection reads as "picked up an object".
- **Drop zones → chrome blue** (was primary).
- **Topbar duplicate "Saved" killed** — `SaveTemplateButton` renders
  nothing when clean (left status covers it); when dirty it's the
  *only* filled button in the bar.
- **⌘S / Ctrl+S actually bound** — the old tooltip promised it but no
  handler existed. Lives in `SaveTemplateButton`, works regardless of
  button visibility, always swallows the browser save dialog.

### Bonus bug found during testing
Deep-link / refresh inside the builder bounced to /dashboard (auth
slice booted `anonymous` before /me resolved; `ClientScoped` dropped
the `next` param). Fixed — see
[tasks/fix-builder-deeplink/change_log.md](../fix-builder-deeplink/change_log.md).

### Files touched (frontend only)
- `src/store/slices/editorSlice.ts` — `hoveredId`, `canvasViewport`
- `src/canvas/renderTree.tsx`, `src/canvas/SelectionToolbar.tsx`
- `src/components/Canvas.tsx`, `Palette.tsx`, `Inspector.tsx`
- `src/components/templates/BuilderTopBar.tsx`, `SaveTemplateButton.tsx`
- `src/styles/canvas/renderTree.module.css`, `SelectionToolbar.module.css`,
  `DropZone.module.css`
- `src/styles/components/Canvas.module.css`, `Palette.module.css`,
  `Inspector.module.css`
- `src/styles/components/templates/BuilderTopBar.module.scss`,
  `SaveTemplateButton.module.scss`
- `src/index.css` (+ `doc/theme/theme.md` §11) — editor-chrome tokens
- `src/store/slices/authSlice.ts`, `src/router/guards/index.tsx` —
  deep-link fix (logged in fix folder)

### Verify (manual)
1. Hover any block → white toolbar pill previews; click → blue ring +
   blue name tag; ⌘D duplicates; Del deletes.
2. Drag a palette tile → slim zones glow blue + pulse; hover a zone →
   solid blue bar; drop into mj-body works.
3. Toggle Mobile → canvas animates to 375px phone frame.
4. Edit anything → topbar flips to "Unsaved changes" + filled Save
   appears; ⌘S saves; button disappears; "Saved · just now" ticks.
5. Refresh the browser inside the builder → you stay in the builder.
6. Switch Dark theme → chrome ring brightens, still clearly blue.

### Recommended split

(unchanged from plan) Both tiers shipped as ONE PR.

---

## Why this PR

After the gap audit:

> The "premium feel" gap is mostly micro-interactions, not features.
> Sendmymail's editor feels like a click-to-discover interface.
> Premium editors feel like hover-to-explore. Closing that one gap
> closes 50% of the perception gap vs Mailchimp / MailerLite.

You already have the architecture (`SelectionToolbar`, `FloatingTextToolbar`,
`DropZone` with active/over states, MJML compile pipeline). This PR
**doesn't build anything new** — it polishes 3 existing surfaces
into premium feel.

---

## Scope

### IN — three gaps from the audit

#### Gap 1: Hover-to-show floating block toolbar

The single biggest premium-feel win. Mailchimp / MailerLite / Notion
show actions on **hover**; we only show them on **click selected**.

**Today:**
- Hover any block → nothing
- Click → `selectedId` set → `SelectionToolbar` renders above
- Users must click first to discover actions exist

**After:**
- Hover any block → lighter "hover" variant of `SelectionToolbar`
  appears in ~100ms with drag-handle + actions visible
- Click → standard `SelectionToolbar` (full opacity, persistent) +
  Inspector opens
- Z-index: selected toolbar wins over hover toolbar
- Hover toolbar dismisses cleanly when cursor leaves the block

#### Gap 2: Drop zone polish during drag

**Today:**
- `DropZone.module.css` `.barActive` is `--color-primary` at 12%
  opacity → near-invisible on cream `--color-bg`
- `.barOver` is full primary on cursor-over → fine
- No pulse animation
- Large drop zone (empty container) shows "Drag a block here" but
  not invitingly styled

**After:**
- `.barActive` opacity → 25-30%
- New keyframe pulse animation (1.5s ease-in-out) on `.barActive` to
  signal "drop here"
- Large drop zone gets a clearer dashed-border + "+ Drop block here"
  label that fades in when drag is active
- Rejected state stays as-is (red diagonal stripes — already great)

#### Gap 3: In-canvas Mobile / Desktop toggle

**Today:**
- `PreviewModal` has Desktop / Mobile / Text / HTML — but it's MODAL
- You can't edit while seeing mobile layout
- Have to close modal to make a change, reopen to verify

**After:**
- New toggle in `BuilderTopBar`: `[ ⊟ Desktop | ⊡ Mobile ]`
- Mobile mode = canvas wrapper clamps to 375px wide with phone-frame
  chrome (similar to TemplateCard phone-frame but in-editor)
- Edits work in both modes (real-time MJML compile already supports
  this — just need width clamp)
- `PreviewModal` keeps Text + HTML preview modes (those need full
  modal layout)
- Settings slice gains `canvasViewport: 'desktop' | 'mobile'` field
  persisted to localStorage so users' preference survives reloads

### Tier 2 — UI of the editor surfaces

The audit identified Tier 1 (interactions). But the SURFACES
themselves (palette, inspector, topbar, canvas chrome) are
functional-plain. Tier 2 lifts them to match the interaction polish.

#### 2.A: Palette (left sidebar) — visual tiles + collapsible groups

**Today:**
- 240px wide, white card, cream search
- 2-column tile grid with tiny icons + 11px label
- Categories are headers (LAYOUT / CONTENT / MEDIA / ADVANCED)
- All groups always expanded; long scroll
- Very compact (5px gap, 11px padding) — feels cramped

**After:**
- Each tile is taller (60-72px) with bigger icon + better label
  typography
- Each group header gets a collapse/expand chevron — user can hide
  groups they don't use (preference persisted to localStorage)
- "Layout" group expanded by default; others collapsed
- Better breathing: tile gap 5px → 8px, tile padding 11px → 14px
- Subtle hover lift on tiles (translateY -1px + soft shadow)
- Search keeps current behavior but search results inline below the
  search bar with their own "Search results" header
- Category icons in headers (IconLayoutGrid, IconLetterT, IconPhoto,
  IconCode) — visual anchor

#### 2.B: Inspector (right sidebar) — collapsible sections + slide-in

**Today:**
- 320px wide, white card
- Header: block type (uppercase, muted) + Delete button (top-right)
- All fields stacked sequentially
- No grouping; no animation; Delete at top feels aggressive

**After:**
- Header: block icon + block type name + small "?" tooltip
  ("Headings introduce sections of your email…")
- Fields grouped into collapsible sections per block type:
  - **Content** (text, image src, button label)
  - **Style** (color, font, weight, alignment)
  - **Spacing** (padding, margin — sliders not raw inputs)
  - **Advanced** (CSS class, custom attributes)
- All sections expanded by default; each gets a chevron to collapse
- Section state persisted to localStorage per block type
- Delete button moved to bottom of inspector (less aggressive)
- Slide-in animation when inspector first appears (200ms ease)
- Cleaner field spacing (12px → 14px between fields; section gap 18px)

#### 2.C: TopBar — "Saved 2s ago" + cleaner hierarchy

**Today:**
- 3-cluster grid (back + name | center | save + test send)
- Dirty/Saved indicator visible
- Buttons compete for attention (Save Test send Preview Test send Send)
- No timestamp on save

**After:**
- "Saved 2s ago" relative-time indicator (updates every 5s)
- Center cluster gets the Desktop/Mobile toggle (from Tier 1.3)
- Right cluster organized: Save (primary action, prominent) — Preview
  (ghost) — Test send (ghost)
- Subtle separator between save status + actions
- Template name in center cluster (inline-editable on click) — moves
  brand identity to the center
- Keyboard hint tooltip on Save button (Cmd+S)

#### 2.D: Canvas chrome — backdrop + paper-card + better selected highlight

**Today:**
- Canvas area is just `--color-bg` (cream) flat
- No visual distinction between the email and the "world around it"
- Selected block highlight is functional but plain
- Edge-to-edge with no breathing

**After:**
- Subtle background dot pattern at very low opacity (1-2% dots,
  4px spacing) — adds texture without distraction
- Email is rendered inside a "paper card" — white bg with a multi-
  layer warm shadow (matching the warm editorial theme). Feels like
  the email is a physical document on a desk.
- Better selected-block highlight: primary-tinted dashed outline +
  subtle primary glow (matches drop zone polish from Tier 1)
- More breathing room around the email (24px → 40px padding)
- Subtle gradient on the canvas backdrop in the warm theme

### OUT V1 (deferred to later phases)

| Item | Why deferred | When |
|---|---|---|
| **Image library** (Gap 4) | Bigger surface; new dialog + Cloudinary listing | Phase B (~1 day) |
| **Color picker with brand swatches** | Polish only | Phase C |
| **Undo/redo named history** | Phase C polish | Phase C |
| **`?` keyboard shortcut overlay** | Phase C polish | Phase C |
| **Stunning starter templates** | Design work, separate PR | Phase D |
| **Block palette hover preview** (rendered block preview) | Could ship V2 — needs MJML→HTML compile per-block | V2 |
| **Notion-style `/` command for inline insertion** | New interaction model | V2 |
| **Inline tooltips on inspector controls** | Requires content (copy writing) | V2 |

---

## Data model / state changes

No DB changes. Two small Redux slice additions:

### `editorSlice` — add `hoveredId`

```typescript
interface EditorState {
  // existing
  tree: IMjmlNode;
  selectedId: string | null;
  editingTextId: string | null;
  history: HistoryEntry[];

  // NEW (feature-editor-premium-polish V1)
  hoveredId: string | null;            // null when no block hovered
}
```

Why a slice field (not local state): selection + hover need to
coexist with z-index priority. Hover toolbar of block A can't show
when block B is selected — that conflict needs awareness across
components.

### `editorSlice` — add `canvasViewport` (persisted)

```typescript
canvasViewport: 'desktop' | 'mobile';   // default 'desktop'
```

Persisted to localStorage (`sendmymail-canvas-viewport`) so user's
preference survives reloads. Mirrors the theme system pattern.

---

## Frontend

### New / modified files

**Tier 1 — Interactions:**
```
src/store/slices/editorSlice.ts          (+ hoveredId, + canvasViewport,
                                          + setHovered/setCanvasViewport)
src/canvas/renderTree.tsx                (onMouseEnter/Leave → setHovered;
                                          useIsHovered hook)
src/canvas/SelectionToolbar.tsx          (variant: 'selected' | 'hover')
src/canvas/SelectionToolbar.module.css   (hover-variant: subtler bg, smaller)
src/canvas/DropZone.module.css           (opacity bump + pulse keyframe +
                                          larger-zone polish)
src/components/Canvas.tsx                (canvasViewport width clamp +
                                          phone-frame chrome on mobile)
src/components/Canvas.module.css         (mobile width clamp + chrome)
src/components/templates/BuilderTopBar.tsx (Desktop/Mobile toggle)
src/styles/components/templates/BuilderTopBar.module.scss (toggle styles)
```

**Tier 2 — UI polish (8 surfaces):**

```
# 2.A: Palette
src/components/Palette.tsx                (chevron collapse per group;
                                          group state persisted)
src/styles/components/Palette.module.css  (taller tiles, hover lift,
                                          category icons, collapsed state,
                                          search-results header)

# 2.B: Inspector
src/components/Inspector.tsx              (header redesign: icon + name;
                                          collapsible section wrapper)
src/components/inspector/InspectorSection.tsx (NEW reusable collapsible
                                                section component)
src/components/inspector/InspectorHeader.tsx  (NEW header w/ block icon)
src/styles/components/Inspector.module.css    (header styles; slide-in
                                                animation; section styles;
                                                spacing improvements;
                                                delete-at-bottom)
src/styles/components/inspector/InspectorSection.module.css (NEW)
src/styles/components/inspector/InspectorHeader.module.css  (NEW)

# 2.C: TopBar
src/components/templates/BuilderTopBar.tsx (relative-time saved indicator;
                                            inline-edit template name;
                                            button hierarchy reorder)
src/store/slices/editorSlice.ts            (+ lastSavedAt timestamp tracking)
src/styles/components/templates/BuilderTopBar.module.scss (separator,
                                                          button hierarchy)

# 2.D: Canvas chrome
src/components/Canvas.tsx                 (paper-card wrapper around tree)
src/components/Canvas.module.css          (dot pattern bg; paper-card
                                            shadow; better selected
                                            highlight; more breathing)
src/canvas/renderTree.module.css          (selected-state polish — primary
                                            dashed outline + glow)
```

### Hover toolbar implementation sketch

In `renderTree.tsx`, wherever a block is rendered:

```typescript
const isSelected = useIsSelected(node._id);
const isHovered  = useIsHovered(node._id);
const showHoverToolbar = isHovered && !isSelected;

return (
  <div
    className={...}
    onClick={onSelect}
    onMouseEnter={() => dispatch(setHovered(node._id))}
    onMouseLeave={() => dispatch(setHovered(null))}
  >
    {isSelected && <SelectionToolbar path={path} variant="selected" />}
    {showHoverToolbar && <SelectionToolbar path={path} variant="hover" />}
    {/* block content */}
  </div>
);
```

Hover variant styling: same toolbar, but:
- 80% opacity (vs 100%)
- Slightly smaller (24px vs 28px buttons)
- No `cursor: grab` styling change (looks lighter)

### Drop zone pulse animation

```css
@keyframes dropZonePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}

.barActive {
  background: color-mix(in srgb, var(--color-primary) 28%, transparent);
  animation: dropZonePulse 1.5s ease-in-out infinite;
}

.barOver {
  /* full primary, NO animation (over takes priority) */
  background: var(--color-primary);
  animation: none;
}
```

Respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .barActive { animation: none; }
}
```

### Mobile/Desktop toggle in canvas

```typescript
// Canvas.tsx
const viewport = useAppSelector((s) => s.editor.canvasViewport);

<div
  className={`${styles.canvasWrap} ${viewport === 'mobile' ? styles.canvasMobile : ''}`}
>
  {/* tree rendering — unchanged; CSS handles the width */}
</div>
```

```css
/* Canvas.module.css */
.canvasWrap {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  transition: max-width 220ms cubic-bezier(.2, .8, .25, 1);
}

.canvasMobile {
  max-width: 375px;
  border: 8px solid #1a1814;     /* phone bezel */
  border-radius: 24px;
  padding: 8px 0;
  /* Phone-frame visual chrome */
}
```

The MJML preview already responds to viewport changes (we use real
compile). The clamp visually narrows it; nothing structural to
change.

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Hover state is global (slice), not local** | `hoveredId` in editorSlice | Selection + hover need cross-component awareness for z-index priority |
| **Hover toolbar = same component, `variant` prop** | Pass `variant: 'selected' \| 'hover'` to SelectionToolbar | Single source of truth for actions. No code duplication. |
| **Hover toolbar styling: lighter, smaller** | 80% opacity + 24px buttons (vs 28px) | Visually subordinate to the selected state so they don't compete |
| **Hover toolbar dismisses on mouse leave** | onMouseLeave → setHovered(null) | Standard pattern; no debounce V1 |
| **Drop zone pulse: 1.5s cycle** | `dropZonePulse` keyframe | Slow enough to feel breathing, not anxious |
| **Drop zone opacity bump** | 12% → 28% | Visible against cream bg without overwhelming the canvas |
| **Reduced-motion respect** | `@media (prefers-reduced-motion: reduce)` disables pulse | Accessibility |
| **Mobile width** | 375px (iPhone SE / 12-mini) | Industry standard for "mobile" preview width |
| **Mobile chrome** | 8px dark bezel + 24px radius | Subtle phone-frame visual; not full iPhone mockup (busy) |
| **Viewport state persisted** | localStorage key `sendmymail-canvas-viewport` | User preference survives reloads (matches theme pattern) |
| **PreviewModal stays for Text/HTML modes** | Don't gut what works | Modal makes sense for non-canvas modes; in-canvas toggle handles the most-used cases |
| **No keyboard shortcut for viewport toggle V1** | Skip Cmd-M binding | Phase C — keyboard shortcuts get their own overlay PR |

#### Tier 2 — UI polish decisions

| Decision | Choice | Why |
|---|---|---|
| **Palette tile size** | 60-72px tall (was ~50px) | More breathing room; matches Mailchimp / MailerLite proportions |
| **Palette group collapse state persisted** | localStorage key `sendmymail-palette-groups` | Survives reloads; user discovers their preferred layout |
| **Palette: which groups default open?** | Only `LAYOUT` and `CONTENT` expanded; `MEDIA` + `ADVANCED` collapsed | "Most used" defaults |
| **Inspector: collapsible sections** | All 4 sections expanded by default | First-time discoverability over compactness; user can collapse |
| **Inspector: section collapse persisted per block type** | localStorage key `sendmymail-inspector-sections-{blockType}` | Different block types have different "noise" — letting user pin their preference |
| **Inspector header** | Block icon + name + tooltip "?" | Helps users learn what each block does |
| **Inspector slide-in** | 200ms ease (matches body theme transition pattern) | Consistent with theme switch animation timing |
| **Delete button position** | Bottom of inspector, NOT top header | Less aggressive; user can't accidentally click while configuring |
| **TopBar template name** | Inline-editable on click | One-click rename. Notion / Linear pattern. |
| **TopBar saved indicator** | Relative time with 5s refresh | Standard SaaS pattern (Notion, Google Docs) |
| **Save button (TopBar)** | Visually primary | Hierarchy — most-used action stands out |
| **Canvas backdrop pattern** | 2% dot pattern, 4px spacing | Texture without distraction; theme-aware |
| **Canvas paper-card** | White bg + multi-layer warm shadow | Email feels physical; matches phone-frame card pattern from TemplateCard |
| **Canvas padding** | 24px → 40px (more breathing) | The "world around the email" feels intentional |
| **Selected-block highlight** | Primary dashed outline + 1-layer glow | Matches drop-zone polish; less plain than current solid outline |
| **All Tier 2 transitions** | 200ms ease, respect `prefers-reduced-motion` | Same standard as theme + skeleton system |

---

## Edge cases

| Case | Behavior |
|---|---|
| User hovers Block A, then clicks Block A | Hover toolbar hidden (selected wins); selected toolbar shown |
| User hovers Block A while Block B is selected | Selected toolbar of B stays visible; A's hover toolbar appears subordinate |
| User clicks empty canvas area | Deselect (selectedId → null); hover toolbar dismisses with cursor leaving last hovered block |
| Drag starts → all drop zones pulse | Pulse animation respects reduced-motion; static when disabled |
| User switches Desktop→Mobile mid-edit | Canvas re-flows; selection persists; inspector stays open |
| User refreshes in Mobile mode | localStorage restores Mobile; canvas opens at 375px |
| Mobile mode + selected block | Floating toolbars repositioned correctly (existing positioning code handles parent bounds) |
| Touch device | Hover model has no analog on touch; long-press could trigger selected state (V2) |
| Reduced-motion user | No pulse on drop zones; canvas viewport transition becomes instant |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Hover a block (not selected) | Hover toolbar appears in <150ms with drag handle + actions |
| Move cursor to another block | Previous hover toolbar disappears; new one appears |
| Click a block | Hover toolbar disappears; selected toolbar appears (persistent) |
| Move cursor away from selected block | Selected toolbar stays; hover state cleared |
| Click empty canvas | Both selection + hover cleared |
| Start dragging a palette block | All valid drop zones pulse subtly (or static if reduced-motion) |
| Drag over a valid drop zone | Pulse stops on that zone; full-primary `barOver` shows |
| Drag over an invalid drop zone | Red stripes pattern shows (existing behavior) |
| Drop is invalid | Block returns to palette (existing); rejected state clears |
| Click Mobile toggle in topbar | Canvas clamps to 375px with phone-frame border in ~220ms |
| Edit text in Mobile mode | ContentEditable works as in Desktop |
| Refresh in Mobile mode | Reloads in Mobile mode (localStorage persisted) |
| Switch to Desktop | Canvas expands back to 720px max with same animation |
| User has `prefers-reduced-motion: reduce` | No drop-zone pulse; canvas viewport switches instantly |

### Tier 2 — UI polish acceptance criteria

| Scenario | Expected |
|---|---|
| Click chevron on palette group "MEDIA" | Group collapses; tiles hide; chevron rotates |
| Refresh after collapsing groups | Groups stay collapsed (localStorage hydrated) |
| Search "image" with all groups collapsed | "Search results" header appears; matches shown inline |
| Click a block | Inspector header shows block icon + name |
| Click inspector section "Spacing" chevron | Section collapses; spacing fields hide |
| Refresh after collapsing inspector section | Section stays collapsed per block type |
| Delete button location | Bottom of inspector with separator above |
| Save with edits | "Saved 2s ago" appears in topbar; updates every 5s |
| Click template name in topbar | Becomes editable input; blur saves; Cmd-S works |
| Resize browser narrow | Canvas paper-card stays centered with adequate breathing |
| Switch to dark theme mid-edit | Dot pattern + paper-card shadow adapt smoothly |
| User on reduced-motion | Inspector slide-in skipped; collapse animations instant |
| User has palette group state from before | localStorage restores on next visit |
| Click selected block in mobile mode | Highlight + toolbar position correctly within 375px |

### Tier 2 — UI polish edge cases

| Case | Behavior |
|---|---|
| User collapses all palette groups | Empty state with "Expand a group above" hint |
| User refreshes after collapsing groups | localStorage restores state — groups stay collapsed |
| Search active + groups collapsed | Search overrides — shows results inline regardless of collapse state |
| Inspector with no block selected | Friendly empty state: icon + "Select a block to edit" |
| User clicks Delete on inspector | Same destructive-confirm pattern — but now at bottom of panel |
| User edits template name in TopBar | Click → ContentEditable → blur saves; Cmd-S also saves |
| Save state changes during user idle | "Saved 2s ago" → "Saved 1m ago" → "Saved 8m ago" |
| Canvas dot pattern in dark theme | Theme-aware: pattern adapts using `var(--color-line-soft)` |
| Mobile mode + paper card | Paper card respects width clamp; no horizontal overflow |
| Theme switch mid-edit | Canvas backdrop + paper card colors update smoothly (existing body transition handles) |
| User has `prefers-reduced-motion: reduce` | Inspector slide-in becomes instant; no collapse-animations |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Main chunk +~1 KB gzipped (hover + viewport state) |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual: hover model works | Hover any block → toolbar appears; click → selected toolbar replaces |
| Manual: drop zones invite during drag | Visible pulse on all valid targets |
| Manual: mobile toggle works | Click → canvas narrows + phone chrome; edits still work |
| Manual: viewport persistence | Refresh in Mobile → stays in Mobile |
| Manual: reduced-motion respected | DevTools emulate `prefers-reduced-motion: reduce` → no pulse, no viewport animation |

---

## Implementation order (when authorized)

**Step 1 — Slice updates (~30 min)**
1. `editorSlice.ts`: add `hoveredId: string | null` + `setHovered` action
2. Add `canvasViewport: 'desktop' | 'mobile'` + `setCanvasViewport` action
3. localStorage hydration for `canvasViewport` (on store init)

**Step 2 — Hover toolbar (~5-6h)**
4. `useIsHovered(id)` hook in `renderTree.tsx` (mirrors `useIsSelected`)
5. `onMouseEnter` / `onMouseLeave` handlers on every selectable frame
6. `SelectionToolbar` accepts `variant: 'selected' | 'hover'` prop
7. `SelectionToolbar.module.css` gets `.toolbarHover` variant
   (smaller buttons, lower opacity, subordinate styling)
8. Render hover toolbar conditionally: `isHovered && !isSelected`
9. Verify z-index: selected > hover > drop zones

**Step 3 — Drop zone polish (~3h)**
10. Bump `.barActive` opacity 12% → 28%
11. Add `@keyframes dropZonePulse` + apply to `.barActive`
12. Add `@media (prefers-reduced-motion: reduce)` to disable animation
13. Large drop zone (empty container) gets a clearer "+ Drop here" label
    + dashed border on hover

**Step 4 — Mobile/Desktop toggle (~5-6h)**
14. `BuilderTopBar.tsx`: add toggle component with Desktop / Mobile pills
15. `Canvas.tsx`: read `canvasViewport` from slice + apply class
16. `Canvas.module.css`: `.canvasMobile` clamps width to 375px +
    phone-frame chrome (8px bezel + 24px radius)
17. Smooth transition (220ms cubic-bezier)
18. Verify selection + drag still work in Mobile mode

**Step 5 — Tier 1 verify (~30 min)**
19. `tsc -b --noEmit` clean
20. Manual E2E: hover, drag, mobile toggle work

---

**Step 6 — Tier 2.A: Palette polish (~6h)**
21. Add chevron + collapse state to `Palette.tsx`
22. localStorage hydration for group state
    (key `sendmymail-palette-groups`)
23. Tile size bump (60-72px) + better label typography
24. Hover lift animation (`translateY(-1px)` + soft shadow)
25. Category icons in group headers
26. Search results header when search is active

**Step 7 — Tier 2.B: Inspector polish (~6h)**
27. New `InspectorHeader.tsx` component (icon + name + tooltip)
28. New `InspectorSection.tsx` collapsible wrapper
29. Refactor existing per-block inspector panels to use sections
    (Content / Style / Spacing / Advanced)
30. localStorage hydration for section state per block type
31. Delete button moved to bottom; visual separator above
32. Slide-in animation (200ms ease from right)
33. Empty state ("Select a block to edit") with friendly icon

**Step 8 — Tier 2.C: TopBar polish (~3h)**
34. `lastSavedAt` timestamp tracked in editorSlice
35. Relative-time formatter (`Saved 2s ago` → `1m ago` → `8m ago`)
36. 5s interval refresh while page is visible
37. Template name → inline-editable (click to rename)
38. Button hierarchy: Save (primary) — Preview — Test send
39. Subtle separator between save status + actions
40. Cmd-S tooltip on Save button

**Step 9 — Tier 2.D: Canvas chrome (~3h)**
41. Subtle dot-pattern backdrop (`background-image: radial-gradient(...)`)
42. Paper-card wrapper around the email (white bg + multi-layer warm shadow)
43. More breathing room: padding 24px → 40px
44. Polish selected-block highlight (primary dashed outline + glow)
45. Verify theme-aware (Dark + White) — pattern + shadow adapt

**Step 10 — Final verify (~1h)**
46. `tsc -b --noEmit` clean
47. `npm run build` + bundle size check
48. `npm run lint` no new issues
49. Manual E2E (in all 3 themes):
    - Tier 1 still works
    - Palette groups collapse/expand
    - Inspector sections collapse/expand
    - Saved 2s ago updates
    - Inline template name rename
    - Paper-card shadow visible + theme-aware
50. Verify `prefers-reduced-motion` honored across all transitions
51. Update change_log Done entry

---

## What this unlocks

### After Tier 1 (interactions):
- **Discoverability** — actions appear on hover, not by guessing
- **Drag confidence** — premium feel during drag with inviting drop zones
- **Mobile-first workflow** — agencies build emails that work on phones (60-80% of opens are mobile)

### After Tier 2 (UI polish):
- **Palette feels organized** — collapsible groups + bigger tiles + breathing
- **Inspector feels intentional** — sectioned, animated, friendly empty states
- **TopBar feels alive** — "Saved 2s ago" updates in real-time; inline rename
- **Canvas feels designed** — email is a paper card on a textured backdrop, not edge-to-edge
- **Theme system pays off** — Dark + White modes now feel premium in the editor too

### Together:
The editor matches the polish level of the rest of the app (skeletons,
optimistic UI, themes). When demoing to beta prospects, the editor is
no longer the "weak link" — it's a featured surface.

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| Phase B | Image library + "Saved 2s ago" indicator | 1-1.5 days |
| Phase C | Color picker with brand swatches + undo/redo named history + `?` overlay + inspector slide-in | 1.5-2 days |
| Phase D | 5 redesigned stunning starter templates | 2 days (design + MJML) |
| V2-a | Block palette hover preview (shows what block will look like) | 4h |
| V2-b | Notion-style `/` command for inline block insertion | 1 day |
| V2-c | Touch-device long-press → select | 4h |
| V2-d | Multi-block selection + bulk actions | 1 day |
| V2-e | Section saving — save a section to "my snippets" for reuse | 1 day |

---

*Plan locked. Ready to implement when authorized.*
