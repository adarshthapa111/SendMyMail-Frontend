# Theme & Design System — single source of truth

> 🎨 **READ THIS BEFORE BUILDING ANY UI.**
>
> **For Claude / AI agents:** Before you create or restyle any UI file (`.tsx`
> component, `.module.scss`, or an HTML mockup), read this document and use these
> tokens, fonts, components, and layout patterns. Do **not** invent new colors,
> spacing, radii, fonts, or shadows — pull from the scales here. If a screen
> genuinely needs a token that doesn't exist, add it to this file in the same change.
>
> **Canonical implementation:** [../mockups/agency_dashboard.html](../mockups/agency_dashboard.html)
> is the reference build of this theme — match it.

This is the **finalized "warm editorial" theme** (v2). It replaces the earlier
cool-indigo / Inter look. See also [folder_structure.md](../folder_structure/folder_structure.md)
for where style files live.

---

## 1. Design principles

1. **Warm, not cold.** Paper-cream canvas (`#FAF6EF`), warm near-black ink. White is reserved for cards that float above the paper.
2. **One display font + one body font.** A *characterful* display (Bricolage Grotesque) carries personality in headings and big numbers; a *calm, readable* body (General Sans) does everything else. Never set body copy in the display font.
3. **Two colors, used with restraint.** Deep indigo = brand/primary; terracotta = the warm accent (CTAs, active nav, highlights, the 2nd chart series). Everything else is warm neutral. No rainbow.
4. **Semantic colors are for status only** — green/amber/red communicate health, never decoration.
5. **De-box.** Don't wrap everything in identical cards. Group related stats into one hairline-divided panel; use editorial lists (rows + dividers) instead of heavy tables; let whitespace do the work.
6. **Generous, deliberate spacing.** Breathe. One clear focal point per screen (usually a personal greeting + the headline metric).
7. **Numbers are tabular** (`.tnum`) so figures don't jitter.

---

## 2. Fonts & type system  ⭐ (the heart of the theme)

| Role | Font | Source |
|------|------|--------|
| **Display** — headings, big numbers, logo | **Bricolage Grotesque** (opsz 12–96, wght 400–700) | Google Fonts |
| **Body / UI** — copy, nav, labels, tables | **General Sans** (400/500/600) | Fontshare |
| Body fallback | **Hanken Grotesk** (400–700) → system sans | Google Fonts |

**Load (mockups / `index.html`):**
```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap" rel="stylesheet">
```
```css
body { font-family:'General Sans','Hanken Grotesk',-apple-system,BlinkMacSystemFont,sans-serif; }
.display { font-family:'Bricolage Grotesque','Hanken Grotesk',sans-serif; font-optical-sizing:auto; letter-spacing:-0.015em; }
```

### Type scale
| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Page greeting / h1 | display | 38px | 600 | line-height 1.04 |
| Section heading / h2 | display | 24px | 600 | |
| Card / panel title / h3 | display | 20px | 600 | |
| Big metric number | display | 34px | 600 | tabular |
| Oversized number (gauge) | display | 42px | 600 | tabular |
| Intro / sub copy | body | 15px | 400 | `--muted` |
| Base body | body | 14px | 400/500 | line-height 1.55 |
| Nav item | body | 14px | 500 | |
| Table / key-value | body | 13.5px | 400/600 | |
| Label / meta | body | 12px | 500 | `--muted` |
| Eyebrow / section label | body | 11px | 600 | uppercase, tracking `.12em`, `--soft` |

**Rule:** anything big or attention-grabbing → `.display`. Everything you *read* → body. Apply `.tnum` to any number that changes.

---

## 3. Color tokens (warm palette)

