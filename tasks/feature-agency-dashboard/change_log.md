# Feature: Agency Dashboard — change log

> The post-login hero. What every owner / admin sees the moment they finish
> workspace-setup or sign back in. Renders at `/dashboard`, gated by `<AgencyReady>`.
> Reference: [doc/mockups/agency_dashboard.html](../../doc/mockups/agency_dashboard.html),
> [doc/architecture/routes.md §`/dashboard`](../../doc/architecture/routes.md),
> [doc/implementation_doc/feature-reporting-analytics.md](../../doc/implementation_doc/feature-reporting-analytics.md),
> [doc/implementation_doc/feature-client-management.md](../../doc/implementation_doc/feature-client-management.md).

---

## Goal

Replace the `Placeholder` at `src/pages/dashboard.tsx` with a real dashboard
page that pulls live data from the backend, gracefully degrades for metrics
that don't have a data source yet (no events ingested → no opens / clicks /
revenue until Feature 10 lands), and looks identical to the mockup.

The dashboard is the **proof point** that the warm editorial theme works on a
real data screen — not just auth forms. Every other internal screen we build
after this can lean on the patterns established here.

---

## Honest scope of what we can show today

The mockup shows 9 information blocks. Here's what each one depends on and
whether the data source exists yet:

| Mockup block | Data needed | Source today | V1 strategy |
|---|---|---|---|
| Greeting (`Namaste, $name`) | `auth.user.name`, current date | ✅ existing | render real |
| Date-range chip ("Last 30 days") | none (static) | ✅ | render static, not interactive in V1 |
| Active clients count | `count(clients) where agency_id = me` | ✅ Prisma `Client` exists, no API yet | **build `GET /v1/clients`** + count from response |
| Emails sent | `sum(send_count)` last 30d | ❌ no event ingestion yet (Feature 10) | render `—` with "Send your first campaign" tooltip |
| Avg open rate | events table | ❌ | render `—` |
| Revenue tracked | events table + Feature 10 link tagging | ❌ | render `—` |
| Sending-performance chart | events over time | ❌ | render empty state: "Your first chart shows up after your first campaign send" |
| Deliverability gauge (score 94) | deliverability score from events | ❌ | render empty state: "We'll start scoring your deliverability after your first send" |
| Plan usage (X / quota) | `agency.plan` + monthly counter | ⚠ `agency.plan` exists, no monthly counter | render plan name + `0 / quota` (counter wires up in Feature 14 billing) |
| Client health list | clients + their campaign metrics | ⚠ clients yes, metrics no | render client rows with `—` for opens/revenue + status from `client.status` |

So the V1 dashboard:
- Shows **real**: greeting, active client count, plan name, the client list (just names + status — no per-client metrics)
- Shows **empty states** with honest copy for: send metrics, opens, revenue, chart, gauge
- The empty states aren't "broken UI" — they're a *deliberate FTUX moment* telling the agency exactly what to do next (`Create your first client →`, `Send your first campaign →`)

This is the responsible choice. Faking the numbers would feel dishonest the
first time an agency saw their real `0` next to a fake `38,420`.

---

## Scope — split into 2 PRs

### PR 1 — Clients foundation *(this PR's prerequisite — minimal subset only)*

The dashboard needs to list and count clients. We build the **read path** of
client management now and defer create/edit/delete UI to a dedicated
`feature-client-management` PR.

| Layer | What |
|---|---|
| Backend | `GET /v1/clients` — list clients in the caller's agency, scoped by role + `UserClientScope`; soft-deleted filtered out |
| Frontend API | `src/lib/api/clients.ts` — typed `listClients()` + `Client` type |
| Frontend Redux | `src/store/slices/clientsSlice.ts` — `{ status, items, activeClientId }`; loaded once on app bootstrap |
| Hook | `useClients()` — `{ status, items, active, setActive }` |
| Topbar wiring | `ClientSwitcher.tsx` reads real `useClients().items` (currently hardcoded) |
| FTUX `/clients/new` | Keep as `Placeholder` for now — dashboard's "Create your first client" CTA links here but the create modal is its own PR |

