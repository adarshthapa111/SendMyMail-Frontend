# SendMyMail · MVP specification

**Version:** 1.0
**Last updated:** May 2026
**Author:** Founding team
**Status:** Pre-build — for execution

---

## How to read this document

This document defines what SendMyMail ships in V1 and what waits for V2. It is the single source of truth for build scope. If a feature is not in V1 here, it is not in V1 — no matter how good the idea sounds in conversation.

The rules:

1. **V1 = the minimum that justifies SendMyMail's existence over Mailchimp.** Anything less is incomplete; anything more is V2.
2. **V2 is the next 6 months after V1 launches**, prioritized by what beta agencies actually ask for, not what we imagine they'll want.
3. **Cuts are explicit.** Every excluded feature is listed in section 9 with reasoning. Future scope creep gets pointed back here.
4. **The engine is multi-tenancy, not the editor.** Anywhere this document asks you to choose between investing in spine-level infrastructure versus surface-level polish, choose the spine.

---

## 1. The product in one paragraph

SendMyMail is an email marketing platform built specifically for Nepali digital agencies. An agency signs up once, manages many client accounts from a single dashboard, sends campaigns under each client's brand and sending domain, bills in NPR via Khalti or eSewa, and white-labels the entire experience so their clients never see the SendMyMail name. The platform handles deliverability through Amazon SES, complies with Gmail and Yahoo's Feb 2024 sender rules, and ships with the workflows Nepali agencies actually use — not generic SMB tools translated to Nepal.

## 2. Who V1 is for

V1 is built for a specific user: **a Nepali digital agency owner with 5 to 30 clients**, currently fragmented across multiple Mailchimp or Mailerlite accounts, paying in USD via personal credit cards, with no white-label, struggling to defend deliverability to clients, and losing 8 to 15 hours per week to context-switching.

V1 is not built for:

- SMBs sending their own email (they have Mailchimp; we are not competing for them)
- Enterprise senders over 1M emails per month (deliverability requirements at that scale need dedicated IPs and 24/7 ops we won't have)
- Transactional-email-only customers (we are marketing-focused; transactional is Postmark's market)
- Indian agencies (different payment rails, different language, different compliance — V3 territory)

If a prospect doesn't match the V1 user profile, the answer is honestly "not yet" — don't bend the product for them.

## 3. The strategic bet

Three non-negotiable bets define V1. Every feature must serve at least one of these:

| Bet | What it means | What it rules out |
|-----|---------------|-------------------|
| **Multi-client workspace** | One login, all clients listed and switchable in 2 clicks | Single-tenant features like personal-account customizations |
| **NPR billing, local payment** | Khalti, eSewa, Fonepay, plus Stripe for USD | Forcing customers through international cards |
| **White-label everything** | Custom domain, agency logo, branded forms and unsub pages | SendMyMail branding showing up where clients see it |

If a feature doesn't strengthen one of these three, it's V2.

## 4. The 14 V1 modules

Each module below has a one-line purpose, the V1 scope (what we build), and explicit out-of-scope items (what we don't, but might consider for V2).

### Module 01 · Authentication & workspace

**Purpose:** Agency signs up, creates a workspace, invites teammates. The shell every other module lives inside.

**V1 scope:**

- Email + password signup via Clerk or Supabase Auth (we do not build auth from scratch)
- Google OAuth as a second login option
- Email verification with 6-digit code (not magic link — works better when mail lands in spam)
- Workspace creation flow with unique slug at `{slug}.sendmymail.np`
- Team member invites via email-bound token, expiring in 7 days
- Two roles: `admin` and `member`
- Password reset, forgot-password flow with anti-enumeration messaging
- Optional TOTP 2FA (Google Authenticator, Authy) with downloadable recovery codes

**Out of scope for V1:**

- SMS 2FA (expensive in Nepal, less secure than TOTP)
- WebAuthn / passkeys (V2)
- SSO / SAML (enterprise feature, not relevant for our V1 user)
- Client-facing logins (covered in section 5)

### Module 02 · Client management

**Purpose:** The unique value-prop. An agency manages many clients from one dashboard.

**V1 scope:**

- Create, edit, soft-delete clients (hard delete deferred — billing dispute protection)
- Top-nav client switcher accessible from every screen, persisting selection in session
- URL pattern `/{agency-slug}/clients/{client-slug}/{module}` so deep links work
- Per-client: name, brand colour, default from-name, default from-email
- Client list view sortable by last activity, contacts count, billing status
- All downstream data (contacts, campaigns, templates, lists) scoped by `client_id`

**Out of scope for V1:**

- Client portal where clients log in to view their own reports (V2 — covered in section 5)
- Per-client custom permissions for agency members (admin vs member is enough for V1)
- Cross-client reporting that aggregates all clients into one view (V2)
- Client groups or tags (V2 — only needed once agencies have 20+ clients)

### Module 03 · Sending domain verification

**Purpose:** Per-client sending domain with DKIM, SPF, DMARC verification.

**V1 scope:**

- AWS SES `VerifyDomainDkim` integration generating two DKIM CNAME records
- Copy-button UI for all required DNS records (SPF, DKIM 1, DKIM 2, DMARC, Return-Path)
- Background worker re-checks unverified domains hourly using Node's `dns.resolveTxt`
- Status badges: Pending, Verified, Failed (with reason)
- Hard block on sending from unverified domains (422 response)
- DMARC defaults to `p=quarantine` — never auto-apply `p=reject`
- One-click unsubscribe header (RFC 8058) on every email — required by Gmail/Yahoo Feb 2024 rules

**Out of scope for V1:**

- BIMI (Brand Indicators for Message Identification — image next to sender name in Gmail)
- Dedicated IP pools per client (V2 for high-volume customers)
- DNS hosted directly by SendMyMail (we provide records, agency adds them; full DNS hosting is V3)
- ARC (Authenticated Received Chain) signing — not needed for V1 volume

### Module 04 · Contacts & lists

**Purpose:** Per-client contact database with lists, tags, segmentation, custom fields, suppression.

**V1 scope:**

- Postgres `contacts` table with `UNIQUE (client_id, lowercased_email)`
- Standard fields (first name, last name, phone, city, birthday) + `jsonb` for up to 10 custom fields per client
- Lists with many-to-many `list_contacts` membership and per-list subscription status
- Tags (free-text, multi-select on contact)
- CSV import via `papaparse` with streaming for large files, UTF-8 detection, BOM stripping, dedupe by email within list
- Mandatory consent declaration checkbox on every import
- Segmentation rule-builder UI with maximum 5 conditions, AND/OR combinations, compiled to parameterized SQL
- Suppression at two levels: client-level (unsubscribed) and agency-level (hard bounces, complaints)
- GDPR right-to-erasure: deleting a contact cascades through `list_contacts`, `events`, `sends`

**Out of scope for V1:**

- More than 10 custom fields per client (rare in practice; can lift in V2)
- Segmentation with more than 5 conditions, or with nested AND/OR groups (V2)
- Behavioural segments based on past campaign engagement (V2 — needs the events architecture to be more mature)
- Predictive scoring / lead scoring (V3)
- Contact merging / dedupe across lists (V2)

### Module 05 · Email builder

**Purpose:** Visual editor producing reliable, MJML-rendered emails.

**V1 scope:**

- Use our **custom in-house MJML drag-and-drop builder** — block-based editor (tree model + inspector + canvas) that compiles to MJML/HTML server-side. (We are not using a third-party editor — see decision log §12.)
- Save the MJML source to database, render HTML at send time so template fixes propagate
- Merge tags: `{{first_name|fallback}}`, `{{email}}`, `{{custom.field_name}}`
- Desktop and mobile previews
- Send-test functionality via Postmark (not customer's SES — keeps platform mail separate from customer reputation)
- **8 starter templates**, each tested in Gmail, Outlook 2016+, and Apple Mail:
  1. Welcome / first-touch
  2. Newsletter
  3. Promo / sale
  4. Order confirmation
  5. Abandoned cart
  6. Birthday
  7. Re-engagement / win-back
  8. Festive (Dashain/Tihar — Devanagari support tested)
- Agency-level templates (saved once, reusable across all clients with brand-colour swap)

**Out of scope for V1:**

- Third-party embedded editors (Unlayer, etc.) — we ship our own builder (see decision log §12)
- 200+ template library (we will ship 8 great ones, not 200 mediocre ones)
- AI-generated content or subject lines (V2)
- Template marketplace / community templates (V2)
- Inline AMP for Email (rare in Nepal, complex to ship safely)

### Module 06 · Campaign engine

**Purpose:** One-shot broadcast pipeline from queue to send to webhook ingestion.

**V1 scope:**

- 6-step campaign wizard: Name → Recipients → From/Subject → Template → Schedule → Review
- Recipient snapshot taken at send time to prevent drift mid-send
- BullMQ on Upstash Redis for job queuing
- One job per N recipients (configurable, default 100)
- Worker checks global + client suppression before render, renders MJML to HTML, calls SES `SendEmail`
- Per-agency rate limit starts at 14 emails/sec (SES sandbox-out default), grows with SES quota
- SNS topic → `/webhooks/ses` endpoint → BullMQ ingestion → updates `sends` table
- Tracked statuses: queued, sent, delivered, bounced (hard/soft), complained, opened, clicked, unsubscribed
- Idempotency via SES message ID dedup (retried jobs must not double-send)
- Tiered sending limits for new agencies: 1K/day in week 1, 10K/day in weeks 2-4, plan limits at day 30+

**Out of scope for V1:**

- A/B testing on subject lines or content (V2)
- Send-time optimization based on per-recipient engagement history (V2)
- Multi-language send via dynamic content (V2)
- Scheduled-send timezone-per-recipient (V1 sends in the agency's timezone)
- Recurring campaigns (use flows instead)

### Module 07 · Marketing automation (flows)

**Purpose:** Pre-built automation templates configured by wizard, not by visual flow builder.

**V1 scope:**

- **Three flow types**, each with a fixed configuration schema (no drag-and-drop canvas):
  1. **Welcome series** — 3 emails over 7 days, triggered by list-add
  2. **Abandoned cart** — 2 emails (1h, 24h), triggered by WooCommerce/Shopify webhook
  3. **Birthday** — 1 email on the day, triggered by daily cron
- Per-flow stop conditions: contact unsubscribes, contact places an order, contact opens specific email
- BullMQ delayed jobs for step scheduling (with daily cron fallback for delays >30 days)
- `flow_executions` table tracking per (flow_id, contact_id): current step, status, started_at
- Re-check suppression at job execution time (race conditions between schedule and execute)
- Per-flow reporting: entered, in-progress, completed, conversions, attributed revenue

**Out of scope for V1:**

- Visual flow builder with drag-and-drop nodes (V2 — but only if beta validates demand)
- Branching logic ("if opened email 1 then send X, else send Y") — V2
- More than 3 flow types (V2 will likely add: re-engagement, post-purchase upsell, lead nurture)
- Custom triggers beyond the 3 we ship (V2)
- Cross-flow contact rules ("don't enter flow B if in flow A") — V2

### Module 08 · Signup forms

**Purpose:** Inline, popup, and hosted forms with proper opt-in and spam protection.

**V1 scope:**

- Simple form builder (no drag-and-drop): field picker, required toggles, button text/colour
- Three rendering modes: inline embed, popup (timer or scroll trigger), hosted page (full URL)
- Output as `<script>` tag the agency pastes on the client's site (renders via iframe to avoid CSS conflicts)
- hCaptcha integration on every form
- Auto-double-optin for EU contacts via IP geolocation (MaxMind GeoLite2)
- Confirmation email sent via Postmark
- On confirmation: add to chosen list + optional flow entry
- Hosted-page forms get auto-issued SSL via Let's Encrypt

**Out of scope for V1:**

- A/B testing on form variants (V2)
- Multi-step forms (V2)
- Quizzes or surveys (V3)
- Conditional logic (show field B if field A = X) — V2
- Exit-intent triggers (V2 — current popup is timer/scroll only)
- Custom HTML form embed (V2)

### Module 09 · Integrations

**Purpose:** Two directions. **Inbound** — sync customers, orders, and cart events from the agency's e-commerce platforms. **Outbound** — push the built email out to the email platform the client already uses.

**V1 scope — inbound (e-commerce event sync):**

- **WooCommerce** — free WordPress plugin distributed via WordPress.org
  - Captures: customer.created, order.placed, cart.abandoned (via session hook)
  - Two-way: tags applied in SendMyMail can flag customers in WooCommerce
  - Plugin self-updates via standard WP update channel
- **Shopify** — private/custom app for initial customers; public App Store listing in parallel (4-8 week approval)
- **Zapier webhook** — outgoing webhooks for any event (escape hatch for everything we don't natively support)
- Webhook receivers validate HMAC signatures, upsert contacts, fire events into the event log

**V1 scope — outbound (ESP export & delivery):**

V1 ships **first-class** integrations only for the email platforms Nepali agencies and their clients actually use. Every other platform stays reachable through the universal **HTML / MJML copy + webhook** escape hatch — so we keep full coverage without building and maintaining 40 integrations. The backend's `thirdPartyClientName` drives platform-specific attribute / merge-tag injection.

**First-class platforms (Nepal — 6):**

- **Mailchimp** — the most widely used by Nepali SMBs and agencies; the tool this product is replacing (see §1). Copy/paste HTML.
- **MailerLite** — budget favorite, also named in §1. API push (connect + push draft).
- **Brevo (Sendinblue)** — affordable, email + SMS, strong in South Asia. API push.
- **SendGrid** — transactional + marketing, common with developer-led teams. API push.
- **HubSpot** — for B2B and larger agency clients. Copy/paste HTML.
- **Klaviyo** — for e-commerce clients on Shopify / WooCommerce. Copy/paste HTML.

**Universal escape hatch (covers every other platform):**

- **Raw HTML** and **Raw MJML** export (copy/paste into anything)
- **Custom Webhook**, **Zapier**, **Make** — POST compiled HTML to any URL

> ⚠️ **Confirm with local knowledge.** This 6-platform set is a market-reasoned proposal (Mailchimp + MailerLite are named in the MVP; the rest are inferred from the South-Asian SMB/agency market). Adjust to what you actually see in Nepal.
>
> **Candidate to add:** **Zoho Campaigns** is very popular in Nepal/South Asia but is **not yet in the codebase** — decide whether to build it for V1.

**Out of scope for V1:**

- **Daraz** — explicitly excluded; they have no third-party API. Document this honestly in the integrations page and tell prospects directly.
- **All other ESP exports** beyond the 6 first-class platforms — Marketo, Salesforce, Braze (+Content Block), Iterable (+Snippet), MoEngage (+Block), Airship, OneSignal, Customer.io, Loops, Dotdigital, Netcore, Blueshift, SendX, Zeta, ActiveCampaign, Postmark, Stripo, Parcel, Mailjet, MailerLite Classic. These exist in the codebase but are **not exposed in V1**; enable per beta demand. Until then they're covered by the HTML/MJML + webhook escape hatch. (V2)
- Magento, Wix, Squarespace, BigCommerce (V2 if 3+ beta customers ask)
- Native Stripe/payment-gateway integration for customer creation (use Zapier in V1)
- Salesforce / HubSpot CRM *sync* (V2 — distinct from HubSpot email export above)
- Native API for agencies to build their own integrations (V2)

### Module 10 · Reporting & analytics

**Purpose:** Per-campaign, per-flow, per-client, per-agency dashboards.

**V1 scope:**

- Open tracking via 1×1 pixel from `track.sendmymail.np` (separate domain to isolate reputation)
- Click tracking via redirect through `track.sendmymail.np/c/{token}` → 302 to destination
- Events stored in Postgres with monthly partitions (migrate to ClickHouse in V2)
- Per-campaign view: sent, delivered, open, click, bounce, complaint, unsub, top links, devices, geo
- Per-flow view: entered, in-progress, completed, conversions, revenue
- Per-client view: aggregate of all campaigns and flows for that client
- Per-agency view: aggregate of all clients (the dashboard)
- Filter range: last 7 / 30 / 90 days, this year, custom
- Export to CSV
- Weekly digest email to agency owner summarizing all clients

**Out of scope for V1:**

- Real-time dashboard (V1 metrics refresh on read, cached 60s)
- Cohort retention analysis (V2)
- Funnel analysis across multiple campaigns/flows (V2)
- Heat maps showing where users clicked in the email (V2)
- Attribution to non-email channels (V3 — different product space)
- Custom report builder (V2)

### Module 11 · Billing

**Purpose:** NPR billing for Nepali agencies, USD billing for international.

**V1 scope:**

- Three hardcoded plans: Starter (NPR 2,499), Pro (NPR 6,999), Scale (NPR 14,999)
- Annual billing option with 2 months free (incentivize cash upfront)
- Khalti integration: initiate payment → callback verify → webhook confirm
- eSewa integration: similar callback flow with HMAC verification
- Stripe subscription for USD billing (requires Delaware C-Corp or Singapore Pte Ltd parent — see section 7)
- Usage tracking: nightly cron updates `usage_counters`, soft-warn at 90%, hard-block at 100%
- Renewal reminder flow: 7-day, 3-day, 1-day-before, day-of, 3-day grace
- Invoice generation as PDF via Puppeteer or pdfkit; invoices show PAN/VAT number
- Self-service plan upgrades; downgrades take effect at next billing cycle

**Out of scope for V1:**

- True card-on-file recurring billing in NPR (Khalti and eSewa don't support this; manual renewal is required)
- Khalti Mandate API (covers some banks; evaluate in V1.5 if churn from manual renewal is painful)
- Per-client billing where the agency invoices each client (V2 — would unlock the "agency reseller" pricing tier)
- Custom enterprise contracts / negotiated pricing (V2)
- Promo codes and discount engine (V2)
- Multi-currency for agencies operating in NPR + USD simultaneously (V2)

### Module 12 · White-label

**Purpose:** Agency's clients see the agency's brand, never SendMyMail's.

**V1 scope:**

- Custom domain mapping: agency CNAMEs `mail.theiragency.com` to `cname.sendmymail.np`
- Auto-issued SSL via Let's Encrypt (Caddy reverse proxy or Vercel custom-domain API)
- Branding stored as agency-level JSON: logo URL, primary colour, accent colour
- Brand resolved by requesting domain: the edge/proxy (Caddy/Vercel) injects `window.__BRAND__` into the static `index.html` by `Host` so there's no flash of SendMyMail branding; the SPA falls back to a `/branding?host=` fetch at bootstrap (gated behind a neutral splash). (Vite SPA — no SSR.)
- Forms, opt-in confirmation pages, unsubscribe pages all use agency branding
- "Powered by SendMyMail" footer on emails — removable only on Scale plan (drives upsell)
- Custom domain for tracking links (V1.5: `track.theiragency.com` instead of `track.sendmymail.np`)

**Out of scope for V1:**

- Full white-label of the agency dashboard itself with custom domain (V2 — auth complexity is high)
- Per-client white-label within an agency (V2 — different clients of one agency seeing different brands)
- Mobile app with agency branding (V3)
- Custom font upload (V2)

### Module 13 · Onboarding wizard

**Purpose:** Guided setup completing first send in under 10 minutes.

**V1 scope:**

- State machine on `onboarding_progress` JSON
- 4 steps: create first client → verify domain → import contacts → send first campaign
- PAN number collection required before first real send (anti-spammer check; manually reviewed in V1)
- Skippable but persistent (banner reminder on incomplete state)
- Each step has clear CTA, copyable DNS records, copy-paste examples
- Failure modes documented inline: DNS propagation delays, Cloudflare-proxy DKIM issues, CSV encoding problems

**Out of scope for V1:**

- Auto-detected DNS provider with one-click record installation (V2 — Mailerlite has this, would be nice)
- Concierge onboarding by SendMyMail staff (handle manually in V1 via Calendly, not in-product)
- Industry-specific onboarding paths (V3)
- Interactive product tour with tooltips (V2 if onboarding completion rate is under 50%)

### Module 14 · Deliverability trust layer

**Purpose:** Invisible but critical — keeps AWS SES happy and protects all agencies from any one bad actor.

**V1 scope:**

- Tiered sending limits for new agencies: 1K/day week 1, 10K/day weeks 2-4, plan limits at day 30+
- Auto-pause on any campaign with >5% hard bounce OR >0.3% complaint
- CSV import quality check: reject if >10% role accounts (info@, admin@) or scraped patterns
- Global agency-level suppression: hard bounces + complaints never re-sent across any client
- RFC 8058 one-click List-Unsubscribe header on every email
- Per-client deliverability score widget (engagement-weighted)
- PAN verification required before first real send
- Manual review of accounts sending >50K emails in their first month
- AWS SES bounce/complaint webhook ingestion with proper handling

**Out of scope for V1:**

- Automated content scanning (subject-line spam-trigger detection, link-reputation check) — V2
- Dedicated IP pool option for high-volume customers (V2)
- Google Postmaster Tools integration for per-domain reputation monitoring (V2)
- Inbox placement testing via seed-list services (V2)
- ML-based abuse detection (V3)

## 5. Roles, permissions, and who logs in

This section is the auth model — possibly the most important conceptual decision in the product.

### Who has a login in V1

- **Agency owner** — the person who signs up, pays the bill. Workspace admin by default.
- **Agency team members** — invited by the owner. Two roles: `admin` or `member`.
- **SendMyMail internal staff** — separate admin app, not part of this MVP.

### Who does NOT log in in V1

- **The agency's clients** (Khukri Spices, Himalaya Trekking, etc.) — managed entities, not users.
- **Email recipients** — they receive campaigns but never visit SendMyMail.
- **Anyone unauthenticated** — except via signup forms and unsubscribe pages, which are public.

### Why clients don't log in to V1

This is the V1's most defensible cut. The agency-reseller model says: the agency is the customer, the client is the agency's product. Building client portals means:

- Doubling the auth surface (separate user table, separate sessions, separate permissions)
- Building per-client white-labelled login pages (different from agency white-label)
- Most agencies don't *want* clients logged in — they want to send polished reports themselves
- The 20% of agencies who want client portals are V2 launch material, not V1 blockers

### V1 permissions matrix

| Permission | Admin | Member |
|------------|-------|--------|
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

Members see everything (transparency over hiding), but action buttons on admin-only features are disabled with a tooltip.

## 6. Pricing

| Plan | Price (NPR) | Clients | Emails/mo | Contacts | Notable features |
|------|-------------|---------|-----------|----------|------------------|
| **Starter** | 2,499 | 3 | 25,000 | 10,000 | All core features, email support |
| **Pro** ★ | 6,999 | 10 | 100,000 | 50,000 | White-label included, priority support |
| **Scale** | 14,999 | 30 | 500,000 | 250,000 | Remove SendMyMail branding, dedicated success contact |

Annual: 2 months free if paid upfront. USD pricing for international agencies via Stripe: $29 / $79 / $179.

**Beta pricing:** First 20 agencies lock in 50% off forever.

## 7. Legal and operational dependencies for V1

These are not features but they block launch. Apply for them on Day 1, not Week 12.

1. **AWS SES production access** — application takes 1-5 days. Without it, sending architecture changes entirely.
2. **Khalti merchant account** — KYC takes ~2 weeks. Without it, no NPR billing path.
3. **eSewa merchant account** — similar timeline; both apps run in parallel.
4. **Pvt Ltd registration at OCR + PAN/VAT** — 2-4 weeks. Required to legally store customer data under Privacy Act 2075 and to issue valid invoices.
5. **Domain ownership** — `sendmymail.np` + `sendmymail.com` registered to the founding entity.
6. **Stripe** — only if international billing is a V1 goal. Requires Delaware C-Corp or Singapore Pte Ltd; otherwise defer to V1.5.
7. **WordPress.org plugin submission** — 2-4 week review. Submit by Week 12 to be live for launch.
8. **Privacy policy, terms of service, anti-spam policy** — drafted by Week 10, reviewed by a lawyer who knows Nepal law before launch.

## 8. Build timeline · 16 weeks, 2 people

The order matters. Engine first, surface last.

| Weeks | Focus | Why now |
|-------|-------|---------|
| **1-2** | Multi-tenant infrastructure: schema, `agency_id` + `client_id` on every table, URL routing, session-scoped client switcher, permission middleware | The engine. Everything else plugs into this. |
| **3-4** | Auth + workspace + client management (the shell, including tenant-isolation tests) | First user-facing screens, but built on the engine |
| **5-7** | Deliverability infrastructure: SES setup, sandbox-out application, DNS verification flow, suppression handling, tiered limits | Second largest investment. Failure here = company over. |
| **8-9** | Contacts, lists, segmentation, CSV import | Per-client data flowing through the engine |
| **10-11** | Email builder (custom in-house MJML builder), 8 starter templates, campaign wizard, ESP-export targets | Editor lives here — bounded scope, late in build |
| **12-13** | Automation flows (3 hardcoded), signup forms, WooCommerce plugin | The agency workflow features |
| **14-15** | Billing (Khalti, eSewa, Stripe), white-label custom domain, reporting dashboard | Revenue and polish |
| **16** | Hardening, deliverability tuning, beta onboarding for first 5 agencies | Reality check |

Apply for SES production access, Khalti, eSewa, OCR registration on **Day 1 of Week 1**.

## 9. Explicit cuts · what is NOT in V1, and why

These have come up in conversation and been deliberately deferred. When someone asks "why aren't we shipping X?", point them here.

| Feature | Why deferred | V2 trigger |
|---------|--------------|------------|
| Visual flow builder | 4-8 weeks of work; wizard-configured flows cover 80% of agency needs | 3+ beta agencies ask in writing |
| 200+ template library | Vanity feature; agencies use 3-5 templates repeatedly | Beta data shows organic template demand |
| Visual flow builder branching | Adds 2 weeks; wizard flows work for V1 | Same as flow builder above |
| Daraz integration | Daraz has no third-party API; impossible to ship honestly | Daraz publishes one |
| SMS marketing | Different product space; needs different infrastructure | Email is excellent and customers ask |
| WhatsApp marketing | Requires Meta Business API approval (months) | After email is excellent |
| AI subject-line generation | Table stakes feature, not differentiating; 1 week to add later | When 10+ agencies ask |
| Client portals (clients log in) | Doubles auth complexity; most agencies don't want it | When 20% of beta asks |
| Real-time analytics | 60s cache is fine for V1; ClickHouse migration is V2 | Single tenant exceeds 10M events/mo |
| A/B testing | Adds campaign-engine complexity | When data shows agencies need it |
| Predictive lead scoring | Requires ML infrastructure | V3 territory |
| Mobile native apps | Web responsive is fine for V1 | If beta usage skews >40% mobile |
| Mailchimp migration tool | Manual CSV import works; tool is V2 if onboarding friction is high | Onboarding completion under 50% |
| Magento, Wix, Squarespace, BigCommerce | WooCommerce + Shopify covers ~85% of Nepali e-commerce | 3+ beta agencies need it |
| Custom DNS hosting (we host their DNS) | DNS records workflow is enough | V3 — different operational complexity |
| Nepali-language UI (i18n) | English-only V1 because all our beta users speak English fluently | V1.1 — translate by month 3 |
| Per-recipient send-time optimization | Needs months of engagement data per contact | V2 |
| Heat maps in reports | Nice-to-have; basic click-through reporting suffices | V2 if 3+ agencies ask |
| BIMI logos | Cool but rarely seen in Nepal inboxes | V2 |

## 10. V2 roadmap · the 6 months after V1 ships

V2 is shaped entirely by what V1 beta agencies say, not by what we imagine they'll want. The list below is a **prioritized hypothesis**, not a commitment. Rank may shift dramatically based on real customer signal.

### V2 quarter 1 (months 1-3 after V1 launch)

**Priority 1 · Khalti Mandate API integration**
*Why:* If V1 churn from manual renewal exceeds 8% in the first 60 days, automatic recurring billing in NPR becomes the most valuable single feature we can ship. Khalti Mandate covers a subset of Nepali banks for true card-on-file. Estimated 2-3 weeks.

**Priority 2 · Visual flow builder**
*Why:* If 3+ agencies in the beta cohort request branching logic ("send X if opened email 1, else Y"), this is the feature unblocking automation-heavy clients. Estimated 4-6 weeks.

**Priority 3 · Client portal (read-only)**
*Why:* If 4+ beta agencies request giving their clients direct dashboard access (instead of always emailing reports), build the V2 client portal. Read-only campaign reports, separate auth, branded login. Estimated 4 weeks.

**Priority 4 · Cross-client agency reporting**
*Why:* Once agencies have 10+ clients, aggregate views ("which client had the best month?") become valuable. Estimated 1 week.

**Priority 5 · ClickHouse migration for events**
*Why:* If any single tenant exceeds 10M events/month, Postgres partitions will start choking. Move events to ClickHouse. Estimated 2 weeks.

### V2 quarter 2 (months 4-6 after V1 launch)

**Priority 6 · Nepali-language UI**
*Why:* Lower-tier customers (Starter plan) often have less English fluency. If translation unlocks the next 30 customers, ship it. Estimated 2-3 weeks (UI strings + onboarding flow).

**Priority 7 · A/B testing on campaigns**
*Why:* Subject-line testing is the highest-ROI experiment any agency can run. Once we have the campaign engine reliable, this is straightforward. Estimated 2-3 weeks.

**Priority 8 · Additional automation flow types**
*Why:* Add re-engagement / win-back, post-purchase upsell, lead nurture. Each becomes another wizard-configured flow. Estimated 1 week per flow.

**Priority 9 · Dedicated IP pools for Scale customers**
*Why:* If any Scale-tier agency exceeds 200K emails/month, their reputation should be isolated. Estimated 1-2 weeks.

**Priority 10 · Per-client custom branding within an agency**
*Why:* Currently white-label is agency-level. V2 could let each client within an agency have their own login experience. Estimated 3 weeks.

**Priority 11 · Magento or Wix integration** (whichever 3+ beta agencies request first)

**Priority 12 · AI subject-line suggestions**
*Why:* Easy to ship once OpenAI integration is in place. 1 week. Adds checkbox-feature parity with Mailchimp.

### V2.5 / V3 backlog (not committed, but tracked)

- Mailchimp migration tool (one-click import from a Mailchimp API key)
- SMS marketing via Twilio / local Nepali SMS gateway
- WhatsApp Business API integration
- BIMI logo support
- Predictive lead scoring
- Custom report builder
- Native mobile apps (iOS + Android)
- Multi-language send (one campaign, three language variants)
- Salesforce / HubSpot CRM sync
- Webhooks for outgoing events (Zapier-like)
- Public REST API for agencies to build their own integrations
- Client portal with edit access (currently V2 is read-only)
- Inbox placement testing via seed-list services
- Heat maps in campaign reports
- Custom domain for tracking links (`track.theiragency.com`)
- WhatsApp / SMS as a 2FA option

## 11. Success metrics — how we know V1 worked

Measured at month 6 after launch:

| Metric | Target | Why this matters |
|--------|--------|------------------|
| Paying agencies | 30+ | Validates product-market fit at small scale |
| MRR | NPR 200,000+ | Approximate break-even on infra + minimal founder pay |
| Average agency: clients managed | 5+ | Multi-client value-prop is being used, not bypassed |
| Gmail inbox rate | 95%+ | Deliverability story is real |
| Bounce rate (platform-wide) | <2% | Quality of customers we're attracting |
| Complaint rate (platform-wide) | <0.1% | Critical for AWS SES standing |
| Onboarding completion rate | 60%+ | Onboarding wizard is working |
| Time to first campaign send | <30 min median | Onboarding flow is smooth |
| NPS score | 40+ | Customers would recommend us |
| Logo churn (monthly) | <5% | We're keeping who we win |
| Support ticket volume | <2 tickets per agency per month | Self-serve features actually work |

If V1 hits these, V2 priorities are confirmed. If V1 misses any of them significantly, V2 priorities reset based on the gap.

## 12. Decision log

Every major scope decision goes here. When a future conversation asks "why did we decide X?", point here.

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| May 2026 (rev.) | Use custom in-house MJML builder, not Unlayer | Builder is already built and working; adopting Unlayer would discard working code. Our own tree also gives full control over ESP-export attribute injection. (Reverses the earlier "use Unlayer" decision.) | Yes — MJML source is portable |
| May 2026 | Clients don't log in to V1 | Doubles auth complexity, most agencies don't want it | Yes — V2 adds client portal |
| May 2026 | Daraz excluded from V1 integrations | No third-party API exists | Yes — when Daraz publishes one |
| May 2026 | 3 hardcoded flows, no visual builder | Wizard flows cover 80% of needs in 1/4 the build time | Yes — V2 priority 2 |
| May 2026 | Khalti/eSewa for NPR, manual renewal accepted | True card-on-file doesn't exist in Nepal yet | Yes — V2 adds Khalti Mandate |
| May 2026 | 8 templates, not 200 | Quality > quantity; agencies build their own library | Yes — add templates as data |
| May 2026 | English-only V1 | Beta users speak English; saves 2 weeks | Yes — V2.6 adds Nepali |
| May 2026 | Pro plan as flagship | NPR 6,999 is the price point Nepali agencies will accept; Starter is acquisition, Scale is upsell | Yes — adjust pricing post-launch |
| May 2026 (rev.) | Vite SPA frontend, not Next.js | Matches the existing `sendmymail-frontend` build; no SSR dependency in V1. White-label brand injection moves to edge/proxy + client bootstrap instead of SSR. (Reverses the earlier Next.js choice.) | Yes — but SSR-style features (brand injection, hosted pages) need SPA-compatible designs |

---

## Appendix A · Technical stack (locked for V1)

- **Frontend:** Vite + React + TypeScript (client-rendered SPA — matches the `sendmymail-frontend` repo)
- **Backend:** NestJS + TypeScript on Node.js
- **Database:** Postgres (Neon for managed hosting)
- **Cache / queue:** Upstash Redis + BullMQ
- **Email sending:** Amazon SES (us-east-1)
- **Transactional / platform email:** Postmark (separate from customer SES)
- **Auth:** Clerk (or Supabase Auth — decide Week 1)
- **File storage:** Cloudflare R2
- **Hosting:** Vercel (frontend) + Railway or Fly.io (backend workers)
- **DNS:** Cloudflare
- **Monitoring:** Sentry + Better Stack
- **Analytics:** PostHog (self-hosted on Hetzner if cost matters)
- **Email builder:** Custom in-house MJML drag-and-drop builder (React; server-side MJML→HTML compilation)
- **CSV parsing:** papaparse
- **Captcha:** hCaptcha (free tier)
- **Geo lookup:** MaxMind GeoLite2

Estimated V1 infrastructure cost: **~$200/month** at launch scale, scaling sub-linearly with revenue.

## Appendix B · The non-negotiables

If anyone — including the founders — proposes cutting one of these from V1, refer them back here. Cutting any of these means cutting SendMyMail's reason to exist.

1. Multi-tenant data isolation (every query carries `agency_id` + `client_id`)
2. AWS SES sandbox-out completed before any customer onboarding
3. DKIM, SPF, DMARC, RFC 8058 unsubscribe on every email
4. Tiered sending limits and auto-pause on bounce/complaint thresholds
5. Khalti or eSewa working at launch (Stripe alone is not enough)
6. White-label custom domain with auto-SSL
7. PAN verification before first real send
8. Privacy Act 2075 compliance (privacy policy, data deletion, consent capture)

Everything else is negotiable. These eight are not.

---

*This document is the source of truth for V1 scope. Update it when scope changes; reference it in every planning conversation.*