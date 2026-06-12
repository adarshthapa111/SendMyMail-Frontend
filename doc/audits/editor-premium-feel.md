# Editor premium-feel audit

> Side-by-side gap analysis: sendmymail's email editor vs Mailchimp /
> MailerLite / Beefree. What we already have, what we're missing,
> and the prioritized fix list.
>
> **TL;DR**: You have ~80% of the premium-editor architecture
> already. The "vibes" gap is mostly **micro-interaction polish + 4
> missing features**, not "build a new editor from scratch."

---

## Architecture overview (what's there)

```
src/components/
  EditorBody.tsx        ← DndContext + Palette + Canvas + Inspector + FloatingTextToolbar
  Canvas.tsx            ← The page where the email renders
  Palette.tsx           ← Block library (left sidebar), categorized groups
  Inspector.tsx         ← Right sidebar (per-block-type sub-components)
  inspector/            ← Inspector panels (Text, Button, Image, Section, etc.)
  PreviewModal.tsx      ← Desktop/Mobile/Text/HTML preview (MODAL)
  templates/
    BuilderTopBar.tsx   ← Top bar (name, dirty state, Save, Preview, Test send)
    SaveTemplateButton, TestSendButton, ...

src/canvas/
  renderTree.tsx        ← Recursive renderer; handles selection + click-to-edit
  SelectionToolbar.tsx  ← Floating ACTION BAR for the SELECTED block (drag + duplicate + delete + reorder)
  DropZone.tsx          ← Slim + large drop targets with active/over/rejected states
  DragChip.tsx          ← Custom drag ghost
  FloatingTextToolbar.tsx ← Inline B/I/U/Link bar when editing text
  ContentEditable.tsx   ← In-place text editing
```

This is a real architecture. Not a shortcut.

---

## ✅ What you ALREADY have (premium-tier)

These match or beat what Mailchimp / MailerLite ship:

| Feature | Status | Notes |
|---|---|---|
| **Floating action toolbar above selected block** | ✅ | `SelectionToolbar` — drag handle + ↑↓ reorder + duplicate + delete |
| **Inline text editing with formatting bar** | ✅ | `ContentEditable` + `FloatingTextToolbar` (B/I/U/Link) |
| **Custom drag ghost** | ✅ | `DragChip` shows the block label while dragging |
| **Drop zones with active/over/rejected states** | ✅ | `DropZone` has 5 visual states; rejected shows red diagonal stripes |
| **Per-block-type Inspector** | ✅ | 12 specialized inspector panels (Text, Button, Image, Section, Column, etc.) |
| **Block palette with categorized groups** | ✅ | `Palette` groups by `PALETTE_GROUP_ORDER` with labels |
| **Layout block visuals** (column count icons) | ✅ | `ColumnVisual` shows N rectangles — matches Beefree |
| **Preview with Desktop / Mobile / Text / HTML toggle** | ✅ | `PreviewModal` has all 4 modes |
| **Test send before launch** | ✅ | `TestSendButton` auto-saves + sends to user's email |
| **Save state indicator** | ✅ | BuilderTopBar shows "Unsaved changes" / "Saved" |
| **MJML compiled preview** | ✅ | Real MJML → HTML via backend, not approximation |
| **Image upload** | ✅ | Cloudinary integration (`uploadPendingImages`) |
| **History (undo/redo)** | ✅ | Redux + `pushHistory` with 50-step cap |
| **Search in Palette** | ✅ | Filter blocks by name |

That's about **80% of what makes a premium editor premium.** You're not starting from scratch.

---

## 🔴 The 5 biggest gaps (prioritized by ROI)

These are what creates the perception gap vs Mailchimp / MailerLite.

### Gap 1: Actions only show on SELECTION, not on HOVER

**The pattern in Mailchimp / MailerLite / Notion:**

Hover ANY block → floating control bar appears in 100ms. No click needed. Drag handle + settings + duplicate + delete all visible.

**Why it matters:** Discoverability. New users SEE actions on the first hover. They learn the interface without reading docs.

**Current behavior in sendmymail:**
- Hover → nothing
- Click → block selected → `SelectionToolbar` appears
- User must click first to discover actions exist

**Fix:**
- Add hover state in `renderTree.tsx` (currently only tracks `isSelected`, no `isHovered`)
- Show a LIGHTER version of `SelectionToolbar` on hover
- Full `SelectionToolbar` appears on click (selected state)
- The selected toolbar stays put even when mouse leaves