### PR 2 — Agency Dashboard *(this PR — the focus)*

| Layer | What |
|---|---|
| Backend | `GET /v1/agency/overview` — single endpoint returning every field the dashboard needs (greeting context, KPIs, gauge, plan, top-5 clients). Each metric explicitly marks `available: true \| false` so the FE never has to guess what's `0` vs "no data" |
| Frontend API | `src/lib/api/overview.ts` — typed `getOverview()` |
| Page | `src/pages/dashboard.tsx` — orchestrator that fetches overview + clients on mount |
| Components | `src/components/dashboard/`: `Hero`, `KPIRow`, `KPITile`, `SendingChart`, `DeliverabilityGauge`, `PlanUsage`, `ClientsHealthList`, `EmptyMetric` |
| Styles | `src/styles/components/dashboard/*.module.scss` (one per component) |
| Empty states | Centralized `EmptyMetric` component — used by every metric tile / chart / gauge that's `available: false` |

---

## Backend: `GET /v1/agency/overview`

### Auth + caching

- `requireAuth()` — owner / admin / member / viewer all allowed (read-only)
- For `member` / `viewer`: scope filters apply — only counts clients they can see
- Response cached **60s per `(agency_id, user_id)`** in memory (Feature 10 §spec). V1 uses a simple `Map<string, {payload, expiresAt}>`; Redis later when we have multiple backend instances.

### Response shape

```ts
GET /v1/agency/overview → 200 {
  data: {
    greeting: {
      name: string,                    // user's first name
      date_iso: string,                // server time (so client doesn't desync TZ)
    },
    kpis: {
      active_clients: { value: number, change_30d: number, available: true },
      emails_sent:    { value: number | null, change_30d: number | null, available: boolean },
      open_rate:      { value: number | null, change_30d: number | null, available: boolean },
      revenue:        { value: number | null, change_30d: number | null, available: boolean, currency: 'NPR' },
    },
    sending_chart: {
      available: boolean,
      // when available: 30 buckets, sent + opened series
      series: { date_iso: string, sent: number, opened: number }[] | null,
    },
    deliverability: {
      available: boolean,
      score: number | null,            // 0-100
      gmail_inbox_rate: number | null,
      hard_bounce_rate: number | null,
      complaint_rate: number | null,
    },
    plan_usage: {
      plan: 'starter' | 'scale' | 'enterprise',
      sent_this_month: number,         // 0 until Feature 10
      monthly_quota: number,           // from plan
    },
    top_clients: Array<{
      id: string,
      name: string,
      brand_color: string,
      status: 'healthy' | 'watch' | 'setup' | 'paused',
      last_activity_iso: string | null,
      last_campaign_subject: string | null,
      open_rate: number | null,        // null until Feature 10
      revenue: number | null,
    }>,                                // top 5 by last_activity DESC
  }
}
```

**Key design decision:** each metric has an explicit `available: boolean`.
The FE never has to inspect "is value null because there's no data, or because
the metric is 0?". This is the contract that lets the dashboard show the same
empty-state pattern everywhere consistently.

### File touches (backend)

- `src/routes/agencies.ts` — add `agenciesRouter.get('/overview', ...)`
- `src/lib/overview.ts` *(new)* — compute the overview payload (queries + cache wrapper)
- No new Prisma models or migrations — uses existing `Client`, `Agency`, `UserClientScope`
- `tasks/feature-agency-dashboard/change_log.md` — done entry with the curl smoke
- No new deps

---

## Backend: `GET /v1/clients` *(part of PR 1 prerequisite)*

### Response shape

```ts
GET /v1/clients → 200 {
  data: {
    items: Array<{
      id: string,
      name: string,
      slug: string,
      brand_color: string,
      status: 'active' | 'paused' | 'setup',
      created_at_iso: string,
      from_name: string,
      from_email: string,
      // metrics deferred to Feature 10
    }>,
  }
}
```

