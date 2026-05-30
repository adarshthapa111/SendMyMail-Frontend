# Feature 07 · Marketing automation (flows) — Implementation

**Module purpose:** Pre-built automation templates configured by wizard — no
visual flow builder. Three flows cover ~80% of agency needs at ¼ the build cost.
**Spec:** [MVP §Module 07](../MVP.md), [feature_details §07](../feature/feature_details.md)
**Build window:** Weeks 12–13.

---

## V1 scope

- **Three fixed flow types**, each a fixed configuration schema (no drag-and-drop):
  1. **Welcome series** — 3 emails over 7 days, triggered by list-add
  2. **Abandoned cart** — 2 emails (1h, 24h), triggered by WooCommerce/Shopify webhook
  3. **Birthday** — 1 email on the day, triggered by daily cron
- Per-flow stop conditions: unsubscribe, order placed, opens a specific email
- BullMQ **delayed jobs** for steps; **daily cron fallback** for delays >30 days
- `flow_executions` tracking per (flow_id, contact_id)
- **Re-check suppression at execution time**
- Per-flow reporting: entered, in-progress, completed, conversions, revenue

**Out of scope:** visual flow builder, branching logic, >3 flow types, custom triggers, cross-flow rules.

---

## Data model _(proposed)_

```
flow
  id, agency_id, client_id, type ENUM('welcome','abandoned_cart','birthday'),
  config jsonb,            -- per-type schema (delays, template ids, stop conds)
  active BOOLEAN, created_at

flow_execution
  id, flow_id, contact_id,
  current_step INT, status ENUM('active','completed','stopped'),
  started_at, next_run_at NULL, stop_reason NULL
  UNIQUE (flow_id, contact_id)   -- one active run per contact per flow
```

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET/POST/PATCH | `/clients/{id}/flows` | Configure one of the 3 types |
| POST | `/clients/{id}/flows/{flowId}/activate` | Start/stop |
| GET | `/clients/{id}/flows/{flowId}/report` | Funnel + revenue |
| (internal) | trigger handlers | list-add event, e-commerce webhook, daily birthday cron |

---

## Key flows

**Enrollment & stepping**
1. Trigger fires (list-add / cart webhook / birthday cron) → create `flow_execution` (skip if one is already active for that contact+flow).
2. Schedule step 1; subsequent steps via **BullMQ delayed jobs** (>30-day delays handled by a daily cron sweep on `next_run_at`).
3. At each step execution: **re-check suppression + stop conditions** → render & send (via campaign send path) → advance `current_step` or mark completed.

**Stop conditions**
- Unsubscribe, order placed, or opening a specific email → set `status='stopped'`, `stop_reason`. Prevents "finish your purchase" after the purchase.

---

## Implementation notes

- **No canvas** — each flow is a fixed schema edited via wizard. Visual builder is V2 (only if 3+ beta agencies ask in writing).
- **Delayed jobs vs cron** — short waits use BullMQ delays; long waits (>30 days) shouldn't sit in Redis, so a daily cron reconciles `next_run_at`.
- **Re-check at execution** closes the race between scheduling and firing (contact may have unsubscribed/converted in between).
- **Attributed revenue** is the number agencies use to justify flows — wire order webhooks (Module 09) into conversion tracking.

---

## Edge cases & failure modes

- Contact re-triggers while already in flow → don't double-enroll (unique constraint).
- Cart recovered before 24h email → stop condition fires, second email suppressed.
- Birthday on Feb 29 / missing birthday → skip safely.
- Delayed job fires after contact erased (GDPR) → execution finds no contact → stop.
- Clock skew / missed cron → idempotent step execution keyed on (flow_execution, step).

## Acceptance criteria

- [ ] All three flow types configurable via wizard and activatable.
- [ ] Steps fire at correct delays; >30-day delays survive via cron fallback.
- [ ] Stop conditions halt the flow (unsubscribe / order / specific open).
- [ ] Suppression re-checked at each step execution.
- [ ] Per-flow report shows entered → in-progress → completed → conversions → revenue.

## Dependencies

BullMQ delayed jobs + cron · Campaign send path (06) · Templates (05) · e-commerce webhooks (09) for cart/order triggers · Contacts/suppression (04).
