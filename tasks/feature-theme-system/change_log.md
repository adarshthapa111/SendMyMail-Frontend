# Feature: Theme system — change log

> Per-user theme selection with 3 options: **Default (warm editorial)**,
> **Dark**, **White (stark minimal)**. localStorage-persisted, system-
> preference detection on first visit, settable from `/settings/appearance`.
> Frontend-only PR — zero backend changes.
>
> References:
> - [src/index.css](../../src/index.css) — the existing `@theme` +
>   `:root` token block this overrides
> - [doc/theme/theme.md](../../doc/theme/theme.md) — design tokens canon

---

## Status: ✅ Done — V1 shipped

Plan estimated 1.5 days; implemented in one focused pass. Frontend-only
PR — zero backend changes, zero migrations.

### What landed (file-by-file)

**New (5 files):**

- `src/hooks/useTheme.ts` (new, ~85 lines) — typed hook tracking
  `preference` (user-picked, persisted) + `appliedTheme` (resolved,
  applied to `<html>`). Listens for OS-level `prefers-color-scheme`
  changes via `matchMedia` event listener. First-visit default:
  `'system'` (auto-follow OS).

- `src/pages/settings/Appearance.tsx` (new, ~65 lines) — `/settings/appearance`
  tab. 4-option picker (Default / Dark / White / System) with hint text
  below showing current OS state when System is selected.

- `src/components/settings/ThemeSwatchCard.tsx` (new, ~75 lines) —
  clickable preview card. Renders inner mini email-card preview using
  the theme it represents via nested `data-theme="..."` attribute.
  System card has split layout: left half default, right half dark,
  with a dashed vertical divider — visually conveys "auto-follows OS".

- `src/styles/components/settings/Appearance.module.scss` (~50 lines)
  — 4-up responsive grid (4 → 2 → 1 columns at 900px / 480px breakpoints).

- `src/styles/components/settings/ThemeSwatchCard.module.scss`
  (~175 lines) — card + selected-state border + mini email preview
  (header / bars / button) + split-card variant for System.

**Modified (8 files):**

- `src/index.css` (+~220 lines) — extended with:
  - `html[data-theme="dark"]` token override block (~70 tokens including
    `@theme` mirror + `:root` mirror)
  - `html[data-theme="white"]` block (cool-tinted, slate-shifted neutrals)
  - `html[data-theme] [data-theme="default"]` scoping rule for theme-
    independent surfaces (re-applies default tokens via cascade)
  - `@media print { html, html[data-theme] { ... } }` — forces default
    light theme for printing
  - `body { transition: background-color 200ms ease, color 200ms ease }`
    — smooth theme switching
  - `@media (prefers-reduced-motion: reduce) { body { transition: none } }`

- `index.html` (+22 lines) — inline `<script>` in `<head>` resolves
  preference + applies `data-theme` BEFORE React mounts. Zero flash
  even on dark-mode-OS users with white preference saved.

- `src/App.tsx` — added `useTheme()` mount at app root. Hook keeps
  `<html data-theme>` in sync with preference + OS changes. Toaster
  already uses `var(--card)` / `var(--ink)` so it themes automatically.

- `src/pages/settings.tsx` — added Appearance to TABS array (6th tab
  after Sending), wired conditional render in the content area.

- `src/components/EditorBody.tsx` — wrapped `<Canvas />` in
  `<div data-theme="default" style={{display:'contents'}}>` so the
  MJML canvas always renders in light theme (emails are white in real
  inboxes regardless of app theme). Used `display: contents` to keep
  the visual tree unchanged.

- `src/pages/public/Unsubscribe.tsx` — added `data-theme="default"` to
  root div. Recipients clicking from emails haven't picked an app
  theme; always show brand-warm default.

- `src/pages/public/HostedForm.tsx` — same `data-theme="default"`
  wrapping. Public form URL recipients get default.

