# Bug: useLists stuck on stale `'loading'` state — change log

> A nasty UX bug where any page using `useLists` would sometimes render only
> a loading spinner indefinitely. Reproducible after navigating away from
> a list-using page during the initial fetch, or any time React 19
> StrictMode double-invocation hit the hook.
>
> Surfaces affected (all `useLists` consumers):
> - `/clients/:cid/lists` — entire page stuck on spinner
> - `/clients/:cid/contacts` — list-filter tabs in the toolbar never render
> - `/clients/:cid/contacts/import` — step 2 ("Add to list") stuck on spinner
>
> Affected component / hook: [src/hooks/useLists.ts](../../src/hooks/useLists.ts)
> Related: [src/store/slices/listsSlice.ts](../../src/store/slices/listsSlice.ts)

---

## Symptoms

- User opens a page that uses `useLists`. The list dropdown / table /
  filter shows only a loading spinner.
- Spinner never resolves. No console errors. Network tab shows the
  `GET /v1/clients/:cid/lists` request did complete with a 200 + valid JSON
  body — the data simply never made it into Redux.
- Hard refresh sometimes fixes it (when the prior cancelled state gets
  cleared on full reload). Often doesn't, because the next mount can
  cancel itself again before the fetch resolves.
- Especially common on deep-link navigation, on the second visit to a
  list-using page, and in dev mode (React 19 StrictMode's intentional
  double-invocation hits the cleanup-cancel path twice).

## Root cause

The hook used a classic **effect cleanup-cancellation pattern** combined
with a **bail-on-`'loading'`** guard. They interacted badly.

```ts
useEffect(() => {
  if (!clientId) return;
  const slice = store.getState().lists;
  if (slice.clientId === clientId && (slice.status === 'loaded' || slice.status === 'loading')) {
    return;     // ← bug source: bailed on stale 'loading' too
  }
  let cancelled = false;
  dispatch(setLoading({ clientId }));
  listLists(clientId)
    .then((res) => { if (!cancelled) dispatch(setLists(res.data.items)); })
    .catch((err) => { /* same cancelled check */ });
  return () => { cancelled = true; };
}, [clientId, dispatch, store]);
```

The bug sequence:

1. **Mount 1** of any list-using component. `slice.status === 'idle'`,
   guard misses, effect proceeds.
2. `dispatch(setLoading)` sets `slice.status = 'loading'`.
3. `listLists()` API call kicks off.
4. **Component unmounts** before the API resolves (router nav,
   modal close re-render, StrictMode dev double-mount). Cleanup runs:
   `cancelled = true`.
5. API call resolves. `.then(...)` checks `cancelled`, sees `true`,
   **skips `dispatch(setLists(...))` entirely.**
6. Slice is now permanently frozen at `status: 'loading'` with no items.
   No further work is queued.
7. **Mount 2** of any list-using component. The guard reads
   `slice.status === 'loading'` and **bails** — refusing to refetch
   because "there's a fetch in flight." But there isn't; the old fetch
   was cancelled and never dispatched.
8. Spinner. Forever.

The `'loading'` half of the bail condition was the trap. It assumed
`'loading'` means "an in-flight request will eventually update the
slice" — but cleanup-cancellation makes that assumption false.

## Fix

[src/hooks/useLists.ts](../../src/hooks/useLists.ts) — drop `'loading'`
from the bail condition. Bail ONLY when we actually have data:

```ts
useEffect(() => {
  if (!clientId) return;
  const slice = store.getState().lists;
  if (slice.clientId === clientId && slice.status === 'loaded') {
    return;     // only skip when we already have data
  }
  let cancelled = false;
  dispatch(setLoading({ clientId }));
  listLists(clientId)
    .then((res) => { if (!cancelled) dispatch(setLists(res.data.items)); })
    .catch(...);
  return () => { cancelled = true; };
}, [clientId, dispatch, store]);
```

Now any non-`'loaded'` status (`idle` / `loading` / `error`) triggers a
fresh fetch on mount. The mount that finds stale `'loading'` will refire
the request itself and dispatch the result — **self-healing.**

## Why this is safe

**Worst case**: two list-using components mount simultaneously and both
fire identical `GET /v1/clients/:cid/lists` requests. The slice gets
updated twice with the same data. Cheap and harmless. The previous
behavior — permanently stuck spinner — was strictly worse.

If we ever need stricter dedup (e.g. when an agency has 50+ lists and
the round-trip is non-trivial), a module-level in-flight token would
collapse concurrent requests to one. Not worth it for V1.

## Other hooks audited

While investigating, checked every hook with a cleanup-cancel pattern OR
a status-based bail guard for the same trap:

| Hook | Has cleanup-cancel? | Has bail guard? | Vulnerable? |
|---|---|---|---|
| `useLists` ([src/hooks/useLists.ts](../../src/hooks/useLists.ts)) | ✅ | ✅ (bailed on `loaded` + `loading`) | **YES — fixed in this change** |
| `useContacts` ([src/hooks/useContacts.ts](../../src/hooks/useContacts.ts)) | ✅ | ❌ no bail; re-fetches on every dep change (clientId/page/search/filters) | No — any remount triggers a fresh fetch |
| `useClientsBootstrap` ([src/hooks/useClientsBootstrap.ts](../../src/hooks/useClientsBootstrap.ts)) | ❌ no cleanup function | ✅ bails on `clientsStatus !== 'idle'` | No — in-flight fetch always dispatches; can never be "cancelled mid-flight" |
| `useBootstrapAuth` ([src/hooks/useBootstrapAuth.ts](../../src/hooks/useBootstrapAuth.ts)) | ❌ | N/A | No |

The vulnerability requires **both** a cleanup-cancel that silently
swallows the in-flight result AND a bail guard that treats `loading`
as "no work needed." Only `useLists` had both.

## Verify

- Reload `/clients/:cid/lists` 10+ times in a row, navigating away
  during the spinner each time — table renders cleanly on every reload.
- Open the contacts `/clients/:cid/contacts/import` page repeatedly,
  closing it (Esc / Back) before step 2 renders — Add-to-list dropdown
  no longer hangs on the next visit.
- Build: `npm run build` clean. Lint: 0 new issues.

## Files touched

- `src/hooks/useLists.ts` — one-line bail-condition change + updated
  comment explaining the self-healing rationale.
- `tasks/bug-list_loading_bug/change_log.md` *(new — this file)* — full
  triage note + audit table.

---

## Changes (newest first)

### 2026-06-03 · ✅ Done — bail-on-`'loaded'`-only fix shipped

Single-line change to `useLists`. No schema migration, no new deps, no
API changes. End-to-end behavior verified across all three affected
surfaces. Other hooks audited for the same pattern — none vulnerable.
