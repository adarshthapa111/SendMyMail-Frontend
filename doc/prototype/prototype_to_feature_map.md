# Prototype → Feature/Implementation Map

Maps every screen and modal in [sendmymail_full_prototype.html](./sendmymail_full_prototype.html)
to its MVP module, the explanation in [feature_details.md](../feature/feature_details.md),
and the build spec in [doc/implementation_doc/](../implementation_doc/).

Use this to answer "what is the spec behind this screen?" (prototype → docs) and
"is this feature designed yet?" (docs → prototype, see the gaps section).

> Screen line numbers point into the single-file prototype. Module column links
> to the per-feature implementation doc.

---

## Screens

| # | Prototype screen | Module | Implementation doc | feature_details |
|---|------------------|--------|--------------------|-----------------|
| — | [Signup](./sendmymail_full_prototype.html#L310) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Verify email (6-digit)](./sendmymail_full_prototype.html#L383) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Workspace setup](./sendmymail_full_prototype.html#L413) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Login](./sendmymail_full_prototype.html#L479) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Forgot password](./sendmymail_full_prototype.html#L539) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Reset password](./sendmymail_full_prototype.html#L560) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Accept invite](./sendmymail_full_prototype.html#L585) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Onboarding wizard](./sendmymail_full_prototype.html#L622) | 13 | [onboarding-wizard](../implementation_doc/feature-onboarding-wizard.md) | §13 |
| — | [Dashboard (agency overview)](./sendmymail_full_prototype.html#L686) | 10 + 02 | [reporting-analytics](../implementation_doc/feature-reporting-analytics.md) | §10 |
| — | [Clients list](./sendmymail_full_prototype.html#L755) | 02 | [client-management](../implementation_doc/feature-client-management.md) | §02 |
| — | [Add new client](./sendmymail_full_prototype.html#L792) | 02 | [client-management](../implementation_doc/feature-client-management.md) | §02 |
| — | [Sending domain](./sendmymail_full_prototype.html#L847) | 03 | [sending-domain-verification](../implementation_doc/feature-sending-domain-verification.md) | §03 |
| — | [Contacts](./sendmymail_full_prototype.html#L925) | 04 | [contacts-lists](../implementation_doc/feature-contacts-lists.md) | §04 |
| — | [Import CSV](./sendmymail_full_prototype.html#L980) | 04 (+14) | [contacts-lists](../implementation_doc/feature-contacts-lists.md) | §04 |
| — | [Contact detail](./sendmymail_full_prototype.html#L1031) | 04 (+09) | [contacts-lists](../implementation_doc/feature-contacts-lists.md) | §04 |
| — | [Templates](./sendmymail_full_prototype.html#L1111) | 05 | [email-builder](../implementation_doc/feature-email-builder.md) | §05 |
| — | [Email builder](./sendmymail_full_prototype.html#L1151) | 05 | [email-builder](../implementation_doc/feature-email-builder.md) ⚠️ | §05 |
| — | [Campaigns list](./sendmymail_full_prototype.html#L1217) | 06 | [campaign-engine](../implementation_doc/feature-campaign-engine.md) | §06 |
| — | [New campaign (6-step)](./sendmymail_full_prototype.html#L1262) | 06 | [campaign-engine](../implementation_doc/feature-campaign-engine.md) | §06 |
| — | [Campaign report](./sendmymail_full_prototype.html#L1305) | 10 (+06) | [reporting-analytics](../implementation_doc/feature-reporting-analytics.md) | §10 |
| — | [Flows](./sendmymail_full_prototype.html#L1384) | 07 | [marketing-automation-flows](../implementation_doc/feature-marketing-automation-flows.md) | §07 |
| — | [Configure flow](./sendmymail_full_prototype.html#L1454) | 07 | [marketing-automation-flows](../implementation_doc/feature-marketing-automation-flows.md) | §07 |
| — | [Forms](./sendmymail_full_prototype.html#L1535) | 08 | [signup-forms](../implementation_doc/feature-signup-forms.md) | §08 |
| — | [Form builder](./sendmymail_full_prototype.html#L1597) | 08 | [signup-forms](../implementation_doc/feature-signup-forms.md) | §08 |
| — | [Reports](./sendmymail_full_prototype.html#L1690) | 10 (+14) | [reporting-analytics](../implementation_doc/feature-reporting-analytics.md) | §10 |
| — | [Team](./sendmymail_full_prototype.html#L1767) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) | §01 |
| — | [Integrations](./sendmymail_full_prototype.html#L1843) | 09 | [integrations](../implementation_doc/feature-integrations.md) | §09 |
| — | [Billing](./sendmymail_full_prototype.html#L1907) | 11 | [billing](../implementation_doc/feature-billing.md) | §11 |
| — | [White-label](./sendmymail_full_prototype.html#L1998) | 12 | [white-label](../implementation_doc/feature-white-label.md) | §12 |

## Modals

| Modal | Module | Implementation doc |
|-------|--------|--------------------|
| [Client switcher](./sendmymail_full_prototype.html#L2082) | 02 | [client-management](../implementation_doc/feature-client-management.md) |
| [Profile menu](./sendmymail_full_prototype.html#L2098) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) |
| [Add contact](./sendmymail_full_prototype.html#L2120) | 04 | [contacts-lists](../implementation_doc/feature-contacts-lists.md) |
| [Segment builder](./sendmymail_full_prototype.html#L2144) | 04 | [contacts-lists](../implementation_doc/feature-contacts-lists.md) |
| [Unsubscribe contact](./sendmymail_full_prototype.html#L2176) | 04 (+14) | [contacts-lists](../implementation_doc/feature-contacts-lists.md) |
| [Invite member](./sendmymail_full_prototype.html#L2194) | 01 | [auth-workspace](../implementation_doc/feature-authentication-workspace.md) |
| [Plan change](./sendmymail_full_prototype.html#L2219) | 11 | [billing](../implementation_doc/feature-billing.md) |
| [WooCommerce settings](./sendmymail_full_prototype.html#L2237) | 09 | [integrations](../implementation_doc/feature-integrations.md) |

---

## Module 14 has no dedicated screen — it surfaces inside others

The Deliverability trust layer ([feature-deliverability-trust-layer](../implementation_doc/feature-deliverability-trust-layer.md))
is intentionally invisible. In the prototype it appears as widgets/guards embedded in other screens:

| Where it shows up | What |
|-------------------|------|
| Dashboard [deliverability score 94](./sendmymail_full_prototype.html#L741) | Per-client engagement-weighted score |
| Reports [deliverability health card](./sendmymail_full_prototype.html#L1745) | Gmail/Outlook inbox rate, bounce, complaint |
| Domain [hard-block banner](./sendmymail_full_prototype.html#L914) | "blocks sending from unverified domains" + Feb-2024 rule |
| Import [consent declaration](./sendmymail_full_prototype.html#L1015) | Quality/consent gate |
| Unsubscribe modal [agency-wide option](./sendmymail_full_prototype.html#L2184) | Agency-scoped suppression |
| Onboarding [PAN banner](./sendmymail_full_prototype.html#L665) | "PAN required before first real send" |

---

## Coverage gaps

### Spec'd features with NO prototype screen yet

These are in the MVP / implementation docs but not drawn in the prototype — design these before building:

| Feature | Module | Where it's referenced |
|---------|--------|------------------------|
| **TOTP 2FA setup + recovery codes** | 01 | Spec'd; no screen (only password/Google shown) |
| **PAN collection + manual review** | 13/14 | Only mentioned in an onboarding *banner*; no capture/review UI |
| **Tiered sending limits / auto-pause UI** | 06/14 | No screen showing caps, warnings, or a paused campaign |
| **Usage hard-block at 100%** | 11 | Usage bars shown, but no block/upgrade-prompt state |
| **Khalti/eSewa payment flow** (initiate→callback→confirm) | 11 | Billing shows method + invoices, but not the pay flow |
| **Stripe USD checkout** | 11 | Plans show USD pricing elsewhere; no USD checkout screen |
| **DMARC `p=quarantine`→reject choice** | 03 | Record shown; no policy-change control |
| **Segment compile/preview beyond 2 conditions** | 04 | Modal caps at the 2 shown rows; 5-condition limit not exercised |

### Prototype elements NOT in the MVP/feature docs

| Element | Note |
|---------|------|
| Marketing stats on auth screens ("42+ agencies", "96.4% Gmail inbox") | Landing/marketing copy, not a product feature |
| "Product viewed" Woo event | Shown as an extra sync toggle; MVP lists only customer/order/cart |

### ESP export integrations — now in the docs, NOT yet in the prototype

ESP export is now part of **Module 09**, but scoped down for V1: **6 first-class
platforms** (Mailchimp, MailerLite, Brevo, SendGrid, HubSpot, Klaviyo) + an
HTML/MJML/webhook escape hatch. The other ~34 entries in `integrations/registry.ts`
stay defined but hidden until V2. The prototype's "Integrations" screen is still
**inbound e-commerce sync only** (Woo/Shopify/Zapier) — so the outbound export UI is
a **prototype gap** to design: the 6-platform picker, API-push connect modals,
copy/paste export, and webhook setup.

---

## ✅ Builder decision — RESOLVED

| Artifact | Email builder |
|----------|---------------|
| MVP §5 + §12 (now updated) | **Custom in-house MJML builder** |
| **Prototype** [builder screen](./sendmymail_full_prototype.html#L1170) | Custom block builder |
| **Repo** (`sendmymail-frontend`) | Custom block builder (tree/blocks/inspector/canvas) |

All three now agree: SendMyMail ships its **own custom MJML builder**. The MVP
decision log was updated (rationale: *already built and working*; reverses the earlier
Unlayer decision) along with [feature-email-builder.md](../implementation_doc/feature-email-builder.md).

This confirms the repo is **Module 05 built first as a standalone slice**, extended with
the ESP-export integrations that now live under Module 09.