### Neutrals
| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#FAF6EF` | paper canvas |
| `--card` | `#FFFFFF` | floating surfaces (cards, panels) |
| `--surface` | `#F2EEE4` | cream tint — input/select fills, sub-cards, code chips, mini bars |
| `--ink` | `#2B2620` | primary text / headings |
| `--muted` | `#6E6860` | secondary text, labels |
| `--soft` | `#9C958A` | tertiary text, placeholders, axis labels |
| `--line` | `rgba(43,38,32,0.11)` | borders |
| `--line-strong` | `rgba(43,38,32,0.16)` | input borders, emphasized dividers |
| `--line-soft` | `rgba(43,38,32,0.06)` | inner dividers, gridlines, top-bar bottom edge |

### Brand + accent
The terracotta is the **primary** (CTAs / active nav) in `_shared.css` — `--primary` aliases the warm accent. Indigo is the secondary brand mark (logo, chart series 1, info eyebrow).

| Token | Value | Use |
|-------|-------|-----|
| `--primary` | `#C56A33` | terracotta — primary CTAs, active nav, eyebrows, bar fills, chart series 2 |
| `--primary-dark` | `#A8521F` | button edge, primary-button hover |
| `--primary-light` | `#F5E7D9` | active-nav pill, warm tint backgrounds, bar tracks, eyebrow chip bg |
| `--primary-ink` | `#964B22` | text on `--primary-light` |
| `--indigo` | `#4B43A8` | brand mark / logo, chart series 1, indigo eyebrow |
| `--indigo-soft` | `#ECEAFB` | indigo tint backgrounds, indigo eyebrow chip bg |
| `--teal` | `#1FA39B` | tertiary chart color (donut slices, etc.) — use sparingly |

### Semantic (status only)
Each semantic color ships in a 3-tone set: `--{name}` foreground, `--{name}-bg` background tint, `--{name}-tx` darker text-on-tint.

| Token | fg | bg | text-on-bg | Use |
|-------|----|----|-----------|-----|
| green | `--green #2E8B5E` | `--green-bg #E5F0E7` | `--green-tx #1F6B47` | healthy, success, positive delta, done state |
| amber | `--amber #B07A1A` | `--amber-bg #F6ECD6` | `--amber-tx #8A560C` | watch / warning |
| red | `--red #B5463A` | `--red-bg #FBEAE7` | — | error / bounce / destructive |
| blue | `--blue #2D6FB8` | `--blue-bg #E8F0FA` | — | info notes, scheduled state |

---

## 4. Spacing scale

Use these px steps — nothing in between:
`4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 30`

- Page padding (main): **30px** (22px on tablet).
- Card / panel padding: **22–24px**.
- Gap between major blocks: **22–24px**; between cards in a grid: **16px**.
- Sidebar nav item: padding **11px 13px**, **5px** gap between items, **22px** above section labels.

---

## 5. Radii

| Token | Value | Use |
|-------|-------|-----|
| `--r-sm` | `12px` | buttons, inputs, mini cards, ostep onum |
| `--r` | `14px` | step rows, picker cards, snap-card, testimonial, handnote, eyebrow chips on cards |
| `--r-lg` | `20px` | cards & panels (default), auth-card (22px override) |
| pill | `999px` | status pills, chips, switcher, count badge, progress bar |
| avatar | `50%` (people) · `8–11px` squircle (brand/client marks) | |

---

## 6. Shadows & borders

```css
--shadow-sm: 0 1px 2px rgba(43,38,32,.05);
--shadow-md: 0 1px 2px rgba(43,38,32,.04), 0 14px 30px -22px rgba(43,38,32,.30);
--shadow-lg: 0 2px 6px rgba(43,38,32,.06), 0 30px 60px -30px rgba(43,38,32,.35);
```
- Cards/panels: `1px solid var(--line)` + `--shadow-md`.
- Buttons/chips at rest: `--shadow-sm`; lift to `--shadow-md` + `translateY(-1px or -2px)` on hover (picker cards).
- Modals / popovers / auth-card: `--shadow-lg`.
- Warm shadow tint (`43,38,32`) — never cool grey.

---

## 7. Layout patterns

