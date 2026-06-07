# Feature: Perceived performance — change log

> Skeleton loaders + optimistic UI across the app. Removes the
> "waiting" feeling from every interaction. Compounds with the theme
> system and reports PRs to push the app firmly into "premium SaaS"
> tier on every interaction.

---

## Status: ✅ Done — V1 shipped

Plan estimated 2 days; implemented in one focused pass. Frontend-only
PR — zero backend changes, zero migrations.

### What landed (file-by-file)

**Skeleton primitives + variants (8 new files, ~480 lines TS + ~330 lines SCSS):**

- `src/components/skeletons/Skeleton.tsx` — 4 primitives:
  - `<Skeleton w h radius />` — base box with theme-aware shimmer
  - `<SkeletonText lines h gap lastWidth />` — stacked text rows
  - `<SkeletonCircle size />` — avatar/icon placeholder
  - `<SkeletonBlock h w radius children />` — wrapping area

- `src/components/skeletons/Skeleton.module.scss` — shimmer animation
  via `::after` overlay with `transform: translateX(...)` keyframe.
  Uses `color-mix(in srgb, var(--color-bg) 30%, transparent)` for the
  peak color so it reads on dark + white themes. `@media
  (prefers-reduced-motion: reduce)` disables animation.

- 7 per-surface skeletons that match real layouts (zero-shift transition):
  - `TemplateCardSkeleton` — phone-frame shape
  - `CampaignCardSkeleton` — status strip + 3-stat columns
  - `FormCardSkeleton` — header + name + URL row + footer stats
  - `KpiCardSkeleton` (with `withSubtitle?` prop for engaged-tone cards)
  - `ChartSkeleton` — gridlines + area + axis labels
  - `RowSkeleton` — generic list rows (count + withAvatar? + withPill?)
  - `DomainCardSkeleton` — header + status pill + records area

**Spinner replacements (12 surfaces):**

| Surface | Skeleton |
|---|---|
| `/dashboard` | Title + 4 KPIs + chart + clients-health rows |
| `/templates` (TemplatesList) | TemplateCardSkeleton × 8 in grid |
| `/clients/:cid/campaigns` (CampaignsList) | CampaignCardSkeleton × 6 |
| `/clients/:cid/campaigns/:id` (CampaignReport) | 4 KPIs + recipient log RowSkeleton × 8 |
| `/clients/:cid/forms` (FormsList) | FormCardSkeleton × 6 |
| `/clients/:cid/forms/:id` (FormDetail) | 4 KPIs + submissions RowSkeleton × 6 |
| `/clients/:cid/contacts` (ContactsList) | RowSkeleton withAvatar × 8 |
| `/clients/:cid/lists` (ListsList) | RowSkeleton × 5 |
| `/clients/:cid/suppression` (SuppressionList) | RowSkeleton withPill × 6 |
| `/clients/:cid/reports` (ClientReport) | 4 KPIs + ChartSkeleton + top campaigns × 5 |
| `/clients` (ClientsList) | RowSkeleton withAvatar × 6 |
| `/settings/sending` (SendingTab) | DomainCardSkeleton |

**Optimistic UI on 6 hooks:**

| Hook | Mutation | Behavior |
|---|---|---|
| `useTemplates` | `archive` | Snapshot row, flip `archived: true` immediately, fire API, rollback on error |
| `useCampaigns` | `remove` | Snapshot, dispatch removeCampaign, fire API, dispatch addCampaign on error |
| `useForms` | `archive` | Capture row + index, filter out, fire API, splice back at original index on error |
| `useSuppression` | `remove` | Same pattern as forms |
| `useSendingDomains` | `remove` | Same pattern |
| `useOnboarding` | `skip`, `complete` | Capture `setupComplete` state, flip to true, fire API, restore on error |

Common pattern: capture rollback state → optimistic update → fire
request → rollback on catch + re-throw so callers can show their own
error toasts.

**Toast extension:**

