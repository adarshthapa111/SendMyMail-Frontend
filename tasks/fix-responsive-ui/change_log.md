# fix-responsive-ui

Mobile + tablet responsiveness for 4 recently-shipped surfaces that
were authored desktop-only (zero media queries). The screens worked
at ≥1100px but degraded badly below — overflowing pills + buttons on
the integrations rows, cramped modals at phone widths, the editor's
3-cluster top bar fighting its grid.

## Status: ✅ Done

## What was broken

| Surface | Symptom at narrow widths |
|---|---|
| **Integrations screen** | Row layout `[logo] [meta…stretch] [pill] [button]` forced all 4 elements onto one line. Below ~620px the pill and button started overlapping the tagline / wrapping ugly. Header had 32px horizontal padding — overkill on mobile. |
| **TestSendDialog** | `max-width: 480px; width: 100%` resized correctly, but the 24px backdrop padding ate too much side margin on phones. Footer button row stayed `flex-end` even when the buttons collectively exceeded the modal width. |
| **BuilderTopBar (editor)** | Already had two breakpoints (1100px, 820px) hiding the center cluster + button text, but the 3-column grid (`1fr auto 1fr`) below ~600px would force back-link + inline-rename to overflow when titles got long. |
| **ImportMjmlDialog** | Same pattern as TestSendDialog — backdrop padding ate space; the action bar didn't reflow for narrow viewports. |

None of these were app-breaking on desktop. All four shipped without
media queries because they were written against the mockups (which are
1280px PNGs). The fix is purely additive — add media queries, don't
touch the desktop layouts.

## What changed

### [src/styles/components/integrations/IntegrationsScreen.module.css](src/styles/components/integrations/IntegrationsScreen.module.css)

Two breakpoints added:

- **≤1100px**: reduce horizontal padding (32 → 22px on header + body).
- **≤760px**: header stacks vertically (back button → title block), body padding shrinks (32 → 12px horiz), and **rows wrap**: logo + meta stay on the first line, pill + button drop to a second line beneath with `margin-left: auto` on the button so it right-aligns. Uses `flex-wrap: wrap` + `flex-basis: calc(100% - 50px)` on the meta (50px = logo 38px + gap 12px) so the meta consumes the rest of the first line.

### [src/styles/components/templates/TestSendDialog.module.scss](src/styles/components/templates/TestSendDialog.module.scss)

One breakpoint at **≤520px**:

- Backdrop padding 24 → 12px (more dialog width).
- `align-items: flex-start` + `padding-top: 32px` so the dialog anchors near the top of the screen instead of vertically centering — better for tap reachability + visible without scroll when the on-screen keyboard pops.
- Footer becomes `flex-direction: column-reverse` with `button { width: 100% }` → primary "Send test" stacks on top, Cancel below. Full-width tap targets.
- Tighter header / body / footer padding (24 → 18px horiz).

### [src/styles/components/templates/BuilderTopBar.module.scss](src/styles/components/templates/BuilderTopBar.module.scss)

Existing breakpoints (1100px, 820px) kept; new **≤600px** added:

- Switch the bar from `display: grid` (which forced 1fr/auto/1fr equal-thirds) to `display: flex; justify-content: space-between`. The grid was the root cause of the overflow — flex sizes each cluster to content so neither pushes the other.
- Back link drops the "Templates" text (`font-size: 0` on the link + `font-size: 16px` on the inner icon child). Keeps the arrow as the visual affordance.
- All separators hidden (`.sep { display: none }`).
- Tighter padding, tighter gaps on left/right clusters.

### [src/styles/components/templates/ImportMjmlDialog.module.scss](src/styles/components/templates/ImportMjmlDialog.module.scss)

Two breakpoints added (matches the dialog pattern):

- **≤720px**: tighter backdrop / header / body / actions padding.
- **≤520px**: top-anchored backdrop + actions stack as `column-reverse` with full-width buttons. Same mobile pattern as TestSendDialog so the two import-flow modals feel identical.

## Decisions

