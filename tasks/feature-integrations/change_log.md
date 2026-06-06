# feature-integrations

V1 cut of the Integrations screen. Two iterations:
- **V1.0** (initial) — two-section row list per the mockup
- **V1.1** (redesign) — Vercel-style featured-hero + card grids, after
  user feedback that the row list felt utilitarian

## Status: ✅ Done — V1.1 redesign shipped

## V1.1 — Card-grid redesign (Vercel-style featured + grid)

### Why redesign

After V1.0 shipped (row list per mockup), user reaction was that the UI
felt like a settings page, not a product surface. The row format
worked but didn't make integrations feel like a destination — brands
were cramped into 38×38 letter badges next to a long tagline + tiny
pill + tiny button, all on one line.

Researched real-world SaaS integration pages (Linear, Vercel, Stripe,
Notion) — they universally use card grids with category headers, and
Vercel specifically uses a featured-curated hero strip + secondary
grid pattern that suits a small-but-opinionated catalog like ours.

### New layout

```
┌─ Integrations ──────────────────────────────────────────────┐
│ Sync e-commerce data in, and export your built email out…   │
└─────────────────────────────────────────────────────────────┘

✨ RECOMMENDED FOR YOUR MARKET
┌───────────────────────────┐  ┌───────────────────────────┐
│  ▣ ML  (big badge)        │  │  ▣ B   (big badge)        │
│                           │  │                           │
│  MailerLite               │  │  Brevo                    │
│  "Budget favorite for     │  │  "Strong in South Asia.   │
│   Nepali agencies. Full   │  │   Affordable email + SMS  │
│   API push, automation-   │  │   in one platform."       │
│   ready."                 │  │                           │
│                           │  │                           │
│   [Connect →]             │  │   [Connect →]             │
└───────────────────────────┘  └───────────────────────────┘

E-COMMERCE SYNC (INBOUND)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ▣ W      │ │ ▣ S      │ │ ▣ Z      │ │ ▣ D      │
│ Woo…     │ │ Shopify  │ │ Zapier   │ │ Daraz    │
│ [Coming] │ │ [Coming] │ │ [Coming] │ │ [Not.s]  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

MORE EMAIL PLATFORMS
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ▣ Mailch │ │ ▣ SendGr │ │ ▣ HubSp  │ │ ▣ Klavy  │
│ Copy/p   │ │ API push │ │ Copy/p   │ │ Copy/p   │
│ [Export] │ │ [Connect]│ │ [Export] │ │ [Export] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

  ⤴ Need another platform? Export HTML / MJML / Webhook.
```

### What changed (V1.1)

