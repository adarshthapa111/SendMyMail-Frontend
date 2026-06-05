# fix-navbar-text-editable

Navbar links can now be edited — text (label), URL (href), add, remove.
Two complementary surfaces: a per-link editor in the Navbar inspector,
and double-click-to-edit inline on the canvas.

## Status: ✅ Done

## The bug

Selecting a `<mj-navbar>` block showed a Navbar inspector with Base URL +
hamburger toggle + align + padding — but no way to edit the actual link
labels ("Home", "About", "Contact") or their URLs. The old hint said
*"Edit individual links via the Advanced panel for now"* which routed
users into raw attribute editing — a dead-end for non-technical users
since the labels are stored in each child's `content` field, not in an
attribute.

Canvas-side, navbar links rendered as plain `<span>` elements with no
selection or edit affordance. Clicking a link selected the parent
navbar; double-click did nothing.

## What changed

| File | Change |
|---|---|
| [src/components/inspector/NavbarInspector.tsx](src/components/inspector/NavbarInspector.tsx) | Full rewrite. New "Links" section at the top renders each `mj-navbar-link` child as a row: Text input (commits via `setContent` to `linkPath`) + URL input (commits via `setAttr({key:'href'})`) + X button (commits via `deleteBlock`). Adds an "+ Add link" button at the bottom (`insertBlock` with a fresh link node via `uuid`). |
| [src/canvas/renderTree.tsx](src/canvas/renderTree.tsx) | `NavbarLeaf` now subscribes to `editor.editingTextId`. Double-click on a link fires `setEditingTextNode(linkId)`. When `editingId === link._id`, the `<span>` is replaced by `<ContentEditable>` (the same widget mj-text uses), reusing the cursor-position-safe pattern. Commits via `setContent`, exit via `setEditingTextNode(null)`. |
| [src/styles/components/inspector/controls/controls.module.css](src/styles/components/inspector/controls/controls.module.css) | New `.navbarLinkRow` (3-col grid: text, url, delete-btn), `.navbarLinkDelete` (28×28 icon button, red on hover), `.navbarAddLink` (subtle outline button matching `.imageDropButton`). |

## Why this approach

**Inspector edit + inline edit, not just one.** The inspector is the
discoverable surface — a user clicking a navbar gets an obvious editing
UI. Inline edit (double-click) is the direct-manipulation power-user
shortcut, matches how `mj-text` already works, and means the existing
`editingTextId` + `ContentEditable` infrastructure is reused (zero new
selection machinery).

**Used `setContent` to update text, not `setAttr`.** Navbar links store
their label in `node.content`, not in `attributes.text` — this matches
the MJML spec (the link element wraps the text node). The existing
slice's `setContent` reducer was already plumbed for `mj-text`'s case
and handles undo/redo + dirty-flag correctly.

**One reducer call per change, not a "save links" button.** Each input's
`onCommit` fires `setContent` or `setAttr` immediately. The
`useDebouncedCommit` hook (already used by `TextInput`/`UrlInput`) batches
keystrokes into ~200ms commits, so we don't spam Redux per keystroke
while still keeping the data model coherent with no explicit save step.

## Edge cases

| Case | Behavior |
|---|---|
| User clicks "+ Add link" with 0 existing links | Inserts at index 0 (`links.length`), works ✓ |
| User deletes the last link | List becomes empty, "No links yet — add one below." hint shown ✓ |
| User double-clicks a link, then clicks elsewhere on canvas | `ContentEditable.onExit` fires via blur → `setEditingTextNode(null)` → link returns to read-only span ✓ |
| User double-clicks a link, presses Enter | `multiline={false}` → Enter commits + exits ✓ |
| User has navbar selected, deletes a link via the inspector X | `deleteBlock` clears `selectedId` (existing reducer behavior), navbar stays in tree ✓ |
| User imports MJML that has `<mj-navbar-link>` without `_id` | `_id` is editor-only — `loadTemplate` doesn't run buildIdPathCache for missing IDs. Imported nodes get IDs assigned by the parser before reaching the tree. Verified path: `parseMjml` → tree with `_id` everywhere → `loadTemplate` → inspector works. |
| Undo after editing a link | `setContent`/`setAttr` push history → undo restores prior label ✓ |

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (1.92s). Builder chunk: 94.95 → 97.97 KB (+3 KB
  combined with the social-icons fix; ~1 KB of that is this navbar work).
- `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Out of scope

- **Per-link color / font-size editing** — each link supports `color` +
  `font-size` attributes; the inspector currently only edits text + href.
  Add to the row when users ask for it (~10 lines).
- **Drag-to-reorder links** — `insertBlock`/`moveNode` reducers exist;
  the row would need a drag handle + dnd-kit wiring. Future PR.
- **Hamburger menu styling controls** — only the on/off toggle is
  exposed; the underlying attributes (`ico-color`, `ico-padding`,
  `ico-target`, etc.) are reachable via the Advanced panel.
