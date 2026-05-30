# SendMyMail · V1 Feature Details

> Companion to [feature_list.md](./feature_list.md). Where the list is the
> at-a-glance index, this file explains **each feature in depth** — what it
> does, why it exists, and how it works — derived from [doc/MVP.md](../MVP.md).
>
> Each entry follows the same shape:
> **What** (the behaviour) · **Why** (the reasoning) · **How** (the mechanism).

---

## Module 01 · Authentication & workspace

The shell every other module lives inside. An agency must be able to get in, prove who they are, and bring their team.

### Email + password signup (Clerk or Supabase Auth)
- **What:** Standard sign-up with email and password.
- **Why:** Auth is a solved, high-risk problem — session handling, hashing, breach response. Building it from scratch burns weeks and invites security mistakes. The provider decision (Clerk vs Supabase) is made in Week 1.
- **How:** A hosted auth provider issues sessions; the app holds only the provider's tokens, never raw passwords.

### Google OAuth login
- **What:** "Sign in with Google" as a second option.
- **Why:** Agency owners often already live in Google Workspace; one-click login removes a signup-funnel drop-off point.
- **How:** OAuth 2.0 authorization-code flow handled by the same auth provider.

### Email verification via 6-digit code
- **What:** New accounts confirm their address by typing a 6-digit code, **not** by clicking a magic link.
- **Why:** This is a deliberate deliverability decision. A code can be read and re-typed even from the spam folder; a magic link is useless if the mail lands in spam or is opened on a different device. For an email company whose own mail must reach inboxes, the code is the safer default.
- **How:** Code generated server-side, emailed via Postmark (platform mail), validated against a short TTL.

### Workspace creation with slug `{slug}.sendmymail.np`
- **What:** Each agency picks a unique slug that becomes its subdomain.
- **Why:** The slug is the tenant's address. It seeds the URL structure used everywhere downstream and is the anchor for white-label later.
- **How:** Slug uniqueness enforced at the DB level; subdomain routing resolves it to the agency tenant.

### Team invites (email-bound token, 7-day expiry)
- **What:** Owner invites teammates by email; the invite link only works for that address and dies after 7 days.
- **Why:** Email-binding prevents a forwarded/leaked link from creating an account for the wrong person. Expiry limits the window of a stale invite being abused.
- **How:** Signed token carries the invited email + workspace; server rejects mismatches and expired tokens.

### Two roles: `admin` and `member`
- **What:** A flat two-role model (see the permissions matrix in feature_list.md).
- **Why:** Granular per-feature permissions are a V2 problem. Two roles cover the real need: who can spend money / change structure (admin) vs who can do the daily work (member).

### Password reset with anti-enumeration messaging
- **What:** Forgot-password always shows the same "if an account exists, we sent an email" message.
- **Why:** Telling an attacker whether an email is registered leaks which accounts to target. Identical responses regardless of account existence closes that leak.

### Optional TOTP 2FA with recovery codes
- **What:** Time-based one-time codes (Google Authenticator, Authy) plus downloadable backup codes.
- **Why:** TOTP is chosen over **SMS 2FA** deliberately — SMS is expensive in Nepal and less secure (SIM-swap, interception). Recovery codes prevent lockout when a phone is lost.

## Module 02 · Client management

This is the unique value-prop. Everything an agency does happens *for a client*, and the platform must make switching between many clients effortless.

### Create / edit / soft-delete clients
- **What:** Clients can be created and edited; deleting only marks them deleted (soft delete). Hard delete is deferred.
- **Why:** An agency in a billing dispute with a client must not be able to destroy the records that prove what was sent. Soft delete keeps the audit trail.

### Top-nav client switcher (session-persisted)
- **What:** A switcher on every screen that changes the active client in 2 clicks; the choice sticks for the session.
- **Why:** This *is* the multi-tenant value-prop made tangible. The pain it solves — agencies losing 8–15 hrs/week to logging in and out of separate Mailchimp accounts — is the company's reason to exist.