### App shell — fixed top bar + fixed sidebar, only main scrolls
```css
.topnav { position:sticky; top:0; height:64px; }                              /* stays */
.shell  { display:flex; height:calc(100vh - 64px); overflow:hidden; }
.sidebar{ width:254px; flex-shrink:0; height:100%; overflow-y:auto;
          display:flex; flex-direction:column; border-right:1px solid var(--line-soft); } /* stays */
/* full-width scroll container (scrollbar at the TRUE right edge) + centered content column */
.main   { flex:1; min-width:0; height:100%; overflow-y:auto;
          display:flex; flex-direction:column; align-items:center; padding:30px 30px 56px; }
.main > * { width:100%; max-width:1180px; }   /* content column; never put max-width on .main itself */
```
- **Never** cap `.main` with `max-width` (that puts the scrollbar mid-screen). Cap `.main > *` instead.
- Content column max-width: **1180px** default (wizards/forms narrower, ~760–1080).

### Grids
- Stat strip: 4 columns inside one panel, split by `--line-soft` (not 4 separate cards).
- Content split: `1.7fr 1fr` (main + rail).

### Responsive (desktop / laptop / tablet)
- **≥1200** full. **992–1200** 4-up grids → 2-up. **≤1080** split stacks. **≤992** sidebar → 60px icon rail (labels hidden via `font-size:0`, icons kept), tables scroll, agency name hidden. **≤680** grids 1-up, header stacks.

### Auth shell — pre-login screens (signup / login / verify / forgot / reset / workspace_setup / invite)
A centered card on the warm canvas. Two variants:
- **Split** (`.auth-card`, 1080px max, 1fr 1fr) — editorial **pitch panel** on the left, **form** on the right. The divider between siblings is drawn via `.auth-card > * + * { border-left:1px solid var(--line-soft); }` so the pitch can sit on either side.
- **Single** (`.auth-card.single`, 520px max) — one-column form (verify code, password reset, invite accept).
- The pitch panel (`.auth-brand`) is a **warm cream gradient** (`linear-gradient(165deg, var(--surface) 0%, #F0E7D4 100%)`) with a 3px terracotta→indigo accent stripe at the top — **never** a dark/purple panel.
- Padding: 48px 44px both sides. Card radius 22px (above the default `--r-lg`). Card shadow `--shadow-lg`.
- On mobile (`≤760px`) the divider flips to a top border and the card stacks.

### FTUX shell — full-viewport onboarding
A Linear-style first-run experience. The body uses `.onb-body` (`overflow:hidden; height:100vh`) so the page itself doesn't scroll; only the rail and stage scroll internally if needed.
```css
.onb-shell { display:flex; width:100vw; height:100vh; overflow:hidden; }
.onb-rail  { width:320px; flex-shrink:0;          /* fixed left rail */
             background:linear-gradient(180deg,var(--surface) 0%,#F3EBDA 100%);
             border-right:1px solid var(--line-soft);
             padding:32px 28px 24px;
             display:flex; flex-direction:column; overflow-y:auto;
             position:relative; }
.onb-rail::before { /* 3px terracotta→indigo accent on the inside edge */
             content:''; position:absolute; top:0; left:0; bottom:0;
             width:3px; background:linear-gradient(180deg,var(--primary) 0%,var(--indigo) 100%); }
.onb-stage { flex:1; min-width:0; overflow-y:auto;
             padding:36px 64px 32px;
             display:flex; flex-direction:column; }
```
- **Left rail** = logo + `SETUP` eyebrow + vertical step list (reuses the campaign-wizard `.vstep` + `.vnum` + `.vtext` styles, with `.done` green-check, `.active` glowing terracotta dot, plain for upcoming) + a pinned footer (`margin-top:auto`) with a small support card and a low-key skip link.
- **Right stage** = `.onb-stage-top` greeting + progress pill, then `.onb-step-active` focused on the current step (eyebrow + 34px H2 + lede + `.pickgrid` of `.pickcard` options + a sticky `.onb-foot` with primary CTA on the right).
- Responsive: ≤1080 picker cards collapse to 2-col; ≤860 the rail stacks above the stage (becomes a horizontal banner with the accent on top).