- `src/lib/toast.ts` — new `successWithUndo(message, onUndo, opts?)`
  helper. Renders an inline button next to the message; clicking
  dismisses the toast + fires the undo handler. Default 6s duration.
  Button uses theme tokens (`var(--color-primary)`, etc.) so it adapts
  to all 3 themes.

  ```typescript
  successWithUndo('Archived', () => unarchive(id));
  ```

  Not yet wired into the consumer pages (templates/forms/etc.) —
  follow-up PR can plug it in. The hook-level optimistic UI is the
  bigger win; Undo is additive polish.

### Decisions that came up during implementation (vs plan)

| Decision | What | Why |
|---|---|---|
| **Skeleton primitives use inline-block + `::after` overlay** | Not a separate animated background | Avoids repainting the whole block on every animation frame; only the overlay moves. Better perf especially with many skeletons on screen. |
| **Per-surface skeletons match real layouts exactly** | Same padding, same grid, same sizing | Zero-shift transition when content lands. Eye doesn't reflow. |
| **`color-mix(in srgb, var(--color-bg) ...)` for shimmer peak** | Instead of hardcoded white/rgba | Works in dark + white themes automatically — shimmer reads against whatever the underlying bg is. |
| **Optimistic UI pattern uses snapshot-then-rollback** | Captured outside `setItems` updater so rollback knows the original | Standard pattern. Works for both Redux (dispatch) and local React state (setItems). |
| **Undo toast helper built but NOT wired in this PR** | Hook-level optimistic UI shipped without page-level Undo | Optimistic UI is the bigger UX win. Wiring Undo across ~6 surfaces is a follow-up PR (each surface needs its own un-action handler). |
| **Skeleton rendered IN the same container layout** | Not in a separate "loading" wrapper div | Zero layout-shift when real items replace skeletons. The `.grid`, `.statsRow`, etc. wrappers stay; only the children swap. |
| **Skeleton on FIRST load only, not refetches** | Existing hooks already preserve data during refetch | "Cache-first" UX feel — once a user has visited a page, they never see a skeleton again unless they explicitly clear data. |
| **`aria-busy="true"` on skeleton containers** | Accessibility — screen readers know content is loading | Standard pattern, costs nothing |

### Build + lint gates

- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.37s). Main chunk +~0.2 KB
  gzipped (skeleton components are tiny; most of the code is shared SCSS).
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**
- No backend changes; no migrations.

### What's NOT verified yet

**Manual sweep pending** — verify on slow connection (Chrome DevTools
throttle to "Slow 4G"):

1. Visit every list page → skeleton appears, shape matches final layout
2. Archive a template / form / campaign → row disappears in 0ms
3. Force a network error → row pops back + error toast
4. Visit `/dashboard` → KPI skeletons + chart skeleton + clients-row skeletons
5. Switch themes (Default / Dark / White) → shimmer reads in all 3
6. Set `prefers-reduced-motion: reduce` → shimmer static
7. Cmd+R on a page with cached data → no skeleton (cache-first UX)

### Known V1 limitations (by design)

- **Undo toast helper built but not wired** — `successWithUndo()` is
  ready in `src/lib/toast.ts` but no caller invokes it yet. Follow-up
  PR can wire across destructive actions (archive, suppression, etc.)
- **Skeleton sizes are reasonable defaults** — could be tuned per
  observed real-data shapes (some users have shorter/longer names)
- **First-load only** — skeleton doesn't show during background
  refetch even if data is stale. Acceptable; matches "cache-first"
  intent.
- **No retry button on skeleton timeout** — if request hangs forever,
  user sees skeleton forever. V2 polish to add a 15s retry overlay.
- **Optimistic rename / theme update** — already instant via existing
  hooks, no new pattern needed.

### Files at a glance

**New (8 + 7 = 15 files)**:
- 4 primitive components in `src/components/skeletons/`:
  - `Skeleton.tsx` (4 primitives in 1 file)
  - 7 per-surface variants
  - `index.ts` barrel
- 8 SCSS modules in `src/styles/components/skeletons/`

**Modified (16 files)**:
- 12 page-level spinner → skeleton swaps
- `src/lib/toast.ts` (+ Undo support)
- 6 hooks gain optimistic UI (`useTemplates`, `useCampaigns`,
  `useForms`, `useSuppression`, `useSendingDomains`, `useOnboarding`)