### URL pattern `/{agency-slug}/clients/{client-slug}/{module}`
- **What:** Deep, human-readable URLs that encode agency + client + module.
- **Why:** Deep links must survive — a teammate pasting a link to "Khukri Spices' campaign report" should land exactly there, scoped correctly.

### Per-client brand defaults
- **What:** Each client stores name, brand colour, default from-name, default from-email.
- **Why:** Pre-filling these per client means campaigns go out under the right identity without re-entry every time, and brand colour feeds template colour-swapping.

### Sortable client list
- **What:** List view sortable by last activity, contact count, billing status.
- **Why:** At 10–30 clients the owner needs to triage — who's gone quiet, who's largest, who's overdue.

### All data scoped by `client_id`
- **What:** Contacts, campaigns, templates, lists all carry a `client_id`.
- **Why:** This is half of the multi-tenant spine (the other half is `agency_id`). It's what guarantees one client's data never bleeds into another's.

## Module 03 · Sending domain verification

Email only reaches inboxes if the sending domain is cryptographically vouched for. This module is where deliverability is won or lost before a single campaign is sent.

### SES `VerifyDomainDkim` → two DKIM CNAMEs
- **What:** Generates the DKIM records the agency must add to the client's DNS.
- **Why:** DKIM signs outgoing mail so receivers can verify it wasn't forged. Gmail/Yahoo's Feb-2024 rules make it mandatory for bulk senders.
- **How:** SES returns DKIM tokens; the app renders them as CNAME records.

### Copy-button UI for all DNS records
- **What:** SPF, DKIM ×2, DMARC, and Return-Path records each with a one-click copy.
- **Why:** DNS is where non-technical agency owners stumble. Copyable records reduce typos, the #1 cause of failed verification.

### Hourly re-check of unverified domains
- **What:** A background worker re-tests pending domains every hour.
- **Why:** DNS propagation is asynchronous and can take hours; polling means the agency doesn't have to babysit and manually re-check.
- **How:** Worker resolves the expected TXT/CNAME records via Node's `dns.resolveTxt` and flips status when they appear.

### Status badges: Pending / Verified / Failed
- **What:** Clear per-record state, with a reason on failure.
- **Why:** Removes mystery — the agency knows whether to wait, fix, or proceed.

### ★ Hard block on unverified-domain sends (422)
- **What:** Sending from an unverified domain is rejected outright.
- **Why:** Sending unauthenticated mail damages the *shared platform* reputation, hurting every agency on SES. This is non-negotiable.

### DMARC defaults to `p=quarantine`
- **What:** The recommended DMARC policy is quarantine, never auto-applied reject.
- **Why:** `p=reject` can silently nuke legitimate mail if anything is slightly misconfigured. Quarantine is the safe default; reject is the agency's explicit choice to make later.

### ★ RFC 8058 one-click unsubscribe
- **What:** A List-Unsubscribe-Post header enabling Gmail's native one-click unsubscribe.
- **Why:** Required by the Feb-2024 sender rules. Absent it, bulk mail gets throttled or junked.

## Module 04 · Contacts & lists

The per-client database that everything sends *to*. Correctness and consent matter more than features here.

### `UNIQUE (client_id, lowercased_email)`
- **What:** A contact's email is unique within a client, case-insensitively.
- **Why:** `Bob@x.com` and `bob@x.com` are the same person; without lowercasing you double-send and inflate counts. Scoping to `client_id` lets the same person exist under different clients.

### Standard fields + 10 custom `jsonb` fields
- **What:** Fixed columns (name, phone, city, birthday) plus up to 10 client-defined fields stored as JSON.
- **Why:** Common fields stay queryable as columns; the `jsonb` escape hatch handles client-specific data without schema migrations. The 10-field cap keeps it sane (liftable in V2).

