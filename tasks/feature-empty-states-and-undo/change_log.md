# Feature: Empty states + Undo toasts — change log

> Polishes the four-state lifecycle started by perceived-performance:
> **loading** (skeletons) → **empty** (illustrated panels, this PR) →
> **loaded** (cards/rows) → **mutating** (optimistic UI) →
> **undone** (toast-attached Undo action, this PR).
>
> Frontend-only. Zero backend changes.

---

## Status: ✅ Done — V1 shipped

Shipped in one pass on top of feature-perceived-performance. ~1 day of
focused work — empty state polish + wiring the `successWithUndo`
helper into the archive/remove flows.

---

## Why

After perceived-performance, two pieces remained in the lifecycle:

1. **Empty states** — every list page still showed plain "No X yet"
   when there was no data. Premium SaaS (Stripe, Vercel, Mailchimp)
   uses empty states as marketing surfaces: illustrated icon, value-
   prop copy, multiple CTAs.

2. **Toast Undo** — `successWithUndo()` helper shipped in the previous
   PR but no caller used it. This PR wires it across destructive
   actions (template + form archive, suppression remove).

Together they complete the "feel premium" loop on every surface.

---

## What landed

### Part A: Empty states polish (6 surfaces)

Pattern applied: tinted icon badge (64px circle, primary-tinted bg) +
bigger heading (`size="lg"`) + multi-sentence helpful copy + 1-2 CTAs
in a flex row. Premium SaaS pattern.

| Surface | Before | After |
|---|---|---|
| **CampaignsList** | No icon, single CTA | IconSend badge + "Send your first campaign" + 2 CTAs (New / Browse templates) |
| **FormsList** | Plain icon, single CTA | IconForms badge + "Grow lists with signup forms" + 2 CTAs (Create / Set up lists first) |
| **SuppressionList** | Plain icon, no CTA | IconAlertCircle badge + "Your do-not-mail list is empty" + "Add manually" CTA |
| **ListsList** | No icon, single CTA | IconListDetails badge + "Organize contacts into lists" + "New list" CTA |
| **FormDetail (no submissions)** | Plain icon, plain text | IconUserPlus badge + "Waiting for first signup" + "Copy URL" CTA |
| **ClientReport (no data)** | Plain icon + Pill-as-link | IconChartLine badge + "No data yet for this range" + 2 CTAs (Create campaign / Add contacts) |

CSS pattern in each module:

```scss
.emptyIconBadge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}
```

Theme-aware via tokens — adapts to Default / Dark / White automatically.

### Part B: Undo toasts wired (3 surfaces)

`successWithUndo()` from the previous PR is now used on destructive
flows. The pattern across all surfaces:

```typescript
// 1. Capture snapshot for un-action
const snapshot = items.find((x) => x.id === id);

// 2. Fire the archive (optimistic — UI already updated)
await archive(id);

// 3. Show toast with Undo button
successWithUndo(`Archived ${snapshot.name}`, () => {
  unarchive(snapshot)
    .then(() => toast.success(`Restored ${snapshot.name}`))
    .catch((err) => toast.error(err.message));
});
```

**Surfaces wired:**

| Surface | Action | Undo flow |
|---|---|---|
| **Template archive** (TemplatesList) | Modal → "Archive" confirm → row gone + Undo toast | PATCH `archived: false` re-inserts |
| **Form archive** (FormsList card kebab) | Click "Archive" → row gone + Undo toast | PATCH `archived: false, status: 'active'` re-inserts at top |
| **Suppression remove** (SuppressionList row) | Click "Remove" → row gone + Undo toast | POST add suppression with email + note re-suppresses (new id) |

**Skipped V1**: Campaign archive — no UI surface for it yet
(`useCampaigns.remove` exists but `CampaignCard` has no archive
menu). Re-visit when bulk-ops or richer card menus land.

### New hook methods

- `useTemplates.unarchive(templateId)` — optimistic flip archived back
  to false via PATCH, rollback on error
- `useForms.unarchive(form)` — re-insert at top + PATCH archived:false
  + status:'active', rollback on error

Both follow the same snapshot → optimistic update → fire API → rollback
pattern as the existing archive methods.

### Toast wrapper

No changes to `successWithUndo()` — the helper from the previous PR
was already complete. This PR is purely consumer-side wiring.

---

## Decisions during implementation

