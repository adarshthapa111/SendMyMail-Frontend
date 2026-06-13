# Feature: Per-client brand kit

> The agency moat MailerLite/Mailchimp can't copy: they have ONE brand
> per account; we have clients as first-class objects, so brand lives
> PER CLIENT. Set a client's color/font/logo/address once → every
> section dropped into that client's emails arrives on-brand.

## Status: ✅ Done — 2026-06-13

Spans backend (schema + routes) and frontend (brand-kit module +
kit-aware composites + editor wiring + client-edit UI). Verified
end-to-end with headless Chrome against a real client.

---

## What a brand kit is

Per-client fields, all optional (null → neutral defaults):
- **brandPrimary** — hex; CTA button + banner-CTA background + accents
- **brandFont** — CSS font stack; all composite text
- **brandLogoUrl** — header/footer logo image (else "✦ {name}" wordmark)
- **brandAddress** — footer postal address (CAN-SPAM)
- **brandSocial** — `{ facebook?, instagram?, twitter? }`

The client's existing **name** doubles as the brand wordmark — zero new
field, instant per-client identity.

---

## Architecture decision: module singleton, not factory params

Section factories are all `() => IMjmlNode`, called from many places
(EditorBody drop handler, Flyout preview). Threading a `kit` argument
through the registry + 25 factories = heavy churn. Instead:

- `blocks/library/brandKit.ts` holds the active kit as a module
  singleton (`activeBrandKit()` / `setActiveBrandKit()`). Pure TS, no
  React/Redux — the editor (UI) pushes the kit down; this layer never
  reaches up.
- `shared.ts` helpers (`text`, `button`, `brandMark`) read
  `activeBrandKit()` at CALL time (= drop time), so a dropped composite
  picks up the live kit.
- The editor (`Builder.tsx`) calls `setActiveBrandKit(client)` once when
  the template loads, resets to defaults on unmount. clientId is fixed
  per Builder session (it's in the URL), so the kit is set once and
  never goes stale mid-edit.

INK/MUTED/LINE stay neutral consts (not themed per client) — only font,
primary, and brand identity vary. No ES-module-live-binding magic
needed; the direct-constant usages that remain (INK/MUTED/LINE) never
change.

---

## Files

### Backend (sendmymail-backend)
- `prisma/schema.prisma` — Client gets brandPrimary/brandFont/
  brandLogoUrl/brandAddress (String?) + brandSocial (Json?)
- `prisma/migrations/20260613023152_add_client_brand_kit/` — applied
- `src/routes/clients.ts` — CLIENT_SELECT + serialize() include brand
  fields; PATCH zod body validates them (hex regex, url(), max lengths,
  strict social sub-schema); audit logs brand field NAMES only (no value
  bloat). `brandSocial` clears via `Prisma.DbNull`.

### Frontend
- `src/lib/api/clients.ts` — Client + ClientUpdateBody gain brand fields;
  ClientBrandSocial type
- `src/blocks/library/brandKit.ts` — NEW: BrandKit type, DEFAULT_BRAND_KIT
  (= the exact pre-feature neutral values), resolveBrandKit(),
  setActiveBrandKit(), activeBrandKit()
- `src/blocks/library/shared.ts` — text/button read kit; new brandMark()
  (logo image if set, else "✦ {name}" wordmark); INK/MUTED/LINE/FONT/
  BTN_BG re-exported from DEFAULT_BRAND_KIT
- `src/blocks/library/{headers,footers,cta,tables}.ts` — use brandMark /
  kit primary / kit address / kit font
- `src/pages/templates/Builder.tsx` — loads client kit on mount, resets
  on unmount
- `src/components/clients/BrandKitCard.tsx` — NEW: brand editor card
  (ColorPicker + FontPicker + logo URL w/ live preview + address +
  3 social), own save via updateClient
- `src/pages/clients/ClientEdit.tsx` — renders BrandKitCard below the
  basic form (Create stays simple)
- `src/components/clients/index.ts` — export BrandKitCard
- `src/styles/components/clients/BrandKitCard.module.scss` — NEW
- `src/styles/components/clients/ClientPage.module.scss` — .section wrapper

---

## Verify (all confirmed live, headless Chrome)
1. PATCH /v1/clients/:id with brand fields → persists + round-trips (curl)
2. Brand kit card on /clients/:id/edit → loads saved values (color
   swatch, Georgia, address, social); Save disabled when clean
3. Builder for that client → drop Banner CTA → background computes
   `rgb(192,57,43)` = the client's #C0392B ✓
4. Drop Contact footer → contains the client name + the saved address ✓
5. tsc clean (FE + BE) · build clean · lint at 12 = pre-existing baseline

---

## Follow-up (2026-06-13): primitives go brand-aware
The bare **Button** and **Hero** primitives (blocks/button.ts,
blocks/hero.ts) hardcoded `#1a73e8` — bright Google-blue, nearly
identical to the editor-chrome selection blue (#2E77F0), so a dropped
button looked like editor UI, not content. Both now use
`activeBrandKit().primaryColor` (default near-black #111827) + the kit
font. Verified live: a dropped Button on the red-branded client renders
`rgb(192,57,43)`, not blue. (The other primitives — text/image/divider/
spacer — were already neutral.)

## V2 / later
- Logo upload via Cloudinary (today: paste a URL)
- Secondary color usage (stored, not yet consumed)
- Re-run section previews when the kit changes mid-session (today the
  Flyout preview cache is fine because clientId is fixed per session)
- Brand kit applied at SEND time server-side for safety (today purely
  authoring-time in the dropped tree)

## Note
The dev client "Juice Nepal" (cmpy57trj…) was given demo brand values
(#C0392B / Georgia / Thamel address) during testing — harmless seed data.