### Lists with per-list subscription status
- **What:** Many-to-many list membership where subscribe/unsubscribe is tracked *per list*.
- **Why:** A contact may want the newsletter but not promos. Per-list status respects that instead of an all-or-nothing global flag.

### Free-text tags
- **What:** Multi-select, free-text labels on contacts.
- **Why:** Lightweight categorization without the overhead of defining fields — feeds simple segmentation.

### CSV import (papaparse, streaming)
- **What:** Streaming CSV import with UTF-8 detection, BOM stripping, and in-list dedupe by email.
- **Why:** Agencies arrive with messy exports from other tools. Streaming handles large files without exhausting memory; UTF-8/BOM handling prevents the classic "garbled Nepali names" bug; dedupe stops importing the same person twice.

### Mandatory consent declaration
- **What:** A consent checkbox required on every import.
- **Why:** Legal cover and deliverability hygiene — it makes the agency affirm the list is permission-based, and creates a record that they did.

### Segmentation rule-builder (≤5 conditions)
- **What:** UI to build AND/OR filters, max 5 conditions, compiled to parameterized SQL.
- **Why:** Covers the overwhelming majority of real segments while bounding complexity. Parameterized SQL (never string-built) prevents injection. Nested groups and >5 conditions are V2.

### Two-level suppression
- **What:** Client-level suppression (unsubscribed from that client) and agency-level (hard bounces, complaints across all clients).
- **Why:** Unsubscribing should be scoped to the client they unsubscribed from — but a hard bounce or spam complaint is a *deliverability* signal that must apply everywhere, protecting the whole platform.

### GDPR right-to-erasure cascade
- **What:** Deleting a contact removes them from `list_contacts`, `events`, and `sends`.
- **Why:** Compliance requires true erasure, not a hidden flag. The cascade ensures no orphaned PII lingers.

## Module 05 · Email builder

Produces the actual email. Built in-house as a block-based MJML editor.

> ✅ **Resolved:** SendMyMail ships its **own custom MJML builder** (matching the
> `sendmymail-frontend` repo and the prototype). This reverses the earlier
> "integrate Unlayer" decision — see MVP §12.

### Custom in-house MJML builder
- **What:** A block-based drag-and-drop editor — tree model + inspector + canvas — that the team built, not a third-party embed.
- **Why:** The builder is already built and working; adopting Unlayer would discard working code. Owning the tree also gives full control over the ESP-export attribute injection (Module 09) that an embedded editor couldn't provide.

### Save MJML, render HTML at send time
- **What:** The database stores MJML source; HTML is compiled when a campaign sends.
- **Why:** Rendering at send time means a fix to the rendering pipeline propagates to every template automatically — no re-saving thousands of stored HTML blobs.

### Merge tags with fallback
- **What:** `{{first_name|fallback}}`, `{{email}}`, `{{custom.field_name}}`.
- **Why:** Personalization is table stakes; the `|fallback` syntax prevents the embarrassing "Hi ," when a field is empty.

### Desktop + mobile previews
- **What:** Toggle between desktop and mobile rendering.
- **Why:** Most email is opened on mobile; the builder must show both so layout breakage is caught before send.

### Send-test via Postmark
- **What:** Test sends go through Postmark, **not** the customer's SES.
- **Why:** Test mail must never touch the customer's sending reputation. Postmark is the platform's separate transactional channel — a recurring theme across the spec.

### 8 tested starter templates
- **What:** Welcome, Newsletter, Promo, Order confirmation, Abandoned cart, Birthday, Re-engagement, Festive — each verified in Gmail, Outlook 2016+, Apple Mail.
- **Why:** 8 templates that actually render correctly beat 200 that break in Outlook. The Festive template explicitly tests Devanagari (Dashain/Tihar) — a Nepal-specific need generic tools ignore.

### Agency-level reusable templates
- **What:** Save a template once, reuse across clients with brand-colour swap.
- **Why:** Agencies reuse 3–5 templates constantly across clients. Colour-swap reskins one template per client without rebuilding it.

