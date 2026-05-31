# Tech stack — what we use and why

> ⚙️ The dependency list, locked. Anything not in §1 or §2 of this doc is **not
> in V1.** If a feature needs a new package, propose it here in the same PR
> (purpose, alternative considered, why we picked it). No quiet additions.

The current `package.json` is the source of truth for installed versions; this
doc explains *why* each thing is in (or proposed for) the stack.

---

## 1. Already in the repo (✅ shipped)

These are installed today and load-bearing in the existing MJML editor.

### Runtime
| Package | Pin | Role |
|---|---|---|
| `react` · `react-dom` | `^19.2` | UI runtime. We're on React 19, so we get the new compiler-friendly hooks (`use`, automatic ref forwarding, the actions/`useFormStatus` API) without separate experimental opt-ins. |
| `typescript` | `~6.0` | Type system. Strict mode on. `npm run build` (= `tsc -b && vite build`) is the type-correctness gate. |
| `vite` · `@vitejs/plugin-react` | `^8.0` / `^6.0` | Build tool + dev server with HMR. SPA — no SSR (per [MVP §12 decision log](../MVP.md)). |

### State + data flow
| Package | Pin | Role |
|---|---|---|
| `@reduxjs/toolkit` | `^2.12` | The store. Slices, reducers, thunks, and `createSelector` come from here. See [architecture/state.md](../architecture/state.md) for the V1 slice map. |
| `react-redux` | `^9.3` | React bindings. Use the typed `useAppSelector` / `useAppDispatch` from [src/store/hooks.ts](../../src/store/hooks.ts) — never the raw `useSelector` / `useDispatch`. |
| `immer` | `^11.1` | Immutable tree mutations via `produce`. The email-builder's pure operations in [src/tree/operations.ts](../../src/tree/operations.ts) are built on this. RTK uses it internally too. |
| `axios` | `^1.16` | HTTP client. The existing pattern in [src/api/renderTemplate.ts](../../src/api/renderTemplate.ts) gets generalized into a single wrapper that attaches the JWT + base URL + handles the error shape in [architecture/api-conventions.md](../architecture/api-conventions.md). |

### UI primitives
| Package | Pin | Role |
|---|---|---|
| `@dnd-kit/core` · `@dnd-kit/sortable` | `^6.3` / `^10.0` | Drag-and-drop for the email-builder canvas (block palette → drop zones, reorder). Already wired. |
| `react-icons` | `^5.6` | Icon set for in-app React code. **Note overlap with Tabler Icons webfont** used in the mockups via `<i class="ti ti-…">` — see §4. |
| `react-toastify` | `^11.1` | **To be swapped for `react-hot-toast`** in the first toast-touching PR — see §2. Existing call sites get migrated as they're touched (not in one big sweep). |