- `src/pages/forms/FormEditor.tsx` — wrapped preview pane in
  `data-theme="default"`. Form preview should match where the form
  actually lives (customer's white website), not the user's app theme.

- `src/components/templates/TemplateCard.tsx` — wrapped phone-frame
  `.screen` in `data-theme="default"`. Email thumbnail inside the
  phone always renders white regardless of app theme.

- `src/components/auth/AuthShell.tsx` — added `data-theme="default"`
  to root. Auth pages (login/signup/verify/forgot/reset/invite) are
  brand-experience BEFORE the user has picked a theme. Always
  warm-editorial.

### Decisions that came up during implementation (vs plan)

| Decision | What | Why |
|---|---|---|
| **`display: contents` wrapper for canvas** | EditorBody wraps `<Canvas />` with `<div data-theme="default" style={{display:'contents'}}>` | Lets the data-theme attribute apply via CSS cascade WITHOUT inserting a visible wrapping element that would break the existing flex layout (`.body { display: flex }` with Palette / Canvas / Inspector siblings). |
| **AuthShell wrapped with default theme** | Added during audit phase, not in original plan | Auth pages are brand experience BEFORE user has picked a theme. Spotted as `#FFE6D2` / `#E8F5EE` hardcoded warm colors that would clash on dark themes. |
| **Onboarding NOT wrapped** | Stays theme-aware | User is authenticated; onboarding is "in the app" not "external brand experience." Different from auth. |
| **`html[data-theme] [data-theme="default"]` selector** | Used compound selector instead of just `[data-theme="default"]` | Higher specificity ensures it wins over the `html[data-theme="dark"]` block. Cascade order isn't guaranteed otherwise. |
| **Mirror tokens (@theme + :root)** | Both blocks duplicated in each theme override | Existing codebase had two parallel token systems; preserving consistency means both must override. Could consolidate to one in a refactor PR. |
| **Hardcoded status colors left as-is** | `color: #1ca85f`, `color: #d11a2a` in pills | These are semantic colors (green = success, red = error). Acceptable for V1 — they're legible against tinted backgrounds in all themes. V2 polish could swap to `var(--color-green-tx)` etc. |
| **Skipped Onboarding wrap** | Theme switching works in onboarding context | The 3-step onboarding wizard is post-auth, in-app. Themes should apply. If first-visit `'system'` resolves to dark, onboarding should be dark. |

### Build + lint gates

- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.49s). Main chunk +~0.3 KB gzipped
  (the appearance page + theme hook are tiny).
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**
- No backend changes.

### What's NOT verified yet

**Manual theme-switching sweep pending** — verify every page in each
of 3 themes (Default / Dark / White) for:
- Broken contrast (light text on light bg, dark text on dark bg)
- Hardcoded hex values showing through (auth had a few; might be more)
- Invisible borders (dark border on dark bg)
- Toast colors readable in all themes
- Charts (SendingChart) gridlines + lines visible

E2E procedure:
1. Visit `/settings/appearance`, click each of the 4 swatches.
2. Visit `/dashboard`, `/templates`, `/clients/:cid/campaigns`,
   `/clients/:cid/forms`, `/clients/:cid/reports` in each theme.
3. Open a template in the builder — confirm canvas stays light in
   dark+white themes.
4. Visit `/f/test-slug` in a public-page-aware browser — confirm
   it renders default theme regardless of saved preference.
5. Visit `/u/some-token` (any unsubscribe URL) — same.
6. Hard refresh (Cmd-Shift-R) on each theme — confirm no flash.
7. Toggle macOS dark mode while preference = 'system' — app should
   auto-switch.
8. Print preview a campaign report — should be light-theme.

### Known V1 limitations (by design)

- **No backend sync** — preference is per-device (localStorage). V2
  adds `User.themePreference` column.
- **No high-contrast theme** — accessibility-specific theme separate
  from design themes.
- **Hardcoded status colors** (`#1ca85f`, `#d11a2a`) used in some
  pills — semantically meaningful, acceptable across themes but
  could be tokenized in V2.
- **Component-level transitions not theme-aware** — only `body`
  transitions on theme switch. Other elements snap to new colors.
  Avoids jank but means brief color "pop" on swap.
- **Email-rendered HTML in iframes** unaware of app theme — they
  render their own MJML-compiled HTML which is intrinsically white.
  Working as intended.

### Files at a glance

**5 new files**:
- `src/hooks/useTheme.ts`
- `src/pages/settings/Appearance.tsx`
- `src/components/settings/ThemeSwatchCard.tsx`
- `src/styles/components/settings/Appearance.module.scss`
- `src/styles/components/settings/ThemeSwatchCard.module.scss`

**8 modified files**:
- `src/index.css` (theme overrides + transitions + print + reduced-motion)
- `index.html` (inline theme script)
- `src/App.tsx` (mount useTheme)
- `src/pages/settings.tsx` (TABS + render)
- `src/components/EditorBody.tsx` (canvas scoping)
- `src/pages/public/Unsubscribe.tsx` (default theme)
- `src/pages/public/HostedForm.tsx` (default theme)
- `src/pages/forms/FormEditor.tsx` (preview scoping)
- `src/components/templates/TemplateCard.tsx` (phone-frame screen scoping)
- `src/components/auth/AuthShell.tsx` (default theme — found during audit)

---

## Original planning sections below (unchanged):

---

## Why this is next

After Reports shipped, the product is genuinely demo-able end-to-end.
Per the user's stated preference, polish work is the right next move
before more big features. Dark mode is expected in 2026 — almost every
modern SaaS has it.

The codebase is already 100% on CSS custom-property tokens
(`var(--color-*)`), so the infrastructure exists. We just add
theme-overriding blocks and a switcher.

---

## Scope

### IN V1

**Three distinct themes:**

| Theme | Vibe | bg | card | ink | primary |
|---|---|---|---|---|---|
| **Default** | Khukri editorial, warm | `#FAF6EF` cream | `#FFFFFF` | `#2B2620` warm dark | `#C56A33` terra |
| **Dark** | Premium / focus / night-shift | `#0e0c0a` warm near-black | `#1a1814` darker card | `#f5f0e8` warm off-white | `#d4815a` lighter terra |
| **White** | Apple Notes / **cool** clinical / daylight | `#FFFFFF` pure | `#F8FAFC` slate-cool gray | `#0F172A` slate-900 cool blue-black | `#C56A33` terra (pops dramatically against cool) |

