# State — Redux slices, server cache, and the active-client model

> 🧠 The answer to "where does *this* piece of data live?" — for every piece.

## 1. Mental model — four places state can live

Pick the *highest* one that fits. State sliding "downward" from URL → store → server → localStorage is a smell.

| Tier | Where | Use for | Lives across |
|---|---|---|---|
| 1 | **URL** (route params + query) | Anything a user might bookmark, share, or refresh into: active-client id, active tab, filter state, pagination cursor, modal open/closed when it represents a navigable view. | Page reload ✅, sharing ✅ |
| 2 | **Redux store** | Client-side app state derived/cached for the running session: current user profile, agency, list of clients (for switcher), in-progress editor tree, draft form values, optimistic flags, undo history. | Page reload ❌ — must rehydrate from URL + server + localStorage |
| 3 | **Server cache** (RTK Query) | The authoritative list/detail data for every backend resource. Cached by (endpoint, params), invalidated by tags. Never duplicate this into a Redux slice. | Page reload ❌ — refetches; freshness controlled by `keepUnusedDataFor` |
| 4 | **localStorage** | Only: the JWT, integration credentials (per [integrations/credentials.ts](../../src/integrations/credentials.ts) precedent), and a few user-prefs (sidebar collapsed, last-visited client). Nothing else. Cleared on logout. | Page reload ✅, but device-only |

**Rule**: if it can live in the URL, it lives in the URL. If it can be a server cache entry, it lives there. Redux is for genuinely client-only ephemera.

## 2. Slice map (V1)

The store already has `editor`, `app`, `integrations` (per [src/store/index.ts](../../src/store/index.ts)). V1 adds the slices below. Each slice owns one concern; cross-slice reads go through selectors, never direct state access.

| Slice | What it owns | What it does NOT own |
|---|---|---|
| `auth` *(new)* | Current user (`id`, `email`, `name`, `role`), session status (`'anonymous' \| 'verifying' \| 'authed' \| 'expired'`), the agency profile (id, name, country, plan, trial state). | The JWT itself (localStorage). Any list of *other* users (that's `team` via server cache). |
| `clients` *(new)* | The lightweight client list used by the **top-bar switcher and sidebar** (id, name, avatar gradient, deliverability score, status), the `activeClientId` selector input, last-visited client id. | Full client detail (server cache). Per-client contacts/campaigns/etc (each is their own server cache). |
| `editor` (existing) | The MJML tree, selection, undo history, subject, draft id. | Compiled HTML (server cache). |
| `app` (existing) | The view switch (`'editor' \| 'integrations'`) — extend with global UI state: command-palette open, global toast queue, sidebar collapsed. | Anything route-specific. |
| `integrations` (existing) | Connection *metadata* (which platforms are connected, last sync timestamps). | Credentials (localStorage). Full sync history (server cache). |
| `onboarding` *(new)* | The 4-step checklist progress for the **current agency** — derived from server state but cached so the FTUX shell renders instantly. | Per-feature setup state (each feature owns its own readiness check). |
| `billing` *(new)* | Current plan, trial countdown, billing alerts (the things the top-bar trial banner needs). | Invoice history (server cache). Payment method details (server, never client). |
| `notifications` *(new)* | In-app toast queue, the slide-out activity log. | Per-feature notification preferences (server cache). |

**Server cache (RTK Query) slices** — one API per top-level resource, all auto-generated:
`agenciesApi · clientsApi · contactsApi · listsApi · templatesApi · campaignsApi · flowsApi · formsApi · reportsApi · teamApi · integrationsApi · billingApi · domainsApi`.

Each follows [api-conventions.md](./api-conventions.md) and uses cache tags (`Client`, `Contact`, `Campaign`, etc.) so mutations invalidate the right reads.

## 3. The active-client model (the cross-cutting concern)

The "currently selected client" is needed by **Contacts, Templates, Campaigns, Flows, Forms, Reports, Domain, and the sidebar nav**. Three rules:

1. **The URL is the source of truth.** `:clientId` in the path is *the* value. If you ever read `state.clients.activeId` and it disagrees with the URL, the URL wins — always.
2. **A single hook reads it.** `useActiveClient()` → `{ id, name, avatar, score, ...rest }`. It joins `useParams().clientId` with the server-cached client from `clientsApi.getClient(id)`. Components never read `:clientId` from the URL directly.
3. **A single side-effect writes it.** A small `<ActiveClientSync>` component, mounted once near the router root, watches `:clientId` and dispatches `clients/setActive(id)` to keep the store mirror in sync (for the sidebar nav and switcher, which render outside the route subtree).

When the user **switches client** via the top-bar dropdown, the dropdown calls `router.push('/clients/:newId/contacts')` (or the closest equivalent of the current screen) — it never just dispatches a Redux action.

When the user **switches agency**, the JWT changes → app re-bootstraps from `/dashboard` and the entire client list reloads.

## 4. localStorage — the only three things in it

```
localStorage['sendmymail_jwt']          → string (the auth token)
localStorage['sendmymail_integrations'] → JSON map of { platformId → credentials }
localStorage['sendmymail_prefs']        → JSON { sidebarCollapsed, lastClientId, theme? }
```

All three are namespaced with the `sendmymail_` prefix. On logout, **all three are cleared.** Anything that needs to persist across logouts goes server-side.

## 5. Optimistic updates — when to use them

Use optimistic updates (RTK Query's `onQueryStarted` pattern) for actions where the user expects an instant response and rollback-on-failure is acceptable:

- Renaming a list, contact, template
- Toggling subscription / tags on a contact
- Reordering blocks in the email builder (already implemented)
- Marking a flow active / paused

**Don't** be optimistic for:
- Sending a campaign / test send (must wait for server confirmation — the user wants to *know* it sent)
- Connecting an integration (waits on credential test)
- Domain DNS verification (server-side check, takes seconds)
- Anything that touches money (`billing`)

## 6. Snapshot of the V1 store shape

```ts
RootState = {
  auth:          { status, user, agency }
  clients:       { switcher: Client[], activeId: string | null, lastVisitedId: string | null }
  editor:        { tree, selectedId, hoveredId, history, subject, draftId, ... }   // existing
  app:           { view, commandPaletteOpen, sidebarCollapsed, toasts: Toast[] }
  integrations:  { connections: Record<platformId, ConnectionMeta> }                // existing
  onboarding:    { checklist: Step[], dismissedUntil: ISODate | null }
  billing:       { plan, trialEndsAt, dueAlert: BillingAlert | null }
  notifications: { activity: Activity[], unread: number }

  // server cache (RTK Query auto-generated)
  agenciesApi: { ... }
  clientsApi:  { ... }
  contactsApi: { ... }
  listsApi:    { ... }
  templatesApi:{ ... }
  campaignsApi:{ ... }
  flowsApi:    { ... }
  formsApi:    { ... }
  reportsApi:  { ... }
  teamApi:     { ... }
  integrationsApi: { ... }
  billingApi:  { ... }
  domainsApi:  { ... }
}
```

## 7. Things explicitly *not* in Redux

- **Form input values** — local component state until submit; if multi-step, the wizard owns its own draft and persists via the relevant API on `next`.
- **Hover / focus / open-or-closed for tooltips, popovers, dropdowns** — local component state.
- **Lists fetched from the server** — server cache (RTK Query), never a slice.
- **The compiled HTML preview of an email** — server cache, keyed by tree hash.

If you find yourself reaching for `useAppDispatch` to set a UI flag that only one component cares about, that's a smell — `useState` is the right tool.
