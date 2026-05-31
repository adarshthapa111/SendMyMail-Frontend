# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure (read before creating files)

🛑 **Before creating, moving, or renaming any file or folder, consult [doc/folder_structure/folder_structure.md](doc/folder_structure/folder_structure.md) and follow its placement + naming rules.** It is the single source of truth for how this repo is organized (the layers, where new code goes, naming conventions). If a change doesn't fit those rules, update that doc in the same change so it never drifts from the codebase.

## Design theme (read before creating UI)

🎨 **Before creating or restyling any UI file (`.tsx` component, `.module.scss`, or an HTML mockup), consult [doc/theme/theme.md](doc/theme/theme.md) and use its tokens, components, and layout patterns.** It is the single source of truth for how the product looks (colors, typography, spacing, radii, shadows, the fixed-sidebar/scrolling-main shell). Never hardcode hex values — reference the `var(--token)` design tokens. If a screen needs a token that doesn't exist, add it to that doc in the same change.

## Architecture (read before wiring a feature)

📐 **Before adding a route, a Redux slice, an API call, or a permission check, consult [doc/architecture/](doc/architecture/) — four short docs cover the cross-cutting decisions that no single feature owns:**

- [routes.md](doc/architecture/routes.md) — every URL ↔ mockup ↔ impl doc ↔ auth gate
- [state.md](doc/architecture/state.md) — Redux slice ownership and the active-client model
- [api-conventions.md](doc/architecture/api-conventions.md) — base URL, headers, error shape, pagination, idempotency
- [auth-tenancy.md](doc/architecture/auth-tenancy.md) — agency → clients → resources hierarchy + role/scope matrix

If a feature spec contradicts these, fix the contradiction in the same change (usually by updating one of the architecture docs).

## Tech stack (read before adding a dependency)

🧰 **Before installing a new package, consult [doc/tech_stack/tech_stack.md](doc/tech_stack/tech_stack.md).** It lists what's already in (§1), what's planned for V1 (§2), and what we've actively decided *against* for V1 (§3, e.g. Tailwind, SSR, GraphQL, UI kits). New dependencies need a one-line justification in the same PR (purpose, alternative considered, why this one).

## Setup (fresh clone → running locally)

🚀 New machine or new contributor? See [doc/setup/setup.md](doc/setup/setup.md) — prereqs (Node 20/22), clone/install/env/run, useful commands, and a troubleshooting table.

## Tasks (per-feature work logs)