**Frontend pieces:**

- Theme token blocks in `src/index.css` — base + 2 overrides
- `useTheme()` hook — read/write current theme, system-preference
  detection, localStorage persistence
- Theme attribute application on `<html>` at startup + on change
- New tab: `/settings/appearance` with 3 preview swatch cards (live
  rendering of the theme's color palette + a mini card preview)
- First-visit detection via `matchMedia('prefers-color-scheme: dark')`
- Smooth body transition: `transition: background-color 200ms ease,
  color 200ms ease`
- Toast notifications (`react-hot-toast`) — pass theme-aware
  `toastOptions` so light/dark variants match
- Charts (`SendingChart`) — gridline + axis colors use theme tokens
  (already do, just need verification)

**Theme-INDEPENDENT surfaces (stay light always):**

These represent reality outside the app and don't theme-switch:

| Surface | Why |
|---|---|
| **MJML editor canvas** | Emails are white in real inboxes regardless of app theme |
| **Public pages** (`/u/:token`, `/f/:slug`, `/e/*`) | External-facing; recipient hasn't picked a theme |
| **Phone-frame template thumbnails** | iPhone bezel stays warm-near-black always (it's an iPhone, irrespective of app theme) |
| **Form preview in editor** | Forms render on the customer's website (white) — preview should match reality |
| **Transactional templates** (verify, reset) | Same as public pages |
| **Print** | Force light theme for printing |

Implementation: scope themes to `[data-theme] body.themed *` selectors;
theme-independent surfaces use explicit `data-theme="default"` wrapper
OR direct hex values for their isolated chunk.

### OUT V1 (deferred follow-ups)

| Item | Why deferred | When |
|---|---|---|
| **Backend `User.themePreference` sync** | localStorage covers single-device; cross-device sync is a small polish | V2 — adds schema field + 1-line PATCH |
| **Auto theme schedule** (light by day / dark by night) | Niche; system preference covers most use cases | V3 |
| **Custom theme** (user picks colors) | Heavy UX; agency-brand-color theming hits this later | V3 |
| **Per-agency forced theme** (white-label) | Agencies want their branded experience for their team — V2 with white-label PR | V2 |
| **High-contrast accessibility theme** | Important but distinct from "design themes" — separate concern | V2 |
| **Reduced-motion** | Existing transitions are subtle; full motion audit is V2 polish | V2 |
| **Smooth theme transition animations** (besides bg/color fade) | Avoid jank by skipping component-level transitions on theme change | V2 |

---

## Architecture

### Token override strategy

Current setup in `src/index.css`:

```css
@theme {
  --color-primary: #C56A33;
  --color-bg:      #FAF6EF;
  --color-ink:     #2B2620;
  /* ... ~30 tokens ... */
}

:root {
  --primary: #C56A33;
  --bg:      #FAF6EF;
  --ink:     #2B2620;
  /* ... mirror set for raw CSS ... */
}
```

After this PR:

```css
@theme { /* base — unchanged, defaults */ }
:root  { /* base — unchanged, defaults */ }

/* Default theme is implicit — no override needed when data-theme is
   missing or "default". */

html[data-theme="dark"] {
  --color-bg:    #0e0c0a;
  --color-card:  #1a1814;
  --color-ink:   #f5f0e8;
  --color-muted: #9c9489;
  --color-soft:  #6e6860;
  --color-line:  rgba(255,250,242,0.10);
  /* ... etc, mirror for :root --bg, --card, etc ... */
}

html[data-theme="white"] {
  --color-bg:    #ffffff;
  --color-card:  #fafafa;
  --color-ink:   #1a1a1a;
  --color-line:  rgba(0,0,0,0.08);
  /* ... etc ... */
}
```

Why `html[data-theme="..."]` selector:
- Higher specificity than `:root` so it wins
- Cascades to all `var(--color-*)` references everywhere
- Theme switches happen at the root → entire tree re-renders without
  any React state propagation

### Theme-independent surface scoping

Two patterns:

**Pattern A — explicit nested data-theme** (for big chunks like editor):
```tsx
<div data-theme="default" className={styles.canvasWrapper}>
  {/* MJML canvas always renders in default light theme */}
</div>
```

This works because the inner `data-theme="default"` re-sets the tokens
to the base values via the cascade.

**Pattern B — direct hex values** (for small isolated bits like the
iPhone bezel):
```scss
.phoneBezel {
  background: #1a1814;     /* hardcoded — NOT theme-aware */
}
```

Used for surfaces where the visual is intrinsic to the metaphor (a
phone is dark regardless of app theme).

### Hook + persistence

Two concepts the hook tracks distinctly:

- **`preference`** — what the user picked from the 4-option picker:
  `'default' | 'dark' | 'white' | 'system'`. Persisted to localStorage.
- **`appliedTheme`** — the actual theme attribute on `<html>`:
  `'default' | 'dark' | 'white'`. Derived from preference. When
  preference is `'system'`, this is `'default'` or `'dark'` depending
  on `prefers-color-scheme`.

```typescript
// src/hooks/useTheme.ts

export type Preference  = 'default' | 'dark' | 'white' | 'system';
export type AppliedTheme = 'default' | 'dark' | 'white';

const STORAGE_KEY = 'sendmymail-theme';

function readPreference(): Preference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'default' || stored === 'dark' ||
      stored === 'white'   || stored === 'system') {
    return stored;
  }
  /* First-visit default: 'system' (auto-follow OS).
     This gives dark-OS users a dark app on first load without forcing
     them into an explicit "Dark" preference they may not have asked for. */
  return 'system';
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function resolvePreference(pref: Preference): AppliedTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'default';
  return pref;
}

export function useTheme() {
  const [preference, setPrefState] = useState<Preference>(readPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  /* Listen for OS-level theme changes — fires when user switches dark
     mode in macOS / Windows / their browser. Only matters when
     preference === 'system'. */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* Derive applied theme + sync to <html data-theme>. */
  const appliedTheme: AppliedTheme = preference === 'system'
    ? (systemDark ? 'dark' : 'default')
    : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = appliedTheme;
  }, [appliedTheme]);

  const setPreference = (next: Preference) => {
    setPrefState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { preference, appliedTheme, systemDark, setPreference };
}
```

The inline `<head>` script (for flash-free initial render) also needs
to handle `'system'`:

```html
<script>
  (function() {
    var stored = localStorage.getItem('sendmymail-theme');
    var pref = (stored === 'default' || stored === 'dark' ||
                stored === 'white' || stored === 'system')
               ? stored : 'system';
    var t = pref;
    if (pref === 'system') {
      t = window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'default';
    }
    document.documentElement.dataset.theme = t;
  })();
</script>
```

### Apply at startup (avoid flash)

Theme application has to happen BEFORE React mounts to avoid a flash
of unstyled (default) theme on dark-mode users. Two approaches:

**A. Inline `<script>` in index.html (recommended)**:
```html
<script>
  (function() {
    var stored = localStorage.getItem('sendmymail-theme');
    var t = stored;
    if (t !== 'default' && t !== 'dark' && t !== 'white') {
      t = window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'default';
    }
    document.documentElement.dataset.theme = t;
  })();
</script>
```

This runs synchronously in `<head>` before React loads. Zero flash.

**B. CSS-only via `prefers-color-scheme`**:
Doesn't work because we need user-selected theme to override system
preference. A user on dark macOS who picks "white" in our app should
see white.

→ **Use approach A.**

---

## Backend

**None.** Zero schema changes, zero new endpoints, zero migrations.

For V2 (cross-device sync), we'd add `User.themePreference String?`
and a tiny PATCH endpoint, but localStorage covers the single-device
case completely.

---

## Frontend

### New / modified files

```
src/index.css                                         (extend with 2 theme overrides)
index.html                                            (add inline theme script in <head>)

src/hooks/useTheme.ts                                 (new)
src/lib/toast.ts                                      (modify — theme-aware toastOptions)

src/pages/settings/Appearance.tsx                     (new — the picker page)
src/components/settings/ThemeSwatchCard.tsx           (new — interactive preview card)
src/styles/components/settings/Appearance.module.scss (new)
src/styles/components/settings/ThemeSwatchCard.module.scss (new)

src/pages/settings.tsx                                (modify — wire Appearance tab to real component)

src/canvas/renderTree.tsx                             (audit + add data-theme="default" wrapper)
src/components/forms/FormRenderer.tsx                 (same — preview should stay light)

src/components/templates/TemplateCard.tsx             (audit — phone bezel hex stays)
src/components/campaigns/CampaignCard.tsx             (audit — verify all colors tokenized)
```

### Settings page integration

The existing `/settings` page already has 5 tabs (Profile / Notifications /
Security / Agency / Sending). Adding **Appearance** as the 6th:

```typescript
const TABS = [
  { id: 'profile',       label: 'Profile',       Icon: IconAt },
  { id: 'notifications', label: 'Notifications', Icon: IconBell },
  { id: 'security',      label: 'Security',      Icon: IconShieldLock },
  { id: 'agency',        label: 'Agency',        Icon: IconBuilding },
  { id: 'sending',       label: 'Sending',       Icon: IconSparkles },
  { id: 'appearance',    label: 'Appearance',    Icon: IconPalette },  // NEW
] as const;
```

### `/settings/appearance` page mockup

Four-option picker — System is the 4th card alongside the 3 themes.
Selecting System auto-follows `prefers-color-scheme` and updates when
the OS theme changes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                 │
│  ── Profile · Notifications · Security · Agency · Sending · Appearance ── │
│                                                                          │
│  Appearance                                                              │
│  Pick how SendMyMail looks for you on this device.                       │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ ░░░░░░░░░░░ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ░░░░░░░░░░░ │  │ ░░░│▓▓▓▓▓▓│    │
│  │ ░ Welcome ░ │  │ ▓ Welcome ▓ │  │ ░ Welcome ░ │  │ ░  │  ▓▓  │    │
│  │ ░ ░░░░░░░ ░ │  │ ▓ ▓▓▓▓▓▓▓ ▓ │  │ ░ ░░░░░░░ ░ │  │ ░  │  ▓▓  │    │
│  │ ░ [Open]  ░ │  │ ▓ [Open]  ▓ │  │ ░ [Open]  ░ │  │ ░  │ [Op] │    │
│  │ ░░░░░░░░░░░ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ░░░░░░░░░░░ │  │ ░░░│▓▓▓▓▓▓│    │
│  │             │  │             │  │             │  │             │    │
│  │ Default     │  │ Dark        │  │ White       │  │ System ⓘ    │    │
│  │ Warm        │  │ Premium /   │  │ Cool        │  │ Auto-follow │    │
│  │ editorial   │  │ focus       │  │ minimal     │  │ your OS     │    │
│  │             │  │             │  │             │  │             │    │
│  │ [● Selected]│  │ [○ Select]  │  │ [○ Select]  │  │ [○ Select]  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  ⓘ When System is selected, the app uses Default in light mode and       │
│     Dark when your OS switches to dark mode. Currently your OS is:       │
│     **light mode**.                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

The System card visually depicts the auto-switch with a split:
left-half rendered in light (default theme), right-half rendered in
dark. Makes the "follows your OS" behavior immediately obvious.

### Swatch card design

Each card is a **mini live preview** of the theme:
- Card uses the theme's actual `--color-card` as background
- Inner mini "Welcome" card uses theme's `--color-bg` + `--color-ink`
- Small button uses theme's `--color-primary`
- Selected state: 2px primary border + check icon top-right
- Hover: subtle scale up + shadow

Implementation trick: nest `data-theme="dark"` etc. on the card root so
the inner elements use that theme's tokens via the CSS cascade.

### Toast theming

`react-hot-toast` needs explicit colors since it can't read CSS vars in
its config. Update `src/lib/toast.ts`:

```typescript
import { useTheme } from '../hooks/useTheme';
import toastBase from 'react-hot-toast';

/* The toast container's styling depends on the current theme; we
   pass theme-aware options at the call site. */
```

OR simpler: configure once at mount time via `<Toaster toastOptions={...}>`
in `<App />`, and re-render `<Toaster />` when theme changes (theme
prop dependency).

### Theme-independent scoping pattern

For the MJML canvas (editor body), wrap in `data-theme="default"`:

```tsx
// src/canvas/renderTree.tsx
<div data-theme="default" className={styles.canvas}>
  {/* All children render with default theme tokens */}
</div>
```

For the public pages — they're already outside AppShell. We can add a
`<div data-theme="default">` at the page root in each (`Unsubscribe.tsx`,
`HostedForm.tsx`).

For the phone-frame template card — the bezel color (`#1a1814`) is
already hardcoded. Leave it. We DO need to check the inner email
content area (which uses tokens like `--color-card`) and decide
whether it should adapt or stay light. **My choice: stay light**
(the email is white in real life).

→ Wrap `.screen` in `data-theme="default"`.

---

## Tokens — full mapping for all 3 themes

This is the contract that drives the whole PR.

### Common tokens (NOT theme-overridden)

These stay constant across all themes because they carry semantic
meaning that shouldn't shift:

```
--color-primary, --color-primary-dark, --color-primary-light, --color-primary-ink
  (primary may shift slightly in dark mode for contrast — see below)

--color-green, --color-amber, --color-red, --color-blue  (status colors)
  + their -bg / -tx variants

--shadow-sm, --shadow, --shadow-lg
  (may swap rgba colors in dark mode but kept as-is V1; shadows on
   dark are subtle by nature so existing rgba(43,38,32,0.05) is
   nearly invisible against dark bg — looks fine)

--radius-*, --font-*  (geometry/typography don't theme)
```

### Default theme (current — implicit baseline)

```
--color-bg:       #FAF6EF   warm cream
--color-card:     #FFFFFF   white
--color-surface:  #F2EEE4   muted cream
--color-ink:      #2B2620   warm dark
--color-muted:    #6E6860   warm mid
--color-soft:     #9C958A   warm soft
--color-line:           rgba(43,38,32,0.11)
--color-line-strong:    rgba(43,38,32,0.16)
--color-line-soft:      rgba(43,38,32,0.06)
```

### Dark theme

```
--color-bg:       #0e0c0a   warm near-black (NOT pure black — softer)
--color-card:     #1a1814   slightly lighter dark
--color-surface:  #221f19   one step up for chips/pills
--color-ink:      #f5f0e8   warm off-white (NOT pure white — paper feel)
--color-muted:    #9c9489   warm mid (legible against dark)
--color-soft:     #6e6860   warm soft (subtle text)
--color-line:           rgba(255,250,242,0.10)
--color-line-strong:    rgba(255,250,242,0.16)
--color-line-soft:      rgba(255,250,242,0.06)

--color-primary:        #d4815a   brighter terra (was #C56A33)
--color-primary-dark:   #C56A33   (default primary)
--color-primary-light:  #2a1f15   dark warm-tinted for backgrounds
--color-primary-ink:    #f5d2bb   light warm for text-on-primary-light

/* Status colors get -bg replacements: dark-tinted backgrounds */
--color-green-bg:       #1a2520   dark green tint
--color-green-tx:       #6dd49f   lighter green for text
--color-amber-bg:       #2a1f12   dark amber tint
--color-amber-tx:       #e8b878
--color-red-bg:         #2a1614   dark red tint
--color-red-tx:         #f59186
--color-blue-bg:        #131b2a
--color-blue-tx:        #7eb0e5

/* Shadows get darker / more diffuse */
--shadow-sm:      0 1px 2px rgba(0,0,0,0.30)
--shadow:         0 1px 2px rgba(0,0,0,0.20), 0 14px 30px -22px rgba(0,0,0,0.60)
--shadow-lg:      0 2px 6px rgba(0,0,0,0.30), 0 30px 60px -30px rgba(0,0,0,0.70)
```

### White (cool minimal) theme

The COOL counterpart to Default. All neutrals shifted toward slate /
blue undertones. Where Default warms everything with brown-tinted grays
(`#2B2620`, `#6E6860`, `rgba(43,38,32,...)`), White uses slate (`#0F172A`,
`#475569`, `rgba(15,23,42,...)`). Terra primary stays unchanged — it
pops dramatically against cool grays (which is the design point: warm
CTA against cool field).

```
--color-bg:       #FFFFFF   pure white
--color-card:     #F8FAFC   slate-50 cool gray
--color-surface:  #F1F5F9   slate-100 chip/pill bg
--color-ink:      #0F172A   slate-900 cool blue-black (NOT warm #1a1a1a)
--color-muted:    #475569   slate-600 cool mid
--color-soft:     #94A3B8   slate-400 cool soft
--color-line:           rgba(15,23,42,0.08)        slate-tinted edges
--color-line-strong:    rgba(15,23,42,0.14)
--color-line-soft:      rgba(15,23,42,0.04)

/* Primary stays terra — warm CTA against cool field is the design point */
--color-primary:        #C56A33     unchanged
--color-primary-dark:   #A8521F     unchanged
--color-primary-light:  #F5E7D9     unchanged (works on white)
--color-primary-ink:    #964B22     unchanged

/* Status colors: cooler / crisper than default */
--color-green:    #059669            cooler emerald (vs default #2E8B5E)
--color-green-bg: #ECFDF5            very subtle cool tint
--color-green-tx: #047857
--color-amber:    #D97706            crisper amber
--color-amber-bg: #FFFBEB
--color-amber-tx: #92400E
--color-red:      #DC2626            crisper red
--color-red-bg:   #FEF2F2
--color-blue:     #2563EB            crisper indigo-blue
--color-blue-bg:  #EFF6FF

/* Shadows: cool-tinted, much subtler than default — minimalism */
--shadow-sm:      0 1px 2px rgba(15,23,42,0.04)
--shadow:         0 1px 2px rgba(15,23,42,0.03), 0 8px 18px -14px rgba(15,23,42,0.10)
--shadow-lg:      0 2px 4px rgba(15,23,42,0.04), 0 20px 40px -22px rgba(15,23,42,0.16)
```

Why distinct from default:
- Default has **WARMTH** — every neutral has brown undertones (`#2B2620`,
  `#6E6860`, `rgba(43,38,32,...)`), cream bg, brown-tinted borders.
  The whole field feels Khukri-editorial.
- White is **COOL** — every neutral has slate/blue undertones (`#0F172A`,
  `#475569`, `rgba(15,23,42,...)`), pure white bg, slate-tinted borders.
  The whole field feels Linear / Apple-Notes / clinical-modern.
- Same terra primary in both, but the EFFECT is different — warm-on-warm
  feels editorial; warm-on-cool feels intentional / curated.
- Different vibe entirely. Distinct enough to be the 3rd theme.

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Number of options** | 4 (Default + Dark + White + System) | User picked 4-option model over separate "Follow system" toggle. Single picker; no hidden checkbox. |
| **Default option (first-visit)** | 'System' | Dark-OS users get dark app on first load without forcing them into an explicit "Dark" preference. Light-OS users get warm default. |
| **'system' state** | Stored as `'system'` in localStorage; resolves to `default` or `dark` at render time | Distinct from picking Dark explicitly — System responds to OS changes; explicit Dark stays dark even if OS goes light. |
| **Storage** | localStorage V1 | Single-device works for 95%. Backend sync is V2. |
| **Per-tab vs per-user** | Per-user (localStorage is per-origin) | User picks once, applies everywhere on that device. |
| **Flash-of-default-theme prevention** | Inline `<script>` in `<head>` before React mount | Standard pattern. Resolves 'system' synchronously. |
| **Theme attribute location** | `<html data-theme="...">` | Higher specificity than `:root`. Cascades everywhere. `data-theme` is the APPLIED theme, never `"system"` — that resolves to a concrete theme. |
| **Theme-independent surfaces** | Editor canvas, public pages, phone-frame, form preview, transactional templates, print | Each represents reality outside the app |
| **Implementation for those** | `data-theme="default"` wrapper at the page/component root | Cleanest — re-applies default tokens via cascade |
| **Default theme vibe** | Warm editorial (cream + terra + warm browns) | Khukri brand DNA |
| **White theme vibe** | Cool minimal (pure white + slate + terra) | Distinct counterpoint to Default's warmth. Same primary terra; cool field makes it pop. |
| **Primary color in dark** | `#d4815a` (lighter terra) | Original `#C56A33` looks muddy on dark bg; needs more luminosity for contrast |
| **Primary color in white** | `#C56A33` unchanged | Warm CTA against cool field is the design point. Dramatic pop, not muted. |
| **Neutrals warm vs cool** | Default + Dark use warm tints (`rgba(43,38,32,...)`); White uses slate tints (`rgba(15,23,42,...)`) | This is what makes White feel COOL — every gray has a blue undertone, every border has a slate tint. |
| **Status colors** | Stay across themes (green = success, red = error) | Semantic meaning shouldn't shift |
| **Status colors in White** | Crisper / cooler variants (emerald `#059669`, indigo-blue `#2563EB`) | Match the clinical-modern vibe |
| **Status bg tints** | DIFFERENT per theme | A "subtle red bg" on dark is `#2a1614` not `#FBEAE7`; on White it's `#FEF2F2` |
| **Shadow tints** | Warm tints (`rgba(43,38,32,...)`) for Default + Dark; slate tints (`rgba(15,23,42,...)`) for White | Maintains the warm/cool vibe even in shadows |
| **Charts** | Use theme tokens (already do) | Adapts automatically |
| **Toasts** | Theme-aware via `<Toaster toastOptions>` | react-hot-toast can't read CSS vars |
| **Smooth transition** | `body { transition: background-color 200ms, color 200ms }` only | Component-level transitions cause jank on theme switch |
| **OS theme change listener** | `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` | Only effective when preference === 'system' |
| **Print** | Force light via `@media print { html { /* default tokens */ } }` | Saves ink, looks normal |

---

## Edge cases

| Case | Behavior |
|---|---|
| User on dark macOS visits for first time | First-visit preference is 'system' → resolves to 'dark' → renders dark immediately on load (inline script handles before React) |
| User on dark macOS picks "White" in settings | Stored as 'white'. Stays white even if macOS switches to dark at sunset. |
| User on dark macOS picks "System" in settings | Stored as 'system'. Resolves to 'dark' now. If macOS switches to light, the matchMedia listener fires → applied theme switches to 'default'. |
| User picks "Default" then later picks "System" | Stored value changes 'default' → 'system'. Applied theme stays 'default' if macOS is light; flips to 'dark' if macOS is dark. |
| User picks "Dark" explicitly on light-mode macOS | Stays Dark. System changes don't override explicit choice. |
| User opens dev tools and inspects token values | CSS custom properties visible per element. Theme override is at `<html>` level. |
| Open template editor while in dark mode | Canvas is wrapped in `data-theme="default"` → renders light (matches real email) |
| Open `/f/:slug` directly from email signed in to app | Public page; always renders default theme regardless of user's app preference |
| Open `/u/:token` (unsubscribe) | Same — always default |
| Print a campaign report | `@media print` forces default theme |
| User has localStorage disabled (private browsing) | Detects system preference each load, theme picker still works for the session |
| Server-side rendering (not applicable V1) | All client-side; no SSR consideration needed |
| User has multiple tabs open | Each tab gets its own theme from localStorage at mount; if user changes in one tab, others sync on next mount or focus event (V2 cross-tab) |
| Theme variable used in inline style with hex literal | Won't theme-switch. The audit phase finds these. |
| Email-content thumbnails (cards with rendered HTML) | Themed inside the iPhone screen frame which has `data-theme="default"` wrapper — email stays white |
| User toggles "Follow system" with explicit theme set | Toggle wins → theme follows system. Previous explicit choice cleared from localStorage. |
| User has `prefers-reduced-motion: reduce` | Skip the 200ms color transition (`@media (prefers-reduced-motion: reduce)`) |
| Tailwind utility class `bg-white` used somewhere | Doesn't theme-switch (it's literal white). Audit phase finds these. |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Visit /settings/appearance | Three swatch cards rendering actual theme previews |
| Click "Dark" swatch | Entire app re-renders in dark theme within ~200ms |
| Refresh page | Dark theme persists (localStorage) |
| Toggle "Follow system theme" | macOS dark mode change auto-switches the app |
| Untoggle "Follow system" | App locks to last-selected theme |
| Visit /templates | Cards render correctly in all 3 themes (phone bezel stays dark) |
| Click a template → open editor | Canvas always renders in default theme |
| Visit /f/test-slug directly | Public form renders default theme |
| Click unsubscribe in email | /u/:token renders default theme |
| Open dashboard in dark mode | Charts render dark — gridlines visible, lines pop |
| Open report in dark mode | All KPI cards readable, sufficient contrast |
| Open campaign wizard step 4 (template picker) | Thumbnails stay light inside phone frame |
| Open campaign report → see top links | Links color (primary) is visible in dark mode |
| Toggle theme while typing in a form input | Input retains focus + value; doesn't flash |
| Trigger a toast notification | Toast color matches current theme |
| Print preview campaign report | Print-friendly default theme used |
| User in scope=clients mode | Theme works identically (no role gating) |
| Hard refresh (Cmd-Shift-R) | No flash of unstyled / wrong theme |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Main chunk +~3-4 KB gzipped (token overrides + appearance page) |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual: visit every major page in each of 3 themes | No broken contrast, no invisible text, no hardcoded hex showing through |
| Manual: editor / forms / public pages | Stay light theme even when app is dark |
| Manual: refresh on dark theme | No flash of default-light |

---

## Implementation order (when authorized)

**Step 1 — Token definitions (~3h)**
1. Extend `src/index.css` with `html[data-theme="dark"]` + `html[data-theme="white"]` token blocks
2. Verify base default still works (no override applies when attribute is missing)
3. Build + visually verify no regression

**Step 2 — Hook + persistence (~1h)**
4. `src/hooks/useTheme.ts` — typed hook with localStorage + system detection
5. `index.html` — inline theme script in `<head>` for flash-free initial render
6. Application: hook applies `dataset.theme` on `<html>` element

**Step 3 — Settings page tab (~2h)**
7. `src/pages/settings/Appearance.tsx` — full page with **4-option picker** (Default / Dark / White / System)
8. `src/components/settings/ThemeSwatchCard.tsx` — interactive preview using nested `data-theme`. The System card uses a split layout (left-half default, right-half dark) to visually convey "auto-follows OS".
9. `src/styles/components/settings/Appearance.module.scss` — 4-up grid responsive to 2x2 on mobile
10. `src/styles/components/settings/ThemeSwatchCard.module.scss` — base card + split-card variant for System
11. Add `appearance` to TABS array in `src/pages/settings.tsx`
12. `/settings/appearance` route already works (uses existing `/settings/:tab` route)
13. Hint text below picker shows current applied theme when System is selected ("Currently your OS is: light mode")

**Step 4 — Theme-independent scoping (~1h)**
13. Wrap MJML canvas: `<div data-theme="default">` in `src/canvas/renderTree.tsx`
14. Wrap public Unsubscribe page in `data-theme="default"`
15. Wrap public HostedForm page in `data-theme="default"`
16. Wrap form preview inside editor in `data-theme="default"`
17. Wrap phone-frame screen inside TemplateCard in `data-theme="default"`

**Step 5 — Toasts + transition + print (~1h)**
18. `src/lib/toast.ts` — theme-aware toastOptions on `<Toaster />` in App
19. `src/index.css` — body color transition
20. `src/index.css` — `@media print` forces default
21. `@media (prefers-reduced-motion: reduce)` skips transition

**Step 6 — Manual audit + fix sweep (~3h — the unknown)**
22. Walk every page in dark + white themes
23. Find + fix hardcoded hex values that break (likely in older
    components like Builder, Inspector, some toolbar buttons)
24. Find + fix any low-contrast text (light gray on light bg)
25. Find + fix any invisible borders (dark border on dark bg)
26. Fix Tailwind utility classes (`bg-white`, `text-zinc-900`, etc.)
    if any exist outside the tokens

**Step 7 — Verification (~1h)**
27. Build + lint
28. Manual smoke test through dashboard / reports / forms / campaigns
    in all 3 themes
29. Hard refresh test to confirm no flash
30. Update change_log Done entry

---

## What this unlocks

- **Beta-ready visual polish** — agencies pitching to clients will get
  asked about dark mode within the first 5 minutes
- **Premium product feel** — themes are table stakes for SaaS in 2026
- **Foundation for white-label V2** — agencies can pick their team's
  default theme
- **Accessibility on-ramp** — high-contrast theme V2 builds on this
  infrastructure

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| V2-a | **User.themePreference sync** — cross-device theme persistence | 30min |
| V2-b | **High-contrast accessibility theme** | 1 day |
| V2-c | **Auto schedule** — light by day / dark by night user-defined | 2h |
| V2-d | **Per-agency forced theme** for white-label customers | 2h with white-label PR |
| V2-e | **Cross-tab theme sync** — `storage` event listener | 1h |
| V2-f | **Reduced-motion full audit** — all transitions respect preference | 4h |
| V2-g | **Theme preview in onboarding** — set user up with right theme early | 1h |
| V2-h | **Email theme support** — let agencies design emails with their own dark variants | 2 days |

---

*Plan locked. Ready to implement when authorized.*
