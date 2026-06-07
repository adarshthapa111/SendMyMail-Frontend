# Feature: Reports — change log

> Connect the agency dashboard to real data. Right now the dashboard
> shell renders fine but most widgets show `available: false` because
> we had nothing to aggregate. After feature-engagement-tracking shipped,
> the data exists in Send + EmailEvent + Campaign tables — this PR runs
> the queries.
>
> Plus a per-client report page (new) so agencies can show clients
> "here's what we did for you this quarter."
>
> References:
> - [tasks/feature-engagement-tracking/change_log.md](../feature-engagement-tracking/change_log.md)
>   — produced the data this PR consumes
> - [tasks/feature-campaigns/change_log.md](../feature-campaigns/change_log.md)
>   — Send/Campaign tables we aggregate over
> - [doc/mockups/agency_dashboard.html](../../doc/mockups/agency_dashboard.html)
>   — visual reference for the dashboard layout (already implemented;
>   this PR just changes what data renders)

---

## Status: 📋 Planning

Plan locked, ready to implement. Estimated 3-5 days.

---

## Why this is next

After engagement tracking shipped, every campaign send produces:

- `Send.openCount`, `Send.clickCount`, `Send.firstOpenedAt`
- `EmailEvent` rows for every open / click

But the agency dashboard at `/dashboard` still shows:

| Widget | Current state |
|---|---|
| Active clients | ✅ Real (count from `Client` table) |
| Plan usage | ✅ Real (plan + monthly_quota; `sent_this_month` is hardcoded 0) |
| Top clients | ⚠️ Partial — names show; open rate, last campaign subject are null |
| **Emails sent KPI** | ❌ `available: false` placeholder |
| **Open rate KPI** | ❌ `available: false` placeholder |
| **Sending chart** | ❌ `available: false` placeholder |
| **Deliverability gauge** | ❌ `available: false` placeholder |
| Revenue KPI | ❌ Out of V1 (needs Shopify/Stripe integration) |

We can compute everything except revenue + deliverability from data that
already exists in Postgres. Time to run the queries.

Plus: agencies need **per-client reports** to show their clients "this
is what we did for you this quarter." Mockup for per-client report
doesn't exist yet, but the architecture supports it cleanly.

---

## Scope

### IN V1

**Backend — fill in dashboard placeholders:**

- `emails_sent` KPI — sum of `Send` rows with `status='sent'` for this
  agency, last 30 days. `change_30d` = % delta vs prior 30 days.
- `open_rate` KPI — `SUM(uniqueOpens) / SUM(sentCount)` across sent
  campaigns in the last 30 days. `change_30d` = delta vs prior 30d.
- `sending_chart` — daily series for last 30 days. For each day:
  `{ date_iso, sent, opened }`.
- `plan_usage.sent_this_month` — count of Sends with `status='sent'`
  this calendar month (from the 1st of this month UTC).
- `top_clients` enrichment — for each of the 5 top clients, surface
  `last_campaign_subject` (most recent sent campaign) and
  `open_rate` (last-30d aggregate for that client).

**Backend — new per-client report endpoint:**

- `GET /v1/clients/:clientId/report?range=30d|90d|all`
- Returns:
  - Header KPIs: total sends, open rate, click rate, list growth
    (contacts added - removed in the range)
  - Sending chart series (same shape as dashboard)
  - Top performing campaigns (top 5 by open rate, must have ≥10 sends)
  - List health: subscribed / unsubscribed / suppressed counts
- Cached 60s per (clientId, range).

**Frontend — wire dashboard widgets:**

- Dashboard widgets stop showing "—" / "Not yet available" copy where
  data exists.
- KPI cards show real numbers + the 30d delta arrow (↑ 12.5% / ↓ 4.2%).
- Sending chart renders as a real line chart (sent + opened series).
- Top clients show their last campaign subject + open rate.

**Frontend — new per-client report page:**

- Route: `/clients/:clientId/report`
- Linked from client detail page sidebar.
- Layout: hero KPIs → sending chart → top campaigns → list health.
- Date range selector: 30d (default), 90d, all-time.

### OUT V1 (deferred follow-ups)