| Decision | What | Why |
|---|---|---|
| **Breakpoints inherited from theme.md** | `760px` (mobile per theme doc), `1100px` (tablet), plus dialog-specific `520px` and `720px` for modal compactness | Theme doc already establishes 760px as the mobile cutoff; we honor it. Modals get extra breakpoints because they're width-constrained AND viewport-sensitive. |
| **No new mobile-only components** | Same JSX + same React tree; only CSS changes | Smallest possible diff, no React tree changes, no test surface to revalidate. |
| **Row wraps, doesn't restack** | At mobile, logo + meta stay on line 1, pill + button drop to line 2 (not full vertical stacks) | Vertical stacks would make each row very tall, costing scrolling. Two-line wrap keeps rows compact while making space for the controls. |
| **Modal button rows go column-reverse on mobile** | Primary action on top, Cancel below | Standard iOS/Android pattern. Tap targets become full-width without changing the button hierarchy. |
| **Flex over grid for narrow top bar** | At ≤600px, BuilderTopBar switches from `display: grid` to `display: flex` | The 1fr/auto/1fr grid was forcing the bar to allocate space the left+right clusters didn't need. Flex sizes to content. |
| **No CSS variable changes** | All new rules use existing `--color-*` tokens; no new tokens introduced | Theme stays consistent; light/dark or future theme variants still work. |

## Edge cases / what stays the same

| Case | Behavior |
|---|---|
| Desktop (>1100px) | Identical to before — no rules apply, no regression risk ✓ |
| Tablet landscape (1024 × 768) | Falls in the 1100px band → reduced padding, center cluster hidden, action button text intact ✓ |
| Tablet portrait (768 × 1024) | Falls in the 820px band → action button text hidden (icon-only), save status hidden ✓ |
| Phone landscape (e.g. 740 × 360) | Triggers 760px integrations rules + 820px top-bar rules ✓ |
| Phone portrait (360 × 640, 414 × 896) | Full mobile treatment: stacked headers, row-wrap, column-reverse modal footers ✓ |
| Very long template names in the inline rename | Inline rename has its own `min-width: 0` + truncate handling (unchanged in this PR); the top bar flex layout now lets it truncate without pushing the right cluster off-screen ✓ |
| Resize from 1200 → 320 with the dialog open | Backdrop padding shrinks at 520px breakpoint, dialog reflows; no JS involved ✓ |

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (4.58s — same as before; CSS is processed identically)
- `npm run lint`: 12 = pre-existing baseline. **0 new issues** (lint only covers JS/TS, but worth confirming nothing else broke).

## Files at a glance

**Modified (4)** — all CSS / SCSS, no TS / JSX changes:
- [src/styles/components/integrations/IntegrationsScreen.module.css](src/styles/components/integrations/IntegrationsScreen.module.css) (+60 lines: 2 media queries)
- [src/styles/components/templates/TestSendDialog.module.scss](src/styles/components/templates/TestSendDialog.module.scss) (+28 lines: 1 media query)
- [src/styles/components/templates/BuilderTopBar.module.scss](src/styles/components/templates/BuilderTopBar.module.scss) (+35 lines: refactored existing breakpoints + new 600px block)
- [src/styles/components/templates/ImportMjmlDialog.module.scss](src/styles/components/templates/ImportMjmlDialog.module.scss) (+33 lines: 2 media queries)

**Not touched** (already responsive enough or out of scope):
- AppShell / sidebar / top nav (presumed already handled)
- Inspector controls (lives in fixed-width sidebar; only relevant inside the builder where the sidebar itself collapses)
- Editor canvas (has its own zoom + scroll behavior; out of scope for "list/modal responsiveness")

## Out of scope

| Item | When |
|---|---|
| Inspector controls layout at very narrow viewports | The inspector sidebar collapses entirely on mobile (existing behavior); the inspector is desktop-first by design |
| Canvas device toggle (the placeholder Mobile/HTML buttons in BuilderTopBar) | Functional preview mode is a separate task — purely visual until those are wired |
| App shell responsiveness audit | If the sidebar/topnav have responsive bugs, that's a separate fix folder |
| Tests for responsive breakpoints (visual regression) | Out of band — would need Playwright or similar; no test infra exists yet |