## Module 06 · Campaign engine

The one-shot broadcast pipeline: take a list, render, send, and ingest the results. This is the throughput-critical path.

### 6-step wizard
- **What:** Name → Recipients → From/Subject → Template → Schedule → Review.
- **Why:** A linear, reviewable flow prevents half-configured sends and gives a final confirmation gate before mail goes out irreversibly.

### Recipient snapshot at send time
- **What:** The recipient list is frozen the moment the send starts.
- **Why:** A large send takes time; if contacts are added/removed mid-send, the run becomes inconsistent (double-sends, missed people). A snapshot makes the run deterministic.

### BullMQ on Upstash Redis, batched jobs
- **What:** Jobs queued in BullMQ, one job per N recipients (default 100).
- **Why:** Batching balances throughput against retry granularity — if a batch fails, only ~100 recipients retry, not the whole campaign.

### Worker pipeline: suppress → render → SES send
- **What:** Each job checks suppression, renders MJML→HTML, then calls SES `SendEmail`.
- **Why:** Suppression is re-checked at the last moment so someone who unsubscribed after the snapshot still isn't mailed.

### Per-agency rate limit (from 14/sec)
- **What:** Sending throttled to the SES quota, starting at the sandbox-out default of 14 emails/sec and growing.
- **Why:** Exceeding the SES rate cap gets the platform throttled or suspended. The limit tracks the actual quota.

### SES event ingestion (SNS → webhook → BullMQ → `sends`)
- **What:** SES delivery events flow via SNS to `/webhooks/ses`, queue through BullMQ, and update the `sends` table.
- **Why:** Async ingestion via a queue absorbs bursts of events without dropping them and keeps the write path off the request thread.

### Full status tracking
- **What:** queued, sent, delivered, bounced (hard/soft), complained, opened, clicked, unsubscribed.
- **Why:** These are the raw material for reporting and for the deliverability auto-pause logic.

### Idempotency via SES message-ID dedup
- **What:** Retried jobs are deduped on the SES message ID.
- **Why:** Queues retry on failure; without dedup a retry could double-send. The message ID makes sends idempotent.

### ★ Tiered new-agency limits
- **What:** 1K/day in week 1, 10K/day weeks 2–4, full plan limits at day 30+.
- **Why:** A brand-new sender blasting volume looks exactly like a spammer to mailbox providers and to SES. Ramping volume builds reputation gradually and contains the blast radius of a bad actor. Non-negotiable.

## Module 07 · Marketing automation (flows)

Automation without a visual canvas. The bet: three well-chosen pre-built flows cover 80% of agency needs at a quarter of the build cost.

### Three fixed flow types
- **What:** Welcome series (3 emails/7 days, list-add trigger), Abandoned cart (2 emails at 1h & 24h, e-commerce webhook), Birthday (1 email, daily cron).
- **Why:** These three are the highest-ROI automations agencies actually run. A visual flow builder is 4–8 weeks of work deferred to V2 — wizard-configured flows ship the value now.

### Per-flow stop conditions
- **What:** A contact exits the flow on unsubscribe, order placed, or opening a specific email.
- **Why:** Continuing to send "complete your purchase" after someone bought is the fastest way to annoy customers and trigger complaints. Stop conditions prevent it.

### BullMQ delayed jobs + cron fallback
- **What:** Step delays use BullMQ delayed jobs, with a daily cron fallback for delays over 30 days.
- **Why:** BullMQ delayed jobs are precise for short waits; very long delays are better handled by a cron sweep than by holding a job in Redis for a month.

### `flow_executions` tracking
- **What:** Per (flow_id, contact_id): current step, status, started_at.
- **Why:** This is the state machine that knows where each contact is in each flow — essential for resuming, reporting, and applying stop conditions.

### Re-check suppression at execution time
- **What:** Suppression is verified again when each delayed step actually runs.
- **Why:** A step scheduled days ago might fire after the contact unsubscribed. Re-checking at execution closes that race condition.

