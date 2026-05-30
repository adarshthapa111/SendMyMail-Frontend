# Feature 06 · Campaign engine — Implementation

**Module purpose:** One-shot broadcast pipeline from queue to send to webhook
ingestion. The throughput-critical path.
**Spec:** [MVP §Module 06](../MVP.md), [feature_details §06](../feature/feature_details.md)
**Build window:** Weeks 10–11.

---

## V1 scope

- **6-step wizard:** Name → Recipients → From/Subject → Template → Schedule → Review
- **Recipient snapshot** at send time (prevents mid-send drift)
- **BullMQ on Upstash Redis**, one job per N recipients (default 100)
- Worker: suppression check → render MJML → SES `SendEmail`
- Per-agency rate limit from **14 emails/sec**, grows with SES quota
- SNS → `/webhooks/ses` → BullMQ → `sends` table
- Statuses: queued, sent, delivered, bounced (hard/soft), complained, opened, clicked, unsubscribed
- **Idempotency** via SES message-ID dedup
- ★ Tiered new-agency limits: 1K/day wk1, 10K/day wk2–4, plan limits day 30+

**Out of scope:** A/B testing, send-time optimization, dynamic multi-language, per-recipient timezone, recurring campaigns (use flows).

---

## Data model _(proposed)_

```
campaign
  id, agency_id, client_id, name,
  from_name, from_email, subject, template_id,
  schedule_at NULL, status ENUM('draft','scheduled','sending','sent','paused'),
  created_at

campaign_recipient            -- the frozen snapshot
  campaign_id, contact_id, email, merge_data jsonb

send
  id, campaign_id, contact_id, ses_message_id (unique),
  status ENUM('queued','sent','delivered','bounced','complained',
              'opened','clicked','unsubscribed'),
  bounce_type ENUM('hard','soft') NULL, updated_at
```

`ses_message_id UNIQUE` is the idempotency key.

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| POST/PATCH | `/clients/{id}/campaigns` | Wizard persistence (draft) |
| POST | `/campaigns/{id}/schedule` | Validate domain verified → enqueue |
| POST | `/campaigns/{id}/send-test` | Postmark |
| POST | `/campaigns/{id}/pause` | Manual or auto (Module 14) |
| POST | `/webhooks/ses` | SNS subscription target (signed) |

---

## Key flows

**Send pipeline**
1. On schedule/send: assert from-domain **verified** (Module 03) else 422.
2. **Snapshot** recipients into `campaign_recipient` (list frozen — no drift).
3. Split into BullMQ jobs of N=100.
4. Worker per job: re-check suppression (client + agency) → render MJML→HTML per recipient → SES `SendEmail`.
5. Respect per-agency rate limit (start 14/sec) and tiered daily caps.

**Event ingestion**
1. SES → SNS topic → `POST /webhooks/ses` (verify signature).
2. Enqueue to BullMQ → update `send` row by `ses_message_id`.
3. Bounces/complaints also write agency-scoped `suppression` (Module 04) and feed auto-pause (Module 14).

**Idempotency**
- Retried jobs dedup on `ses_message_id` — a retry never double-sends.

---

## Implementation notes

- **Snapshot at send** makes a long run deterministic against concurrent contact edits.
- **Suppression re-checked in the worker**, not just at snapshot — someone who unsubscribes after snapshot is still skipped.
- **Rate limit tracks SES quota**; exceeding it risks SES throttling/suspension for everyone.
- **Tiered ramp** (shared with Module 14) builds reputation and caps bad-actor blast radius.
- Async event ingestion via queue absorbs SNS bursts without dropping events.

---

## Edge cases & failure modes

- Domain unverified at schedule → block (422).
- Contact edited/erased after snapshot → snapshot governs; honor erasure post-send.
- Job retry after partial SES success → message-ID dedup prevents resend.
- SNS event arrives before `send` row exists (race) → upsert by message-ID.
- Daily cap hit mid-campaign → pause and resume next window.

## Acceptance criteria

- [ ] Wizard produces a reviewable campaign; review is the final gate.
- [ ] Recipient list is frozen at send; mid-send contact changes don't affect the run.
- [ ] Suppression is re-checked in the worker immediately before SES send.
- [ ] Retried jobs never double-send (message-ID dedup).
- [ ] All SES events update `sends`; bounces/complaints create agency suppression.
- [ ] New-agency daily caps enforced (1K → 10K → plan).

## Dependencies

BullMQ/Upstash Redis · AWS SES + SNS · Domain verification (03) · Templates (05) · Contacts/suppression (04) · Deliverability layer (14).
