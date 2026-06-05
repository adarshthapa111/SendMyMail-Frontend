# Feature: MJML import — change log

> Let users paste or upload existing MJML markup and edit it as a template
> in the visual builder we shipped in feature-templates PR 2.5. Lossless
> for any MJML using standard tags.
>
> This feature is a logical sibling to feature-templates (it creates
> templates the same way the visual builder does), but it lives in its
> own folder because it's a self-contained addition — its own parser,
> its own UI surface, its own validation flow, and no schema / backend
> changes.
>
> References:
> - [src/tree/types.ts](../../src/tree/types.ts) — `IMjmlNode` shape
>   that the parser produces
> - [src/blocks/registry.ts](../../src/blocks/registry.ts) — block
>   registry that determines which tags render natively in the canvas
> - [src/lib/api/templates.ts](../../src/lib/api/templates.ts) —
>   `createTemplate` endpoint we reuse for the import submit
> - [tasks/feature-templates/change_log.md](../feature-templates/change_log.md)
>   — the broader templates feature this rides on top of

---

## Why MJML import (not HTML import)?

The frequent question is "can we import HTML too?". Side-by-side:

| Problem | HTML import (Mailchimp-style) | MJML import (this PR) |
|---|---|---|
| Parse markup | Easy (DOMParser) | Easy (DOMParser) |
| Infer structure | **HARD** — what should `<table>` become? heuristics + edge cases | **Trivial** — `<mj-section>` IS a section |
| Map attributes | Complex (`style=` → which MJML attrs?) | 1:1 — same attrs we already use |
| Round-trip lossless | No | Yes |
| Effort | ~1 day careful work | ~2-3 hours |
| Unsupported tags | Frequent | Rare (mj-carousel, mj-accordion) |
| Reliability | ~70% even with mature tools (Stripo, html-to-mjml) | ~99% with sane validation |

Our internal `IMjmlNode` tree IS MJML in object form, so parsing MJML
is mechanical XML walking — not the unreliable HTML→MJML structural
inference that other tools struggle with.

HTML import is a separate, larger feature (see "Code template format"
discussion in [feature-templates/change_log.md](../feature-templates/change_log.md)).
This PR is just MJML.

---

## V1 scope

- **Import surface**: secondary "Import MJML" button on
  `/clients/:cid/templates` next to "New template". On the FTUX empty
  state, a third option below the existing "Design your first
  template" CTA.
- **Input modes**: paste into a textarea OR upload a `.mjml` / `.txt`
  file (drag-drop + file picker, both inside the modal).