| Item | Why deferred | When |
|---|---|---|
| **Revenue KPI** | Needs Shopify/Stripe/WooCommerce integration. Not data we have. | V3 — after billing infra exists |
| **Deliverability gauge (real)** | Needs Resend webhook ingestion for bounce + complaint events. V1 just keeps the placeholder. | V2 with webhooks |
| **Date range selector on dashboard** | Dashboard stays 30d fixed V1. Per-client report page has the picker. | V2 polish |
| **Custom date range** (vs presets) | Adds DatePicker dependency + complexity. Presets cover 95% of use cases. | V2 polish |
| **Export to PDF / CSV** | Agencies want "send this report to client". Needs PDF library or email-the-report flow. | V2 |
| **Compare two campaigns side-by-side** | Specific A/B testing use case. | V3 with A/B tests |
| **Cohort analysis** ("opens by signup-week") | Sophisticated; agencies don't ask for this V1. | V3 |
| **Heatmap day-of-week × hour** | Send time optimization. Cool but not core. | V3 |
| **Per-recipient engagement detail** | "Show me ALL emails this contact opened" — requires expanded contact detail page. | V2 with contacts deep-dive |

### Phasing options

**Phase 1 (~2 days)**: Backend aggregations + wire dashboard widgets.
Make `/dashboard` show real numbers.

**Phase 2 (~2 days)**: Per-client report endpoint + page + date range
selector.

**Default: ship as ONE PR.** The two halves share `aggregation.ts`
helpers; splitting forces duplication.

---

## Data layer

### What already exists (no new schema needed)

This is one of the rare PRs with **zero schema migration**. All data
already lives in tables created by earlier PRs:

| Table | Provides |
|---|---|
| `Send` | sentCount per campaign, openCount + clickCount aggregates, sent timestamps |
| `Campaign` | campaign metadata, totalRecipients, sentCount, failedCount |
| `Client` | client list for filtering / per-client aggregation |
| `Contact` | list growth (createdAt + deletedAt timestamps) |
| `ListContact` | subscribed / unsubscribed status counts |
| `Suppression` | suppression count |
| `EmailEvent` | individual open / click events (used for time-series chart, not aggregates) |

### What we'll compute (sample queries)

**Total sends in date range:**
```sql
SELECT COUNT(*) FROM sends
WHERE campaign_id IN (SELECT id FROM campaigns WHERE agency_id = ?)
  AND status = 'sent'
  AND sent_at >= ?
  AND sent_at <  ?
```

**Open rate in date range:**
```sql
SELECT
  SUM(CASE WHEN first_opened_at IS NOT NULL THEN 1 ELSE 0 END)::float
  / NULLIF(COUNT(*), 0) AS open_rate
FROM sends
WHERE campaign_id IN (SELECT id FROM campaigns WHERE agency_id = ?)
  AND status = 'sent'
  AND sent_at >= ?
  AND sent_at <  ?
```

**Daily sending chart (30 days):**
```sql
SELECT
  DATE_TRUNC('day', sent_at) AS day,
  COUNT(*) AS sent,
  COUNT(first_opened_at) AS opened
FROM sends
WHERE campaign_id IN (SELECT id FROM campaigns WHERE agency_id = ?)
  AND status = 'sent'
  AND sent_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day
```

All cheap on indexed columns. Postgres handles fine until ~1M sends.

---

## Backend

### New / modified files

```
src/lib/overview.ts                    (modify — replace placeholders with real queries)
src/lib/report.ts                      (new — per-client aggregation helpers shared between
                                        overview + per-client endpoints)
src/routes/clients.ts                  (modify — add GET /:id/report endpoint)
```

### Shared helpers in `src/lib/report.ts`

```typescript
interface AggregateOpts {
  agencyId: string;
  clientIds?: string[];    // narrow to specific clients
  startAt:   Date;
  endAt:     Date;
}

interface AggregateResult {
  sentCount:        number;
  openCount:        number;          // unique opens
  clickCount:       number;          // unique clicks
  openRate:         number | null;
  clickRate:        number | null;
}

export async function aggregateSends(opts: AggregateOpts): Promise<AggregateResult>;

export async function dailyChart(opts: AggregateOpts): Promise<Array<{
  date_iso: string;
  sent:     number;
  opened:   number;
}>>;

export async function topCampaignsByEngagement(opts: AggregateOpts & {
  limit: number;
}): Promise<Array<{
  id:        string;
  name:      string;
  subject:   string | null;
  sentAt:    string;
  sentCount: number;
  openRate:  number | null;
  clickRate: number | null;
}>>;

export async function listGrowth(opts: AggregateOpts): Promise<{
  added:        number;        // Contacts created in range
  unsubscribed: number;        // ListContact.status flips to unsubscribed
  suppressed:   number;        // Suppression rows created in range
}>;
```