### Utilities
| Package | Pin | Role |
|---|---|---|
| `uuid` | `^14.0` | The node `_id`s in the MJML tree (see [src/tree/types.ts](../../src/tree/types.ts)) + idempotency keys for POSTs (see [architecture/api-conventions.md §6](../architecture/api-conventions.md#6-idempotency--required-for-actions-that-move-money-or-send-mail)). |

### Tooling
| Package | Pin | Role |
|---|---|---|
| `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | latest | Linting. `npm run lint` runs the full repo. Flat config (`eslint.config.js`). |
| `@types/*` | | TS type packages for `react`, `react-dom`, `node`, `uuid`. |

---

## 2. V1 additions (🟡 add before / during early sprints)

What we need to actually build the rest of the app. Each comes with a primary recommendation and the alternative we considered.

### Notifications — `react-hot-toast` (replaces `react-toastify`)
**Why:** smaller bundle (~5kb vs ~13kb), simpler imperative API (`toast.success(msg)` / `toast.error(msg)` / `toast.promise(p, {...})`), built-in promise toasts (clean for async actions like "Saving…" → "Saved"), no global CSS file to import. Headless by default — easy to restyle with our warm tokens.
**Alternative considered:** keep `react-toastify` (already installed). `react-hot-toast` won on API and bundle size.
**Migration:** add `react-hot-toast`, mount `<Toaster />` once near the router root, leave `react-toastify` in place until each call site is migrated organically — both can coexist briefly. Drop `react-toastify` from `package.json` once the last call site moves.

### Styling — **SCSS Modules** + **Tailwind v4 utilities** (tokens-only)
A two-layer model. Both reference the same `var(--token)` CSS custom properties — they don't compete, they cover different jobs:

| Layer | When to reach for it | Lives in |
|---|---|---|
| **Tailwind utilities** | One-off layout / spacing / state on JSX: `flex`, `gap-4`, `p-6`, `mt-auto`, `bg-primary`, `text-ink`. Fast, no new file per variant. | JSX `className` |
| **SCSS Modules** | Component structure, nesting, mixins, complex selectors, hover/focus states beyond a single utility | `*.module.scss` in `src/styles/` |

**Why this combination:** the warm token set is small (~25 colors / radii / shadows) and editorial. SCSS gives nesting + `@use` + mixins for the complex bits; Tailwind gives JSX-utility ergonomics for the simple bits. Tokens stay the single source of truth — neither layer invents its own palette.

**The critical config rule — Tailwind v4 with `@theme` exposing ONLY our tokens, no defaults.** In `src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* ONLY our tokens — Tailwind defaults disabled */
  --color-primary:       #C56A33;
  --color-primary-light: #F5E7D9;
  --color-primary-ink:   #964B22;
  --color-indigo:        #4B43A8;
  --color-indigo-soft:   #ECEAFB;
  --color-ink:           #2B2620;
  --color-muted:         #6E6860;
  --color-soft:          #9C958A;
  --color-bg:            #FAF6EF;
  --color-card:          #FFFFFF;
  --color-surface:       #F2EEE4;
  --color-line:          rgba(43,38,32,0.11);
  --color-green:         #2E8B5E;  --color-green-bg: #E5F0E7;
  --color-amber:         #B07A1A;  --color-amber-bg: #F6ECD6;
  --color-red:           #B5463A;  --color-red-bg:   #FBEAE7;
  --radius-sm: 12px;  --radius: 14px;  --radius-lg: 20px;
  --shadow-sm: 0 1px 2px rgba(43,38,32,.05);
  --shadow:    0 1px 2px rgba(43,38,32,.04), 0 14px 30px -22px rgba(43,38,32,.30);
}
```

That gives you `bg-primary`, `text-ink`, `border-line`, `rounded-lg`, `shadow`, etc. — plus all of Tailwind's layout utilities (`flex`, `grid`, `gap-*`, `p-*`, `m-*`) which don't reference colors and so don't conflict.

**Hard PR-review rule:** any Tailwind class that isn't a layout utility AND isn't in the `@theme` block → reject. No `bg-blue-500`, no `text-zinc-900`. The whole point is one warm palette.

**Alternatives considered:** plain CSS Modules + no Tailwind (works, more boilerplate for one-off layouts); Tailwind alone with default palette (would actively work against the editorial feel); CSS-in-JS (runtime cost, redundant with tokens).

**Install:**
```bash
npm install -D sass tailwindcss @tailwindcss/vite
```
Then add `tailwindcss()` to `vite.config.ts`'s plugins array. SCSS support is automatic with `sass` installed.

**Migration from current state:** rename `*.module.css` → `*.module.scss` as you touch each component. New files use `.module.scss`. Tailwind utilities can be added to any JSX file the moment Tailwind is installed — no file renaming required.

### Routing — `react-router-dom`
**Why:** the app today is a single view switched by `app.view` in Redux. V1 has ~30 routes (see [architecture/routes.md](../architecture/routes.md)). React Router v6/7 is the de-facto standard, supports lazy chunks per route (matches our code-split table), nested layouts (for the persistent shell), and data routers (loaders/actions) if we want them later.
**Alternative considered:** TanStack Router (type-safe routes, codegen). More elegant types, smaller ecosystem, no nested-layouts-out-of-the-box pattern. Pick React Router for V1; revisit if route-typing pain shows up.

### Server cache — RTK Query (already part of `@reduxjs/toolkit`)
**Why:** every backend resource (clients, contacts, campaigns, …) needs caching, invalidation, polling, and pagination. RTK Query ships *with* the toolkit we already have — zero new deps. It cleanly separates server cache from app state (see [architecture/state.md §1](../architecture/state.md#1-mental-model--four-places-state-can-live)), supports cache tags for cross-resource invalidation, has built-in optimistic updates and `keepUnusedDataFor` for memory control.
**Alternative considered:** TanStack Query (richer dev UX, framework-agnostic). Better library but a second mental model alongside Redux. Stick with RTK Query — same library, same devtools.

### Form handling — `react-hook-form` + `zod`
**Why:** auth, workspace setup, client create, campaign wizard, form builder — V1 has ~15 forms, some multi-step. `react-hook-form` minimises re-renders, plays well with controlled and uncontrolled inputs, and integrates with `zod` for schema validation. Use the same zod schemas to validate API responses where it matters (e.g., the JWT payload).
**Alternative considered:** Formik (heavier, more renders). TanStack Form (newer, smaller community).

### Date / time — `date-fns` + `date-fns-tz`
**Why:** the campaign scheduler, reports, "sent 2 hours ago" stamps. `date-fns` is tree-shakeable (we won't ship megabytes of locale data), supports the `Asia/Kathmandu` TZ via `date-fns-tz`, and stays out of our way (no `moment`-style mutation traps).
**Alternative considered:** Day.js (smaller core, plugin friction). `Intl` API only (we'll still need it for relative-time math).

### Charts — `recharts`
**Why:** the dashboard ([agency_dashboard.html](../mockups/agency_dashboard.html)), per-campaign reports ([campaign_report.html](../mockups/campaign_report.html)), and per-client reports each need an area chart, a donut, and a horizontal-bar funnel. `recharts` is component-based (composes naturally with React), supports the styling needed for our `--indigo` / `--primary` series colors, and is small enough.
**Alternative considered:** `visx` (more control, more code), `chart.js` + `react-chartjs-2` (imperative, awkward in JSX), Apex (heavy). Pick `recharts`; if we hit perf or styling limits, replace specific charts with `visx` islands.

### Icons — **drop `react-icons`, standardise on Tabler Icons React**
**Why:** the mockups use Tabler via webfont (`<i class="ti ti-mail">`). For React we want the tree-shakeable component package — `@tabler/icons-react` — so a screen only ships the icons it actually uses (vs. `react-icons`'s grab-bag approach that we already have but isn't aligned with the design system).
**Decision:** remove `react-icons`, add `@tabler/icons-react`. Single icon source = single mental model.

### Error monitoring — `@sentry/react`
**Why:** unhandled exceptions, source-mapped stack traces, release tracking. Wire at the router root (`Sentry.ErrorBoundary` around every lazy route) so a feature crash doesn't blank the whole app. Free tier covers V1.
**Alternative considered:** none seriously; Sentry is the default.

### Analytics — `posthog-js`
**Why:** product analytics (funnel from `/signup` → first send, per-feature DAU, cohort retention) plus session replay for debugging. Self-hostable, generous free tier, EU/Asia data residency available.
**Alternative considered:** Plausible (privacy-first, lighter, no replay). Mixpanel (more enterprise). Pick PostHog; revisit if cost or compliance pushes us.

### Testing — `vitest` + `@testing-library/react` + `playwright`
**Why:** Vitest for unit tests (component logic, slice reducers, tree operations) — same Vite config, fast, Jest-compatible API. Testing Library for component testing. Playwright for end-to-end on the **three critical paths**: signup → first send, drag-block-into-canvas → preview, send-to-ESP-integration.
**Bar:** unit tests required for `tree/operations.ts` and any pure logic in `src/utils/`; component tests for anything with non-trivial state; E2E only for the three critical paths. CI runs all three on PR.

### Code formatting — `prettier`
**Why:** zero-discussion formatting on save / pre-commit. Run as `npm run format`. Configure to *not* fight ESLint (let ESLint own logic rules, Prettier own whitespace).

### Git hooks — `husky` + `lint-staged`
**Why:** pre-commit runs Prettier + ESLint --fix on staged files only (fast). pre-push runs `npm run build` + `npm test` (catches typescript errors before they hit CI).

### Env management — `dotenv` (built-in to Vite) + a typed wrapper
**Why:** Vite already loads `.env`, `.env.local`, `.env.production`. Add `src/config/env.ts` that reads `import.meta.env.VITE_*` and validates with zod on app boot — so a missing `VITE_BACKEND_URL` fails fast at startup with a clear error, not as a `undefined.fetch` crash later.

---

## 3. Deferred (⏸️ not in V1)

We've actively decided *against* these for V1. Revisit when the use case is concrete.

| Not using | Why we said no for V1 |
|---|---|
| **Next.js / Remix / any SSR** | The app is auth-walled — no SEO value. Vite SPA + edge injection for white-label brand (per [implementation_doc/README.md](../implementation_doc/README.md)). |
| **GraphQL** | One API style for V1. The per-feature endpoints in [architecture/api-conventions.md](../architecture/api-conventions.md) are REST. |
| **CSS-in-JS** (Emotion, styled-components, vanilla-extract) | SCSS Modules + design tokens via `var(--token)` already cover everything in [theme.md](../theme/theme.md). No runtime cost, no bundle bloat. |
<!-- Tailwind moved to §2 — it's now part of V1 alongside SCSS Modules, see Styling section above -->
| **UI component libraries** (MUI, Chakra, Mantine, shadcn) | We have a custom design system in `_shared.css` that doesn't map to any of these. Headless primitives like `@radix-ui/react-dialog` are fair game when we need a complex a11y primitive (combobox, dropdown menu, dialog) — add them one at a time as needed, not as a kit. |
| **WebSockets / SSE** | Long-running ops (campaign send, CSV import) use short polling per [api-conventions.md §8](../architecture/api-conventions.md#8-file-uploads--direct-to-storage). Real-time arrives when a feature genuinely demands it. |
| **i18n library** (i18next, react-intl) | V1 ships English with Nepali touches (`रू`, "Namaste"). Multi-locale = post-V1. When it arrives, `react-intl` is the default. |
| **2FA / SSO library** | Out of [auth-tenancy.md §8](../architecture/auth-tenancy.md#8-open-questions-flag-during-impl) for V1. Plain email+password + Google sign-in only. |
| **Storybook** | Useful, but adds maintenance overhead V1 can't pay for. The mockups serve as the visual contract until component churn justifies a real component catalog. |

---

## 4. Decision log — known frictions to fix early

- **`react-icons` overlap with Tabler.** The repo currently has `react-icons`; the mockups use Tabler. **Action:** in the first React PR that touches an icon, swap `react-icons` for `@tabler/icons-react` and remove `react-icons` from `package.json`. Don't let both coexist.
- **No router today.** `app.view` switching is fine for the editor-only repo we have now. Adding React Router is the first structural PR before any V1 feature work — it unblocks code-splitting, lazy loading, and the auth gates from [routes.md §3](../architecture/routes.md#3-auth-gates--what-each-one-means).
- **No test runner today.** Add Vitest as the second structural PR. Backfill tests for `src/tree/operations.ts` first (highest-leverage — it's the core invariant of the editor).
- **Toast swap incoming.** `react-toastify` is in `package.json` today but the call sites should migrate to `react-hot-toast` as they're touched. Don't add a wrapper layer — `react-hot-toast`'s API (`toast.success` / `toast.error` / `toast.promise`) is already terse enough that the swap is a find-replace away if we ever change again.
- **SCSS migration.** Existing `.module.css` files stay until touched, then rename to `.module.scss` in the same change. New files use `.module.scss` from the start.
- **Tailwind enforcement.** Once Tailwind is installed, PR review MUST reject any color/border/shadow/radius utility that isn't defined in our `@theme` block — i.e. `bg-blue-500`, `text-zinc-900`, `border-gray-300` etc. are bugs. Only `bg-primary` / `text-ink` / `border-line` / etc. (mapped to our tokens) and layout-only utilities (`flex`, `grid`, `p-*`, `m-*`, `gap-*`) are allowed. If a screen needs a new color, **add a token first** (to [theme.md §11](../theme/theme.md) + the `@theme` block in `src/index.css`), then use it.

---

## 5. Hosting & CI (Tier 2 — not blocking dev, but decide early)

Open. The three realistic options:

| Option | Pros | Cons |
|---|---|---|
| **Vercel** | Best DX for Vite SPAs, zero-config preview deploys per PR, edge functions for white-label brand injection. | Pricing scales with bandwidth — watch for image/asset costs. |
| **Cloudflare Pages** | Generous free tier, Workers for edge logic, great for Asia latency (data centres in KTM-adjacent regions). | Less polished build dashboard. |
| **Netlify** | Mature SPA hosting, easy redirects, good preview deploys. | Edge functions weaker than Vercel/CF. |

CI: GitHub Actions (free for public repos and generous for private). Run `lint → build → test → e2e` on PR; deploy preview on push to a PR branch; deploy prod on merge to `main`. Decision: pick the host before the first deploy; the rest follows.

---

## Quick summary

- **Today (✅):** React 19, TS 6, Vite 8, Redux Toolkit, immer, axios, @dnd-kit, react-toastify *(→ swapping to react-hot-toast)*, react-icons *(→ swapping to @tabler/icons-react)*, uuid, ESLint.
- **Add for V1 (🟡):** **react-hot-toast**, **sass** (SCSS Modules) + **tailwindcss v4** (`@theme` with tokens-only — see §2 Styling), React Router, RTK Query (already in toolkit, just enable), react-hook-form + zod, date-fns + date-fns-tz, recharts, @tabler/icons-react, Sentry, PostHog, Vitest + Playwright, Prettier, husky + lint-staged.
- **Skip for V1 (⏸️):** SSR, GraphQL, CSS-in-JS, UI kits, WebSockets, i18n, 2FA, Storybook.