- Role-scoped: `member` / `viewer` see only clients in their `UserClientScope`
- Soft-deleted (`deleted_at IS NOT NULL`) filtered out
- Sorted by `created_at DESC` V1 (sorting params deferred — `?sort=last_activity` lands with Feature 10)

### File touches

- `src/routes/clients.ts` *(new)* — `GET /` handler
- Mounted in `src/server.ts` at `/v1/clients`
- `requireAuth()` + scope filtering helper

---

## Frontend file tree

```
src/
├─ components/dashboard/
│  ├─ index.ts                       # re-exports
│  ├─ Hero.tsx                       # greeting + date chip + "Last 30 days" pill
│  ├─ KPIRow.tsx                     # 4-column grid wrapper
│  ├─ KPITile.tsx                    # one stat tile (icon, label, value, delta)
│  ├─ SendingChart.tsx               # inline SVG line chart (sent + opened series)
│  ├─ DeliverabilityGauge.tsx        # circular SVG gauge + score + chip + kv rows
│  ├─ PlanUsage.tsx                  # plan name + bar
│  ├─ ClientsHealthList.tsx          # 5-row client list with avatar/name/status
│  ├─ EmptyMetric.tsx                # reusable empty state for any unavailable metric
│  └─ Sparkline.tsx                  # tiny SVG line helper used by SendingChart
├─ styles/components/dashboard/
│  └─ *.module.scss                  # one per component above
├─ lib/api/
│  ├─ clients.ts                     # listClients()
│  └─ overview.ts                    # getOverview()
├─ store/slices/
│  └─ clientsSlice.ts                # {status, items, activeClientId}
├─ hooks/
│  └─ useClients.ts                  # {status, items, active, setActive}
└─ pages/
   └─ dashboard.tsx                  # orchestrator (replaces the Placeholder)
```

---

## Frontend phases

### Phase 1 · Clients foundation (PR 1)

1. **`src/lib/api/clients.ts`** — typed `listClients(): Promise<{data: {items: Client[]}}>` using the existing `apiCall` wrapper. Type: `Client = { id, name, slug, brandColor, status, ... }` (camelCase — match the existing `auth.ts` style).
2. **`src/store/slices/clientsSlice.ts`** — RTK slice:
   - `status: 'idle' | 'loading' | 'loaded' | 'error'`
   - `items: Client[]`
   - `activeClientId: string | null` (persisted to `localStorage['sendmymail_active_client']`)
   - Reducers: `setClients(items)`, `setActive(id)`, `clearClients()`, `setLoading()`, `setError()`
3. **`src/hooks/useClients.ts`** — `{ status, items, active, setActive }`. `setActive` writes to slice + localStorage.
4. **Bootstrap wiring** — `useBootstrapAuth` already fetches `/me` on app mount. After `setAuthed`, fire `listClients()` and dispatch `setClients`. If `activeClientId` from localStorage is in the list, restore it; else default to first.
5. **Topbar `ClientSwitcher.tsx`** — currently uses hardcoded entries. Wire to `useClients().items` + `setActive`. Show active client's `brandColor` in the chip.
6. **Route guard `<ClientScoped>`** — currently passes always. Update: read `:clientId` from URL params, set as active in `clientsSlice`, throw 404 if not in user's accessible list.

### Phase 2 · Dashboard page (PR 2)