These helpers are used by BOTH the dashboard endpoint and the per-client
report endpoint — same aggregations, different scopes.

### Per-client report endpoint

```typescript
// GET /v1/clients/:clientId/report
//   ?range=30d (default) | 90d | all

interface ClientReportPayload {
  client: { id: string; name: string };
  range:  '30d' | '90d' | 'all';

  kpis: {
    sent_count:    number;
    open_rate:     number | null;
    click_rate:    number | null;
    list_growth:   number;            // added - unsubscribed
  };

  sending_chart: Array<{ date_iso: string; sent: number; opened: number }>;

  top_campaigns: Array<{
    id:         string;
    name:       string;
    subject:    string | null;
    sent_at:    string;
    sent_count: number;
    open_rate:  number | null;
    click_rate: number | null;
  }>;

  list_health: {
    total_contacts:    number;
    subscribed_count:  number;
    unsubscribed_count: number;
    suppressed_count:   number;
  };
}
```

Server-side cached 60s per (clientId, range) — same TTL pattern as
the dashboard.

### Dashboard `computeOverview` changes

Replace placeholder fields:

```typescript
// BEFORE
emails_sent:    { value: null, change_30d: null, available: false },
open_rate:      { value: null, change_30d: null, available: false },
sending_chart:  { available: false, series: null },
plan_usage:     { ..., sent_this_month: 0, ... },

// AFTER (compute via aggregateSends helper)
const last30 = await aggregateSends({
  agencyId, clientIds: scopedClientIds,
  startAt: subDays(now, 30), endAt: now,
});
const prior30 = await aggregateSends({
  agencyId, clientIds: scopedClientIds,
  startAt: subDays(now, 60), endAt: subDays(now, 30),
});

emails_sent: {
  value:      last30.sentCount,
  change_30d: pctChange(last30.sentCount, prior30.sentCount),
  available:  true,
},
open_rate: {
  value:      last30.openRate,        // 0.0 - 1.0
  change_30d: pctChange(last30.openRate, prior30.openRate),
  available:  true,
},
sending_chart: {
  available: true,
  series:    await dailyChart({ agencyId, clientIds: scopedClientIds,
                                startAt: subDays(now, 30), endAt: now }),
},
plan_usage: {
  ...,
  sent_this_month: countSentSince(startOfMonth),
},
```

Top clients enrichment:

```typescript
// For each top client, fetch in parallel:
//   - last sent campaign (Campaign WHERE status='sent' ORDER BY sentAt DESC LIMIT 1)
//   - aggregate open rate last 30d
top_clients: await Promise.all(topClientsRaw.map(async (c) => ({
  ...c,
  last_campaign_subject: await mostRecentCampaignSubject(c.id),
  open_rate:             await openRateForClient(c.id, last30Range),
})));
```

### Performance

- Dashboard aggregations: ~5 queries (KPIs + chart + top_clients
  enrichment). Cache 60s — most users refresh more often than that.
- Per-client report: ~6 queries. Cache 60s per (client, range).
- All queries hit indexed columns (`Send.campaignId`, `Send.sentAt`,
  `Campaign.agencyId`). Test at 10K sends: each query <50ms.
- At 1M sends, single GROUP BY on Send still <500ms (Postgres
  handles this trivially). If we exceed that, add a materialized
  view or shift to a daily-rollup table — but that's a year away
  for the target ICP.

---

## Frontend

### Modified files

```
src/pages/dashboard.tsx                (mostly already done — sub-components handle the data shape)
src/components/dashboard/*.tsx         (likely no changes — they already accept the typed payload;
                                        backend just stops returning `available: false`)
src/lib/api/clientReport.ts            (new — typed wrapper for GET /v1/clients/:cid/report)
src/hooks/useClientReport.ts           (new — fetch + range state)
src/pages/clients/ClientReport.tsx     (new — the actual report page)
src/components/clients/RangePicker.tsx (new — 30d / 90d / all toggle)
src/router/index.tsx                   (+1 route)
```

### Per-client report page layout