---

## 8. Components

**Buttons** — height 40px, radius `--r-sm` (12px), weight 600, soft `--shadow-xs`, lift on hover.
- **Primary (warm):** solid `--terra`, `#FFF7EE` text, 1px `#AC5320` edge, soft warm shadow.
- **Secondary:** `--card`, `--line` border.
- **Ghost:** transparent → warm wash on hover.

**Top bar** — brand lockup (`S` mark + "SendMyMail" in display) + agency name, the client switcher, then right-aligned icon buttons + primary CTA + user avatar.

**Sidebar** — flex column. Section labels (eyebrow style) with generous space; nav items roomy (11×13, 5px gaps); **active item = `--terra-soft` pill + `--terra` icon + `inset 0 0 0 1px rgba(197,106,51,.18)` ring**; count = soft rounded pill; a **"Help & support" footer** pinned at the bottom. Icons rest at 85% opacity, full on hover/active.

**Cards / panels** — `--card`, `1px --line`, `--r-lg` (20px), `--shadow`, padding 22–24px. Panel titles in `.display`.

**Stat strip** — one panel, 4 cells divided by `--line-soft`; label (12px) + big `.display` number + delta foot. Accent the hero stat's number in `--terra`.

**Editorial list** (preferred over dense tables for primary content) — rows separated by `--line-soft`, ~17px vertical padding, circular gradient avatar + name + muted subline + right-aligned `.display` figures + a status dot.

**Pills / chips** — fully rounded, 11.5px/600. Status uses semantic fg/bg.

**Gauge** — SVG donut, `--green-soft` track + `--green` value, round caps, `dashoffset = C·(1-pct)`, big `.display` number beside it.

**Bars** — `--terra-soft` track, `--terra` fill, fully rounded.

**Inputs / search** — `--card`, `1px --line-strong`, `--r-sm`; search may show a `⌘K` `<kbd>` hint.

### Human-touch utility kit (editorial / FTUX patterns)
A small set of reusable classes that give the product its "crafted, not template" feel. Use these instead of inventing new patterns when a screen needs a moment of personality (hero pitch, welcome-back panel, founder note, picker grid).

| Class | What it is | Used on |
|-------|-----------|---------|
| `.eyebrow` / `.eyebrow.indigo` | Small-caps tag chip with a colored dot. Default is terracotta on `--primary-light`; `.indigo` variant flips to indigo on `--indigo-soft`. | section labels above big headings (auth pitch, FTUX step) |
| `.pitch-h1` | 46px Bricolage editorial headline. Wrap a phrase in `<em>` to get a terracotta marker-highlight underneath (warm rgba band). | left pitch panel on signup/login |
| `.pitch-lede` | 15px body lede, `--muted`, max-width 38ch | paragraph under `.pitch-h1` |
| `.tickline` | Row with a green-bg checkmark bubble + line of text | bullet benefits in the pitch panel |
| `.brand-strip` + `.brand-chip` | Mini horizontal row of gradient initials chips after a `Trusted by` eyebrow label | signup pitch footer |
| `.snap-card` + `.snap-num` + `.snap-trend` | Warm card with a small label, a 42px Bricolage tabular number, and a green delta pill. `.metric-line` below splits a hairline-dashed row into 3 small `<b>`-numbered cells. | login welcome-back snapshot |
| `.testimonial` | Avatar + italic quote + author line, wrapped in a warm card | signup pitch panel |
| `.handnote` | Dashed-border sticky-note vibe — terracotta gradient avatar + conversational copy + signed off `.sig` (italic) | founder notes on login pitch + onboarding |
| `.progress-track` + `.progress-row` | Slim 8px warm progress bar with a gradient fill, plus a top row that labels `b/total` and time-left | onboarding (in-page) |
| `.progress-pill` | Pill containing a mini 6px progress bar + `b done · ~6 min left` copy | onboarding stage top-bar |
| `.last-seen` | Tiny capsule with a green shield icon + meta string | login form ("Last signed in from Kathmandu · 2 hrs ago") |
| `.pickcard` (in `.pickgrid`) | Picker card with icon tile, title, description, and a small meta footer (`.pm`). `.on` = terracotta gradient selected state; hover lifts 2px. | FTUX step options |