| Decision | What | Why |
|---|---|---|
| **Template archive switches from `withFormToast` to manual flow** | Archive is now optimistic; no loading state to show | Cleaner. Skip the loading toast, go straight to `successWithUndo` after `archive()` resolves. |
| **Modal closes immediately on confirm** | `setArchiveCand(null)` BEFORE the API resolves | Combined with optimistic UI, the modal disappears in 0ms and the row vanishes simultaneously. |
| **Suppression Undo creates a NEW row** | The original id is lost on delete; re-add creates a fresh suppression | Email + reason are preserved. Slight UX wart: the new suppression has a different id, so if user removes-then-undos-then-removes again, they're acting on a different row. Acceptable. |
| **Campaign archive deferred** | No UI surface to attach Undo to | The `remove` hook exists but `CampaignCard` has no archive menu. V2 when bulk-ops or richer card kebab menus land. |
| **Empty states stay inline, no new shared component** | Each surface has its own structure (different CTAs, different copy) | Sharing would force every surface through the same prop shape. Inline gives flexibility for surface-specific decorative elements. |
| **Icon badge uses primary color** | Not status colors (green/red/etc.) | Empty states are always "you could do something here" — primary action color makes sense. Status colors imply success/error semantics. |
| **64px circle, 30px icon** | Larger than the 28px we use in some other UIs | Empty states are FOCAL — they're the only thing on the page. Make the icon read. |

---

## Build + lint gates

- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.24s). Main chunk unchanged.
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**
- No backend changes; no migrations.

---

## What's NOT verified yet

**Manual sweep recommended** — visit each empty state in every theme:

1. Fresh client (no contacts) → `/clients/:cid/contacts` → polished empty state with import + manual + form CTAs
2. Fresh client → `/clients/:cid/lists` → IconListDetails + new list CTA
3. Fresh client → `/clients/:cid/campaigns` → IconSend + 2 CTAs
4. Fresh client → `/clients/:cid/forms` → IconForms + 2 CTAs
5. Suppression list with 0 rows → IconAlertCircle + add manually CTA
6. Form with 0 submissions → /clients/:cid/forms/:id → IconUserPlus + Copy URL
7. New client → /clients/:cid/reports → IconChartLine + Create campaign + Add contacts CTAs

**Undo flow:**

1. Archive a template → toast appears with "Archived X · [Undo]" for 6 sec
2. Click Undo within window → row pops back + "Restored X" confirmation
3. Let toast expire → row stays archived
4. Test same flow for form archive and suppression remove

---

## Known V1 limitations

- **Campaign archive Undo skipped** — no UI surface yet. Add when
  bulk ops or campaign card kebab menu lands.
- **Suppression Undo creates new id** — email + reason preserved but
  id changes. Acceptable for V1; would need an "undelete" endpoint
  to be perfect.
- **Inline empty states**, not a shared component — each surface
  hand-crafted. Allows surface-specific touches but means future
  changes need to be applied N times.
- **No custom SVG illustrations** — used Tabler icons in a primary-
  tinted circle. Custom branded illustrations could come later as
  pure visual polish (~1 day each).

---

## Files at a glance

**Modified — 14 files:**

Page components (8):
- `src/pages/templates/TemplatesList.tsx` — archive flow → successWithUndo
- `src/pages/forms/FormsList.tsx` — empty state polish + archive Undo
- `src/pages/forms/FormDetail.tsx` — no-submissions empty state polish
- `src/pages/campaigns/CampaignsList.tsx` — empty state polish (icon + 2 CTAs)
- `src/pages/contacts/SuppressionList.tsx` — empty state polish + remove Undo
- `src/pages/contacts/ListsList.tsx` — empty state polish (icon + CTA)
- `src/pages/clients/ClientReport.tsx` — empty state polish (2 CTAs)

Hooks (2):
- `src/hooks/useTemplates.ts` — added `unarchive` method
- `src/hooks/useForms.ts` — added `unarchive` method

SCSS modules (4):
- `src/styles/components/campaigns/CampaignsList.module.scss`
- `src/styles/components/forms/FormsList.module.scss`
- `src/styles/components/forms/FormDetail.module.scss`
- `src/styles/components/contacts/ListsList.module.scss`
- `src/styles/components/contacts/SuppressionList.module.scss`
- `src/styles/components/clients/ClientReport.module.scss`

**New — 1 file:**
- `tasks/feature-empty-states-and-undo/change_log.md` (this doc)

---

## Out of V1 (V2 follow-ups)

| PR | Title | Effort |
|---|---|---|
| V2-a | **Custom SVG illustrations** for top empty states (Templates, Campaigns, Forms) | 1 day |
| V2-b | **Campaign card kebab + archive Undo** | 4h |
| V2-c | **Bulk archive Undo** — undo multi-row archives in one toast | 6h |
| V2-d | **Empty state on dashboard** for brand-new agency | 4h |
| V2-e | **Empty state for filtered views** (e.g. "All sent campaigns" when there are draft-only) | 4h |
| V2-f | **Toast stacking polish** — when multiple toasts pile up | 3h |
| V2-g | **Undo-then-redo** — long-form undo history (V3 territory) | 1-2 days |
