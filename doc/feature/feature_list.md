# SendMyMail · V1 Feature List

> Derived from [doc/MVP.md](../MVP.md) (v1.0, May 2026). This is a structured
> index of every V1 feature across the 14 modules. The MVP doc remains the
> source of truth for scope and reasoning; this file is the at-a-glance checklist.
>
> **Legend:** `[V1]` ships in V1 · `[V2]` / `[V3]` deferred · `★` non-negotiable (Appendix B)

---

## The three strategic bets

Every V1 feature serves at least one of these:

1. **Multi-client workspace** — one login, all clients switchable in 2 clicks
2. **NPR billing, local payment** — Khalti, eSewa, Fonepay (+ Stripe for USD)
3. **White-label everything** — custom domain, agency branding, no SendMyMail name where clients see it

---

## Module 01 · Authentication & workspace

**Purpose:** Agency signs up, creates a workspace, invites teammates.

**V1**
- [V1] Email + password signup (Clerk or Supabase Auth — not built from scratch)
- [V1] Google OAuth login
- [V1] Email verification via 6-digit code (not magic link — survives spam folder)
- [V1] Workspace creation with unique slug at `{slug}.sendmymail.np`
- [V1] Team invites via email-bound token, expiring in 7 days
- [V1] Two roles: `admin`, `member`
- [V1] Password reset / forgot-password with anti-enumeration messaging
- [V1] Optional TOTP 2FA with downloadable recovery codes

**Deferred:** SMS 2FA, WebAuthn/passkeys `[V2]`, SSO/SAML, client-facing logins

## Module 02 · Client management

**Purpose:** The unique value-prop — manage many clients from one dashboard.

**V1**
- [V1] Create, edit, soft-delete clients (hard delete deferred for billing-dispute protection)
- [V1] Top-nav client switcher on every screen, selection persisted in session
- [V1] URL pattern `/{agency-slug}/clients/{client-slug}/{module}` (deep-linkable)
- [V1] Per-client: name, brand colour, default from-name, default from-email
- [V1] Client list sortable by last activity, contacts count, billing status
- [V1] All downstream data scoped by `client_id`

**Deferred:** Client portal `[V2]`, per-client member permissions, cross-client reporting `[V2]`, client groups/tags `[V2]`

## Module 03 · Sending domain verification

**Purpose:** Per-client sending domain with DKIM, SPF, DMARC.

**V1**
- [V1] AWS SES `VerifyDomainDkim` → two DKIM CNAME records
- [V1] Copy-button UI for all DNS records (SPF, DKIM ×2, DMARC, Return-Path)
- [V1] Hourly background re-check of unverified domains (`dns.resolveTxt`)
- [V1] Status badges: Pending / Verified / Failed (with reason)
- [V1] ★ Hard block on sending from unverified domains (422)
- [V1] DMARC defaults to `p=quarantine` — never auto-apply `p=reject`
- [V1] ★ RFC 8058 one-click unsubscribe header on every email

**Deferred:** BIMI `[V2]`, dedicated IP pools `[V2]`, SendMyMail-hosted DNS `[V3]`, ARC signing

## Module 04 · Contacts & lists

**Purpose:** Per-client contact database with lists, tags, segmentation, suppression.

**V1**
- [V1] Postgres `contacts` with `UNIQUE (client_id, lowercased_email)`
- [V1] Standard fields + `jsonb` for up to 10 custom fields per client
- [V1] Lists with many-to-many membership and per-list subscription status
- [V1] Free-text multi-select tags
- [V1] CSV import (papaparse, streaming, UTF-8/BOM handling, in-list dedupe)
- [V1] Mandatory consent declaration on every import
- [V1] Segmentation rule-builder: max 5 conditions, AND/OR, compiled to parameterized SQL
- [V1] Two-level suppression: client (unsubscribed) + agency (hard bounces, complaints)
- [V1] GDPR right-to-erasure cascading through `list_contacts`, `events`, `sends`

**Deferred:** >10 custom fields, >5 conditions / nested groups, behavioural segments `[V2]`, predictive scoring `[V3]`, cross-list merge `[V2]`

## Module 05 · Email builder

**Purpose:** Visual editor producing reliable, MJML-rendered emails.