**Rule of thumb:** use these when the page would otherwise read as "form on grey" — they're how a screen earns a personality without inventing one-off styles.

---

## 9. Data-visualization

- **Series 1 = indigo** (`#4B43A8`) with a vertical gradient area fill (0.20 → 0 opacity).
- **Series 2 = terracotta** (`#C56A33`) line, no fill.
- Gridlines `rgba(43,38,32,0.05)`; axis labels 11px `--soft`; end-of-line emphasis dot = paper fill + colored stroke.
- Max two series colors per chart; beyond that, use tints of indigo.

---

## 10. Icons
**Tabler Icons** (`@tabler/icons-webfont`), 18–19px in UI; rest at ~85% opacity, full on active/hover. Color from `--muted`, or `--terra` when active.

---

## 11. Canonical `:root` token block

Paste into the one global stylesheet (`src/index.css`) and the mockup shared stylesheet. Components reference `var(--token)`; **never hardcode hex.**
```css
:root{
  /* primary (warm terracotta) */
  --primary:#C56A33; --primary-dark:#A8521F;
  --primary-light:#F5E7D9; --primary-ink:#964B22;
  /* brand mark / secondary */
  --indigo:#4B43A8; --indigo-soft:#ECEAFB;
  --teal:#1FA39B;                              /* tertiary chart only */
  /* neutrals (warm) */
  --ink:#2B2620; --muted:#6E6860; --soft:#9C958A;
  --bg:#FAF6EF; --card:#FFFFFF; --surface:#F2EEE4;
  --line:rgba(43,38,32,0.11);
  --line-strong:rgba(43,38,32,0.16);
  --line-soft:rgba(43,38,32,0.06);
  /* semantic (3-tone sets) */
  --green:#2E8B5E; --green-bg:#E5F0E7; --green-tx:#1F6B47;
  --amber:#B07A1A; --amber-bg:#F6ECD6; --amber-tx:#8A560C;
  --red:#B5463A;   --red-bg:#FBEAE7;
  --blue:#2D6FB8;  --blue-bg:#E8F0FA;
  /* editor chrome (fix-editor-chrome V1) — vivid blue for editor tool
     chrome ONLY: selection rings, hover affordances, drop indicators
     in the email builder. Deliberately cool against the warm palette
     so the eye reads it as "tool, not content" (Figma/Canva pattern).
     Never use in product UI — that's --primary's job.
     Dark theme overrides to #5B96F7 for contrast. */
  --editor-chrome:#2E77F0; --editor-chrome-bg:rgba(46,119,240,0.08);
  /* radii */
  --r-sm:12px; --r:14px; --r-lg:20px;
  /* shadows (warm — never cool grey) */
  --shadow-sm:0 1px 2px rgba(43,38,32,0.05);
  --shadow-md:0 1px 2px rgba(43,38,32,0.04), 0 14px 30px -22px rgba(43,38,32,0.30);
  --shadow-lg:0 2px 6px rgba(43,38,32,0.06), 0 30px 60px -30px rgba(43,38,32,0.35);
}
```

---

## 12. Using the theme in React (this repo)

The token block from §11 lives **twice** in `src/index.css`:
1. In `:root { … }` — so SCSS Modules + raw CSS can reference `var(--primary)` etc.
2. In `@theme { … }` — so Tailwind v4 exposes utilities like `bg-primary`, `text-ink`, `border-line`, `rounded-lg`, `shadow` (mapped from the same hex values).

Plus the two font `<link>`s in `index.html`. That's all the global CSS.

**Two ways to apply a style — pick the right one per case:**