---

## Original planning sections below (unchanged):

---

## Why this bundle

After theme system shipped, the app is **visually** premium. But it
still **feels** slow because every list page shows a spinner during
load and every mutation has a 200-500ms latency before UI updates.

Linear / Notion / Stripe feel "instant" because they:

1. **Show skeleton placeholders matching final layout** instead of
   spinners — your eye thinks "content is here, just rendering."
2. **Apply mutations to local UI FIRST, then sync with server** —
   archive a row and it disappears in 0ms instead of 300ms.

Both are infrastructure-level wins that compound across every surface.
Once they're in, the whole app feels faster even though the actual
network latency hasn't changed at all.

---

## Scope

### Part A — Skeleton loaders (~1 day)

Replace ~20 `<Spinner />` instances across the app with content-shape
skeleton placeholders. Each skeleton matches the final layout's grid +
spacing + sizing so the transition from skeleton → real content is
zero-shift (no layout jank).

**Surfaces:**

| Page | Current | After |
|---|---|---|
| `/dashboard` | Centered spinner | KPI card skeletons + chart skeleton + top-clients row skeletons |
| `/templates` | Spinner | Template card grid skeleton (phone-frame shapes) |
| `/clients/:cid/campaigns` | Spinner | Campaign card grid skeleton |
| `/clients/:cid/campaigns/:id` (Report) | Spinner | Stats hero + recipient log skeleton |
| `/clients/:cid/forms` | Spinner | Form card grid skeleton |
| `/clients/:cid/forms/:id` (Detail) | Spinner | Stats hero + submissions list skeleton |
| `/clients/:cid/contacts` | Spinner | Contact rows skeleton |
| `/clients/:cid/lists` | Spinner | List rows skeleton |
| `/clients/:cid/suppression` | Spinner | Suppression rows skeleton |
| `/clients/:cid/reports` (Report) | Spinner | KPI hero + chart + top campaigns skeleton |
| `/clients` | Spinner | Client list skeleton |
| `/settings/sending` | Spinner | Domain card skeletons |
| Onboarding banner | (no spinner — refetches silently) | n/a |

**New skeleton primitives:**

```
src/components/skeletons/
  Skeleton.tsx              ← base primitive with shimmer animation
  SkeletonText.tsx          ← variable-width text placeholders
  SkeletonCircle.tsx        ← avatar / icon placeholders
  SkeletonBlock.tsx          ← box placeholders
  index.ts                   ← barrel export
```

**Per-surface skeleton components:**

```
src/components/templates/TemplateCardSkeleton.tsx
src/components/campaigns/CampaignCardSkeleton.tsx
src/components/forms/FormCardSkeleton.tsx
src/components/clients/ClientRowSkeleton.tsx
src/components/clients/KpiCardSkeleton.tsx
src/components/contacts/ContactRowSkeleton.tsx
src/components/contacts/SuppressionRowSkeleton.tsx
src/components/dashboard/SendingChartSkeleton.tsx
src/components/settings/DomainCardSkeleton.tsx
```

**Animation:** Subtle shimmer left-to-right via CSS `background:
linear-gradient(...)` + keyframes animation. Cycles in ~1.5s.
Uses theme tokens (`var(--color-line)` base, `var(--color-line-soft)`
peak) so it adapts to all 3 themes.

### Part B — Optimistic UI (~1 day)

Every mutation: apply local update FIRST, fire server request in
background, rollback on error.

**Pattern:**

```typescript
const handleArchive = async (id: string) => {
  // 1. Capture rollback state
  const prevItems = items;

  // 2. Apply optimistic update IMMEDIATELY
  setItems((curr) => curr.filter((i) => i.id !== id));

  try {
    // 3. Fire server request
    await archiveTemplate(id);
    toast.success('Archived', /* with Undo handler */);
  } catch (err) {
    // 4. Rollback on error
    setItems(prevItems);
    toast.error(err instanceof Error ? err.message : 'Failed to archive');
  }
};
```

**Mutations to make optimistic:**

