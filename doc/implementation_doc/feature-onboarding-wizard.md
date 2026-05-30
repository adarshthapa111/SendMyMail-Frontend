# Feature 13 · Onboarding wizard — Implementation

**Module purpose:** Guided setup that gets a new agency to its first successful
send in under 10 minutes.
**Spec:** [MVP §Module 13](../MVP.md), [feature_details §13](../feature/feature_details.md)
**Build window:** Weeks 12–13 (depends on the modules it stitches together).

---

## V1 scope

- State machine on `onboarding_progress` JSON
- **4 steps:** create first client → verify domain → import contacts → send first campaign
- ★ **PAN number** collection required before first real send (manually reviewed)
- Skippable but **persistent** (banner reminder on incomplete state)
- Each step: clear CTA, copyable DNS records, copy-paste examples
- Inline failure-mode docs: DNS propagation delays, Cloudflare-proxy DKIM, CSV encoding

**Out of scope:** auto DNS-provider one-click install, concierge onboarding (handle via Calendly), industry-specific paths, interactive product tour.

---

## Data model _(proposed)_

```
onboarding_progress
  agency_id (pk),
  state jsonb,             -- {step1_client:bool, step2_domain:bool,
                           --  step3_contacts:bool, step4_campaign:bool}
  pan_number NULL, pan_status ENUM('none','submitted','approved'),
  skipped BOOLEAN, completed_at NULL
```

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/onboarding` | Current state for banner + wizard |
| POST | `/onboarding/advance` | Mark a step complete |
| POST | `/onboarding/pan` | Submit PAN (queues manual review) |
| POST | `/onboarding/skip` | Skip (keeps persistent banner) |

The four steps **delegate** to existing module endpoints (clients, domains,
contacts, campaigns) — onboarding orchestrates, it doesn't reimplement.

---

## Key flows

**Guided path**
1. Step 1 → create first client (Module 02).
2. Step 2 → verify domain (Module 03), with copyable records + inline troubleshooting.
3. Step 3 → import contacts (Module 04).
4. Step 4 → send first campaign (Module 06) — **gated on PAN approval**.

**State machine**
- `onboarding_progress.state` updated as steps complete; survives multiple sessions (DNS step alone can span hours/days). Skippable, but an incomplete banner persists.

**PAN gate**
- PAN submitted → manual review (V1) → on approval, first real send unblocks. Anti-spammer check (also Module 14).

---

## Implementation notes

- **Persisted state machine** is essential because onboarding isn't single-session — the domain step waits on DNS propagation.
- **PAN before first send** is a non-negotiable abuse gate (shared with Module 14); manual review trades scale for safety in V1.
- **Inline failure docs** target the exact three stumbling points (DNS propagation, Cloudflare grey-cloud DKIM, CSV encoding) — pre-empting the top support tickets.
- Don't force completion; the persistent banner is the nudge (incomplete onboarding is the strongest churn predictor — feeds success metric "onboarding completion 60%+").

---

## Edge cases & failure modes

- User skips then returns days later → resume exact step from `state`.
- Domain stuck pending (DNS) → step 2 stays open; allow proceeding to step 3 meanwhile.
- PAN submitted but not yet approved → steps 1–3 done, step 4 blocked with clear status.
- Multiple admins onboarding same agency → single shared `onboarding_progress`.

## Acceptance criteria

- [ ] A new agency can complete all 4 steps and send in under 10 minutes (excluding DNS wait).
- [ ] Progress persists across sessions; resumes at the right step.
- [ ] First real send is blocked until PAN is approved.
- [ ] Skipping keeps a persistent reminder banner.
- [ ] Each step shows copyable records and inline fixes for the 3 known failure modes.

## Dependencies

Orchestrates Modules 02 (clients), 03 (domains), 04 (contacts), 06 (campaigns) · PAN review shared with Module 14.