| Use **Tailwind utilities** for | Use **SCSS Modules** for |
|---|---|
| Layout (`flex`, `grid`, `gap-4`, `p-6`, `mt-auto`) | Reusable component classes (`.card`, `.btn`, `.pill`) |
| Spacing & sizing one-offs | Hover / focus / active states beyond a single utility |
| Colors via tokens (`bg-primary`, `text-ink`, `border-line`) | Nested selectors, mixins, complex `&::before` patterns |
| Quick state classes (`opacity-50`, `cursor-pointer`) | Anything with shared structure across many components |

```tsx
// idiomatic component
import styles from '@styles/components/Card.module.scss';

export function Card({ title, children }) {
  return (
    <div className={`${styles.card} flex flex-col gap-4 p-6`}>
      <h2 className="text-ink display">{title}</h2>
      <p className="text-muted">{children}</p>
    </div>
  );
}
```

**Hard rules:**
- **Never hardcode a hex** in a component — add the token to §3 + §11 (and the `@theme` block in `src/index.css`) first, then use it via `var(--token)` or `bg-tokenName`.
- **Never use a Tailwind color/border/shadow utility that isn't in our `@theme` block.** No `bg-blue-500`, no `text-zinc-900`, no `border-gray-300`. Layout utilities (`flex`, `gap-*`, `p-*`) are fine — they have no palette concern.
- **SCSS variables** (`$foo`) are for local computed values only (e.g. `$step: 4px`) — they must never shadow a design token.
- Add `.display` for headings/big numbers; body inherits General Sans.

---

## 13. Do / Don't

| ✅ Do | ❌ Don't |
|------|---------|
| Display font for headings + big numbers | Set body copy in Bricolage |
| Body in General Sans (Hanken fallback) | Fall back to generic Inter for the look |
| Warm paper canvas + white cards | Cool grey / pure-white backgrounds |
| Indigo + terracotta, used sparingly | Add a third brand color "for variety" |
| Semantic colors for status only | Color buttons green/red for decoration |
| De-box: panels, editorial lists, whitespace | Wrap every element in an identical card |
| `.main` full-width, content capped via `.main > *` | Put `max-width` on the scroll container |
| Tabular numerals on figures | Let metrics shift width |
| Warm shadows (`43,38,32`) | Cool/grey shadows |
| Tailwind utilities from our `@theme` block (`bg-primary`, `text-ink`) + layout (`flex`, `gap-4`) | Tailwind defaults like `bg-blue-500`, `text-zinc-900`, `border-gray-300` |
| Mix Tailwind utilities with SCSS Module classes in `className` | Reach for inline `style={{ ... }}` when a token-mapped utility exists |

---

## Rollout status

**Mockups · shipped.** All 37 mockups in [doc/mockups/](../mockups/) are on this theme. The shared library [doc/mockups/_shared.css](../mockups/_shared.css) owns the `:root` tokens, font `@import`s, and every component class (sidebar/topbar shell, cards, tables, pills, auth-card, FTUX shell, human-touch utility kit). All in-app screens inject the chrome via [doc/mockups/_shell.js](../mockups/_shell.js) so the topbar + sidebar are identical everywhere; auth/onboarding screens use `.auth-wrap` / `.auth-card` / `.onb-shell` instead.

- **Reference dashboard:** [agency_dashboard.html](../mockups/agency_dashboard.html) — the canonical v2 reference.
- **Auth screens:** [signup.html](../mockups/signup.html), [login.html](../mockups/login.html), and the 5 single-column screens (verify / forgot / reset / workspace_setup / invite) all use the warm-pitch + form pattern from §7 Auth shell.
- **Onboarding:** [onboarding.html](../mockups/onboarding.html) uses the §7 FTUX shell.
- **No legacy hexes.** No file carries the old cool-indigo palette (`#6366F1`, `#5046E5`, `#5C53C4 → #3A3486`, etc.).

**App (Vite/React) · pending.** `src/index.css` still needs the §11 `:root` block + the two font `<link>`s in `index.html`. Components under `src/styles/` then reference `var(--token)` and `.display`. The mockups can serve as the visual contract while the React shell catches up.