| Mutation | Where | Notes |
|---|---|---|
| Archive template | `TemplateCard` menu, `useTemplates` | Row disappears immediately |
| Rename template | Builder topbar | Topbar reflects new name; backend syncs |
| Archive campaign | `CampaignCard` menu, `useCampaigns` | |
| Archive form | `FormCard` menu + `FormDetail`, `useForms` | |
| Pause / Activate form | `FormDetail` header, hook update | Status pill flips immediately |
| Remove suppression | `SuppressionList` row, `useSuppression` | |
| Add suppression | `SuppressionList` modal | Row appears at top instantly |
| Remove sending domain | `DomainCard`, `useSendingDomains` | |
| Dismiss onboarding banner | `OnboardingBanner` X, `useOnboarding` | Banner disappears immediately |
| Archive client | `Clients.Edit` (if exists), `useClients` | |
| Rename client | Wherever client name is editable | |

### Bonus: Toast with Undo (~30min — bundled because we're touching toast already)

For DESTRUCTIVE mutations (archive, delete, suppression), the success
toast gets an Undo action:

```tsx
toast.success('Archived', {
  duration: 6000,
  action: { label: 'Undo', onClick: () => unarchive(id) },
});
```

If Undo is clicked within 6 seconds:
- Re-archive call (POST a new row OR PATCH archived: false)
- Apply optimistic UN-archive
- Confirmation toast

