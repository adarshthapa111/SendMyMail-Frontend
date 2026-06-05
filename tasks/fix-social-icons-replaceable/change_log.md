# fix-social-icons-replaceable

Social block now defaults to Facebook / Instagram / TikTok with real
brand-colored icons, each icon is individually selectable on the canvas,
and a per-icon inspector lets the user swap the icon image (upload from
file via the same Cloudinary defer-to-save flow that mj-image uses).

## Status: ✅ Done

## The bug

Two issues bundled:

1. **Stale defaults.** The factory created facebook + twitter + instagram
   with no `src`, so the canvas showed colored letter chips ("F", "T",
   "I") instead of recognizable icons. Twitter is no longer a useful
   default (rebranded, deprioritized for marketing); TikTok is what
   creators actually want.

2. **Icons not replaceable.** The `SocialInspector` only exposed group
   properties (icon size, spacing, layout, align). To change an
   individual icon's image, network, or URL, users had to dive into the
   Advanced panel and edit raw attributes — no upload flow, no preview.

## What changed

| File | Change |
|---|---|
| [src/blocks/social.ts](src/blocks/social.ts) | Defaults changed to facebook + instagram + tiktok. Each child now has a `src` pointing at simpleicons.org's CDN (brand-colored SVG: facebook `#1877F2`, instagram `#E4405F`, tiktok `#000000`). Default `icon-size` bumped from 24px → 32px (better visual weight for real icons vs. placeholder letters). |
| [src/canvas/renderTree.tsx](src/canvas/renderTree.tsx) | `SocialLeaf` extracted icon rendering into a new `SocialIconElement` component. When `src` is set: renders `<img>` sized via the parent's `icon-size`, with selection halo on hover/click. When `src` is missing: falls back to the letter chip (legacy templates still render). Each icon dispatches `selectNode(_id)` on click (with `stopPropagation` so the parent navbar doesn't also select). |
| [src/components/inspector/SocialElementInspector.tsx](src/components/inspector/SocialElementInspector.tsx) | New. Per-icon editor: `ImageReplaceControl` for icon upload (reuses the same widget mj-image uses → uploads to Cloudinary on save via `uploadPendingImages`), `UrlInput` for icon URL (alternative manual entry), `UrlInput` for link href, `TextInput` for network name, `ColorPicker` for background. |
| [src/components/Inspector.tsx](src/components/Inspector.tsx) | Imports `SocialElementInspector`, adds `case 'mj-social-element'` to the dispatch switch, adds `'mj-social-element': 'Social Icon'` to the LABELS map. |
| [src/components/inspector/SocialInspector.tsx](src/components/inspector/SocialInspector.tsx) | Updated outdated hint from *"Add or remove specific networks via the Advanced panel — full per-icon editing arrives in a later phase"* to *"Click an icon on the canvas to edit it (image, URL, network name)."* |
| [src/styles/canvas/renderTree.module.css](src/styles/canvas/renderTree.module.css) | New `.socialIconImg` style (sized via inline `width`/`height` from `icon-size` attr, selection-halo outline matching other canvas selectables). `.socialIcon` (letter fallback) gains `cursor: pointer`. Added `.selected` composition for both. |

## Why simpleicons.org for default URLs

- **Reliability**: been around since 2014, widely used in production
  (GitHub stars >18k, many SaaS rely on it). No auth, no rate limits
  for casual use, free CDN.
- **No CORS issues**: serves with permissive `Access-Control-Allow-Origin`.
- **Tiny**: SVGs ~1 KB each — invisible bandwidth cost.
- **On-brand**: returns the official monochrome logo + your chosen
  fill color via the URL path (`/facebook/1877F2` = Facebook blue).
- **Email-client safe**: SVG is widely supported in modern clients
  (Apple Mail, Gmail web, iOS). Older Outlook desktop renders as
  PNG via MJML's compilation if needed (the backend's
  `transformSocialToRaw` rewrites to PNG-compatible HTML at compile
  time anyway).

**Alternative considered**: hosting default icons in our own Cloudinary
account. Rejected — adds setup friction, no upside over simpleicons,
and means we own a permanence guarantee we shouldn't volunteer for.

## Why reuse `ImageReplaceControl` rather than a social-specific upload widget

The widget already does:
- File picker + drag-and-drop
- 5 MB / type validation
- "Local file — will upload on Save" hint
- Thumbnail preview

For social icons it's the same flow: user picks a file → tree gets
`data:` URL → save dispatches `uploadPendingImages(tree)` which walks
the tree and uploads every pending `data:` src to Cloudinary.

**Made the walker poly-tag.** Originally `uploadPendingImages` only
matched `mj-image`. Extended it to a `HOSTS_IMAGE_SRC` set that includes
`mj-image` + `mj-social-element`. Now custom-uploaded social icons go
through the same defer-to-save flow as image blocks → uploaded to
Cloudinary at save time, not baked into the email HTML as inline
base64. Future image-bearing blocks (hero `background-url`, button
icons) extend the set with one line.

## Edge cases

| Case | Behavior |
|---|---|
| Existing template loaded with no `src` on social elements | Letter chip renders (legacy fallback) ✓ |
| User imports MJML with `<mj-social-element src="https://...">` | Renders the imported icon ✓ |
| User imports MJML with `name="twitter"` and no src | Letter "T" chip; user can swap via the inspector ✓ |
| User clicks a single icon | Selects the `mj-social-element` (NOT the parent navbar/social) → SocialElementInspector opens ✓ |
| User clicks outside icons but inside the social wrapper | Parent `mj-social` selects (existing behavior) ✓ |
| User uploads a custom icon, doesn't save, closes tab | Browser memory cleared → nothing uploaded → no orphan ✓ |
| User uploads a custom icon, saves | `uploadPendingImages` walks `mj-social-element` too → uploads to Cloudinary → src becomes `https://res.cloudinary.com/...` → saved MJML has a clean URL, no base64 ✓ |
| User has icon selected, hits Delete | `deleteBlock` removes the `mj-social-element` from the social block's children. Parent renders the remaining icons. ✓ |
| User undoes a custom-icon upload | Data URL pops out of `src`, prior value (or undefined) restored ✓ |

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (1.92s). Builder chunk: 94.95 → 97.97 KB
  (+3 KB combined with the navbar fix; ~2 KB of that is this social
  work — SocialElementInspector + SocialIconElement + styles).
- `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Follow-up (logged, not blocking)

| Item | Why later |
|---|---|
| Drag-to-reorder social icons | Same need as navbar links — moveNode reducer exists, needs dnd-kit wiring on the icon row. |
| "+ Add icon" button in SocialInspector | Mirrors the navbar's "+ Add link" pattern. Currently users have to dive into Advanced or duplicate via the canvas toolbar. |
| Preset library of common networks (LinkedIn, YouTube, X, Threads, Pinterest, etc.) | A dropdown with one-click "+ LinkedIn" / "+ YouTube" — populates name + href + simpleicons URL automatically. |