**V1**
- [V1] **Custom in-house MJML drag-and-drop builder** — block-based (tree + inspector + canvas), compiles to MJML/HTML server-side
- [V1] Save MJML source to DB; render HTML at send time (fixes propagate)
- [V1] Merge tags: `{{first_name|fallback}}`, `{{email}}`, `{{custom.field_name}}`
- [V1] Desktop + mobile previews
- [V1] Send-test via Postmark (kept off customer SES reputation)
- [V1] 8 starter templates, each tested in Gmail / Outlook 2016+ / Apple Mail:
  Welcome · Newsletter · Promo · Order confirmation · Abandoned cart · Birthday · Re-engagement · Festive (Dashain/Tihar, Devanagari)
- [V1] Agency-level reusable templates with brand-colour swap

**Deferred:** Third-party embedded editors (Unlayer), 200+ template library, AI content `[V2]`, template marketplace `[V2]`, AMP for Email
> ✅ **Resolved:** custom builder is the V1 decision (matches the `sendmymail-frontend` repo and the prototype). Reverses the earlier "use Unlayer" decision — see MVP §12.

## Module 06 · Campaign engine

**Purpose:** One-shot broadcast pipeline from queue to send to webhook ingestion.

**V1**
- [V1] 6-step wizard: Name → Recipients → From/Subject → Template → Schedule → Review
- [V1] Recipient snapshot at send time (prevents mid-send drift)
- [V1] BullMQ on Upstash Redis; one job per N recipients (default 100)
- [V1] Worker: suppression check → render MJML → SES `SendEmail`
- [V1] Per-agency rate limit from 14 emails/sec, grows with SES quota
- [V1] SNS → `/webhooks/ses` → BullMQ → `sends` table
- [V1] Statuses: queued, sent, delivered, bounced (hard/soft), complained, opened, clicked, unsubscribed
- [V1] Idempotency via SES message-ID dedup
- [V1] ★ Tiered new-agency limits: 1K/day wk1, 10K/day wk2–4, plan limits day 30+

**Deferred:** A/B testing `[V2]`, send-time optimization `[V2]`, dynamic multi-language `[V2]`, per-recipient timezone, recurring campaigns (use flows)

## Module 07 · Marketing automation (flows)

**Purpose:** Pre-built automation templates configured by wizard (no visual canvas).

**V1**
- [V1] Three fixed flow types:
  1. Welcome series — 3 emails / 7 days, triggered by list-add
  2. Abandoned cart — 2 emails (1h, 24h), WooCommerce/Shopify webhook trigger
  3. Birthday — 1 email on the day, daily cron
- [V1] Per-flow stop conditions (unsubscribe, order placed, specific open)
- [V1] BullMQ delayed jobs + daily cron fallback for >30-day delays
- [V1] `flow_executions` tracking per (flow_id, contact_id)
- [V1] Re-check suppression at execution time
- [V1] Per-flow reporting: entered, in-progress, completed, conversions, revenue

**Deferred:** Visual flow builder `[V2]`, branching logic `[V2]`, >3 flow types `[V2]`, custom triggers `[V2]`, cross-flow rules `[V2]`

## Module 08 · Signup forms

**Purpose:** Inline, popup, and hosted forms with opt-in and spam protection.