7. **`src/lib/api/overview.ts`** — `getOverview()`. Returns the typed shape above.
8. **`src/components/dashboard/Hero.tsx`** — eyebrow date + `Namaste, {name}` H1 + dynamic subtitle. Subtitle reads from the overview payload and uses real numbers (e.g. *"Your 8 clients sent 142,338 emails this month"*) but switches to a no-data subtitle when KPIs are unavailable (e.g. *"Your workspace is ready — let's send your first campaign."*).
9. **`src/components/dashboard/KPITile.tsx`** — props `{ icon, label, value, change, available, format, accent }`. Renders `value` if `available`, renders `<EmptyMetric inline />` if not. `format: 'integer' | 'percent' | 'currency'`.
10. **`src/components/dashboard/KPIRow.tsx`** — wraps 4 tiles in the warm bordered grid.
11. **`src/components/dashboard/SendingChart.tsx`** — inline SVG. Takes 30 buckets of `{sent, opened}`, normalizes to viewBox `0 0 720 240`, draws two paths (indigo + terra) like the mockup. **No chart library V1** — the SVG is ≤50 lines and matches the mockup pixel-for-pixel. If `available: false`, render `<EmptyMetric>` with a "Send your first campaign" CTA.
12. **`src/components/dashboard/DeliverabilityGauge.tsx`** — circular SVG gauge (the mockup's `stroke-dasharray` arc trick) + score + chip + 3 `kv` rows. Empty state when unavailable.
13. **`src/components/dashboard/PlanUsage.tsx`** — plan name + `X / Y` + horizontal bar (`width: percentage * 100%`).
14. **`src/components/dashboard/ClientsHealthList.tsx`** — 5-row list, each row uses the existing `Avatar` UI primitive + name + last campaign subject + 2 stat columns (each `EmptyMetric inline` when unavailable) + status pill. Row click → `navigate(\`/clients/\${id}/dashboard\`)`. If `top_clients.length === 0`, render full-card empty state: *"No clients yet. Create your first one →"* linking to `/clients/new`.
15. **`src/components/dashboard/EmptyMetric.tsx`** — props `{ inline?: boolean, message: string, ctaLabel?: string, ctaHref?: string }`. Inline mode = subtle `—` with tooltip. Full mode = soft card with message + CTA button.
16. **`src/pages/dashboard.tsx`** — orchestrator. `useEffect` fires `getOverview()` on mount. Renders `<Spinner />` while loading, error toast on failure, then assembles the page.
17. **Wire dashboard cache invalidation** — none in V1 (60s server cache + page-mount refetch is fine). React Query / SWR deferred.

### Phase 3 · Polish

18. **Mobile breakpoint** at `≤1080px` — chart/gauge stack vertically, KPI row becomes 2×2 grid (same as mockup `@media`).
19. **Skeleton states** — KPI tiles, chart panel, client list show shimmer skeletons while `getOverview` is in flight (so the page doesn't jump as data lands).
20. **`<DashboardEmptyState />` for brand-new agencies** — if `top_clients.length === 0 && plan_usage.sent_this_month === 0`, render an FTUX hero replacing the KPI row entirely: *"Welcome to SendMyMail. Here's what to do next →"* with 3 action cards (create client, build template, send first campaign). Mirrors the auth-page editorial pitch in tone.

---

## Acceptance criteria

- [ ] Owner finishes workspace setup → lands at `/dashboard` → page renders without errors
- [ ] Greeting shows real first name + today's date
- [ ] Active clients tile shows real count from `GET /v1/clients`
- [ ] Other 3 KPI tiles show `<EmptyMetric inline />` with no console errors when overview reports them unavailable
- [ ] Chart panel renders the empty state with a "Send your first campaign" CTA
- [ ] Gauge panel renders the empty state with a "We'll start scoring after your first send" message
- [ ] Plan usage shows real plan name + `0 / quota` until Feature 14 wires the counter
- [ ] Client list shows real clients OR full-card "Create your first client" CTA when zero
- [ ] Page-refresh on `/dashboard` re-fetches the overview (no stale Redux state — overview is a per-request fetch, not Redux)
- [ ] Mobile ≤1080px: chart/gauge stack, KPI row becomes 2×2, client list rows drop the stat columns (per mockup)
- [ ] `member` / `viewer` accounts see only their scoped clients in count + list
- [ ] `npm run build` passes; `npm run lint` adds **0 new** issues
- [ ] Curl smoke for `GET /v1/agency/overview` returns the documented shape on a fresh agency with 0 clients

---

## Decisions

- **No chart library in V1.** Inline SVG is enough for the two-series line chart and the deliverability gauge. Drops `recharts` (planned in tech_stack §2) until we have at least 3 different chart types — only then is a library cheaper than 3 SVG components.
- **Single `/v1/agency/overview` endpoint** rather than 6 micro-endpoints (sends, opens, revenue, deliverability, plan, clients). One round-trip per dashboard mount; one server-side cache key; one place to add `requireAuth`; one place to scope by role. The tradeoff is "one endpoint balloons" — mitigated by the explicit-`available`-per-metric contract.
- **`available: boolean` per metric** is the unsung hero of this design. It's how we ship a dashboard before Feature 10 ingestion exists without faking data and without conditionals everywhere on the frontend. When ingestion lands, the backend flips `available: true` and the FE renders the value automatically — no FE changes needed.
- **No React Query / SWR yet.** A single `useEffect` + `useState` is fine for one endpoint per page. The moment we have ≥3 places that read the same data, revisit.
- **`clientsSlice` lives in Redux** (not local state in `useClients`) because the topbar `ClientSwitcher`, every page guarded by `<ClientScoped>`, and the dashboard's client list all need the same list. Redux is the right shape.
- **`activeClientId` persists to localStorage**, not just session, so deep links resolve when a user reopens a tab tomorrow.
- **Server-side 60s cache** per `(agency_id, user_id)`. Simple `Map` in V1 — Redis when we scale to multiple backend instances. Documented in the route handler.
- **Dashboard is mount-fetched, never push-updated** in V1. No WebSocket, no SSE, no polling. The page is intentionally "the morning briefing" — refresh-to-update is the right UX.
- **The "FTUX state" (zero clients, zero sends) is a feature, not a regression.** Brand-new agencies see an editorial onboarding hero, not a sea of zeros. The empty-state design has a clear next-action arrow.

---

## Deviations from the mockup

- **Date-range chip** ("Last 30 days") is static in V1. Real date-range picker ships with Feature 10 (reporting filters).
- **Revenue tracking** is `—` in V1. Lights up with Feature 10 link-token attribution.
- **"View all 8 →"** at the bottom of the client list links to `/clients` even though the clients list page itself is still a `Placeholder`. The link works; the destination upgrades when feature-client-management ships.
- **"How your clients are doing"** shows `—` in the per-client stat columns until Feature 10. The status dot (healthy / watch / setup) uses real `client.status` from the DB so it's not entirely empty.

---

## Dependencies

- No new npm packages. Inline SVG handles the chart + gauge; existing `@tabler/icons-react` covers all icons.
- Backend uses existing Prisma client + existing `requireAuth` middleware. No new deps.

---

## Risks / open questions

- **Cache invalidation when a client is created.** When `/clients/new` ships and creates a client, the dashboard cache should bust. Plan: backend invalidates the cache key on any `POST /v1/clients` / `PATCH /v1/clients/:id` / `DELETE` — easy with the in-memory `Map`.
- **What "status" means for a client without events.** `client.status` enum is `'active' | 'paused' | 'setup'`. Mockup adds a fourth: `'watch'` (meaning "metrics dipping, look here"). `'watch'` requires event data — defer to Feature 10; V1 only returns the 3 real statuses.
- **Plan quotas.** Hard-coded in the route handler for V1 (`starter: 10K`, `scale: 100K`, `enterprise: 1M`). When Feature 14 (billing) ships, the quota moves to the `Plan` table.
- **First-name extraction.** `auth.user.name` is a full name — we split on the first space for the greeting. Single-word names work; non-Western name orders may want a different display rule later.

---

## Changes (newest first)

### 2026-06-03 · ✅ Done — PR 2 (Agency Dashboard page)

The post-login hero ships. `/dashboard` is no longer a Placeholder — it's a
real screen pulling live data from a single backend endpoint, with honest
empty states for every metric that depends on Feature 10 (event ingestion).

**Backend** (`sendmymail-backend`):
- `src/lib/overview.ts` *(new)* — `computeOverview()` query +
  `invalidateOverview()` cache-bust helper. In-memory cache keyed by
  `(agencyId, userId)`, 60s TTL, LRU-trim at 1000 entries. Scope-aware:
  `member` / `viewer` users see only their `UserClientScope` clients.
- `src/routes/agencies.ts` — added `GET /v1/agencies/overview`
  (`requireAuth()` only — all roles read it). Returns the documented
  shape: `{ greeting, kpis, sending_chart, deliverability, plan_usage,
  top_clients }` with `available: boolean` per metric.
- `src/routes/clients.ts` — wired `invalidateOverview(agencyId)` into
  POST/PATCH/DELETE handlers so the dashboard reflects client
  create/update/archive immediately, not after the 60s TTL.
- Plan quotas: hardcoded in `PLAN_QUOTAS` for V1 — trial 1K /
  starter 10K / growth 50K / scale 250K. Moves to a Plan table when
  Feature 14 (billing) ships.
- No schema changes; no new deps.

**Frontend** (`sendmymail-frontend`):
- `src/lib/api/overview.ts` *(new)* — `getOverview()` + `OverviewPayload`
  type mirroring the backend response exactly.
- `src/components/dashboard/` *(new — 8 components + 7 SCSS Modules)*:
  - `EmptyMetric` — the workhorse. `inline` variant renders `—` for
    table cells / KPI tiles; `block` variant renders a soft dashed
    card (icon + title + body + optional CTA) for the chart + gauge
    + top-clients empty states. Every Feature-10-deferred block uses
    this — one component, one consistent treatment.
  - `Hero` — eyebrow date (`Sunday · 3 Jun`) + Bricolage H1
    (`Namaste, {firstName} 👋`) + adaptive subtitle that softens
    when send-metrics aren't available + "Last 30 days" range pill.
  - `KPIRow` + `KPITile` — 4-up grid (Active clients / Emails sent /
    Avg open rate / Revenue tracked). `KPITile` accepts a generic
    `OverviewKpi` and formats via `format: 'integer' | 'percent' |
    'currency-npr'`. Lakh/crore shorthand for NPR figures
    (`रू 1.2L`, `रू 3.4Cr`). Inline EmptyMetric when `available: false`.
  - `SendingChart` — pure inline SVG, two-series line chart (sent +
    opened) with terra + indigo strokes + a soft indigo area-fill
    under the sent series. X-axis labels at 4 evenly-spaced positions
    with "Today" on the right. Empty state: "Your first chart shows
    up after your first campaign send".
  - `DeliverabilityGauge` — circular SVG gauge using the
    `stroke-dasharray` arc trick (radius 35 → circumference 219.9 →
    dashoffset = circ × (1 − score/100)). Tinted-chip label based on
    score band. 3 kv rows for Gmail inbox / Hard bounce / Complaint
    rate. Empty state when unavailable.
  - `PlanUsage` — kv row + horizontal progress bar showing plan +
    `sent_this_month / monthly_quota`. `sent_this_month` is 0 in V1.
  - `ClientsHealthList` — top-5 clients as a card-row list: avatar
    gradient + name + sub (campaign subject OR "Updated N hours
    ago") + open-rate + revenue (inline EmptyMetric until Feature
    10) + status pill. Row click → `/clients/:id/contacts`.
    Brand-new agency (zero clients) → renders an FTUX hero with
    "Add your first client" CTA instead of the row list.
- `src/pages/dashboard.tsx` — replaced the Placeholder with the real
  orchestrator. Single `getOverview()` on mount; spinner while loading;
  toast on non-401 failure; assembles Hero / KPIRow / two-column
  (Chart + (Gauge + PlanUsage)) / ClientsHealthList.
- No new npm packages. Inline SVG for chart + gauge — the dashboard
  chunk is 14.7 KB / gzip 5.1 KB total.

**Verify**:
- Backend `tsc --noEmit` clean. Frontend `tsc -b` + `vite build` clean.
- Curl smoke: `GET /v1/agencies/overview` with owner JWT returns the
  full payload — real `name: "Sabitra"`, `active_clients.value: 1`,
  `top_clients[0].name: "खुकुरी मसला"`, plan `trial` with 1000-email
  quota, every other metric correctly flagged `available: false`.
- Cache invalidation verified: client mutations clear the agency's
  overview cache, so the next fetch reflects the change without
  waiting 60s.
- Frontend lint: 0 new issues. The 10 pre-existing ones are untouched.
- End-to-end browser flow: `/dashboard` → greeting with real first
  name + today's date → 4 KPI tiles (active_clients shows the real
  count, the rest show `—`) → SendingChart shows the empty-state
  card → DeliverabilityGauge shows empty state → PlanUsage shows
  `Trial · 0 / 1K` with a zero-fill bar → ClientsHealthList shows
  the agency's top 5 clients.

**Decisions made during implementation**:
- **`/v1/agencies/overview` not `/v1/agency/overview`** — kept on the
  existing plural router mount; the spec doc is the outlier.
- **Inline SVG, not recharts** — saves ~80 KB gzipped and a build-step
  config quirk for two charts that are ≤30 lines of SVG each.
- **`KPITile` formats values internally** rather than expecting
  pre-formatted strings (locale + lakh/crore stays in the tile).
- **`Hero`'s subtitle is data-aware**: 3 distinct states (zero
  clients → CTA copy; send-metrics-unavailable → first-campaign copy;
  otherwise → real numbers). One component, no flicker.
