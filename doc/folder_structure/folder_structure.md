# Folder Structure — single source of truth

> 🛑 **READ THIS BEFORE CREATING ANY FILE OR FOLDER.**
>
> **For Claude / AI agents:** Before you create, move, or rename a file or folder,
> consult this document and follow its placement + naming rules. If your change
> doesn't fit the rules here, update this file *first* (in the same change) so
> the doc and the codebase never drift apart. Do not invent a new top-level
> folder or convention without recording it here.
>
> **For developers:** This is the map of the repo. New code goes where this doc
> says it goes — that's what keeps the project understandable as it grows.

This describes the **`sendmymail-frontend`** repo: a Vite + React + TypeScript SPA
(the custom MJML email editor). For *what the code does*, see [CLAUDE.md](../../CLAUDE.md);
for *what we're building*, see [doc/MVP.md](../MVP.md).

---

## 1. The mental model (read this first)

The app has **layers**, and dependencies flow in **one direction** — from the
pure core outward to the UI. A file should only import from layers *below* it:

```
┌─────────────────────────────────────────────┐
│  UI            components/ · canvas/          │  React components, SSCSS Modules
├─────────────────────────────────────────────┤
│  State         store/                         │  Redux Toolkit slices + hooks
├─────────────────────────────────────────────┤
│  Domain core   tree/ · blocks/                │  pure TS: the email tree + block factories
├─────────────────────────────────────────────┤
│  Edges         api/ · integrations/           │  network calls + platform catalog
└─────────────────────────────────────────────┘
```

- **`tree/` is the heart.** The whole email is one `IMjmlNode` tree. Everything else serves it.
- **Pure logic has no React.** `tree/`, `blocks/`, `api/`, `integrations/` are plain `.ts` — no JSX, no hooks.
- **UI never mutates the tree directly.** UI dispatches Redux actions → `store/slices/editorSlice.ts` → calls a pure function in `tree/operations.ts`.

If you keep imports flowing downward, the code stays easy to reason about.

---

## 2. Top-level layout

```
sendmymail-frontend/
├── src/                  ← all application code (see §3)
├── public/               ← static assets served as-is (favicon, images)
├── doc/                  ← all documentation (MVP, features, prototype, this file)
├── dist/                 ← build output — generated, never edit by hand
├── index.html            ← Vite entry HTML; mounts #root
├── package.json          ← scripts + dependencies
├── vite.config.ts        ← build/dev config
├── tsconfig*.json         ← TypeScript project config
├── eslint.config.js      ← lint rules
├── CLAUDE.md             ← guidance for Claude Code (architecture + rules)
└── README.md
```

**Documentation lives under `doc/`**, one topic per subfolder:

```
doc/
├── MVP.md                          ← product spec (source of truth for scope)
├── feature/                        ← feature_list.md + feature_details.md
├── implementation_doc/             ← per-module build specs (feature-*.md)
├── prototype/                      ← the original full HTML prototype + its feature map
├── mockups/                        ← polished, themed screen mockups (agency_dashboard, clients_list, campaign_report …)
├── theme/                          ← theme.md (design tokens + components)
└── folder_structure/               ← THIS file
```

---

## 3. The `src/` map