### Per-flow reporting
- **What:** Entered, in-progress, completed, conversions, attributed revenue.
- **Why:** Agencies need to prove flows make money — attributed revenue is the number that justifies the feature to their clients.

## Module 08 · Signup forms

How contacts get *into* the system — with proper opt-in and spam defenses, because a polluted list destroys deliverability.

### Simple form builder (no drag-and-drop)
- **What:** Field picker, required toggles, button text/colour.
- **Why:** Forms don't need a design canvas; a configurator covers the need without the build cost.

### Three rendering modes
- **What:** Inline embed, popup (timer/scroll trigger), hosted page (full URL).
- **Why:** Covers the three places agencies collect signups — on a page, as an overlay, or as a standalone link to share.

### iframe `<script>` embed
- **What:** Output is a `<script>` the agency pastes onto the client's site; it renders via iframe.
- **Why:** The iframe sandboxes the form's CSS so the host site's styles can't break it (and vice versa).

### hCaptcha on every form
- **What:** Captcha required on all forms.
- **Why:** Bots stuffing fake/spam-trap addresses into a list is a direct deliverability threat. hCaptcha (free tier) blocks automated submissions.

### EU auto double-opt-in (MaxMind GeoLite2)
- **What:** Contacts geolocated to the EU get a confirmation step automatically.
- **Why:** GDPR effectively requires confirmed opt-in for EU contacts. IP geolocation applies it only where legally needed, without burdening everyone.

### Postmark confirmation email
- **What:** The opt-in confirmation is sent via Postmark.
- **Why:** Same principle as elsewhere — platform/transactional mail stays off the customer's SES reputation.

### Post-confirm actions
- **What:** On confirmation, add to a chosen list + optionally enter a flow.
- **Why:** Connects acquisition directly to activation — a new signup can immediately drop into a Welcome series.

### Auto-SSL hosted pages (Let's Encrypt)
- **What:** Hosted form pages get SSL automatically.
- **Why:** A form collecting personal data over plain HTTP is both a trust and a compliance problem; auto-SSL removes the manual cert step.

## Module 09 · Integrations

Two directions: pulls e-commerce events *in* (the data that powers automation), and pushes the built email *out* to the platform the client uses (6 first-class ESPs in V1, plus an HTML/MJML/webhook escape hatch).

### WooCommerce plugin (WordPress.org)
- **What:** A free, self-updating WordPress plugin capturing customer.created, order.placed, and cart.abandoned; tags applied in SendMyMail can flag customers back in WooCommerce.
- **Why:** WooCommerce dominates Nepali e-commerce. WordPress.org distribution gives free discovery and a trusted update channel. Two-way tag sync makes SendMyMail useful inside the store, not just downstream.

### Shopify (private app, then public)
- **What:** A private/custom app for initial customers while the public App Store listing goes through review (4–8 weeks).
- **Why:** Shopify's review is slow; the private app unblocks early customers immediately rather than waiting on Shopify's approval timeline.

### Zapier outgoing webhook
- **What:** Outgoing webhooks for any event.
- **Why:** The escape hatch — anything not natively integrated can still be wired up by the agency through Zapier, covering the long tail without per-integration engineering.

### HMAC-validated receivers
- **What:** Webhook receivers verify HMAC signatures, then upsert contacts and emit events.
- **Why:** Without signature validation, anyone could POST fake orders/contacts. HMAC proves the payload came from the real platform.

### Daraz explicitly excluded
- **What:** Daraz is documented as unsupported, openly, on the integrations page.
- **Why:** Daraz has no third-party API — integration is technically impossible, not merely deprioritized. Honesty here prevents over-promising to prospects.