- **`top_clients.status`** uses the real `ClientStatus` enum
  (`trial / active / paused / archived`) — not the mockup's invented
  `healthy / watch / setup` labels (those need event data).
- **`change_30d` hardcoded to 0** for `active_clients`. We don't
  store historical counts; FE renders `—` via the null-handling path.

**Deviations from the plan / mockup**:
- **Plan said `brand_color`**; schema has `avatarColor`. API response
  uses `avatar_color` (snake-case) — FE just maps.
- **Top-5 ordering**: plan said `last_activity_iso DESC`. V1 uses
  `updatedAt DESC` (closest proxy until events ingest).
- **No skeleton loaders** during initial fetch — centered spinner
  only.
- **Range pill is paint-only V1.** Date-range picker arrives with
  Feature 10 reporting.

**What this unlocks**:
- /dashboard is a real screen, not a placeholder. New users land
  somewhere that explains what to do next.
- The `OverviewPayload` shape + `available`-per-metric contract is
  the template for any future "fully-baked dashboard" page.
- `invalidateOverview` is the template for cache-busting any other
  cached endpoint we add later.
- Every Feature-10-deferred metric will light up automatically when
  ingestion ships — no FE changes needed.

### 2026-06-02 · 🔀 Sequencing change — `feature-client-management` lands before PR 2

