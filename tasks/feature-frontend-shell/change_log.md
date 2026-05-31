# Feature: Frontend shell — change log

> The foundational React app shell — installs the V1 styling/routing stack, wires the design tokens, and ports the topbar + sidebar chrome from the mockups into real React components. **No feature work in this PR** — every page is a placeholder route that lazy-loads.
>
> This is the prerequisite for every feature PR that follows. After this lands, building any single screen becomes a small ~3-file PR.

## Scope

**IN this PR:**

- Install the V1 styling stack: `sass`, `tailwindcss@latest` (v4), `@tailwindcss/vite`
- Install routing: `react-router-dom`
- Swap notification lib: drop `react-toastify`, add `react-hot-toast`
- Swap icons: drop `react-icons`, add `@tabler/icons-react`
- Rewrite `src/index.css` with the canonical `@theme` block (Tailwind utilities mapped to our tokens) + `:root` block (same tokens for SCSS / raw CSS) + font imports + body reset — per [theme.md §11](../../doc/theme/theme.md)
- Add `@styles` path alias to `vite.config.ts` + `tsconfig.app.json` — per [folder_structure.md](../../doc/folder_structure/folder_structure.md)
- Configure `@tailwindcss/vite` plugin in `vite.config.ts`
- Build the React app chrome:
  - `src/components/shell/AppShell.tsx` — layout (topbar + sidebar + scrolling main)
  - `src/components/shell/Topbar.tsx` — brand + client switcher + search + bell + new-campaign + user menu (port from `doc/mockups/_shell.js`)
  - `src/components/shell/Sidebar.tsx` — section labels + nav items + active highlight (port from `_shell.js`)
  - `src/components/shell/UserMenu.tsx` — avatar dropdown
  - `src/components/shell/ClientSwitcher.tsx` — top-bar dropdown to switch active client
- Build the router:
  - `src/router/index.tsx` — route table with lazy chunks per [routes.md §5](../../doc/architecture/routes.md#5-code-split-boundaries)
  - `src/router/guards/` — stub guards (`Public`, `AuthOnly`, `AgencyReady`, `ClientScoped`, `RoleGated`) that for now always pass; real logic lands with the auth feature
- Create placeholder page components for every route in [routes.md](../../doc/architecture/routes.md) — each renders just a `<h1>` + route path so we can see lazy-loading working
- Fold the existing MJML editor under `/clients/:clientId/templates/:templateId/edit` (it's already built; just plug it into the router)
- Wire `react-hot-toast`'s `<Toaster />` once in `AppShell`

**NOT in this PR (separate work):**

- Real auth logic (everything's a passing stub) — that's [`tasks/feature-auth/`](#) (next)
- Any feature CRUD (clients, contacts, campaigns, etc.)
- RTK Query setup — added with the first real API call
- Sentry / PostHog wiring — added before first deploy
- Vitest / Playwright — added in a separate testing-foundation PR
- Prettier + husky + lint-staged — separate dev-tooling PR

## Acceptance criteria

- [ ] `npm run dev` renders the warm theme in React — topbar + sidebar + main scroll area look identical to [agency_dashboard.html](../../doc/mockups/agency_dashboard.html)
- [ ] Clicking sidebar items navigates between routes
- [ ] The currently-active sidebar item is highlighted (terracotta pill, same as mockup)
- [ ] User avatar menu opens on click, closes on outside-click
- [ ] Bell button links to `/notifications`
- [ ] Help & support link in sidebar footer links to `/help`
- [ ] Each route loads its own chunk (verify with the Network tab — separate `.js` files per chunk)
- [ ] `npm run build` passes type-check
- [ ] `npm run lint` passes
- [ ] The existing MJML editor still works when navigated to `/clients/:clientId/templates/:templateId/edit`
- [ ] Tailwind utilities work in JSX: `<div className="bg-card text-ink rounded-lg p-4 flex gap-4">` renders correctly
- [ ] SCSS Modules work: a sample `Card.module.scss` imported via `@styles/components/Card.module.scss` renders correctly
- [ ] No old hexes (`#6366F1`, `#5046E5`, etc.) sneak into any new file — only `var(--token)` or Tailwind utilities mapped to our `@theme`

## Dependencies

**Adding:**
- `react-router-dom` (^7) — routing
- `sass` (devDep) — SCSS Module support
- `tailwindcss` (^4) — utility classes
- `@tailwindcss/vite` (devDep, ^4) — Vite plugin for Tailwind v4
- `react-hot-toast` — notifications
- `@tabler/icons-react` — icons

**Removing:**
- `react-toastify` — replaced by react-hot-toast
- `react-icons` — replaced by @tabler/icons-react

## Decisions made for this PR

- **React Router v7 over TanStack Router** — per [tech_stack.md §2](../../doc/tech_stack/tech_stack.md). Stable, nested layouts out of the box, well-known.
- **Tailwind v4 (not v3)** — v4's `@theme` block reads tokens directly from CSS, no `tailwind.config.js` needed. Cleaner integration with our token system.
- **Lazy-load by route chunk, not by component** — matches [routes.md §5](../../doc/architecture/routes.md#5-code-split-boundaries). Simpler mental model: one URL group = one chunk.
- **Stub auth guards in this PR** — every guard returns `true` for now. Real logic lands when the auth feature PR adds the JWT + agency state. Lets us ship + verify the router without blocking on backend.
- **Mock data for the client switcher** — Khukri Spices hard-coded (same as `_shell.js`). Real `clientsApi` query comes with the clients feature.
- **No styling refactor of the existing editor** — it keeps its `.module.css` files for now. Will migrate to `.module.scss` opportunistically as we touch each editor component.

## Changes (newest first)

### 2026-05-31 · 📋 Planning — initial scope locked

The plan above is what this PR delivers. Next step: review with the team (or just confirm to proceed), then start implementation.

**Estimated file count:** ~30 files added, ~6 files modified (`package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.app.json`, `src/main.tsx`, `src/App.tsx`).

**Estimated time:** 1–2 days of focused work for a single dev who's already comfortable with the stack.

**Risk areas:**
- Tailwind v4 is recent — IDE plugins / VS Code IntelliSense may need extension updates. Tested on the latest VS Code Tailwind plugin.
- React 19 + React Router v7 — both very recent; double-check there's no peer-dep mismatch in `npm install`.
- The existing MJML editor's state lives in Redux already (`editorSlice`); plugging it into a route means it activates when the route mounts. Should "just work" but verify the tree state hydrates correctly on a fresh route mount.

---

*(future entries — 🚧 in-progress, ✅ done — get added above this line.)*
