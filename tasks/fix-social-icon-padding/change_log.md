# fix-social-icon-padding

Individual social icons can now have their padding adjusted — both the
outer spacing (around the whole element, between siblings in the row)
and the inner icon-padding (breathing room around the icon itself
inside its wrapper).

## Status: ✅ Done

## The bug

After [fix-social-icons-replaceable](../fix-social-icons-replaceable/change_log.md)
landed, individual social icons could be selected and have their image,
URL, and network name edited — but the `SocialElementInspector` had no
spacing controls. The parent `mj-social` block has padding + icon-spacing
controls (inner-padding), but they apply to all icons uniformly. There
was no way to give one icon (e.g., a highlighted brand logo) more
breathing room than the others.

Users hitting this would either:
- Edit raw `padding` / `icon-padding` attributes via the Advanced panel (ugly + non-discoverable)
- Compose multiple `mj-social` blocks to fake per-icon spacing (heavy hack)
- Give up

## What changed

| File | Change |
|---|---|
| [src/components/inspector/SocialElementInspector.tsx](src/components/inspector/SocialElementInspector.tsx) | New "Spacing" `FormSection` at the bottom with `PaddingControl` (4-side `padding`) + `NumberInput` (`icon-padding` in px) + a hint explaining the distinction. `KNOWN_KEYS` extended to include `padding` + `icon-padding` so they don't show as "unknown" in the Advanced panel anymore. |
| [src/canvas/renderTree.tsx](src/canvas/renderTree.tsx) | `SocialIconElement` rewritten to honor both padding attributes visually. The icon is now wrapped in an outer `<span>` carrying `padding` (so changes show up as space between icons in the row), and the inner `<img>` / letter chip carries `icon-padding` (so changes show as breathing room around the icon itself, without affecting row width-per-element). `boxSizing: 'content-box'` on the `<img>` so padding doesn't eat into the icon-size value. |

## Why this approach

**Two controls, not one.** MJML distinguishes `padding` (outer, on the
`<td>` containing the element) from `icon-padding` (inner, on the
`<td>` containing the icon). These produce visually different effects
in the rendered email. Collapsing them into a single "padding" control
would force the user to choose one MJML attribute over the other; the
inspector should mirror the MJML model so the saved tree round-trips
cleanly.

**Wrapper `<span>` for outer padding, not on the `<img>` directly.**
Putting `padding` on the `<img>` would conflict with the existing
selection-halo outline (which sits at `outline-offset: 2px`). The
wrapper keeps the selection visual on the icon-shaped element while
the padding lives outside it. Click events on the wrapper still
select the icon (via the same `selectNode(_id)` dispatch), so the
larger click target is a bonus UX win.

**`boxSizing: 'content-box'` for icon-padding.** Without it, increasing
`icon-padding` would shrink the visible icon (browsers default to
`border-box` in modern CSS resets). With `content-box`, the icon stays
at its declared `icon-size` and the padding adds *outside* the icon's
content. Matches what users expect from setting "icon padding".

## Reused existing controls

- **`PaddingControl`** — already used by `mj-image`, `mj-text`,
  `mj-button`, `mj-hero`, `mj-social` (parent), `mj-navbar`. Supports
  one-value-for-all OR per-side, with px/em/% units. Zero new code.
- **`NumberInput`** — same component used for `icon-size` and
  `inner-padding` in `SocialInspector`. Single-unit (px) for
  `icon-padding` since em/% are uncommon there.

## Edge cases

| Case | Behavior |
|---|---|
| User sets `padding="20px"` on one icon | Canvas: that icon's wrapper grows by 20px on each side, pushing siblings further away. Compiled: same effect in the rendered email. ✓ |
| User sets `icon-padding="8px"` on one icon | Canvas: 8px of space added around the img inside its wrapper. Compiled: same. ✓ |
| User sets both | Both apply, stacked. Outer pushes siblings; inner adds breathing room around the icon itself. ✓ |
| User sets `padding="20px 0"` (asymmetric) | `PaddingControl` supports per-side editing. Wrapper span receives the full value verbatim. ✓ |
| User imports MJML with these attributes preset | Loaded into the tree by `parseMjml` → renders correctly on first canvas render → editable in the inspector. ✓ |
| User clears the field | Padding/icon-padding fall back to MJML defaults (4px / 0 respectively) at compile time. Canvas reflects `undefined` → CSS default. ✓ |
| Letter-chip fallback (no `src`) | Inner padding applies to the chip too, but the chip's fixed 28×28 size + `padding` increases the visible chip area. Acceptable — chip is a fallback for legacy templates, real icons are the primary path. |
| Padding + selection halo overlap | Halo sits on the `<img>` / chip via `outline`, padding sits on the wrapper. They don't fight. ✓ |

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (2.19s). Builder chunk effectively unchanged
  (~200 bytes for the inspector additions + canvas tweaks).
- `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Out of scope (future)

- **`text-padding`** — `mj-social-element` can carry an optional text
  label (network name beside the icon). When users start using that
  pattern, add a third control for `text-padding`.
- **Padding control on `mj-navbar-link`** — by symmetry, individual nav
  links could carry per-link padding. Hold until a user asks; navbar
  link styling is usually uniform across links.
- **Drag-to-resize padding directly on the canvas** — would need a
  custom handle / chip on the selected icon. The inspector control
  covers the common case.