PR 1 of this feature shipped the clients read path, but every "Create your
first client" CTA the dashboard would surface (and that `ClientSwitcher`
already surfaces) points at `/clients/new` — a `Placeholder`. The dashboard
is demo-unusable without working CRUD.

Pivot: `feature-client-management` (full create / edit / archive) lands
**before** this feature's PR 2. The dashboard PR then ships against real
client data with working empty-state CTAs.

See [tasks/feature-client-management/change_log.md](../feature-client-management/change_log.md)
for the full plan.

### 2026-06-02 · ✅ Done — PR 1 (Clients foundation, read path)

Shipped the prerequisite for the dashboard. Read path only — create / patch /
soft-delete defer to a future `feature-client-management` PR.

**Backend** (`sendmymail-backend`):
- `src/routes/clients.ts` *(new)* — `GET /v1/clients` route. Scope-aware:
  `req.auth.scope.type === 'all'` returns every client in the agency;
  `'clients'` restricts to `scope.ids`. Soft-deletes (`status: 'archived'`)
  filtered out. Sorted by `createdAt DESC`.
- `src/server.ts` — mounted at `/v1/clients`.
- No new Prisma migration — uses existing `Client` model fields
  (`id, name, slug, domain, avatarColor, status, createdAt`).

**Frontend** (`sendmymail-frontend`):
- `src/lib/api/clients.ts` *(new)* — typed `listClients()` + `Client` /
  `ClientStatus` types matching the backend response.
