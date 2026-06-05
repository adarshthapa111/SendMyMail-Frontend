# fix-saved-templates-editable

Saved templates re-opened from the templates list now load with
selectable / editable nodes. Previously, every node was loaded without
an `_id`, which silently broke selection, hover, the inspector, and
every tree mutation — making templates read-only after their first save.

## Status: ✅ Done

## The bug

Re-opening a saved template (navigate to `/clients/:cid/templates/:tid/edit`)
showed the design correctly on canvas, but clicking any block did
nothing: no selection halo, no inspector panel, no edit mode on
double-click. Effectively the entire template was read-only after the
first save — a critical regression for the templates feature.

**Reported symptom**: *"when we try to edit the saved templates then i
am not being able to edit it ?? whyy ???"*

## Root cause

The editor uses an `_id` field on every node as a stable handle for
selection (`selectedId`), hover (`hoveredId`), inline text editing
(`editingTextId`), and the `idPathCache` map that every reducer uses
to translate a UI-level node ID into the structural NodePath needed
for tree mutations.

On save, `stripForPersistence` (correctly) removes `_id` and `_meta`
from the persisted JSON — these are editor-only fields, irrelevant to
the backend's MJML compiler, and only inflate the payload.

On load, the file `src/tree/paths.ts` already exported a
purpose-built `assignFreshIds(tree)` hydration helper, with a docstring
that literally said *"Used on load: persisted JSON has no _id (stripped
on save), so we hydrate them."* But a grep confirmed it was **never
called anywhere** — dead code.

`Builder.tsx` dispatched the backend-loaded tree straight into
`loadTemplate({ tree })` without hydration:

```typescript
// src/pages/templates/Builder.tsx:45
dispatch(loadTemplate({ tree: res.data.template.mjmlSource }));
//                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                            stripped — no _id on any node
```

Inside the reducer, `buildIdPathCache` walked the tree but every node
returned `node._id === undefined`, so the cache was empty. Every
subsequent `selectNode(_id)` dispatched from a canvas click looked up
an undefined ID, found no matching path, and silently did nothing. The
inspector reads from `selectSelectedNode`, which depends on the cache;
with an empty cache, `selection` is null → inspector never appears.

This wasn't a regression I introduced — it was a pre-existing latent
bug from the templates-persistence PR (PR 2). The save-load round-trip
was never end-to-end tested with the canvas interactions.

## The fix

Two surgical edits:

| File | Change |
|---|---|
| [src/tree/paths.ts](src/tree/paths.ts) | `assignFreshIds` made **idempotent**: `_id: node._id ?? uuid()` instead of `_id: uuid()`. Nodes that already have an `_id` (the in-memory post-save tree, freshly parsed MJML imports, the initial `newTemplate()`) pass through with stable IDs. Nodes without one (backend-loaded stripped tree) get fresh UUIDs. Updated docstring. |
| [src/store/slices/editorSlice.ts](src/store/slices/editorSlice.ts) | `loadTemplate` reducer now wraps its tree argument with `assignFreshIds(...)` BEFORE assigning to `state.tree`. Every existing caller (`Builder.tsx`, `SaveTemplateButton.tsx`) benefits without changing the call sites. |

## Why the fix lives in the reducer, not the caller

Three reasons:

1. **Forget-proof.** Every future caller of `loadTemplate` is safe by
   default. Without this, the next person who adds a load path (e.g.
   "Duplicate template", "Load from preset") would hit the same trap.
2. **Single source of truth.** ID hydration is a property of *"loading
   a tree into the editor"*, not a property of *the place that fetched
   the tree*. The reducer is the load semantics.
3. **The idempotence guarantee makes it safe.** With
   `_id: node._id ?? uuid()`, calling `assignFreshIds` on a tree that
   already has IDs is a no-op (returns a new object identity but
   identical `_id` values). So `SaveTemplateButton`'s
   `dispatch(loadTemplate({ tree: hosted }))` after upload still works
   — `hosted` has IDs from the editing session, those IDs survive
   intact, and history reset / dirty clear happen as before.

## Verified call sites

| Caller | Tree shape | Hydration result |
|---|---|---|
| `Builder.tsx` (load from backend) | No `_id` on any node | All nodes get fresh UUIDs ✓ |
| `SaveTemplateButton.tsx` (after Cloudinary upload) | `_id` on every node (in-memory editing tree) | All IDs preserved ✓ |
| `ImportMjmlDialog` (via `parseMjml` then `createTemplate` then redirect to Builder) | `_id` assigned by parser (`parse.ts:156`) | Parser IDs are stripped on save, so on next load Builder.tsx gets fresh ones — correct |
| `newTemplate()` (initial state — never goes through `loadTemplate`) | `_id` from factory | Not affected by this fix |

## Edge cases

| Case | Behavior |
|---|---|
| User opens a saved template, edits, saves, edits more, saves again | Each save → loadTemplate({ hosted }) → IDs preserved → selection re-clicks needed but everything works ✓ |
| User opens template A, navigates to template B, navigates back to A | Each navigation → fetch → loadTemplate → fresh IDs assigned. `idPathCache` rebuilt. ✓ |
| User imports MJML with `_id` already in attributes (someone tried to be clever) | `_id` is hoisted out of attributes by the parser (top-level on `IMjmlNode`), not stored as an MJML attribute. If hypothetically the persisted JSON had stray `_id` values, `assignFreshIds` keeps them. |
| Undo across a save | History was already cleared by `loadTemplate` (existing behavior). No change. |
| Selection across a save | `loadTemplate` clears `state.selectedId` (existing behavior). User has to re-click. Unrelated to this fix. |

## Why this wasn't caught earlier

- Manual save flow ends with a toast and the editor still showing the
  same in-memory tree → selection works because IDs are still in memory
- Bug only manifests after navigating AWAY and BACK to the template
  (or refresh + reopen)
- No automated test exists for the save → reload → edit round trip
- The `assignFreshIds` helper looked called-from-somewhere because it
  was exported with a hopeful docstring

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (1.76s). Bundle size effectively unchanged
  (~50 bytes for the idempotence guard + reducer wrapper).
- `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Follow-ups (none blocking)

- **Add a round-trip test** for save → reload → click → verify selection
  works. Even a simple Vitest test using the in-memory store would
  catch this class of bug going forward.
- **Consider running the same hydration inside the MJML import flow**
  for defense-in-depth — currently the parser assigns IDs at parse
  time, but if a future codepath bypasses the parser (e.g. paste-as-JSON),
  the loadTemplate reducer is the safety net.