| File | Change |
|---|---|
| [src/integrations/registry.ts](src/integrations/registry.ts) | Added `featured?: { reason: string }` field to `PlatformDef`. Set on MailerLite (`"Budget favorite for Nepali agencies. Full API push, automation-ready."`) and Brevo (`"Strong in South Asia. Affordable email + SMS in one platform."`). New `isFeatured` predicate exported. |
| [src/components/integrations/PlatformCard.tsx](src/components/integrations/PlatformCard.tsx) | Rewritten. Universal card component with `variant: 'featured' \| 'standard'`. Featured variant: larger logo (56px vs 42px), pulled-in `featuredReason` copy, accent gradient background + softer accent border, lift on hover. Standard variant: compact (logo 42px, dense layout, button at bottom). Same component drives all sections. |
| [src/components/integrations/IntegrationsScreen.tsx](src/components/integrations/IntegrationsScreen.tsx) | Full rewrite for the new layout. 3 sections: Recommended (featured cards), Inbound (4-card grid from `INBOUND_CATALOG`), More email platforms (outbound minus featured to avoid duplication per Vercel's pattern). Footer escape-hatch note unchanged. |
| [src/styles/components/integrations/IntegrationsScreen.module.css](src/styles/components/integrations/IntegrationsScreen.module.css) | Full rewrite. New classes: `.featuredGrid` / `.inboundGrid` / `.outboundGrid` (CSS grid with `auto-fit minmax`), `.card` / `.cardFeatured` (with gradient bg + accent border), `.cardHead` / `.cardLogo` / `.cardLogoFeatured`, `.cardBody`, `.cardFoot`. Hover micro-interactions: standard cards lift their border-color, featured cards lift + shadow. Responsive: featured stacks to single column at ≤760px. |
| `src/components/integrations/PlatformRow.tsx` | **Deleted.** The row component from V1.0 is no longer used. |

### Decisions (V1.1)

| Decision | Choice | Why |
|---|---|---|
| **Featured = registry data, not screen state** | `def.featured.reason` field on the platform itself | Editorial copy lives next to the platform definition. Adding/removing a featured platform is a 4-line registry diff, not a screen rewrite. |
| **Featured doesn't duplicate in the grid** | MailerLite + Brevo appear only in the Featured row | Vercel's pattern. Duplicate cards would look bloated; the section heading becomes "More email platforms" to honor this. |
| **2 hero cards, not 3** | Only MailerLite + Brevo are flagged featured | Per impl doc — these are the two explicitly called out for Nepal. Adding more dilutes the editorial signal. |
| **Card grid, not row list** | CSS Grid with `auto-fit minmax(220px, 1fr)` | Reflows cleanly at any width: 3-col → 2-col → 1-col without media queries for each step. The breakpoint is implied by the min-width, not hardcoded. |
| **Standard cards have logo + name + tagline + button** | Inline pill replaces button when status ≠ available | "Coming soon" / "Not supported" cards have no button; the pill takes its place visually. Keeps card height roughly consistent. |
| **Featured uses gradient + accent border** | `linear-gradient` background (4% primary) + `color-mix` border | Makes the editorial spotlight feel distinct without being loud. Subtle enough that the rest of the screen still reads as the inventory. |
| **Section labels become uppercase mini-headers** | 11px uppercase, 0.06em letter-spacing, muted color, ✨ sparkle icon for "Recommended" | Standard editorial pattern. Pulls the eye to section starts. The sparkle on "Recommended" reinforces the spotlight without screaming. |

### Bundle impact

- `tsc -b --noEmit`: clean
- `npm run build`: clean (1.89s). Builder chunk unchanged (98.53 KB,
  gzip 28.53 KB) — integrations is not in the Builder bundle.
- `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

### What was kept from V1.0

- `v1?: true` registry flag (hides the 17 non-V1 platforms — still
  the right call)
- `inboundCatalog.ts` (presentation-only inbound data)
- `isV1` predicate
- `ExportDropdown` V1-filter (unchanged)
- ConnectModal / SetupModal / WebhookModal flows (unchanged)
- Two-section conceptual split (Inbound / Outbound)
- Escape-hatch footer note

### Live examples we drew from

- [linear.app/integrations](https://linear.app/integrations) — category card grids with hover state
- [vercel.com/integrations](https://vercel.com/integrations) — featured curated section + native/external split
- Stripe Apps marketplace, Notion connections page — confirmed the
  pattern across product categories

---

## V1.0 — Initial cut (row list per mockup)

(superseded by V1.1; kept here as a record of what shipped first)

### Status: ✅ Done — V1.0 shipped

## Why this PR

Per [doc/implementation_doc/feature-integrations.md](doc/implementation_doc/feature-integrations.md):
- **Outbound V1**: only 6 first-class platforms — Mailchimp, MailerLite,
  Brevo, SendGrid, HubSpot, Klaviyo — plus escape hatch (HTML, MJML,
  Webhook, Zapier, Make).
- **Inbound V1**: WooCommerce, Shopify, Zapier-inbound — but backend
  infra (HMAC webhook receivers, event log) is **Weeks 12-13**, not
  built yet.
- The existing screen showed all 28 registry entries in a generic card
  grid with search + filter chips. Off-spec for V1.

## What changed

| File | Change |
|---|---|
| [src/integrations/registry.ts](src/integrations/registry.ts) | Added `v1?: true` field to `PlatformDef`. Flagged the 11 V1 entries: Mailchimp, MailerLite, Brevo, SendGrid, HubSpot, Klaviyo, HTML, MJML, Webhook, Zapier, Make. Other 17 entries unchanged (Marketo, Postmark, Salesforce, ActiveCampaign, etc.) — still in registry, hidden by absence of `v1`. Exported `isV1(def)` predicate. |
| [src/integrations/inboundCatalog.ts](src/integrations/inboundCatalog.ts) (new) | Presentation-only catalog for the inbound section. `InboundDef` shape carries display data (name, tagline, brand color, letter, optional icon, status) — no credentials / send endpoints because backend doesn't accept them yet. 4 entries: WooCommerce / Shopify / Zapier / Daraz. WooCommerce + Shopify + Zapier all `status: 'coming-soon'`; Daraz `status: 'not-supported'`. |
| [src/components/integrations/PlatformRow.tsx](src/components/integrations/PlatformRow.tsx) (new) | Single row component matching the mockup's `.int-row` markup. Props: brandColor / letter / optional icon / name / tagline / status / actionLabel / actionPrimary / onAction. Status pill variants (connected / coming-soon / not-supported) + optional action button (Connect / Configure / Export / Set up). Built-in `textOn(bg)` luminance check so Mailchimp's yellow badge gets black text (everything else white). |
| [src/components/integrations/IntegrationsScreen.tsx](src/components/integrations/IntegrationsScreen.tsx) | Full rewrite. Removed search + filter chips + grid. Two sections rendered by mapping `INBOUND_CATALOG` and a fixed-order array of outbound V1 platform IDs. Footer note with inline buttons linking to HTML / MJML / Webhook escape-hatch modals. |
| [src/styles/components/integrations/IntegrationsScreen.module.css](src/styles/components/integrations/IntegrationsScreen.module.css) | Full rewrite. Replaced hardcoded hex (`#f7f8fa`, `#65676b`, etc.) with `--color-*` theme tokens so the screen sits inside the warm editorial palette. New classes: `.row` (14×18 padding, top-border dividers) / `.logo` (38×38 rounded letter badge) / `.pill` + 3 variants / `.btn` + `.btnPrimary` / `.note` + `.noteLink`. |
| [src/components/integrations/ExportDropdown.tsx](src/components/integrations/ExportDropdown.tsx) | Filter loop now skips non-V1 platforms via `isV1(def)`. Keeps the dropdown's visible set consistent with the screen — a user can't connect a Marketo from the screen, so the dropdown shouldn't surface a Marketo entry either (even if one somehow ended up in localStorage). |

## What did NOT change

- **ConnectModal / SetupModal / WebhookModal** — the modal flows for
  Tier 1 (API push), Tier 3 (copy/paste), Tier 4 (webhook) are reused
  unchanged. They already work end-to-end.
- **PlatformCard.tsx** — kept; still used elsewhere (ExportDropdown
  card display). Not deleted.
- **PlatformIcon.tsx** — unchanged.
- **src/integrations/credentials.ts** (localStorage layer) — unchanged.
  Persistence stays client-only until backend ships at Weeks 12-13.
- **integrationsSlice** — unchanged. `search` and `filter` state still
  exist in the slice but are no longer read; harmless. Will remove
  when we're confident no other surface depends on them.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **V1 visibility = registry flag** | `v1?: true` per entry + exported `isV1` predicate | Matches impl doc's "keep the rest defined but hidden behind a flag". Flipping a flag re-enables a platform; no code in screens / dropdown changes. |
| **Inbound = separate catalog** | `inboundCatalog.ts`, not a category in the registry | Inbound platforms have a fundamentally different data shape (no credentials, no sendEndpoint, no thirdPartyClientName). Stuffing them into `PlatformDef` would muddy the type. |
| **Inbound = presentation-only V1** | All rows are `coming-soon` or `not-supported`. No click. | Per user direction: "Disable the row entirely". Backend infra is Weeks 12-13; pretending to connect would be misleading. |
| **No search / filter chips** | Removed entirely | Mockup doesn't have them. With only 10 visible rows, search has no value. |
| **No tabs** | Two scrolling sections, not Inbound/Outbound tabs | Mockup shows both at once. Tabs would hide one direction; agencies use both. |
| **Webhook + Zapier + Make in footer, not main list** | Escape-hatch note links to their modals | Mockup intent: webhooks aren't first-class destinations, they're "everything else" escape hatches. |
| **Daraz rendered, dimmed** | Visual row with "Not supported" gray pill, opacity 0.6, no click | Honest about the limitation while still being mockup-faithful. Educates clients on why Daraz isn't supported (no third-party API). |
| **Brand color text** | Auto-pick black or white via luminance threshold (0.6) | Mockup hardcodes color choices (Mailchimp Y black, Brevo B white). The threshold reproduces the same decisions without hardcoding. |
| **ExportDropdown V1-filtered** | Same `isV1` predicate | Mirror the screen's visible set. Defense in depth — if a non-V1 connection slips into localStorage somehow, the dropdown still hides it. |

## Edge cases

| Case | Behavior |
|---|---|
| User has a non-V1 platform "connected" in localStorage (from a prior session) | Screen doesn't list it (no row). Dropdown also hides it. Connection metadata stays in localStorage harmlessly — uncovered by UI until we flip the flag. ✓ |
| User imports a template with non-V1 `thirdPartyClientName` in MJML | Backend still recognizes it; render pipeline unchanged. ✓ |
| User clicks an outbound V1 platform's "Connect" / "Configure" / "Export" | Routes to the matching modal (ConnectModal / SetupModal). Tier-3 platforms always show "Export" (no persistent connection state). ✓ |
| User clicks an inbound row | Nothing happens — no `onAction` passed. The row renders without the button. ✓ |
| User clicks an escape-hatch footer link | Opens the matching modal (Tier 3 for HTML/MJML, Tier 4 for Webhook). ✓ |
| User connects MailerLite, then refreshes | `hydrateConnections(loadAllConnections())` on mount restores connection state. The MailerLite row's status flips to "Connected" + button to "Configure". ✓ |
| Future beta-team unhides Marketo by adding `v1: true` to its registry entry | The next deploy shows Marketo automatically in the outbound section — no screen code changes. (Marketo also needs to be added to the explicit-order array OR the screen logic switched to "all V1, sorted alphabetical". For V1 we use a fixed 6-platform list; expanding past 6 will need that array updated.) |

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (1.79s). Builder chunk unchanged (98.53 KB,
  gzip 28.53 KB) — integrations is not in the Builder bundle.
- `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Out of scope (clean follow-ups)

| Item | When |
|---|---|
| Backend inbound endpoints (Woo / Shopify / Zapier webhook receivers, HMAC validation, event log) | Weeks 12-13 per impl doc. Frontend will swap "coming-soon" rows for real ConnectModal flows then. |
| Persist connection state in Postgres (not localStorage) | Comes with the backend work. The `integration` table is sketched in impl doc §Data model. |
| Search / filter on integrations screen | If/when the visible set grows past ~15 platforms |
| Daraz CSV import shortcut from the row | When a Daraz client asks for it. The contacts import flow already supports CSV; just needs a deep-link button. |
| The other 17 hidden registry entries | Unhide per beta demand. ActiveCampaign + Postmark are the most likely candidates. |
| Stripe Tier 1 integration (mentioned in impl doc as out of scope V1) | Feature 09 V2 |
| Public integration API | Feature 09 V2 |

## Files at a glance

**New (3)**:
- `src/integrations/inboundCatalog.ts` (~65 lines)
- `src/components/integrations/PlatformRow.tsx` (~110 lines)
- `tasks/feature-integrations/change_log.md` (this file)

**Modified (4)**:
- `src/integrations/registry.ts` (interface + 11 entry flags + isV1 export)
- `src/components/integrations/IntegrationsScreen.tsx` (rewrite, 125 → 165 lines)
- `src/styles/components/integrations/IntegrationsScreen.module.css` (rewrite, ~240 lines)
- `src/components/integrations/ExportDropdown.tsx` (one-line `isV1` guard)