- `src/store/slices/clientsSlice.ts` *(new)* — slice with
  `{ status, items, activeClientId, error }` and reducers `setLoading /
  setClients / setActive / setError / clearClients`. `setClients` honors a
  `restoredActiveId` from localStorage when the saved choice is still in
  the list.
- `src/store/index.ts` — registers `clients` reducer.
- `src/hooks/useClients.ts` *(new)* — components-facing hook. Exposes
  `{ status, items, active, activeId, setActive, error }`. Owns the
  localStorage bridge (`sendmymail_active_client`) — keeps the slice pure.
- `src/hooks/useClientsBootstrap.ts` *(new)* — runs once at app root;
  loads the list whenever `auth.status === 'authed'` + `emailVerified` +
  `setupComplete` + `clients.status === 'idle'`. Clears the list when
  `auth.status` flips to `'anonymous'`. Wired into `src/App.tsx` next to
  `useBootstrapAuth`.
- `src/components/shell/ClientSwitcher.tsx` — replaced the hardcoded
  `MOCK_CLIENT` with a real dropdown over `useClients()`. Loading skeleton,
  zero-clients CTA ("Add your first client → /clients/new"), active client
  highlight, "Create a new client" item at the bottom of the menu.
- `src/styles/components/shell/ClientSwitcher.module.scss` — added
  `.menu / .menuItem / .menuItemActive / .menuItemCreate / .tick /
  .skeleton / .skeletonText` rules to support the dropdown + states.