Per the design tokens + existing dashboard component style:

```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Khukri Spices                                         │
│                                                                 │
│ Performance report                                              │
│ Khukri Spices · Last 30 days  [30d ▾]                          │
│                                                                 │
│ ┌─────────┬─────────┬─────────┬─────────┐                      │
│ │  1,234  │  68.6%  │  27.7%  │  +47    │                      │
│ │  Sent   │  Open   │  Click  │ Growth  │                      │
│ │ ↑ 12%   │ ↑ 4%    │ ↑ 2%   │ added   │                      │
│ └─────────┴─────────┴─────────┴─────────┘                      │
│                                                                 │
│ Sending over time                                               │
│ [line chart, last 30 days, sent + opened series]               │
│                                                                 │
│ Top campaigns by open rate                                      │
│ 1 │ Spring promo              │ 89.2%  │ 487 sent              │
│ 2 │ Welcome series #1         │ 76.4%  │ 234 sent              │
│ 3 │ Newsletter Mar            │ 71.0%  │ 612 sent              │
│                                                                 │
│ List health                                                     │
│ ┌──────────────┬────────────────┬──────────────┐               │
│ │ 1,847        │ 23             │ 12           │               │
│ │ Subscribed   │ Unsubscribed   │ Suppressed   │               │
│ └──────────────┴────────────────┴──────────────┘               │
└────────────────────────────────────────────────────────────────┘
```

Reuses dashboard widget components where possible (StatCard, line chart).

### Date range picker

```typescript
type Range = '30d' | '90d' | 'all';
const RANGE_LABELS: Record<Range, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  'all': 'All time',
};
```

Simple dropdown (matches the existing component pattern). Changing
the range refetches the endpoint.

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Schema changes** | None | All data exists from prior PRs |
| **Caching** | 60s in-process per cache key | Matches existing dashboard pattern. Aggregations are read-heavy + tolerate ~minute staleness |
| **Date ranges** | Fixed presets: 30d / 90d / all | Covers 95% of use cases. Custom picker is V2 polish. |
| **Default range** | 30d on both dashboard + per-client | Matches industry norm (Mailchimp, Klaviyo default) |
| **Open rate formula** | `unique opens / sent count` | Mailchimp standard. Matches what we use in CampaignReport. |
| **Click rate formula** | `unique clicks / sent count` | Same logic. CTOR (clicks/opens) deferred to V2. |
| **List growth** | `added - unsubscribed` in range, NOT net total | Shows period delta, not snapshot |
| **Top campaigns ranking** | By open rate, MIN 10 sends to qualify | Avoids "1-recipient campaign with 100% open rate" topping the chart |
| **Deliverability gauge** | Stays `available: false` V1 | Needs Resend webhook data — V2 |
| **Revenue KPI** | Stays `available: false` V1 | Needs sales/billing integration |
| **Per-client URL** | `/clients/:cid/report` | Matches sibling pattern (`/clients/:cid/campaigns`, `/clients/:cid/contacts`) |
| **Per-client navigation** | New tab in client detail page sidebar | Discoverable from existing client UX |
| **change_30d sign** | Positive number means UP (good for sends, ambiguous for unsubscribes) | Frontend chooses arrow direction + color contextually |
| **Empty state** | "Nothing sent yet — launch a campaign to see results" | New agencies / clients with no campaign history |
| **Scope-aware** | `requireClientScope` on per-client endpoint; respect `scope.type === 'clients'` filter on dashboard | Matches existing pattern; per-client viewers shouldn't see other clients' data |

---

## Edge cases

