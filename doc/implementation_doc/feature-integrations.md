# Feature 09 · Integrations — Implementation

**Module purpose:** Two directions. **Inbound** — sync customers, orders, and cart
events *in* from e-commerce platforms (the data that powers automation).
**Outbound** — push the built email *out* to the ESP the client uses (6 first-class in V1 + escape hatch).
**Spec:** [MVP §Module 09](../MVP.md), [feature_details §09](../feature/feature_details.md)
**Build window:** Weeks 12–13 (inbound). Outbound ESP export already exists in `sendmymail-frontend`.

> The **outbound ESP-export system (~40 platforms)** in the
> `sendmymail-frontend` repo is part of this module. See `src/integrations/registry.ts`
> (catalog), `src/integrations/credentials.ts` (localStorage creds), and
> `src/components/integrations/` (UI).

---

## V1 scope — inbound (e-commerce sync)

- **WooCommerce** — free WordPress.org plugin: captures `customer.created`, `order.placed`, `cart.abandoned` (session hook); two-way (tags in SendMyMail flag customers in Woo); self-updating
- **Shopify** — private/custom app for early customers; public App Store listing in parallel (4–8 wk review)
- **Zapier** — outgoing webhooks for any event (escape hatch)
- Webhook receivers validate **HMAC** signatures, upsert contacts, fire events into the event log

## V1 scope — outbound (ESP export, 6 first-class platforms for Nepal)

Push the compiled email to the platform the client already uses. V1 **exposes
only 6 first-class platforms** (the ones Nepali agencies use); every other
platform is reached via the universal HTML/MJML + webhook escape hatch. The
`thirdPartyClientName` value (exact string the backend expects) drives
platform-specific attribute / merge-tag injection at render time.

| Platform | Mechanism | Why (Nepal) |
|----------|-----------|-------------|
| **Mailchimp** | copy/paste HTML | Most-used by Nepali SMBs/agencies; the tool we replace |
| **MailerLite** | API push (creds + send endpoint) | Budget favorite, named in MVP §1 |
| **Brevo / Sendinblue** | API push | Affordable, email+SMS, strong in South Asia |
| **SendGrid** | API push | Transactional + marketing, dev-led teams |
| **HubSpot** | copy/paste HTML | B2B / larger clients |
| **Klaviyo** | copy/paste HTML | E-commerce clients (Shopify/Woo) |
| **Escape hatch** | raw HTML, raw MJML, Custom Webhook, Zapier, Make | Reach any other platform |

The repo's `integrations/registry.ts` already defines ~40 platforms across four
tiers; V1 simply **exposes the 6 + escape hatch** and keeps the rest defined but
hidden behind a flag, enabled per beta demand.

> The 6-platform set is a market-reasoned proposal — confirm against real Nepal
> usage. **Zoho Campaigns** is a strong candidate but is **not yet in the registry**.

**Out of scope:** **Daraz (no third-party API — explicitly excluded)**, the other ~34 ESP exports (built in the registry, hidden in V1), Magento/Wix/Squarespace/BigCommerce, native Stripe customer-create, HubSpot/Salesforce CRM sync, public integration API.

---

## Data model _(proposed)_

```
integration
  id, agency_id, client_id,
  type ENUM('woocommerce','shopify','zapier'),
  credentials jsonb,         -- store secret; HMAC shared secret
  status ENUM('connected','error'), created_at

ecommerce_event              -- normalized inbound events
  id, integration_id, client_id,
  type ENUM('customer.created','order.placed','cart.abandoned'),
  contact_email, payload jsonb, received_at

esp_connection               -- outbound ESP export targets (Tier 1 / Tier 4)
  id, agency_id, client_id,
  platform_value,            -- exact thirdPartyClientName (e.g. 'Sendgrid', 'Braze::Html')
  tier INT,                  -- 1..4
  credentials jsonb,         -- Tier 1 only; repo keeps these localStorage-only
  webhook_url NULL,          -- Tier 4 only
  status ENUM('connected','error'), connected_at
```