### Outbound: ESP export & delivery (6 first-class platforms for Nepal)
- **What:** After the email is built, push it to the platform the client already uses. V1 ships **first-class** integrations for just the platforms Nepali agencies actually use — **Mailchimp** (copy/paste; the tool we replace), **MailerLite** (API push; budget favorite), **Brevo/Sendinblue** (API push; affordable, email+SMS), **SendGrid** (API push; dev-led teams), **HubSpot** (copy/paste; B2B), **Klaviyo** (copy/paste; e-commerce). Every other platform is reachable through the universal escape hatch: raw **HTML**/​**MJML** export and **webhooks** (Custom Webhook, Zapier, Make).
- **Why:** Agencies and their clients already live in specific ESPs; SendMyMail meets them where they are. But integrating and maintaining 40 platforms is wasted V1 effort when a handful cover the Nepali market and the escape hatch covers the rest. The `thirdPartyClientName` string tells the backend which platform-specific attributes and merge tags to inject — which is exactly why the builder is custom (Module 05); an embedded editor couldn't do this.
- **How:** The catalog lives in the repo's `integrations/registry.ts` (which already contains ~40 entries — V1 simply *exposes* the 6 + escape hatch; the rest stay defined but hidden, enabled per beta demand). The `value` per platform is the exact `thirdPartyClientName` the backend expects. API-push platforms store credentials (localStorage-only) and hit test/send endpoints; webhooks POST compiled HTML to a user URL.
- **Note:** The 6-platform set is a market-reasoned proposal (Mailchimp + MailerLite are named in the MVP; the rest inferred from the South-Asian market) — confirm against real Nepal usage. **Zoho Campaigns** is a strong candidate but is not yet in the codebase.

## Module 10 · Reporting & analytics

Turns raw send events into the dashboards agencies show their clients. Reputation isolation is a quiet but deliberate theme.

### Open tracking via pixel on `track.sendmymail.np`
- **What:** A 1×1 pixel served from a *separate* domain records opens.
- **Why:** Tracking domains attract spam-filter scrutiny. Isolating them on their own domain keeps any reputation hit away from the sending domain.

### Click tracking via redirect
- **What:** Links route through `track.sendmymail.np/c/{token}` then 302 to the destination.
- **Why:** The redirect records the click before forwarding. Same reputation-isolation rationale as the pixel.

### Events in Postgres (monthly partitions)
- **What:** Events stored in Postgres, partitioned by month.
- **Why:** Partitioning keeps queries fast and old data pruneable at V1 scale. ClickHouse migration is explicitly a V2 move once a tenant exceeds ~10M events/month.

### Four reporting scopes
- **What:** Per-campaign, per-flow, per-client, and per-agency (the dashboard) views.
- **Why:** Each audience needs a different altitude — a campaign post-mortem, a flow's ROI, a client summary to forward, and the agency-wide overview.

### Range filters + CSV export
- **What:** 7/30/90-day, this-year, custom ranges; export to CSV.
- **Why:** Agencies build their own client reports; CSV export lets them take the data into their own decks.

### Weekly digest email
- **What:** A summary of all clients emailed to the agency owner weekly.
- **Why:** Pulls the owner back into the product on a regular cadence without them having to log in — a retention and at-a-glance health mechanism.

### (V1 limitation) 60-second cache, not real-time
- **What:** Metrics refresh on read, cached for 60s.
- **Why:** Real-time dashboards add infrastructure cost for marginal value at V1 scale. 60s is indistinguishable from real-time for campaign reporting.

## Module 11 · Billing

Gets money in — in the currency and via the rails Nepali agencies actually use. The whole module is shaped around a constraint: true recurring card billing doesn't exist locally.

### Three hardcoded plans
- **What:** Starter (₨2,499), Pro (₨6,999), Scale (₨14,999), with limits per plan.
- **Why:** Hardcoding (not a flexible pricing engine) is right for V1 — three plans cover the market; a discount/promo engine is V2.

### Annual billing (2 months free)
- **What:** Pay yearly, get 2 months free.
- **Why:** Cash upfront improves runway and reduces churn — the discount is the incentive to commit.