**Effort:** ~6-8h. Requires:
- New `hoveredId` slice field
- `useIsHovered(id)` hook (mirror of `useIsSelected`)
- Hover handler on each selectable frame
- New "hover" variant of `SelectionToolbar.module.css` (subtler styling)
- Z-index dance so hover toolbar doesn't fight selected toolbar

**Impact:** ⭐⭐⭐⭐⭐ — single biggest "premium feel" upgrade

---

### Gap 2: Drop zones are subtle; don't pulse / invite

**The pattern in Mailchimp / Beefree:**

When dragging starts, EVERY valid drop target pulses subtly with primary-tinted background. Cursor never wonders "where can I drop this?"

**Current behavior:**
- Drop zones use `barActive` (12% primary background) when ANY drag is active
- `barOver` (full primary) when cursor is IN the drop zone
- ✅ The states exist
- ❌ The visual is faint; no pulse; no "drop here" label

**Look at DropZone.module.css line 30:**
```scss
.barActive {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}
```

12% opacity is invisible against a `--color-bg` of cream. The "you can drop here" affordance is too quiet.

**Fix:**
- Bump `barActive` opacity to 25-35%
- Add a `pulse` animation (subtle 1.5s ease in-out brightness shift)
- For LARGE drop zones (empty containers), show a clear "+ Drop here" label that fades in on drag start

**Effort:** ~3-4h. Pure CSS — no JS changes.

**Impact:** ⭐⭐⭐⭐ — premium drag feedback

---

### Gap 3: Preview toggle is in a MODAL, not in-canvas

**The pattern in Mailchimp / MailerLite:**

A toggle in the topbar (Desktop / Mobile) switches the canvas view INLINE. You can keep editing while seeing the mobile layout. No modal.

**Current behavior:**
- Click "Preview" → modal opens covering the editor
- Desktop / Mobile / Text / HTML in the modal
- ✅ Works, but breaks flow
- ❌ Can't EDIT while previewing mobile layout

**Fix:**
- Add canvas-view toggle in BuilderTopBar: `[ Desktop | Mobile ]`
- Mobile mode = canvas wrapper width clamps to 375px + adds device chrome
- KEEP `PreviewModal` for the Text/HTML/Plain preview modes
- The Desktop/Mobile toggle in the modal becomes redundant (in-canvas wins)

**Effort:** ~6h. Requires:
- New `canvasViewport` slice field (`'desktop' | 'mobile'`)
- Canvas CSS width clamp when viewport === 'mobile'
- Topbar toggle component
- Optional: subtle phone-frame chrome around mobile view

**Impact:** ⭐⭐⭐⭐ — visible "look what you make" moment

---

### Gap 4: No image library / asset reuse

**The pattern in Mailchimp:**

Click "Add image" → modal opens with grid of EVERY image you've ever uploaded for this client. Pick one. Optional: upload new.

**Current behavior (likely):**
- Click image → uploads new each time
- Old images are stored on Cloudinary but not surfaced
- User re-uploads the same logo for the 5th time this month

**Fix:**
- New `Asset` table in DB? OR query Cloudinary's API (it can list assets in a folder)
- Image inspector replaces "Upload" button with "Choose from library" dialog
- Dialog shows past uploads + upload new option
- Cache thumbnails

**Effort:** ~1 day. Two options:
- A. Add an `Asset` DB table that records every upload — clean, our data
- B. Query Cloudinary's listing API by folder — no DB change, slightly slower

**Impact:** ⭐⭐⭐⭐ — real workflow win for active users

---

### Gap 5: Auto-save indicator lacks "Saved 2s ago" specificity

**The pattern in Notion / Google Docs:**

Saved indicator shows specific time ("Saved 2 seconds ago" → "Saved 1 minute ago"). Visible at all times. Cures save anxiety.

**Current behavior:**
- BuilderTopBar shows `Unsaved changes` or `Saved`
- ✅ Better than nothing
- ❌ No timestamp; no "auto-save running" feedback

**Fix:**
- Track `lastSavedAt` timestamp in editor slice
- New `SaveIndicator` component in topbar with relative time
- Updates every 5s ("Saved 2s ago" → "Saved 15s ago" → "Saved 1m ago")
- If actively saving: spinner + "Saving…"

**Effort:** ~2-3h. Minor change to existing save flow.

**Impact:** ⭐⭐⭐ — anxiety-killer

---

## 🟡 What you have but could be MORE premium

### Polish items (smaller scope each)

