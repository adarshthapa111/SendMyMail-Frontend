# Feature 14 · Deliverability trust layer — Implementation

**Module purpose:** Invisible but existential — keeps AWS SES happy and stops any
one bad actor from poisoning deliverability for every agency.
**Spec:** [MVP §Module 14](../MVP.md), [feature_details §14](../feature/feature_details.md)
**Build window:** spans weeks 5–7 (foundation) and 16 (tuning); enforced everywhere.

---

## V1 scope

- ★ Tiered sending limits: **1K/day wk1, 10K/day wk2–4, plan limits day 30+**
- ★ Auto-pause any campaign with **>5% hard bounce OR >0.3% complaint**
- CSV import quality check: reject if **>10% role accounts** (info@, admin@) or scraped patterns
- Global **agency-level suppression**: hard bounces + complaints never re-sent across any client
- ★ RFC 8058 one-click List-Unsubscribe on every email
- Per-client deliverability score widget (engagement-weighted)
- ★ **PAN verification** before first real send
- Manual review of accounts sending **>50K in first month**
- AWS SES bounce/complaint webhook ingestion

**Out of scope:** automated content scanning, dedicated IP pools, Google Postmaster Tools, seed-list inbox testing, ML abuse detection.

---

## Data model _(proposed)_

```
sending_limit
  agency_id, daily_cap, sent_today, tier_started_at,
  current_tier ENUM('week1','week2_4','plan')

agency_reputation
  agency_id, client_id NULL,
  bounce_rate, complaint_rate, engagement_score, updated_at

-- suppression: see Module 04 (agency-scoped rows)
-- abuse_review queue for >50K/month and PAN approvals
```

---

## Enforcement points (cross-cutting)

This module is mostly **guards injected into other modules**, not a standalone screen:

| Hook | Where | Rule |
|------|-------|------|
| Daily cap | Campaign worker (06) | Block/queue when `sent_today ≥ daily_cap` |
| Auto-pause | SES event ingestion (06) | Pause campaign if bounce >5% or complaint >0.3% |
| Suppression | Campaign + flow workers | Skip agency-suppressed addresses |
| Import quality | CSV import (04) | Reject >10% role/scraped |
| RFC 8058 header | Render/send (03, 06) | On every email |
| PAN gate | First send (13) | Block until approved |
| High-volume review | Send path | Flag >50K/first-month for manual review |

---

## Key flows

**Auto-pause loop**
1. SES bounce/complaint events ingested (Module 06 webhook).
2. Running tallies of bounce/complaint rate per campaign.
3. Cross threshold (>5% hard bounce / >0.3% complaint) → **pause campaign**, alert agency, write agency-scoped suppression.

**Tiered ramp**
- New agency: 1K/day week 1 → 10K/day weeks 2–4 → plan limits at day 30. `sending_limit` advances by `tier_started_at`.

**Reputation score**
- Engagement-weighted per-client score surfaced as a widget — early-warning + a defensible "how's our deliverability" answer for agencies.

---

## Implementation notes

- **The platform protects itself from its own customers.** Every guard exists because one bad agency can get the shared SES account throttled or suspended — taking down everyone.
- **Thresholds (5% / 0.3%)** mirror what AWS itself watches — pause *before* AWS does.
- **Suppression is agency-scoped** for bounces/complaints (deliverability signal), unlike client-scoped unsubscribes (Module 04).
- **PAN + >50K review** are layered abuse defenses: screen at signup, catch fast-scaling spam after.
- Most of this is invisible — correctness here is the difference between a healthy SES account and a dead company.

---

## Edge cases & failure modes

- Small campaign, few sends → don't auto-pause on a single bounce (apply rate over a minimum volume).
- Legitimate high bounce from an old list → pause is correct; provide a path to clean + resume.
- Role-account-heavy B2B list (legit) → 10% threshold may false-positive; surface override-with-review.
- SES suspends despite guards → platform-wide alert + halt new sends.
- Engagement score cold start (new client) → neutral default until data accrues.

## Acceptance criteria

- [ ] New-agency daily caps enforced (1K → 10K → plan) across campaigns and flows.
- [ ] Campaign auto-pauses at >5% hard bounce or >0.3% complaint, with alert.
- [ ] CSV imports with >10% role/scraped addresses are rejected.
- [ ] Bounces/complaints create agency-wide suppression, never re-sent under any client.
- [ ] Every email carries the RFC 8058 header; no real send before PAN approval.
- [ ] Accounts exceeding 50K in month one are flagged for manual review.

## Dependencies

AWS SES + SNS (06) · suppression (04) · import (04) · PAN gate (13) · render (03/06). Touches nearly every module — it's the spine's immune system.