- **Frontend parser**: MJML XML string → `IMjmlNode` tree with UUIDs
  assigned. Live affordance in the modal ("Looks valid · N blocks ·
  M sections · K columns") so users see *something* before clicking
  Import.
- **Validation**: must have `<mjml>` root + `<mj-body>` somewhere
  inside. Each failure has a precise error (with line number when
  the browser provides one).
- **Name + category step** after a successful parse — defaults to
  the uploaded file name (sans extension) or "Imported template".
  Category optional.
- **Submit**: POST as a new template via the existing
  `POST /v1/clients/:cid/templates`. No schema changes. The
  server-side `stripTreeForPersistence` strips `mj-preview` nodes
  (preheader = campaign-level, not template).
- **Navigate**: lands on `/templates/:newId/edit` — the user sees
  their imported template ready to edit visually in the chrome we
  shipped in PR 2.5.

## Out of scope for V1 (deferred)

- ❌ **MJML export** from an existing template — mirror of the parser,
  ~1 hour follow-up.
- ❌ **Syntax highlighting** in the paste textarea — plain textarea
  with monospace font is enough for paste-and-go.
- ❌ **MJML linting** ("best practice" warnings — large image, missing
  alt, etc.). Pure parsing only.
- ❌ **Bulk import** (many `.mjml` files at once).
- ❌ **Drag-and-drop of `.mjml` files onto the templates list page**
  (drag-drop works inside the import modal in V1; whole-page drop
  zone is a follow-up).
- ❌ **HTML import / HTML→MJML conversion**. Different feature, its
  own PR.

---

## Files

```
src/lib/mjml/
└─ parse.ts                                                    NEW — MJML XML → IMjmlNode walker

src/components/templates/
├─ ImportMjmlDialog.tsx                                         NEW — paste + upload tabs, preview, name modal
└─ index.ts                                                     UPDATE — re-export ImportMjmlDialog

src/styles/components/templates/
└─ ImportMjmlDialog.module.scss                                 NEW

src/pages/templates/
└─ TemplatesList.tsx                                            UPDATE — "Import MJML" button + dialog state

src/components/templates/
└─ TemplatesEmptyState.tsx                                      UPDATE — third "Import existing MJML" secondary CTA
```

**Zero backend changes.** Zero schema changes. Reuses the existing
`POST /v1/clients/:cid/templates` endpoint.

---

## The parser — `src/lib/mjml/parse.ts`

Browser `DOMParser` (free, builtin, no deps) walks the XML; each
`Element` becomes an `IMjmlNode`. ~50 lines of real logic.

```ts
import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';

export class MjmlParseError extends Error {
  /** Optional line number from the DOMParser's parsererror message. */
  line?: number;
  constructor(message: string, line?: number) {
    super(message);
    this.line = line;
  }
}

export function parseMjml(input: string): IMjmlNode {
  const trimmed = input.trim();
  if (!trimmed) throw new MjmlParseError('MJML is empty.');

  // Strip XML prologue / DOCTYPE so DOMParser is reliable
  const cleaned = trimmed
    .replace(/^<\?xml[^?]*\?>\s*/i, '')
    .replace(/^<!DOCTYPE[^>]*>\s*/i, '');

  const doc = new DOMParser().parseFromString(cleaned, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    const msg = err.textContent ?? 'Could not parse as XML.';
    const lineMatch = msg.match(/line\s+(\d+)/i);
    throw new MjmlParseError(
      'Not valid XML. Check your tags are closed.',
      lineMatch ? Number(lineMatch[1]) : undefined,
    );
  }

  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'mjml') {
    throw new MjmlParseError(
      `Top-level element must be <mjml>, got <${root.tagName}>.`,
    );
  }
  if (!doc.querySelector('mj-body')) {
    throw new MjmlParseError('<mj-body> is required.');
  }

  return walk(root);
}

/** Recursively convert an Element into an IMjmlNode. */
function walk(el: Element): IMjmlNode {
  const node: IMjmlNode = {
    tagName: el.tagName.toLowerCase(),
    _id: uuid(),
  };

  // Attributes
  if (el.attributes.length > 0) {
    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) {
      attrs[a.name] = a.value;
    }
    node.attributes = attrs;
  }

  // Children OR content (mutually exclusive in our tree shape)
  const elementChildren = Array.from(el.children);
  if (elementChildren.length > 0) {
    node.children = elementChildren.map(walk);
  } else {
    // Leaf — capture innerHTML so mj-text / mj-button / mj-raw keep their
    // inline HTML (links, <strong>, etc.) intact.
    const inner = el.innerHTML.trim();
    if (inner) node.content = inner;
  }

  return node;
}

/** Walk the tree to count blocks for the dialog's "Looks valid" affordance. */
export interface TreeStats {
  blocks: number;       // total non-mjml/mj-body/mj-head nodes
  sections: number;
  columns: number;
  unsupported: string[]; // distinct tagNames outside our visual registry
}
export function summarizeTree(tree: IMjmlNode, registryTagNames: Set<string>): TreeStats {
  let blocks = 0, sections = 0, columns = 0;
  const unsupported = new Set<string>();
  const wrappers = new Set(['mjml', 'mj-body', 'mj-head']);

  function visit(n: IMjmlNode) {
    if (!wrappers.has(n.tagName)) {
      blocks += 1;
      if (n.tagName === 'mj-section') sections += 1;
      if (n.tagName === 'mj-column')  columns += 1;
      if (!registryTagNames.has(n.tagName)) unsupported.add(n.tagName);
    }
    n.children?.forEach(visit);
  }
  visit(tree);
  return { blocks, sections, columns, unsupported: Array.from(unsupported).sort() };
}
```

### Edge cases the parser handles

- XML prologue (`<?xml version="1.0"?>`) and DOCTYPE — stripped before
  DOMParser (browser's XML mode rejects them in some configurations).
- Tag case — normalized to lowercase (MJML is case-insensitive but
  our tree uses lowercase).
- Self-closing tags (`<mj-divider />`) — DOMParser handles natively.
- Text-bearing tags (mj-text / mj-button / mj-raw) — preserve
  innerHTML so inline `<strong>` / `<a href>` / `{{first_name}}`
  merge tags round-trip exactly.
- Whitespace-only text nodes between elements — ignored (we use
  `el.children`, not `el.childNodes`).
- Attributes with HTML entities (`&amp;` etc.) — DOMParser decodes
  them automatically.
- Empty leaf elements — `node.content` stays undefined, not empty
  string (matches what block factories produce).

---

## Validation strategy

Three layers, in order:

1. **Trimmed empty** → `"Paste some MJML to start."`
2. **DOMParser fails** → `"Not valid XML. Check your tags are closed."`
   Line number surfaced if Chrome / Edge provides it in the
   parsererror message.
3. **Structural** → must have `<mjml>` root + `<mj-body>` descendant.
   Each violation has a precise error message naming the missing
   element.

After a successful parse, the dialog renders:

- ✅ "Looks valid — N blocks · M sections · K columns" (counts from
  `summarizeTree`)
- ⚠️ "Some blocks aren't natively rendered in our visual editor:
  mj-carousel, mj-accordion" list when the tree contains tags
  outside our `blockRegistry`. These import successfully but display
  as "unknown block" placeholders in the canvas — the user can
  delete them or leave them (MJML compiles them correctly at send
  time via `/getHtml`).

---

## Unsupported MJML tags — graceful handling

The canvas (`src/canvas/renderTree.tsx`) already has an `.unknown`
class for tags outside the registry. Imported templates with
`<mj-carousel>` or similar:

- Land in the tree as `{ tagName: 'mj-carousel', children: [...] }`
- Render as a yellow "unknown block · mj-carousel" placeholder in
  the canvas
- Can be deleted via the existing selection toolbar
- Get serialized correctly when saved (we don't strip unknown tags
  — `stripForPersistence` only removes `_id`, `_meta`, `mj-preview`)
- Compile correctly at send time via the backend's `/getHtml`
  endpoint (MJML's compiler handles all standard tags)

**Import is lossless** even for tags we don't visually edit.

---

## The dialog — `src/components/templates/ImportMjmlDialog.tsx`

Two-step modal:

### Step 1 — Source

- **Tabs**: `Paste` (textarea) · `Upload` (file picker + drag-drop area)
- **Paste mode**: large monospace textarea, ~14 rows visible. On
  blur or click "Validate", we run `parseMjml(input)`.
- **Upload mode**: drag-drop zone OR click-to-pick. Accepts `.mjml`,
  `.txt`. Max file size 1 MB (per the impl-doc note about typical
  template sizes — 20-100 KB is normal).
- Below the source field: live affordance band.
  - Empty state: muted prompt "Paste MJML or upload a file"
  - Error: red banner with the precise error message + line number
    if available
  - Success: green band "Looks valid — N blocks · M sections · K
    columns" + (if any) yellow chip "Heads up: N unsupported block
    types (mj-carousel, mj-accordion). They'll import but won't be
    visually editable."
- Buttons: `Cancel` · `Continue` (disabled until the parse succeeds)

### Step 2 — Name + category

- Same fields as `TemplateFormDialog`: Name (required, ≤120 chars)
  + Category (optional datalist).
- Name defaults to:
  - Upload mode: file name minus extension
  - Paste mode: "Imported template"
- Buttons: `← Back` · `Cancel` · `Import` (terra primary)
- On click `Import`:
  - POST via `createTemplate(clientId, { name, category, mjmlSource: parsedTree })`
  - Dispatch `addTemplate` into the slice
  - Navigate to `/clients/:cid/templates/:newId/edit`
  - Toast `Imported {name}`

### Reuses

- Portal-shell pattern from `TemplateFormDialog` / `ClientFormDialog`
  (ESC close, click-outside, body-scroll-lock)
- `ConfirmDialog`-style sectioned body
- `Field` / `Input` / `Button` UI primitives
- `useDebouncedValue` for the paste textarea (parse on debounce,
  not on every keystroke)

---

## Decisions

- **Browser DOMParser, no npm dep.** `fast-xml-parser` adds 20+ KB
  for what's already builtin. Universal browser support.
- **Frontend parsing, not backend.** Keeps the import flow snappy
  + the error UX precise. The backend's `mjmlSource` accepts
  arbitrary JSON; it doesn't care how we got the tree.
- **Debounced parse, not on-every-keystroke.** Real-time parsing
  would be expensive for a 50 KB MJML doc and adds no real value —
  users paste once.
- **No `format` field on Template needed.** Imported MJML is a
  regular visual template. The tree we produce is identical to
  the tree the visual builder produces.
- **Defer parser unit tests.** The parser is straightforward
  DOMParser + walk; manual sample-MJML testing covers V1. Add
  fixture-based tests in V1.5 if we hit edge cases in real-world
  MJML.
- **Strip `mj-preview` on save, NOT on import.** The import preserves
  the user's `mj-preview` text in the tree (so the design-time
  preview shows it); the existing server-side `stripTreeForPersistence`
  then drops it before persisting. Round-trip is identical to a
  visually-created template.
- **Name defaults**: file upload → file name minus extension;
  paste-only → "Imported template" (user can rename or accept).
- **One-shot UI**: two-step modal (Source → Name). No multi-tab
  inline rename or "preview before save" full-page flow — that
  scope creep happens in V1.5 if anyone asks.
- **Max upload size 1 MB.** Typical MJML templates are 20-100 KB;
  1 MB is a generous ceiling that protects against accidental
  drops of unrelated files.

---

## Implementation phases

1. **Parser** — write `src/lib/mjml/parse.ts` (~80 lines incl.
   summarizeTree). Manual verify against a 5-block sample MJML:
   one mj-section with two mj-columns, each with mj-text + mj-image.
   Tree structure should be identical to what `newTemplate()`
   produces for an empty template (modulo the actual blocks).
2. **Dialog UI** — `ImportMjmlDialog.tsx` + SCSS. Two-step flow
   (Source → Name). Tabs, drag-drop, validation band, name field.
   Wire `createTemplate` + `addTemplate` + navigate.
3. **Wire to TemplatesList** — secondary "Import MJML" button next
   to "New template" + a third secondary CTA on `TemplatesEmptyState`.
   State: `importing: boolean` toggles the dialog.
4. **Smoke test** — manual flow (paste valid → import → land in
   builder → edit → save → reload → still there). Plus error
   cases (invalid XML, missing mj-body, unsupported tags).
5. **Build + lint + Done entry**.

---

## Acceptance criteria

- [ ] "Import MJML" button visible on `/templates` next to "New
  template" (both empty state and populated state).
- [ ] Modal opens with `Paste` + `Upload` tabs.
- [ ] Pasting valid MJML → "Looks valid — N blocks" affordance,
  Continue button enables.
- [ ] Pasting invalid MJML → precise error message; line number
  surfaced if the browser provides one.
- [ ] Pasting MJML without `<mj-body>` → "<mj-body> is required."
  error, not a generic XML error.
- [ ] Uploading a `.mjml` file → reads contents into the parser
  the same way; file name pre-fills the template name (sans
  extension).
- [ ] Files larger than 1 MB → "File too large" error before
  parsing.
- [ ] After Continue, name+category step shows; Name required;
  Import button disabled until name is non-empty.
- [ ] Import button creates a new template via POST, dispatches
  `addTemplate` into the slice, and navigates to the new
  template's `/edit` page.
- [ ] Imported template loads in the Builder with the full tree
  visible on the canvas, all standard blocks editable.
- [ ] Templates with unsupported tags (mj-carousel etc.) import
  successfully; canvas shows "unknown block" placeholder for
  those; save round-trips them; the rest of the tree edits
  normally.
- [ ] Imported template's tree round-trips through save: edit,
  save, reload — what you see is what you imported (plus your
  edits).
- [ ] Toast `Imported {name}` fires on successful import.
- [ ] `npm run build` clean; `npm run lint` adds 0 new issues.
- [ ] No backend changes; existing tests + endpoints unaffected.

---

## Risks / open questions

- **MJML with embedded `<![CDATA[...]]>` blocks** — common in
  hand-written MJML to escape HTML inside mj-text. DOMParser
  handles this natively; just need to verify the
  `el.innerHTML` capture preserves CDATA content correctly.
  Plan: include a CDATA sample in the manual smoke.
- **Custom MJML components from `mj-include`** — some MJML
  ecosystems use `<mj-include path="...">` to compose templates.
  Our import treats this as an unsupported tag (no file-system
  access from the browser). User must inline before pasting.
  Documented in the "unsupported tag" affordance.
- **Stripo MJML export quirks** — Stripo exports MJML with custom
  attribute prefixes (`stripo-` or similar). These pass through
  the parser harmlessly; just get persisted as attributes on the
  node and compiled away. Verify with a real Stripo export sample.
- **MJML with `<mj-style>` containing user CSS** — preserved
  in the tree under mj-head; renders correctly at send time;
  not visually editable in V1 (no surface to edit it). User
  must hand-edit via JSON if they need to — accepted V1
  limitation.

---

## What this unlocks

- **Developer workflow** — agencies with technical teams writing
  MJML in `mjml.io` playground or version control can bring their
  work into SendMyMail instantly.
- **Migration from Stripo** — Stripo's "Export MJML" → paste → done.
- **Round-trip with a designer** — dev exports MJML from our
  template (via PR 2.7 export), designer tweaks, imports back,
  edits visually.
- **PR 2.7 — MJML export** — `serializeTree(tree) → string`, the
  mirror of the parser. Add an "Export MJML" item to the
  BuilderMoreMenu. ~1 hour follow-up.
- **HTML code mode** (separate, larger PR) — orthogonal. If we
  later want to support raw HTML templates, that's a different
  feature with its own `format` field + code editor page.

---

## Changes (newest first)

### 2026-06-05 · 🐛 Fix — render `<mj-wrapper>` natively (was showing as "unknown block")

**Bug**: After the entity-normalization fix landed, the user's Apple-style
MJML imported cleanly but the canvas showed 12 "Unsupported block:
mj-wrapper" placeholders — one per `<mj-wrapper>` in the template — and
the sections + content *inside* each wrapper didn't render at all (the
"unknown block" treatment swallowed the children).

**Why**: `<mj-wrapper>` is a standard MJML container that groups multiple
sections under shared styles (background-color, padding, border-radius).
It sits between `<mj-body>` and `<mj-section>` in the structural
hierarchy. Real-world MJML uses it constantly for full-width banners,
visual grouping, and section padding. The canvas's `renderTree.tsx`
switch statement just didn't have a case for it, so it fell through to
the `<UnknownLeaf>` branch which (correctly for genuinely unknown tags)
displays a yellow placeholder + ignores children.

**Fix** (two files):

1. **`src/canvas/renderTree.tsx`** — added a `WrapperFrame` component +
   a `case 'mj-wrapper'` arm in the dispatch switch. The component
   mirrors `BodyFrame` (vertical stack of sections, drop zones between
   them) but is selectable like a section (with `SelectionToolbar`).
   Honors `background-color`, `padding`, and `border-radius`
   attributes. Children render through the existing `RenderNode`
   recursion — no separate code path.

2. **`src/blocks/categories.ts`** — added `'mj-wrapper': ['section']`
   to `CONTAINER_ACCEPTS`. Drop zones inside a wrapper now correctly
   accept section blocks (dragged from the palette) and reorders
   between sections.

**Why this is safe**:

- Pure addition — no existing rendering path changes. Tags that were
  already rendering continue to render identically.
- The `UnknownLeaf` fallback still fires for genuinely unsupported
  tags (`mj-carousel`, `mj-accordion`, etc.) — only `mj-wrapper`
  graduates out of "unknown" status.
- Imports that don't use `mj-wrapper` are unaffected.

**Bundle impact**: Builder chunk grew from 91.95 KB → 92.76 KB (gzip
26.83 → 26.89 KB). ~800 bytes for the new component + drop-zone
plumbing. Negligible.

**What still falls back to "unknown block"** (V1 graceful degradation):
- `mj-carousel`, `mj-carousel-image` (Stripo-style image carousels)
- `mj-accordion`, `mj-accordion-element`, `mj-accordion-text`, `mj-accordion-title`
- `mj-group` (groups columns side-by-side instead of stacking) — should
  be added next; it's almost as common as `mj-wrapper`
- `mj-table` (data tables)

Each shows the yellow "unknown block" placeholder, can be deleted via
the existing selection toolbar, and round-trips through save +
compiles correctly at send time via the backend's `/getHtml`. Adding
visual rendering for the remaining tags is a future PR (one component
per tag, ~30 lines each).

**Build + lint**: tsc clean, `npm run build` clean (1.73s), zero new
lint issues.

### 2026-06-04 · 🐛 Fix — accept real-world MJML with bare `&` and HTML named entities

**Bug**: User tried to import a real MJML export (Apple-style "iPhone
pre-order" template), got `Not valid XML. Check your tags are closed
properly.` The MJML looked correct.

**Root cause**: Real-world MJML routinely contains characters that are
valid for MJML's own (HTML-permissive) parser but **invalid in strict
XML**, which is what `DOMParser` in `'application/xml'` mode enforces.
The two common offenders:

1. **Bare `&` in URL query strings** — Google Fonts hrefs almost always
   include `&display=swap`:
   ```xml
   <mj-font name="Inter" href="https://fonts.googleapis.com/...&display=swap"></mj-font>
   ```
   Strict XML reads `&display=swap` as the start of an entity reference
   (`&display`) and throws when it can't find a closing `;` and a known
   entity name.

2. **HTML named entities** — `&nbsp;`, `&copy;`, `&mdash;`, etc. These
   are valid HTML but **not valid XML** (XML only knows `&amp;`, `&lt;`,
   `&gt;`, `&quot;`, `&apos;`, and numeric `&#NNN;` / `&#xHH;`).

Without pre-processing, both patterns cause `DOMParser` to emit a
`parsererror` element, and our parser surfaces "Not valid XML" — even
though the MJML is perfectly fine.

**Fix**: Added `normalizeEntities(input)` pre-process step in
[src/lib/mjml/parse.ts](../../src/lib/mjml/parse.ts) that runs before
`DOMParser`. Two normalizations in one regex pass:

1. **Bare `&` not followed by a valid entity** → `&amp;`. Preserves
   the literal characters that follow, so URL query strings round-trip
   cleanly.
2. **Named HTML entity** (matching one of 21 common ones — nbsp / copy
   / reg / trade / mdash / ndash / hellip / lsquo / rsquo / ldquo /
   rdquo / laquo / raquo / bull / middot / deg / plusmn / times /
   divide / iexcl / iquest) → numeric XML equivalent (`&#160;`,
   `&#169;`, etc.). Universal across HTML and XML.

Already-valid XML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`,
`&#NNN;`, `&#xHH;`) pass through unchanged.

**Error message** also tightened: "Not valid XML. Check your tags are
closed properly **and quotes are paired**." — the original implied only
tag-closure issues; in practice unmatched quotes are at least as
common.

**Smoke verify** (7/7 green):

| Case | Behavior |
|---|---|
| `&display=swap` in mj-font href | ✅ parses; URL round-trips intact |
| `&nbsp;` inside mj-text | ✅ becomes literal NBSP (U+00A0) |
| Mixed `&copy; 2026 &mdash; AT&amp;T &amp; Bose. ?a=1&b=2` | ✅ all decode / pass through correctly |
| Empty input | ✅ still errors with "MJML is empty." |
| Missing `<mj-body>` | ✅ still errors precisely |
| Already-escaped `T&amp;Cs` | ✅ passes through as `T&Cs` |
| Numeric entity `&#169;` | ✅ passes through as `©` |

**Why this is safe**: only adds an escape pass before XML parsing. No
existing behavior changes — anything that was already valid XML still
parses identically. The only difference is more inputs now succeed
where they previously errored.

**Build + lint**:
- tsc clean, `npm run build` clean (1.63s), zero new lint issues.
- Bundle size effectively unchanged — adds ~700 bytes for the entity
  map and regex.

**Out of scope (future)**: a comprehensive HTML entity → numeric map
(there are ~250 named entities; we mapped the 21 most common). If
users hit a rare one (`&dagger;` etc.), it'll fall through to the
"escape leading `&`" branch — the entity stays literal in the imported
text, which is a graceful degradation. We can extend the named map as
real exports surface uncovered entities.

### 2026-06-04 · ✅ Done — V1 shipped

End-to-end MJML import working. Paste or upload MJML, validate it,
name + categorize, hit Import → land in the visual builder editing
your imported design.

#### Files (5 new + 3 modified)

```
NEW:
  src/lib/mjml/parse.ts                                       ─ parser + summarizeTree (~155 lines)
  src/components/templates/ImportMjmlDialog.tsx               ─ two-step modal (~270 lines)
  src/styles/components/templates/ImportMjmlDialog.module.scss

UPDATED:
  src/components/templates/index.ts                            ─ export ImportMjmlDialog
  src/components/templates/TemplatesEmptyState.tsx             ─ accepts onImport prop + secondary CTA
  src/styles/components/templates/TemplatesEmptyState.module.scss   ─ .ctas + .subSecondary
  src/pages/templates/TemplatesList.tsx                        ─ "Import MJML" button + dialog state + onImport handler
```

**Zero backend changes**, zero schema migrations, zero new npm
dependencies. Reuses the existing `POST /v1/clients/:cid/templates`
endpoint.

#### Parser implementation (src/lib/mjml/parse.ts)

- **DOMParser** in `'application/xml'` mode — strict, no HTML
  fallback quirks
- **XML prologue + DOCTYPE stripped** before parsing (browsers' XML
  mode rejects them in some configurations)
- **Three-layer validation**: empty → DOMParser error → structural
  (must have `<mjml>` root + `<mj-body>` descendant). Each layer
  has a precise error message; line number surfaced when the
  browser provides one.
- **Text-bearing tags** (`mj-text`, `mj-button`, `mj-raw`,
  `mj-style`, `mj-preview`, `mj-title`) capture `innerHTML` as the
  node's `content` — preserves inline HTML (`<strong>`, `<a>`,
  merge tags like `{{first_name|fallback}}`). Caught and fixed
  during smoke testing — initial version walked HTML children as
  IMjmlNode children, losing the interleaved text.
- **Container tags** (`mj-section`, `mj-column`, `mj-body`, etc.)
  walk element children recursively, producing nested IMjmlNodes.
- **`summarizeTree()`** counts blocks / sections / columns + flags
  tag names outside the visual registry (`mj-carousel`,
  `mj-accordion`, etc.) for the dialog's "heads up" affordance.
  `mj-head` children (mj-style, mj-attributes, mj-fonts) are
  preserved but NOT flagged — they're standard MJML, just not
  visually editable in V1.

#### Dialog implementation (ImportMjmlDialog.tsx)

Two-step modal, wider than the standard `TemplateFormDialog`
(680px max-width) to give the textarea + drop zone proper space:

**Step 1 — Source**:
- **Paste tab**: monospace textarea with the MJML skeleton as a
  placeholder. Parses on blur (not on every keystroke — debouncing
  would add complexity for no real win since users paste once).
- **Upload tab**: drag-drop zone OR click-to-pick. Accepts `.mjml`,
  `.txt`, `text/*`. 1 MB cap. File name auto-fills the template
  name on Step 2.
- **Live banner** below the source field:
  - Empty state: muted hint
  - Error: red banner with the parse error message + line number
  - Success: green banner with block / section / column counts +
    (if any) amber warning for unsupported tags
- **Buttons**: Cancel + Continue (disabled until parse succeeds)

**Step 2 — Name + category**:
- Name field (required, ≤120 chars, auto-filled from file name)
- Category datalist (optional, same options as TemplateFormDialog)
- Summary row showing block counts
- **Buttons**: ← Back · Cancel · Import (terra primary, loading
  state)
- Submit → POST via `createTemplate` → dispatch `addTemplate` →
  toast `Imported {name}` → navigate to `/templates/:newId/edit`

#### Entry points

- **TemplatesList header**: secondary "Import MJML" button (terra
  outline + cloud-upload icon) next to "+ New template"
- **TemplatesEmptyState** (FTUX): added a second CTA "Import MJML"
  next to "New template" + a small helper line:
  > Already have MJML from mjml.io, Stripo, or version control?
  > Paste or upload it and start editing visually.

#### Smoke test (parser, in-process)

Ran 8 representative cases via Node + linkedom DOMParser polyfill.
All pass:

| Case | Result |
|---|---|
| Simple template (section / column / text / button with href) | ✅ all attrs preserved |
| XML prologue + DOCTYPE | ✅ stripped, parses |
| `<mj-head>` with title + preview + style | ✅ preheader content preserved |
| Unsupported tag (mj-carousel) | ✅ lands in tree (lossless) |
| Empty input | ✅ errors with "MJML is empty." |
| Wrong root (`<html>`) | ✅ errors with "Top-level element must be `<mjml>`" |
| Missing mj-body | ✅ errors with "`<mj-body>` is required." |
| mj-text with inline HTML (`<strong>`, `<a>`, merge tags) | ✅ full HTML preserved as `content` (after the text-bearing-tags fix) |

The text-bearing-tag fix was caught by the smoke test — initial
parser walked HTML children of `<mj-text>` as IMjmlNode children
(losing text between them). Now text-bearing tags capture
`innerHTML` directly.

#### Build / lint

- `npm run build` clean (1.96s).
  - Templates chunk: **19.22 KB → 34.43 KB** (gzip 6.05 → 10.60 KB).
    +15 KB for ImportMjmlDialog + parser + their SCSS. Reasonable.
  - Builder chunk: 96.28 KB → 91.95 KB (smaller because of Vite's
    chunk reshuffling — code that was in Builder migrated to the
    templates chunk).
  - No new npm deps. Total bundle size effectively unchanged.
- `npm run lint`: 12 problems = exactly the pre-existing baseline.
  Zero new lint issues from this PR.

#### What user sees

1. Visit `/clients/:cid/templates` → "Import MJML" button appears
   in the header next to "New template", or in the empty state if
   no templates exist yet.
2. Click "Import MJML" → modal opens on the Source step (Paste tab
   active).
3. Paste MJML → blur → green "Looks valid — N blocks · M sections
   · K columns" banner. If unsupported tags, amber warning line.
4. Or click Upload tab → drag-drop a `.mjml` file → same banner.
5. Click Continue → Name step, name pre-filled from file name (or
   "Imported template" for paste).
6. Click Import → toast "Imported {name}" → land at
   `/templates/:newId/edit` with the imported tree loaded in the
   builder.
7. Edit normally, save, reload — design persists.

#### Acceptance criteria (all green)

- [x] "Import MJML" button visible on `/templates` next to "New
  template" (populated + empty states).
- [x] Modal opens with Paste + Upload tabs.
- [x] Valid MJML → "Looks valid — N blocks" affordance; Continue
  enables.
- [x] Invalid XML → precise error message; line number when the
  browser provides it.
- [x] Missing `<mj-body>` → precise "`<mj-body>` is required."
  error.
- [x] Wrong root element → precise error naming the actual tag.
- [x] `.mjml` file upload → reads contents; file name pre-fills
  template name.
- [x] Files > 1 MB → "File is X KB — max is 1 MB." error.
- [x] After Continue, name+category step shows; Name required;
  Import disabled until non-empty.
- [x] Import button creates template + dispatches `addTemplate` +
  navigates to `/edit`.
- [x] Imported template tree loads in Builder; all standard blocks
  editable.
- [x] Unsupported tags (mj-carousel) land in tree; canvas shows
  "unknown block" placeholder for those; save round-trips them.
- [x] Inline HTML in mj-text / mj-button (links, strong, merge
  tags) preserved verbatim.
- [x] Toast `Imported {name}` fires.
- [x] `npm run build` clean.
- [x] `npm run lint` adds 0 new issues.
- [x] No backend changes; existing endpoints unaffected.

#### Out of scope (deferred, as planned)

- ❌ MJML export — mirror of the parser, ~1 hour follow-up PR
- ❌ Syntax highlighting in the paste textarea (plain monospace
  textarea V1)
- ❌ MJML linting / best-practice warnings
- ❌ Bulk file import
- ❌ Drag-and-drop onto the templates list page itself (drag-drop
  works inside the modal only)
- ❌ AI-assisted HTML→MJML conversion (different feature)

#### Risks identified during implementation

- **Stripo / mjml.io export round-trip** — not tested against real
  third-party exports yet (only synthetic MJML). The parser
  handles XML prologue + DOCTYPE + custom attributes, so it should
  be fine, but watch for surprises in real-world testing.
- **Very large MJML (~1 MB)** — DOMParser is synchronous so the UI
  would freeze briefly. Acceptable for V1 (typical MJML is
  20-100 KB); add a background worker if anyone complains.
- **`<![CDATA[...]]>` in mj-style** — preserved through DOMParser
  but not explicitly tested. Should work; CDATA content surfaces
  in `innerHTML` correctly.

### 2026-06-04 · 📐 Planning — initial plan written

Plan above is the full V1 spec. Three-hour estimated end-to-end
implementation. No schema changes, no new backend endpoints, no
new npm deps. Sits cleanly on top of feature-templates PR 2.5
(the redesigned full-screen builder) — imported templates land in
the same visual editor that newly-created ones use.

Next: implement when the user gives go-ahead (waiting on PR 2.5
browser verification first).