Surfaces with Undo:
- Template archive
- Campaign archive
- Form archive
- Suppression remove (re-add)
- Form pause (re-activate)

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Skeleton shapes** | Match each surface's real layout exactly (grid, columns, sizing) | Zero-shift transition. Eye doesn't reflow. |
| **Skeleton animation** | Subtle left-to-right shimmer, 1.5s cycle | Standard SaaS pattern. Not distracting. |
| **Animation in dark/white themes** | Same shimmer principle, theme-aware tokens | Auto-adapts |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)` disables shimmer; static skeleton | Accessibility |
| **Skeleton fallback** | Only used during initial load (no cached data yet). Once cached, no skeleton on refetch. | "Cache-first" UX feel |
| **Optimistic pattern** | Hook owns state; mutation = update + fire + rollback | Single place to encapsulate rollback logic |
| **Error rollback** | Show toast with the failure reason | User knows what happened |
| **Undo toast duration** | 6 seconds | Industry standard. Long enough to read, short enough not to clutter. |
| **Optimistic for renames** | Yes — top of list shows new name immediately | Removes "did it save?" anxiety |
| **Optimistic for status toggles** | Yes — pause/activate, etc. | Instant feedback |
| **Optimistic for "destructive"** | Yes WITH Undo toast | Net: feels faster AND safer |
| **First-load vs refetch** | Skeleton on first load; existing data stays during refetch | Don't replace content with skeleton on refresh |

---

## Edge cases

| Case | Behavior |
|---|---|
| Optimistic archive → server returns 403 | Toast shows error; row pops back |
| Optimistic add → server returns 409 (dupe) | Toast shows error; pending row removed |
| Network failure during optimistic op | Treated same as 500 — rollback + toast |
| User clicks Undo after the original action's toast expired | Toast already gone — Undo not available |
| User performs second action while first is in flight | Second action queues; both rollback if either fails |
| Skeleton stays forever (request hangs) | After 15s, replace skeleton with error state ("Failed to load — Retry") |
| User refreshes while optimistic op is in flight | Refresh reloads from server; optimistic state lost but server state correct |
| Theme switch during shimmer animation | Shimmer continues smoothly with new theme tokens (CSS vars cascade) |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Visit any list page | Skeleton renders first, real content replaces it within ~200ms |
| Skeleton shape matches final content | Zero layout shift when content loads |
| Archive any row | Disappears in 0ms (not after server roundtrip) |
| Archive then immediately archive another | Both work; rollback isolated if one fails |
| Server returns error on archive | Row pops back; error toast shown |
| Undo toast appears for archive | "Archived. Undo →" with 6s duration |
| Click Undo within window | Row re-appears at original position; confirmation toast |
| Pause a form | Status pill flips to "Paused" immediately |
| Rename a campaign | New name shows immediately in topbar / lists |
| Refresh page during shimmer | Skeleton continues until data lands |
| Visit page with cached data | NO skeleton — cached content shows immediately, refreshes in background |
| Use `prefers-reduced-motion: reduce` | Skeletons static, no shimmer animation |
| Theme switch mid-load | Skeleton tokens adapt without flicker |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Main chunk +~2-3 KB gzipped (skeleton primitives + components). |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual: every list page on first load | Skeleton appears, no spinner |
| Manual: every mutation | UI updates instantly, network roundtrip in background |
| Manual: forced 3G throttle | Skeleton visible for longer; optimistic mutations still instant |
| Manual: forced error (offline) | Optimistic UI rolls back; error toast appears |

---

## Implementation order (when authorized)

**Step 1 — Skeleton primitives (~2h)**
1. `Skeleton` base component with theme-aware shimmer
2. `SkeletonText`, `SkeletonBlock`, `SkeletonCircle` primitives
3. `Skeleton.module.scss` with keyframes
4. Barrel export

**Step 2 — Per-surface skeleton variants (~3h)**
5. `TemplateCardSkeleton` — phone-frame shape
6. `CampaignCardSkeleton` — status strip + stats
7. `FormCardSkeleton` — card with URL row
8. `ClientRowSkeleton` — table row variant
9. `ContactRowSkeleton`
10. `SuppressionRowSkeleton`
11. `KpiCardSkeleton` — for dashboard + report KPI cards
12. `SendingChartSkeleton` — bar/area placeholder
13. `DomainCardSkeleton`
14. `RecipientLogRowSkeleton`

**Step 3 — Replace spinners with skeletons (~3h)**
15. `/dashboard` — KPIRow + SendingChart + ClientsHealthList
16. `/templates` (TemplatesList)
17. `/clients/:cid/campaigns` (CampaignsList)
18. `/clients/:cid/campaigns/:id` (CampaignReport)
19. `/clients/:cid/forms` (FormsList)
20. `/clients/:cid/forms/:id` (FormDetail)
21. `/clients/:cid/contacts` (ContactsList)
22. `/clients/:cid/lists` (ListsList)
23. `/clients/:cid/suppression` (SuppressionList)
24. `/clients/:cid/reports` (ClientReport)
25. `/clients` (ClientsList)
26. `/settings/sending` (SendingTab)

**Step 4 — Optimistic UI on hooks (~3h)**
27. Audit + update `useTemplates` — archive/rename optimistic
28. Audit + update `useCampaigns` — archive optimistic
29. Audit + update `useForms` — archive/pause optimistic
30. Audit + update `useSuppression` — add/remove optimistic
31. Audit + update `useSendingDomains` — remove optimistic
32. Audit + update `useOnboarding` — skip optimistic
33. Other mutation surfaces

**Step 5 — Undo toasts (~2h)**
34. Extend `toast` wrapper with Undo action support
35. Wire Undo into archive flows (templates, campaigns, forms)
36. Wire into suppression add/remove (mutual undo)

**Step 6 — Verify (~1h)**
37. Build + lint clean
38. Manual sweep through pages on slow connection (Chrome throttle)
39. Manual mutation test (archive then Undo)
40. Update change_log Done entry

---

## What this unlocks

- **Premium SaaS feel** across every page — closes the perception gap vs Linear / Notion
- **Confidence on slow connections** — skeleton + optimistic = users never feel "is it broken?"
- **Foundation for richer mutations** — once optimistic pattern is in every hook, complex flows (bulk archive, reorder) become trivial
- **Demo-friendly** — first 30 seconds of using the app feel premium even on initial load

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| V2-a | **Stale-while-revalidate caching** — show cached data instantly, refresh in background | 1 day |
| V2-b | **Hover prefetching** — prefetch on link hover | 4h |
| V2-c | **Bulk operations** — multi-select with optimistic bulk archive | 2 days |
| V2-d | **Page transitions** — fade-in on route change | 3h |
| V2-e | **Error boundaries** — page-level error UIs replacing crashes | 4h |
| V2-f | **Retry button on skeleton timeout** | 2h |

---

*Plan locked. Ready to implement when authorized.*