```
src/
├── main.tsx                ← app entry: mounts <App/> in Redux <Provider>
├── App.tsx                 ← top-level view switch (editor vs integrations)
├── index.css               ← global styles (the ONLY global CSS)
│
├── tree/                   ← DOMAIN CORE — the email as an IMjmlNode tree (pure TS)
│   ├── types.ts            ← IMjmlNode, NodePath (the core types)
│   ├── operations.ts       ← pure insert/move/delete/duplicate/update (immer)
│   ├── paths.ts            ← path<->id lookup, idPathCache, clone helpers
│   ├── strip.ts            ← remove editor-only fields before network calls
│   └── newTemplate.ts      ← starting email tree
│
├── blocks/                 ← BLOCK REGISTRY — one factory per block type (pure TS)
│   ├── registry.ts         ← maps block id → factory(); palette is built from this
│   ├── categories.ts       ← drop-rule categories + palette groups
│   ├── text.ts image.ts button.ts divider.ts spacer.ts
│   ├── hero.ts navbar.ts social.ts sections.ts rawHtml.ts
│   └── labels.ts
│
├── store/                  ← STATE — Redux Toolkit
│   ├── index.ts            ← configureStore; RootState / AppDispatch types
│   ├── hooks.ts            ← typed useAppSelector / useAppDispatch
│   ├── selectors.ts        ← shared selectors
│   └── slices/             ← one file per slice
│       ├── editorSlice.ts      ← tree state + history (the big one)
│       ├── appSlice.ts         ← which top-level view is active
│       └── integrationsSlice.ts← connection state
│
├── styles/                 ← ALL SSCSS Modules, mirroring the source folder tree
│   ├── canvas/                 ← styles for canvas/* components
│   │   ├── renderTree.module.scss DropZone.module.scss …
│   ├── components/             ← styles for components/* components
│   │   ├── Toolbar.module.scss Palette.module.scss …
│   │   ├── inspector/controls/controls.module.scss
│   │   └── integrations/       ← Modal / ExportDropdown / IntegrationsScreen .module.scss
│
├── canvas/                 ← UI: the editable canvas (renders the tree to DOM)
│   ├── renderTree.tsx          ← recursive tree → selectable DOM
│   ├── ContentEditable.tsx     ← inline text editing
│   ├── DropZone.tsx · DragChip.tsx          ← drag-and-drop (@dnd-kit)
│   └── SelectionToolbar.tsx · FloatingTextToolbar.tsx
│       (styles live in styles/canvas/<Component>.module.scss)
│
├── components/             ← UI: everything else, composed into screens
│   ├── EditorShell.tsx         ← the editor layout (palette + canvas + inspector)
│   ├── Canvas.tsx Toolbar.tsx Palette.tsx Inspector.tsx
│   ├── PreviewModal.tsx EmailSettingsBar.tsx
│   ├── inspector/              ← per-block property editors
│   │   ├── TextInspector.tsx ButtonInspector.tsx … (one per block type)
│   │   ├── AdvancedPanel.tsx · useInspectorHelpers.ts
│   │   └── controls/           ← reusable form controls
│   │       ├── ColorPicker.tsx FontPicker.tsx NumberInput.tsx …
│   │       └── useDebouncedCommit.ts
│   └── integrations/           ← the integrations screen + its modals
│       ├── IntegrationsScreen.tsx · PlatformCard.tsx · PlatformIcon.tsx
│       ├── ConnectModal.tsx SetupModal.tsx WebhookModal.tsx ModalShell.tsx
│       └── ExportDropdown.tsx
│       (styles live in styles/components/… mirroring this tree)
│
├── api/                    ← EDGE: network calls
│   └── renderTemplate.ts       ← the only path to backend compile (/getHtml, /getMjml)
│
└── integrations/           ← EDGE: platform catalog + credentials (pure TS, no UI)
    ├── registry.ts             ← the ESP/platform catalog (tiers, fields)
    └── credentials.ts          ← localStorage credential + connection storage
```

> Note the deliberate split: **`integrations/`** (pure data: catalog + credential
> storage) vs **`components/integrations/`** (the React UI that renders it). Same
> pattern could apply to any feature — keep logic out of components.

---

## 4. Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| React component file | `PascalCase.tsx`, one component per file | `components/Toolbar.tsx` |
| Component styles | SCSS Module in **`src/styles/`** mirroring the component's folder, imported via the **`@styles`** alias | `@styles/components/Toolbar.module.scss` |
| Pure logic / domain / data | `camelCase.ts`, no JSX | `operations.ts`, `registry.ts` |
| React hook | `useX.ts` (camelCase, `use` prefix) | `useDebouncedCommit.ts` |
| Redux slice | `xSlice.ts` in `store/slices/` | `editorSlice.ts` |
| Block factory | one file per block in `blocks/`, registered in `registry.ts` | `button.ts` |
| Global CSS | only `src/index.css` — everything else is a SCSS Module under `styles/` | — |
| Types | co-locate with their domain (`tree/types.ts`); slice types live in the slice | — |

**Styles rule:** SSCSS Modules do **not** sit next to components. They live in
`src/styles/<same-folder-path>/<ComponentName>.module.scss`, mirroring the source
tree, and are imported through the **`@styles` path alias** — never with relative
`../` paths. Examples:

| Component | Stylesheet | Import |
|-----------|-----------|--------|
| `src/components/Toolbar.tsx` | `src/styles/components/Toolbar.module.scss` | `import styles from '@styles/components/Toolbar.module.scss'` |
| `src/canvas/DropZone.tsx` | `src/styles/canvas/DropZone.module.scss` | `import styles from '@styles/canvas/DropZone.module.scss'` |
| `src/components/integrations/ModalShell.tsx` | `src/styles/components/integrations/Modal.module.scss` | `import styles from '@styles/components/integrations/Modal.module.scss'` |

The `@styles` alias points at `src/styles/` and is configured in two places that
must stay in sync — **[vite.config.ts](../../vite.config.ts)** (`resolve.alias`) and
**[tsconfig.app.json](../../tsconfig.app.json)** (`compilerOptions.paths`). Because the import
path is alias-relative (not file-relative), it's the same no matter how deep the
component sits — no `../../../` counting.

**One-thing-per-file rule:** one component, one slice, one block factory per file.

---

## 5. "Where do I put…?" — quick guide

| I want to add… | Put it in | Then |
|----------------|-----------|------|
| A new **block type** (e.g. a video block) | `blocks/<name>.ts` (factory) | register in `blocks/registry.ts`; add an inspector in `components/inspector/` |
| A property editor for a block | `components/inspector/<Block>Inspector.tsx` | reuse controls from `components/inspector/controls/` |
| A reusable form control | `components/inspector/controls/<Name>.tsx` | — |
| A new **screen / big UI area** | `components/<Name>.tsx` + styles in `styles/components/<Name>.module.scss` | wire into `App.tsx` / `EditorShell.tsx` |
| A **stylesheet** for a component | `styles/<mirror-of-component-folder>/<Name>.module.scss` | import via `@styles/<mirror>/<Name>.module.scss` |
| New **tree behaviour** (a mutation) | a pure fn in `tree/operations.ts` | call it from a reducer in `editorSlice.ts` |
| New **global state** | a reducer in an existing `store/slices/*` (or a new slice) | register a new slice in `store/index.ts` |
| A new **backend call** | extend `api/renderTemplate.ts` or add `api/<name>.ts` | keep all network code in `api/` |
| A new **export/ESP platform** | an entry in `integrations/registry.ts` | UI is data-driven from the catalog |
| A **new documentation topic** | a new subfolder under `doc/<topic>/` | — |

If your addition doesn't fit any row above, that's a signal: either it belongs in
an existing file, or you need a new folder — in which case **add it to §3 of this
doc in the same change**.

---

## 6. Rules for creating new files & folders (the consistency contract)

1. **Check this doc first.** Find the layer/folder that matches what you're adding.
2. **Prefer adding to an existing file/folder** over creating a new one. Don't make a folder for a single file.
3. **Create a new folder only when** a group of ≥3 related files emerges (mirrors how `inspector/`, `controls/`, `integrations/` formed). When you do, **document it in §3 here**.
4. **Respect the dependency direction** (§1): UI → state → domain → edges. Never import UI from `tree/`, `blocks/`, or `api/`.
5. **Keep pure logic out of components.** If a component grows non-trivial logic, extract it to a `.ts` module (a hook, a `tree/` function, or a helper).
6. **Styles live in `src/styles/`**, mirroring the component's folder path — never next to the component. Import them via the **`@styles`** alias (configured in `vite.config.ts` + `tsconfig.app.json`), never with `../` paths. No global CSS except `index.css`.
7. **Match the naming table** (§4) exactly.
8. **If the rules need to change, change this file in the same PR.** The doc and the tree must never disagree.

---

## 7. Planned / not yet built

The [MVP](../MVP.md) describes a full multi-tenant platform (NestJS backend,
BullMQ workers, Postgres, etc.). **None of that exists in this repo yet** — this
repo is the frontend email-builder slice (Module 05 + the integrations catalog).

When the backend or other top-level areas are added, document their structure
here **before** the code lands, so this file stays the single source of truth.
Do not create speculative folders for work that hasn't started.