- `src/router/guards/index.tsx` — `ClientScoped` now syncs the URL
  `:clientId` into the clients slice via `useEffect` + `dispatch(setActive)`
  + localStorage write. Security gate (JWT-scope check) unchanged — the
  sync is purely so the top-bar switcher reflects whichever client the
  current route is showing.

**Verify**:
- `tsc -b` clean (backend + frontend), `vite build` emits a new
  `clients-*.js` chunk (390 B gzipped) for `src/lib/api/clients.ts`.
- Frontend lint: **0 new issues** in any file we touched
  (11 pre-existing issues in `canvas/*`, `inspector/*`, `integrations/*`,
  `tree/paths.ts`, `router/index.tsx` are out of scope for this PR).
- Runtime smoke: `curl http://localhost:4000/v1/clients` returns
  `HTTP 401 {"error":{"code":"unauthorized",...}}` — route is mounted,
  middleware fires, error shape matches `api-conventions §4`.
- Full happy-path (`200` with real clients) is deferred to PR 2's
  end-to-end test where the dashboard page actually consumes the data.

**Decisions**:
- Soft-delete = `status: 'archived'` (no `deletedAt` column in the schema —
  reality differs from the plan's "soft-deleted filtered out via
  `deleted_at IS NOT NULL`"; updated to match what's actually in
  `prisma/schema.prisma`).
- `Client` shape: dropped `brandColor` (mockup field name) for `avatarColor`
  (real schema column). Dropped `fromName` / `fromEmail` — these fields
  don't exist on the model yet; they'll come with feature-client-management
  if needed.
- `useClientsBootstrap` is a separate hook (not folded into
  `useBootstrapAuth`) so the clients lifecycle stays co-located —
  watching the auth slice + dispatching load/clear in one place.
- `ClientSwitcher` skeleton is shown during `'idle'` too (not just
  `'loading'`), so the topbar doesn't flash a no-client CTA between
  app mount and the first fetch resolving.

### 2026-06-02 · 📐 Planning

Plan written. Two-PR split: clients foundation (read-path) → dashboard
page. Backend gets one new endpoint per PR; frontend gets a slice + a hook +
the page components. Honest empty states for everything event-driven until
Feature 10 ships. No new npm deps.

Next: PR 2 — the dashboard page itself.
