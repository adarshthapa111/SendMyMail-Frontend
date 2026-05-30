# Feature 10 · Reporting & analytics — Implementation

**Module purpose:** Per-campaign, per-flow, per-client, per-agency dashboards.
Turns raw send events into the reports agencies show clients.
**Spec:** [MVP §Module 10](../MVP.md), [feature_details §10](../feature/feature_details.md)
**Build window:** Weeks 14–15.

---

## V1 scope

- Open tracking via 1×1 pixel from **`track.sendmymail.np`** (separate domain — reputation isolation)
- Click tracking via redirect `track.sendmymail.np/c/{token}` → 302
- Events in Postgres with **monthly partitions** (ClickHouse is V2)
- Per-campaign / per-flow / per-client / per-agency views
- Range filters: 7 / 30 / 90 days, this year, custom
- CSV export
- Weekly digest email to agency owner
- **(V1 limit)** metrics refresh on read, cached **60s** (not real-time)

**Out of scope:** real-time dashboard, cohort retention, funnel analysis, heat maps, non-email attribution, custom report builder.

---

## Data model _(proposed)_

```
event   (PARTITION BY RANGE (created_at) — monthly)
  id, agency_id, client_id, campaign_id NULL, flow_id NULL,
  contact_id, type ENUM('delivered','open','click','bounce',
                        'complaint','unsubscribe'),
  link_url NULL, device NULL, country NULL, created_at

link_token
  token (pk), campaign_id, contact_id, destination_url
```

Aggregations cached 60s on read.

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET | `track.sendmymail.np/o/{token}.gif` | Open pixel → write `open` event |
| GET | `track.sendmymail.np/c/{token}` | Click → write `click` event → 302 |
| GET | `/campaigns/{id}/report` | Campaign metrics |
| GET | `/flows/{id}/report` | Flow funnel + revenue |
| GET | `/clients/{id}/report` | Per-client aggregate |
| GET | `/agency/report` | Dashboard (all clients) |
| GET | `/reports/export` | CSV |

---

## Key flows

**Tracking**
- At render, rewrite links to `track.sendmymail.np/c/{token}` and inject the open pixel from the same isolated domain. Click handler writes the event then 302s to the real destination.

**Aggregation**
- Per-campaign: sent, delivered, open, click, bounce, complaint, unsub, top links, devices, geo.
- Per-flow: entered, in-progress, completed, conversions, revenue.
- Per-client: aggregate of its campaigns + flows. Per-agency: aggregate of all clients.
- Read-through cache (60s) — indistinguishable from real-time at this scale.

**Weekly digest** — cron emails the owner a cross-client summary (re-engagement loop).

---

## Implementation notes

- **Separate tracking domain** isolates spam-filter scrutiny from the sending domain — a deliberate reputation-protection choice (mirrors the SES/Postmark split).
- **Monthly partitions** keep Postgres queries fast and old data pruneable; migrate to ClickHouse only when a tenant exceeds ~10M events/mo (V2).
- **60s cache** is an explicit V1 trade — real-time infra isn't worth it yet.
- V1.5: custom tracking domain per agency (`track.theiragency.com`) ties into white-label (Module 12).

---

## Edge cases & failure modes

- Open-pixel false positives (proxy prefetch, e.g. Apple MPP) → treat opens as soft signal; don't over-weight.
- Bot clicks on security scanners → filter known scanner patterns.
- Link token tampering → tokens signed/opaque; unknown token → safe redirect or 404.
- Partition rollover → automate monthly partition creation.

## Acceptance criteria

- [ ] Opens and clicks recorded via `track.sendmymail.np`, separate from sending domain.
- [ ] All four report scopes render with correct aggregates.
- [ ] Range filters and CSV export work.
- [ ] Weekly digest emails the owner a cross-client summary.
- [ ] Events partitioned monthly; queries stay performant at V1 volume.

## Dependencies

`track.sendmymail.np` domain · Postgres partitions · SES events (06) · Flow/conversion data (07, 09) · feeds white-label tracking domain (12, V1.5).
