# Feature 03 · Sending domain verification — Implementation

**Module purpose:** Per-client sending domain with DKIM, SPF, DMARC verification.
Where deliverability is won or lost before any campaign sends.
**Spec:** [MVP §Module 03](../MVP.md), [feature_details §03](../feature/feature_details.md)
**Build window:** Weeks 5–7 (deliverability block — second-largest investment).

---

## V1 scope

- AWS SES `VerifyDomainDkim` → two DKIM CNAME records
- Copy-button UI for all DNS records (SPF, DKIM ×2, DMARC, Return-Path)
- Background worker re-checks unverified domains **hourly** (`dns.resolveTxt`)
- Status badges: Pending / Verified / Failed (with reason)
- ★ **Hard block** on sending from unverified domains (422)
- DMARC defaults to `p=quarantine` — never auto-apply `p=reject`
- ★ RFC 8058 one-click List-Unsubscribe header on every email

**Out of scope:** BIMI, dedicated IP pools, SendMyMail-hosted DNS, ARC signing.

---

## Data model _(proposed)_

```
sending_domain
  id (pk), agency_id, client_id, domain,
  status ENUM('pending','verified','failed'),
  fail_reason NULL, ses_identity_arn,
  last_checked_at, verified_at NULL, created_at

dns_record
  id (pk), sending_domain_id (fk),
  type ENUM('SPF','DKIM','DMARC','RETURN_PATH'),
  host, value, verified BOOLEAN
```

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| POST | `/clients/{id}/domains` | Register domain → SES `VerifyDomainDkim`, generate records |
| GET | `/clients/{id}/domains/{domainId}` | Status + DNS records to display |
| POST | `/clients/{id}/domains/{domainId}/recheck` | Manual re-verify trigger |
| DELETE | `/clients/{id}/domains/{domainId}` | Remove |

Internal: hourly worker `verifyPendingDomains`.

---

## Key flows

**Domain registration**
1. Agency enters the client's domain.
2. App calls SES `VerifyDomainDkim` → DKIM tokens; computes SPF, DMARC (`p=quarantine`), Return-Path records.
3. Persists `dns_record` rows; UI shows each with a copy button.

**Hourly verification worker**
1. Selects `sending_domain` where `status='pending'`.
2. For each, `dns.resolveTxt`/CNAME-resolves expected records.
3. All present → `status='verified'`; partial/missing past a grace window → keep pending or `failed` with `fail_reason`.

**Send-time gate** (consumed by Campaign engine, Module 06)
- Before any send, assert the from-domain is `verified`. Otherwise **422** with a clear message. This is non-negotiable.

---

## Implementation notes

- **DKIM (2 CNAMEs)** from SES; **SPF** includes SES; **DMARC** starts at `p=quarantine` — never auto-`reject` (one misconfig would silently drop all mail). **Return-Path** for alignment.
- **RFC 8058 List-Unsubscribe-Post** header is added at send time on every email (also Module 14) — required by Gmail/Yahoo Feb-2024 rules.
- **Hourly poll** absorbs DNS propagation latency so the agency doesn't babysit.
- Common failure: Cloudflare proxying the DKIM CNAME (orange cloud) breaks resolution — surface this in onboarding docs (Module 13).

---

## Edge cases & failure modes

- DNS not yet propagated → stays Pending; don't mark Failed prematurely.
- Cloudflare-proxied DKIM record → resolves wrong; document the "grey cloud" fix.
- Domain re-used across clients → scope identity per (client, domain).
- Partial verification (SPF ok, DKIM missing) → show per-record state, block sending until all required pass.

## Acceptance criteria

- [ ] Registering a domain returns all required records with working copy buttons.
- [ ] Hourly worker flips Pending → Verified once records resolve, with no manual step.
- [ ] Sending from an unverified domain is rejected with 422.
- [ ] DMARC default is `p=quarantine`; reject is never auto-applied.
- [ ] Every sent email carries SPF/DKIM alignment and the RFC 8058 header.

## Dependencies

AWS SES (us-east-1) · Node `dns` · BullMQ worker · feeds Campaign engine (06) & Deliverability layer (14).