### ★ Khalti integration
- **What:** Initiate payment → callback verify → webhook confirm.
- **Why:** Khalti is a primary NPR rail. Non-negotiable: NPR billing must work at launch — Stripe alone doesn't serve the core Nepali customer.

### ★ eSewa integration
- **What:** Similar callback flow with HMAC verification.
- **Why:** eSewa is the other dominant NPR wallet; HMAC verifies the payment callback is genuine. Runs in parallel with Khalti so the agency can use whichever they have.

### Stripe for USD
- **What:** Stripe subscriptions for international agencies ($29/$79/$179).
- **Why:** International agencies expect cards. Note: Stripe requires a Delaware C-Corp or Singapore entity, so it may defer to V1.5 if that entity isn't ready.

### Usage tracking with soft/hard limits
- **What:** Nightly cron updates usage counters; soft-warn at 90%, hard-block at 100%.
- **Why:** Protects both the customer (no surprise overage) and the platform (no unbounded sending). The warning gives a chance to upgrade before the block.

### Renewal reminder flow
- **What:** Reminders at 7-day, 3-day, 1-day-before, day-of, then a 3-day grace.
- **Why:** Because NPR billing is *manual* (see below), customers must be actively reminded to pay or they'll lapse. The grace period prevents accidental lockout.

### PDF invoices with PAN/VAT
- **What:** Generated PDFs showing the PAN/VAT number.
- **Why:** Legally required for valid invoices in Nepal; agencies need them for their own accounting.

### (V1 constraint) Manual NPR renewal
- **What:** No card-on-file recurring billing in NPR — renewal is manual.
- **Why:** Khalti and eSewa simply don't support true card-on-file recurring charges yet. The Khalti Mandate API (partial bank coverage) is a V2 fix if manual-renewal churn proves painful.

## Module 12 · White-label

Makes the agency's clients see the agency's brand, never SendMyMail's — one of the three core bets.

### ★ Custom domain mapping
- **What:** Agency CNAMEs `mail.theiragency.com` to `cname.sendmymail.np`.
- **Why:** The agency's clients should interact with the agency's domain, not a SendMyMail subdomain. Non-negotiable to the white-label promise.

### ★ Auto-SSL (Let's Encrypt)
- **What:** Certificates auto-issued for mapped custom domains (Caddy reverse proxy or Vercel custom-domain API).
- **Why:** A custom domain without HTTPS is broken and untrusted; auto-issuance removes manual cert ops.

### Agency branding JSON
- **What:** Logo URL, primary colour, accent colour stored at agency level.
- **Why:** A single source of brand truth that every customer-facing surface reads from.

### `window.__BRAND__` injection by requesting domain
- **What:** The edge/proxy (Caddy/Vercel) injects branding into the static `index.html` based on the requesting domain, before the Vite SPA boots; a `/branding?host=` fetch at app bootstrap is the fallback.
- **Why:** Injecting at the edge (by domain) means the right brand is present before first paint — no flash of SendMyMail branding. Since the frontend is a client-rendered Vite SPA (no SSR), this replaces the server-render approach; the fetch fallback must gate render behind a neutral splash to keep the no-flash guarantee.

### Branded forms, opt-in, unsubscribe pages
- **What:** Every public-facing page uses agency branding.
- **Why:** These are exactly the pages a client's *customers* see. A SendMyMail logo here would break the white-label illusion entirely.

### "Powered by SendMyMail" footer (Scale removes it)
- **What:** Emails carry the footer unless the agency is on Scale.
- **Why:** Free marketing on lower tiers; removing it is a concrete upsell reason to reach Scale.

## Module 13 · Onboarding wizard

Gets a new agency from signup to first successful send in under 10 minutes — the moment they experience the product's value.

### State machine on `onboarding_progress`
- **What:** Progress tracked in a JSON state machine.
- **Why:** Onboarding spans multiple sessions (DNS takes hours to propagate); a persisted state machine lets the agency leave and resume exactly where they were.