| Case | Behavior |
|---|---|
| Brand-new agency, no campaigns sent | All KPIs return 0 / null. Frontend shows empty state on dashboard. Per-client report says "no campaigns yet". |
| Client with no campaigns | Same — empty state + helpful copy. |
| sentCount = 0 in range | openRate / clickRate are `null` (not 0%). UI shows em-dash. |
| Range includes pre-engagement-tracking campaigns | They have `openCount: 0` (no backfill). UI handles by showing rate as honest "we tracked X% of sends" or just averaging in zeros. We'll go with the latter — simpler. |
| Top campaigns: only 1 campaign with ≥10 sends | Show that one campaign + a "Need more data" hint |
| Change_30d when prior period was 0 | `pctChange(N, 0)` returns null (not infinity). UI hides the delta arrow. |
| User has `scope.type: 'clients'` and is restricted | Dashboard filters to their accessible clients only. Per-client report 404s if they ask about a client they don't have access to. |
| Cache stale: campaign launched 30s ago, dashboard shows stale data | Accepted — 60s TTL. Force-refresh by hitting `/v1/agencies/overview?refresh=1`? V2 polish. Most users wait. |
| Concurrent dashboard hits during recompute | Two requests both fetch fresh; not a problem (60s TTL means redundant compute happens at most every minute). |
| List growth includes pre-onboarding imported contacts | Contacts imported on day 1 of agency setup count as "added" in that day's growth. Acceptable. |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Visit /dashboard with sends in last 30 days | Emails sent + open rate KPIs show real numbers with delta arrows |
| Visit /dashboard with no campaigns sent | KPIs show "—" or "Not yet available" gracefully |
| Sending chart on /dashboard | Renders as a line chart with sent + opened series, last 30 days |
| Visit /clients/:cid/report | Shows the 4 hero KPIs (Sent / Open / Click / Growth) |
| Change range to "90d" | Page refetches; numbers update |
| Top campaigns section | Shows up to 5 campaigns sorted by open rate, ≥10 sends each |
| List health section | Shows subscribed / unsubscribed / suppressed counts |
| Per-client report for client with no campaigns | Empty state, not error |
| User with limited scope | Sees only their accessible clients on dashboard + 404 on out-of-scope client report |
| Dashboard cache | 60s TTL — subsequent loads serve cached payload |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Backend `tsc --noEmit` | clean |
| No new Prisma migrations | true |
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Dashboard chunk +5-8 KB gzipped (chart library if not already in). |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual E2E #1 | /dashboard after launching campaigns shows real KPIs |
| Manual E2E #2 | /clients/:cid/report shows per-client breakdown |
| Manual E2E #3 | Date range selector changes numbers |

---

## Implementation order (when authorized)

**Step 1 — Backend aggregation foundation (~3h)**
1. `src/lib/report.ts` — 4 helpers: aggregateSends, dailyChart,
   topCampaignsByEngagement, listGrowth
2. Tests with manual fixture data

**Step 2 — Dashboard wired up (~2h)**
3. `src/lib/overview.ts` — replace placeholders using report.ts helpers
4. Top clients enrichment (last campaign + open rate)
5. tsc clean

**Step 3 — Per-client report endpoint (~3h)**
6. `src/routes/clients.ts` — GET /:id/report
7. Zod schema for range query param
8. Caching layer (60s TTL per (clientId, range))

**Step 4 — Frontend dashboard wire-up (~1h)**
9. Verify dashboard components correctly handle now-populated data
10. Add empty state if all KPIs return null/0
11. Smoke test against backend

**Step 5 — Per-client report page (~3h)**
12. `src/lib/api/clientReport.ts` + `useClientReport` hook
13. `src/pages/clients/ClientReport.tsx` — full page
14. `src/components/clients/RangePicker.tsx`
15. Reuse dashboard components (StatCard, chart)
16. Add navigation link from client detail page

**Step 6 — Verification (~1h)**
17. Build + lint
18. Manual E2E: launch a campaign, see numbers update
19. Update change_log Done entry

---

## What this unlocks

- **Beta-ready reporting** — agencies can finally show their clients
  results without screenshotting per-campaign stats
- **Self-service insights** — users discover what's working without
  having to ask
- **V2 polish surface** — exports, comparisons, custom date ranges all
  build on top of this foundation
- **Validation of engagement tracking** — proves the data is sound by
  making it visible at aggregate level

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| V2-a | **Resend webhook ingestion** — populates the deliverability gauge with real bounce/complaint data | 1-2 days |
| V2-b | **Date range picker on dashboard** + custom range | 1 day |
| V2-c | **Export report to PDF / CSV** | 1-2 days |
| V2-d | **Agency-wide engagement leaderboard** — top contacts | 4h |
| V2-e | **Cohort analysis** — "opens by signup-week" | 1 day |
| V2-f | **Send time optimization** — heatmap of day-of-week × hour | 1 day |
| V2-g | **Compare two campaigns side-by-side** | 1 day |
| V2-h | **Revenue KPI** — needs Shopify/Stripe ingestion | 1 week+ |

---

*Plan locked. Ready to implement when authorized.*
