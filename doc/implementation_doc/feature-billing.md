# Feature 11 · Billing — Implementation

**Module purpose:** NPR billing for Nepali agencies, USD for international.
Shaped by one constraint: true recurring card billing doesn't exist locally.
**Spec:** [MVP §Module 11](../MVP.md), [feature_details §11](../feature/feature_details.md)
**Build window:** Weeks 14–15.

---

## V1 scope

- Three hardcoded plans: **Starter ₨2,499 / Pro ₨6,999 / Scale ₨14,999** (USD $29/$79/$179)
- Annual billing — **2 months free**
- ★ **Khalti**: initiate → callback verify → webhook confirm
- ★ **eSewa**: callback flow with HMAC verification
- **Stripe** subscription for USD (needs Delaware C-Corp / Singapore entity — may defer to V1.5)
- Usage tracking: nightly cron updates counters, **soft-warn 90%**, **hard-block 100%**
- Renewal reminders: 7-day, 3-day, 1-day-before, day-of, 3-day grace
- PDF invoices with **PAN/VAT** number
- Self-service upgrades; downgrades at next cycle

**Out of scope:** card-on-file NPR recurring (Khalti Mandate = V2), per-client agency invoicing, enterprise contracts, promo codes, multi-currency.

---

## Data model _(proposed)_

```
subscription
  id, agency_id, plan ENUM('starter','pro','scale'),
  cycle ENUM('monthly','annual'), currency ENUM('NPR','USD'),
  status ENUM('active','past_due','grace','cancelled'),
  current_period_end, provider ENUM('khalti','esewa','stripe')

payment
  id, agency_id, subscription_id, amount, currency,
  provider, provider_ref, status, paid_at

usage_counter
  agency_id, period_start, emails_sent, contacts, clients

invoice
  id, agency_id, number, pdf_url, pan_vat, amount, issued_at
```

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/billing/plans` | Hardcoded plan catalog |
| POST | `/billing/checkout` | Returns Khalti/eSewa/Stripe init |
| GET | `/billing/khalti/callback` | Verify |
| POST | `/webhooks/khalti` | Confirm |
| POST | `/webhooks/esewa` | HMAC verify + confirm |
| POST | `/webhooks/stripe` | Subscription lifecycle |
| GET | `/billing/invoices/{id}.pdf` | PDF |
| POST | `/billing/change-plan` | Upgrade now / downgrade next cycle |

---

## Key flows

**NPR payment (Khalti/eSewa)**
1. Checkout → provider init → redirect.
2. Provider callback → server-side **verify** (eSewa: HMAC).
3. Provider **webhook** confirms → mark `payment` paid, extend `current_period_end`.
4. Because there's **no card-on-file**, renewal is **manual** — reminder flow drives re-payment.

**Usage enforcement**
- Nightly cron updates `usage_counter`. Soft-warn at 90% (email + banner), hard-block sends at 100% until upgrade.

**Renewal reminders** — cron at 7/3/1-day-before, day-of, then 3-day grace before lapse.

---

## Implementation notes

- **Manual NPR renewal is a platform constraint, not a choice** — Khalti/eSewa lack true recurring card-on-file. The reminder flow exists precisely to compensate. Khalti Mandate API (partial bank coverage) is the V2 fix if manual-renewal churn >8% in 60 days.
- **Stripe gating:** requires a Delaware C-Corp or Singapore Pte Ltd parent — if that entity isn't ready, defer USD billing to V1.5 (don't block V1 NPR launch).
- **Invoices must show PAN/VAT** — legal requirement in Nepal; generate via Puppeteer/pdfkit.
- **Hardcoded plans** — no pricing engine in V1; promo/discount engine is V2.

---

## Edge cases & failure modes

- Callback received but webhook delayed/lost → reconcile via provider verify API; don't double-extend.
- Payment succeeds, webhook never arrives → scheduled reconciliation job.
- Downgrade with usage above the lower plan's cap → apply at next cycle, warn.
- Grace period expiry → suspend sends, keep data (soft state).
- Currency mismatch (agency operating NPR + USD) → single currency per subscription in V1.

## Acceptance criteria

- [ ] Khalti and eSewa payments complete via callback + webhook and extend the period.
- [ ] Stripe USD subscription works (or is cleanly deferred to V1.5 with NPR launching regardless).
- [ ] Usage soft-warns at 90%, hard-blocks at 100%.
- [ ] Renewal reminders fire on the full schedule with a 3-day grace.
- [ ] Invoices render as PDF with PAN/VAT.

## Dependencies

Khalti · eSewa · Stripe · Puppeteer/pdfkit · usage data from Campaign engine (06) · legal entity (PAN/VAT, see MVP §7).