| # | Current | Premium upgrade | Effort |
|---|---|---|---|
| 6 | Inspector appears instantly on selection | Slide in from right with 200ms ease | 2h |
| 7 | Block palette icons (single-color) | Icons + subtle hover preview tooltip showing what the block will look like | 4h |
| 8 | Color inputs are HTML `<input type="color">` | Custom palette picker with agency brand colors + recently-used swatches | 6h |
| 9 | Undo/redo via keyboard (Cmd-Z) | Topbar undo/redo buttons showing named history ("Undo: Added paragraph") | 4h |
| 10 | No keyboard shortcut overlay | `?` opens cheatsheet showing all shortcuts | 3h |
| 11 | Drag ghost is `DragChip` showing label | Add a subtle "preview" of the block being dragged (shape-suggesting) | 3h |
| 12 | Inspector panels are functional forms | Each control gets a label tooltip, inline help, sensible defaults | 4h |
| 13 | Empty canvas just shows "drag a block" | Show a "Start with template" CTA + recent templates inline | 3h |

---

## 🎯 Recommended sequence

### Phase A — The 3 visible game-changers (2-3 days)

Ship these first; biggest perception shift.

1. **Hover-to-show toolbar** (~6-8h) — Gap 1 — single biggest premium-feel win
2. **Drop zone polish** (~3-4h) — Gap 2 — premium drag feedback
3. **In-canvas Mobile/Desktop toggle** (~6h) — Gap 3 — the "wow" moment

**Result after Phase A:** Editor feels qualitatively different. Users get acknowledged on hover; drag is satisfying; mobile view is one click away.

### Phase B — Workflow + anxiety (1 day)

4. **Image library** (~1 day) — Gap 4 — workflow accelerator for active users
5. **"Saved 2s ago" indicator** (~2-3h) — Gap 5 — anxiety cure

### Phase C — Smaller polish items (1-2 days)

Pick from the "🟡 polish items" list above based on what's most missing for the demo. The top 3 I'd ship:

6. **Inspector slide-in animation** (~2h) — feels intentional
7. **Block palette hover preview** (~4h) — discoverability
8. **Keyboard shortcut `?` overlay** (~3h) — power-user signal

### Phase D — Template visual quality (separate, 2 days)

This is a DIFFERENT PR — design + MJML, not engineering. But it might matter MORE than any of the above:

9. **5 redesigned starter templates** that look genuinely beautiful out of the box

A great editor with bland templates feels amateur. A clunky editor with stunning templates feels premium.

---

## The honest truth

You have:
- ✅ All the architecture pieces
- ✅ Floating toolbars (just need hover-show)
- ✅ Inline text editing
- ✅ Drag-drop infrastructure
- ✅ Drop zone states (just need polish)
- ✅ Per-block inspector
- ✅ Preview modes
- ✅ Save state

The "premium vibes" gap is mostly:
- 🔴 **Hover-vs-click discoverability** (Gap 1 — fix this and 50% of the perception gap closes)
- 🔴 **Drop zone visibility during drag** (Gap 2)
- 🔴 **Inline mobile preview** (Gap 3)
- 🟡 **Asset reuse + save timestamp** (Gaps 4-5)
- 🟡 **Defaults + micro-animations** (Polish items)

You don't need to rebuild the editor. You need to ship **Phase A (~2-3 days)** and the perception will shift dramatically.

---

## What I'd build first

If forced to pick ONE thing: **Gap 1 — hover-to-show toolbar**.

Right now, sendmymail's editor feels like a click-to-discover interface. Premium editors feel like hover-to-explore. That's the single largest cognitive gap, and the fix is ~6-8h.

After that ships, do a side-by-side with Mailchimp again. You'll be surprised how much closer it feels.

---

## Side-by-side comparison summary

| Interaction | Mailchimp / MailerLite | sendmymail today | After Phase A |
|---|---|---|---|
| Hover a block | Floating actions appear | Nothing | Floating actions appear ✅ |
| Click a block | Block selected + inspector | Block selected + inspector ✅ | Same |
| Start dragging | All drop targets pulse | Drop targets faint | Drop targets pulse ✅ |
| Drop onto invalid | Cursor says "no" | Red diagonal stripes ✅ | Red diagonal stripes ✅ |
| Click text in block | Inline edit + format bar | Inline edit + format bar ✅ | Same |
| See mobile layout | One-click toggle in canvas | Modal preview | One-click toggle ✅ |
| Reuse image | Library opens | Re-upload | Library opens (Phase B) |
| "Did it save?" | "Saved 2s ago" | "Saved" no timestamp | "Saved 2s ago" (Phase B) |

After Phase A + B: **functional parity** with Mailchimp on the core interactions.

---

*Audit complete. Ready to plan Phase A as a feature PR when authorized.*