### 4 steps: client → domain → contacts → campaign
- **What:** Create first client, verify domain, import contacts, send first campaign.
- **Why:** This is the critical path to value, in dependency order. Completing it means the agency has experienced the entire core loop.

### ★ PAN required before first real send
- **What:** A PAN number must be collected and (manually) reviewed before the first real send.
- **Why:** An anti-spammer gate — real businesses have a PAN; throwaway spam accounts don't. Manual review in V1 trades scale for safety. Non-negotiable.

### Skippable but persistent
- **What:** Can be skipped, but an incomplete-state banner keeps reminding.
- **Why:** Don't force, but don't let people quietly stall — incomplete onboarding is the strongest churn predictor.

### Inline failure-mode docs
- **What:** Documented fixes for DNS propagation delays, Cloudflare-proxy DKIM issues, CSV encoding problems.
- **Why:** These are the exact three places non-technical agencies get stuck; pre-empting them inline avoids support tickets and abandonment.

## Module 14 · Deliverability trust layer

Invisible to users but existential to the company. It keeps AWS SES happy and stops any single bad actor from poisoning deliverability for everyone.

### ★ Tiered sending limits
- **What:** 1K/day week 1, 10K/day weeks 2–4, plan limits day 30+ (mirrors the campaign engine).
- **Why:** Gradual ramp builds sender reputation and caps how much damage a new bad actor can do before detection.

### ★ Auto-pause on bounce/complaint thresholds
- **What:** Any campaign exceeding 5% hard bounce OR 0.3% complaint is paused automatically.
- **Why:** These are the thresholds AWS itself watches. Auto-pausing before they're breached platform-wide protects SES standing for all agencies. Non-negotiable.

### CSV import quality check
- **What:** Reject imports with >10% role accounts (info@, admin@) or scraped-list patterns.
- **Why:** Role accounts and scraped lists are hallmarks of purchased/spam lists that generate bounces and complaints. Rejecting at import keeps the poison out.

### Global agency-level suppression
- **What:** Hard bounces and complaints are never re-sent across *any* client of that agency.
- **Why:** A bounced or complaining address is a deliverability hazard regardless of which client it came from; suppression must be global, not per-list.

### Per-client deliverability score widget
- **What:** An engagement-weighted score shown per client.
- **Why:** Gives the agency a defensible, at-a-glance answer to "how's our deliverability?" — and an early warning before problems escalate.

### ★ PAN verification + manual review of high-volume new accounts
- **What:** PAN before first send; manual review of any account sending >50K in its first month.
- **Why:** Layered abuse defense — PAN screens at signup, the volume review catches anyone who slips through and tries to scale spam fast.

### SES bounce/complaint webhook ingestion
- **What:** Properly handles SES bounce/complaint notifications.
- **Why:** This is the data feed that powers suppression and auto-pause — without ingesting it, the whole trust layer is blind.

---

## Cross-cutting design principles

These recur across modules and explain many individual decisions:

1. **Two mail channels, never mixed.** Customer marketing mail → AWS SES (customer's reputation). Platform/transactional mail (verification, test sends, opt-in confirmations) → Postmark. The two reputations are never allowed to touch.
2. **Reputation isolation by domain.** Tracking pixels and click redirects live on `track.sendmymail.np`, separate from sending domains, so tracking scrutiny never taints sending.
3. **Suppression is checked at the last possible moment.** At snapshot, then again at render/execution — because state changes between scheduling and sending.
4. **The platform protects itself from its own customers.** Tiered limits, auto-pause, import quality checks, PAN gates — every one exists because one bad agency can damage SES standing for all of them.
5. **Buy the commodity, build the spine.** Auth (Clerk/Supabase) and captcha (hCaptcha) are integrated, not built. The exceptions are the multi-tenant engine, deliverability, **and the email builder** — the builder is custom because owning the MJML tree is what enables ESP-specific export (Module 09). Engineering effort concentrates on these — the actual moat.