> Repo note: in `sendmymail-frontend`, ESP credentials + connection state are
> **localStorage-only** (`integrations/credentials.ts`); connection *metadata* is
> rehydrated into Redux on startup but raw credentials never sit in Redux. The
> `esp_connection` row above is the server-side equivalent for the platform.

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| POST | `/clients/{id}/integrations` | Connect (store credentials/secret) |
| POST | `/webhooks/woocommerce/{integrationId}` | HMAC-verified inbound |
| POST | `/webhooks/shopify/{integrationId}` | HMAC-verified inbound |
| POST | `/webhooks/zapier/{integrationId}` | Inbound escape hatch |
| POST | `/integrations/{id}/tags/sync` | Inbound platform: push tag → WooCommerce |
| POST | `/getHtml` · `/getMjml` | Compile email with `thirdPartyClientName` (Tier 2/3 export, Tier 1/4 payload) |
| POST | `/integrations/{esp}/test` | Tier 1: validate credentials |
| POST | `/integrations/{esp}/send` | Tier 1: push draft to ESP |
| POST | `/integrations/webhook/send` | Tier 4: POST compiled HTML to user URL |

---

## Key flows

**Inbound event**
1. Platform fires webhook → receiver verifies **HMAC signature** (rejects forgeries).
2. Upsert `contact` by `email_lower` (Module 04); record `ecommerce_event`.
3. `cart.abandoned` / `order.placed` feed Flow triggers (Module 07); `order.placed` feeds conversion/revenue attribution.

**WooCommerce two-way**
- Tags applied in SendMyMail are pushed back to flag the customer in WooCommerce.

**Shopify rollout**
- Private app unblocks early customers immediately while the public listing clears Shopify's 4–8 week review.

**Outbound export (by tier)**
1. User builds the email (Module 05) and picks an export target from the catalog.
2. Compile via `/getHtml` or `/getMjml` with the target's `thirdPartyClientName` so the backend injects platform-specific attributes/merge tags.
3. **Tier 1:** with stored credentials, POST the draft to the ESP `send` endpoint. **Tier 2/3:** present the HTML/MJML for copy/paste. **Tier 4:** POST compiled HTML to the user's webhook URL.

---

## Implementation notes

- **HMAC validation is mandatory** on every receiver — without it anyone could POST fake orders/contacts.
- **Daraz is documented as unsupported, openly** — it has no API; honesty prevents over-promising. Put this on the integrations page and tell prospects directly.
- **Zapier is the long-tail escape hatch** — anything not natively integrated routes through it, avoiding per-integration engineering.
- WordPress.org distribution gives the Woo plugin free discovery + a trusted self-update channel.

---

## Edge cases & failure modes

- Replayed webhook → idempotency key on event id; dedup.
- HMAC mismatch → 401, log, no upsert.
- Cart abandoned then completed → emit `order.placed`; flow stop condition handles it.
- Shopify listing rejected/delayed → private app keeps early customers live.
- Tag sync failure to Woo → retry queue; don't block inbound.

## Acceptance criteria

- [ ] Woo plugin installs from WordPress.org, captures all 3 events, self-updates.
- [ ] All inbound webhooks reject invalid HMAC signatures.
- [ ] Inbound events upsert contacts and trigger the right flows.
- [ ] Tags applied in SendMyMail appear on the WooCommerce customer.
- [ ] Daraz is clearly documented as unsupported with the reason.
- [ ] Each ESP export target uses the exact `thirdPartyClientName` the backend expects.
- [ ] Tier 1 connect → test → push-draft works; Tier 4 POSTs HTML to the user URL.
- [ ] ESP credentials are never exposed beyond where they're needed (localStorage-only in the repo).

## Dependencies

WordPress.org · Shopify App review · Zapier · BullMQ (retry) · Contacts (04) · Flows (07) · Reporting/revenue (10) · Email builder render API (05) for outbound compilation (`thirdPartyClientName`).