📋 **Per-feature working logs live in [tasks/feature-{name}/change_log.md](tasks/README.md)** — they track the planning → in-progress → done lifecycle of each feature's actual implementation (separate from the spec in `doc/implementation_doc/`). When you start work on a feature, create its folder and log there; when you change something in an existing feature, update its log.

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b (type-check, project refs) then vite build
npm run lint     # ESLint over the repo
npm run preview  # Serve the production build
```

There is no test runner configured. `npm run build` is the type-correctness gate — run it before considering a change done.

## Environment

`VITE_BACKEND_URL` must be set for rendering to work — all MJML→HTML/MJML compilation happens server-side (see API layer below). The auth JWT is read from `localStorage['sendmymail_jwt']` and attached as a Bearer token on every request.

## What this is

A visual drag-and-drop **MJML email editor**. The user builds an email on a canvas, the editor maintains the email as an in-memory tree, and a backend compiles that tree to HTML/MJML. The built email can then be pushed to ~40 email platforms (ESPs, transactional providers, webhooks) via the integrations system.

The app is a single Redux store with two top-level views switched by `app.view` in [App.tsx](src/App.tsx): `editor` (the builder) and `integrations` (the platform connection screen).

## Core architecture

### The tree is the single source of truth

The entire email is one `IMjmlNode` tree (`{ tagName, attributes, content, children }`) living in `editor.tree`. This mirrors the MJML element structure (`mjml` > `mj-body` > `mj-section` > `mj-column` > content blocks). See [tree/types.ts](src/tree/types.ts).

Two **editor-only** fields are layered on top and never reach the backend:
- `_id` — a UUID used for selection/hover/lookup. Stripped by [tree/strip.ts](src/tree/strip.ts) before any network call.
- `_meta` — blockType / locked / notes.

### Paths, not IDs, address nodes for mutation

A `NodePath` is an array like `['children', 1, 'children', 0]` that walks from the root. All tree mutations in [tree/operations.ts](src/tree/operations.ts) (insert/move/delete/duplicate/updateAttr/updateContent) take a path and are **pure functions built on immer's `produce`** — they return a new tree with structural sharing.

Because UI components know a node's `_id` (from clicks) but operations need a path, the store keeps an `idPathCache` (`_id → NodePath`) rebuilt by `buildIdPathCache` after every structural mutation. See [tree/paths.ts](src/tree/paths.ts). When you add an action that changes tree shape, you must rebuild this cache.

### Redux editor slice owns all tree state and history

[store/slices/editorSlice.ts](src/store/slices/editorSlice.ts) is the heart of the app. Every mutating reducer follows the same pattern: snapshot the current tree, apply a pure `tree/operations` function, rebuild `idPathCache`, then `pushHistory`. Undo/redo work on immutable tree snapshots (immer's `current()`), capped at `HISTORY_LIMIT = 50`. Structural sharing makes snapshots cheap.

Note the deliberate split of email metadata:
- `subject` lives in slice state (MJML has no subject element — it's an ESP concern).
- The preheader lives **inside the tree** as an `mj-preview` node so it compiles into the HTML head naturally. Edited via `setPreheader`, read via `getPreheaderFromTree`.

The store ([store/index.ts](src/store/index.ts)) has three slices: `editor`, `app` (view switch), `integrations`. Use the typed `useAppSelector` / `useAppDispatch` from [store/hooks.ts](src/store/hooks.ts).

### Canvas rendering is an editing approximation, NOT a preview

[canvas/renderTree.tsx](src/canvas/renderTree.tsx) recursively renders the tree into selectable/editable DOM. It is explicitly **not** what the final email looks like — the iframe preview (compiled server-side) is the source of truth. Inline text editing uses [canvas/ContentEditable.tsx](src/canvas/ContentEditable.tsx); drag-and-drop is `@dnd-kit` with `DropZone`/`DragChip`.

### Block registry + drop rules

- [blocks/registry.ts](src/blocks/registry.ts) maps a block id to a `factory()` that produces a fresh `IMjmlNode` subtree. The palette is generated from this registry. Adding a new block type = add a factory in `blocks/` and register it here.
- Each block has a `category` (where it can be dropped) and a `group` (where it shows in the palette sidebar) — these are intentionally different axes. See [blocks/categories.ts](src/blocks/categories.ts), where `CONTAINER_ACCEPTS` encodes MJML's structural drop rules that drop zones enforce.

### Server-side rendering

[api/renderTemplate.ts](src/api/renderTemplate.ts) is the only network path for compilation. It POSTs the **stripped** tree to `/getHtml` or `/getMjml` with an `operationType` (`preview` | `copy`) and an optional `thirdPartyClientName` (so the backend can inject platform-specific attributes/merge tags). Requests support `AbortSignal`.

### Integrations system (tiered)

[integrations/registry.ts](src/integrations/registry.ts) is the catalog of every supported platform, organized into four **tiers** that determine the entire UX:
- **Tier 1** — full API integration: has `credentialFields`, `testEndpoint`, `sendEndpoint`. Connects and pushes drafts directly.
- **Tier 2** — export with ESP-specific HTML attributes baked in (copy/paste, no connection).
- **Tier 3** — plain copy & paste (HTML/MJML).
- **Tier 4** — webhooks: `acceptsUrl: true`, POST compiled HTML to a user URL.

The `value` field is the **exact `thirdPartyClientName` string the backend expects** — don't change it casually. The catalog drives the whole integrations UI (cards, modals, export dropdown) under [components/integrations/](src/components/integrations/).

Credentials and connection state are **localStorage-only**, namespaced in [integrations/credentials.ts](src/integrations/credentials.ts). Connection *metadata* is rehydrated into Redux on startup (`hydrateConnections`), but raw *credentials* are loaded on demand (modal open, send) and deliberately never sit in Redux.

## Stack notes

React 19 + TypeScript + Vite, Redux Toolkit (with immer), `@dnd-kit` for drag-and-drop, `react-hot-toast` for notifications, **SCSS Modules + Tailwind v4** (both reference the same `var(--token)` design tokens — see [doc/theme/theme.md §12](doc/theme/theme.md)) for component styling. See [doc/tech_stack/tech_stack.md](doc/tech_stack/tech_stack.md) for the full stack rationale and V1 additions.