**V1**
- [V1] Simple form builder (field picker, required toggles, button text/colour)
- [V1] Three modes: inline embed, popup (timer/scroll), hosted page
- [V1] `<script>` embed rendering via iframe (avoids CSS conflicts)
- [V1] hCaptcha on every form
- [V1] Auto double-opt-in for EU contacts (MaxMind GeoLite2 IP geo)
- [V1] Confirmation email via Postmark
- [V1] On confirm: add to list + optional flow entry
- [V1] Auto SSL for hosted pages (Let's Encrypt)

**Deferred:** Form A/B testing `[V2]`, multi-step forms `[V2]`, quizzes/surveys `[V3]`, conditional logic `[V2]`, exit-intent `[V2]`, custom HTML embed `[V2]`

## Module 09 · Integrations

**Purpose:** Two directions — **inbound** e-commerce event sync, and **outbound** ESP export/delivery to the platforms Nepali agencies actually use.

**V1 — inbound (e-commerce sync)**
- [V1] WooCommerce — free WordPress.org plugin (customer.created, order.placed, cart.abandoned; two-way tag sync; self-updating)
- [V1] Shopify — private app first, public App Store listing in parallel
- [V1] Zapier outgoing webhook (escape hatch)
- [V1] HMAC-validated webhook receivers; upsert contacts → event log

**V1 — outbound (ESP export, 6 first-class platforms for Nepal)**
First-class only; everything else via the HTML/MJML + webhook escape hatch. `thirdPartyClientName` drives platform-specific attribute/merge-tag injection.
- [V1] **Mailchimp** (copy/paste) — most-used by Nepali SMBs/agencies; the tool we replace
- [V1] **MailerLite** (API push) — budget favorite, named in MVP §1
- [V1] **Brevo / Sendinblue** (API push) — affordable, email+SMS, strong in South Asia
- [V1] **SendGrid** (API push) — transactional + marketing, dev-led teams
- [V1] **HubSpot** (copy/paste) — B2B / larger clients
- [V1] **Klaviyo** (copy/paste) — e-commerce clients (Shopify/Woo)
- [V1] **Escape hatch:** raw HTML, raw MJML, Custom Webhook, Zapier, Make (reach any other platform)

**Deferred:** **Daraz (no API — explicitly excluded)**, **all other ESP exports** (Marketo, Salesforce, Braze, Iterable, MoEngage, Airship, OneSignal, Customer.io, Loops, Dotdigital, Netcore, Blueshift, SendX, Zeta, ActiveCampaign, Postmark, Stripo, Parcel, Mailjet, MailerLite Classic — built in code, not exposed in V1) `[V2]`, Magento/Wix/Squarespace/BigCommerce `[V2]`, native Stripe customer-create, HubSpot/Salesforce CRM sync `[V2]`, public integration API `[V2]`
> 📝 6-platform set is a market-reasoned proposal — confirm against real Nepal usage. **Zoho Campaigns** is a strong candidate but not yet in the codebase.

## Module 10 · Reporting & analytics

**Purpose:** Per-campaign, per-flow, per-client, per-agency dashboards.

**V1**
- [V1] Open tracking via 1×1 pixel from `track.sendmymail.np` (reputation-isolated domain)
- [V1] Click tracking via `track.sendmymail.np/c/{token}` → 302
- [V1] Events in Postgres, monthly partitions
- [V1] Per-campaign view (sent/delivered/open/click/bounce/complaint/unsub, top links, devices, geo)
- [V1] Per-flow, per-client, per-agency aggregate views
- [V1] Range filters (7/30/90 days, this year, custom)
- [V1] CSV export
- [V1] Weekly digest email to agency owner

**Deferred:** Real-time dashboard (V1 caches 60s), cohort retention `[V2]`, funnel analysis `[V2]`, heat maps `[V2]`, multi-channel attribution `[V3]`, custom report builder `[V2]`

## Module 11 · Billing

**Purpose:** NPR billing for Nepali agencies, USD for international.

**V1**
- [V1] Three hardcoded plans: Starter (₨2,499) / Pro (₨6,999) / Scale (₨14,999)
- [V1] Annual billing — 2 months free
- [V1] ★ Khalti integration (initiate → callback verify → webhook confirm)
- [V1] ★ eSewa integration (callback + HMAC verify)
- [V1] Stripe subscription for USD ($29/$79/$179)
- [V1] Usage tracking (nightly cron, soft-warn 90%, hard-block 100%)
- [V1] Renewal reminders (7/3/1-day, day-of, 3-day grace)
- [V1] PDF invoices with PAN/VAT number
- [V1] Self-service upgrades; downgrades at next cycle

**Deferred:** Card-on-file NPR recurring (Khalti Mandate `[V2]`), per-client agency invoicing `[V2]`, enterprise contracts `[V2]`, promo codes `[V2]`, multi-currency `[V2]`

## Module 12 · White-label

**Purpose:** Agency's clients see the agency's brand, never SendMyMail's.

**V1**
- [V1] ★ Custom domain mapping (CNAME `mail.theiragency.com` → `cname.sendmymail.np`)
- [V1] ★ Auto SSL (Let's Encrypt via Caddy or Vercel custom-domain API)
- [V1] Agency-level branding JSON (logo, primary + accent colour)
- [V1] `window.__BRAND__` by requesting domain — edge/proxy injection into `index.html` (Vite SPA, no SSR) + client-bootstrap fallback
- [V1] Branded forms, opt-in pages, unsubscribe pages
- [V1] "Powered by SendMyMail" footer — removable on Scale plan only
- [V1.5] Custom tracking-link domain (`track.theiragency.com`)

**Deferred:** Dashboard white-label `[V2]`, per-client branding `[V2]`, branded mobile app `[V3]`, custom font upload `[V2]`

## Module 13 · Onboarding wizard

**Purpose:** Guided setup to first send in under 10 minutes.

**V1**
- [V1] State machine on `onboarding_progress` JSON
- [V1] 4 steps: create client → verify domain → import contacts → send first campaign
- [V1] ★ PAN number required before first real send (manually reviewed)
- [V1] Skippable but persistent (incomplete-state banner)
- [V1] Per-step CTAs, copyable DNS records, copy-paste examples
- [V1] Inline failure-mode docs (DNS propagation, Cloudflare DKIM, CSV encoding)

**Deferred:** Auto DNS-provider one-click install `[V2]`, concierge onboarding (manual via Calendly), industry paths `[V3]`, interactive product tour `[V2]`

## Module 14 · Deliverability trust layer

**Purpose:** Invisible but critical — keeps SES happy, isolates bad actors.

**V1**
- [V1] ★ Tiered sending limits (1K/day wk1, 10K/day wk2–4, plan limits day 30+)
- [V1] ★ Auto-pause on >5% hard bounce OR >0.3% complaint
- [V1] CSV import quality check (reject >10% role accounts / scraped patterns)
- [V1] Global agency-level suppression (bounces + complaints never re-sent)
- [V1] ★ RFC 8058 List-Unsubscribe on every email
- [V1] Per-client deliverability score widget (engagement-weighted)
- [V1] ★ PAN verification before first real send
- [V1] Manual review of accounts sending >50K in first month
- [V1] SES bounce/complaint webhook ingestion

**Deferred:** Automated content scanning `[V2]`, dedicated IP pools `[V2]`, Google Postmaster Tools `[V2]`, seed-list inbox testing `[V2]`, ML abuse detection `[V3]`

---

## V1 permissions matrix

| Permission | Admin | Member |
|------------|:-----:|:------:|
| Create / delete clients | ✓ | — |
| Send campaigns | ✓ | ✓ |
| Edit templates and flows | ✓ | ✓ |
| Manage contacts and lists | ✓ | ✓ |
| Configure signup forms | ✓ | ✓ |
| Invite / remove teammates | ✓ | — |
| View billing | ✓ | view-only |
| Change plan | ✓ | — |
| Configure white-label | ✓ | — |
| Delete agency workspace | ✓ | — |

---

## Pricing (V1)

| Plan | NPR/mo | USD/mo | Clients | Emails/mo | Contacts | Notable |
|------|-------:|-------:|--------:|----------:|---------:|---------|
| Starter | 2,499 | $29 | 3 | 25,000 | 10,000 | Core features, email support |
| Pro ★ | 6,999 | $79 | 10 | 100,000 | 50,000 | White-label, priority support |
| Scale | 14,999 | $179 | 30 | 500,000 | 250,000 | Remove branding, dedicated contact |

Annual = 2 months free. **Beta:** first 20 agencies get 50% off forever.

---

## The 8 non-negotiables (Appendix B)

Cutting any of these cuts SendMyMail's reason to exist:

1. ★ Multi-tenant data isolation (`agency_id` + `client_id` on every query)
2. ★ AWS SES sandbox-out before any customer onboarding
3. ★ DKIM, SPF, DMARC, RFC 8058 unsubscribe on every email
4. ★ Tiered sending limits + auto-pause on bounce/complaint thresholds
5. ★ Khalti or eSewa working at launch (Stripe alone insufficient)
6. ★ White-label custom domain with auto-SSL
7. ★ PAN verification before first real send
8. ★ Privacy Act 2075 compliance (policy, data deletion, consent capture)
