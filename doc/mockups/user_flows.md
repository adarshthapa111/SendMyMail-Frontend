# SendMyMail — User Flows (screen by screen)

How a user moves through the product, journey by journey, mapped onto the
mockups in this folder. Each step is **Screen → what the user does → next screen**.

- In-app screens live here in [doc/mockups/](.) and share one shell (top nav + left sidebar; only the main panel scrolls).
- Pre-login + onboarding screens (signup, verify, workspace, onboarding wizard) live in the original [../prototype/sendmymail_full_prototype.html](../prototype/sendmymail_full_prototype.html) — referenced where a journey starts there.

## Navigation model

- **Two scopes.** *Agency-level* (Overview, All clients) and *Client-level* (everything under the active client). The **client switcher** in the top nav changes which client all the per-client screens operate on.
- **The sidebar is the spine.** Three groups: **Agency**, the **active client** (Sending domain, Contacts, Templates, Campaigns, Flows, Forms, Reports), and **Settings** (Team, Integrations, Billing, White-label).
- **Sending gate.** A client can't broadcast until its sending domain is verified; every send also passes a deliverability pre-check.

---

## Flow 1 · First run → first campaign (activation)

The onboarding path, ending in the app (all now polished mockups):

```
signup.html → verify.html (6-digit) → workspace_setup.html
      → onboarding.html (4 steps):
          1 create client → 2 verify domain → 3 import contacts → 4 send campaign
      → agency_dashboard.html
```

Also: [login.html](login.html) → dashboard · [forgot.html](forgot.html) → [reset.html](reset.html) → login · [invite.html](invite.html) → dashboard.
PAN verification is required before the first real send (anti-spam gate).

Auth screens use a separate split-card layout (no sidebar); every in-app screen uses the shared shell. The 8 dialogs (switcher, profile, add contact, segment, unsubscribe, invite, plan, Woo settings) are gathered in [modals.html](modals.html).

---

## Flow 2 · Create & send a campaign (the core loop)

```
Sidebar: Campaigns                → campaigns_list.html
  click "New campaign"            → the 6-step wizard, one screen per step:
      campaign_new.html      1 Name & client
      campaign_step2.html    2 Recipients (lists/segment → recipient count)
      campaign_step3.html    3 From & subject (+ inbox preview)
      campaign_step4.html    4 Template ──→ builder.html (edit) ──→ back
      campaign_step5.html    5 Schedule (now / later)
      campaign_step6.html    6 Review & send (+ deliverability pre-check)
  hit Send                        → campaign_sent.html   (sending confirmation)
      → "View live report"        → campaign_report.html
      → "Back to campaigns"       → campaigns_list.html
```
Each step has Back/Continue; "Edit" links on the Review step jump back to the relevant step.

- [campaigns_list.html](campaigns_list.html) — tabs (All / Sent / Scheduled / Drafts); rows open the report, drafts/scheduled open the wizard.
- [campaign_new.html](campaign_new.html) — vertical stepper; the Review step summarizes everything + runs the deliverability check.
- [campaign_report.html](campaign_report.html) — metrics, engagement funnel, top links, devices, per-recipient table; "Share with client".

---

## Flow 3 · Build & manage the audience

```
Sidebar: Contacts                 → contacts.html
  row                             → contact_detail.html   (profile + e-commerce + timeline)
  "Import CSV"                    → contact_import.html   (file → list → map columns → consent → import)
  list tabs                       filter All / Newsletter / VIP / Suppressed
  segment bar "Edit segment"      → (segment builder modal)
```

- [contacts.html](contacts.html) → [contact_detail.html](contact_detail.html) / [contact_import.html](contact_import.html)
- Import enforces a **consent declaration** + a **quality check** (rejects role-account/scraped lists) before contacts land.

---

## Flow 4 · Set up automation (Flows)

```
Sidebar: Flows                    → flows.html
  pick a flow type:
      Welcome series  (3 emails / 7 days, on list-join)
      Abandoned cart  (2 emails, 1h + 24h, on cart webhook)
      Birthday        (1 email, daily cron)
  click a card                    → flow_config.html
      set Trigger
      set Emails in series (+ delays + templates)
      set Stop conditions (unsubscribe / order placed / opens email)
  "Save flow"                     → flows.html
```

- [flows.html](flows.html) — three pre-built flow cards + an **execution view** showing the live funnel (trigger → email 1 → wait → email 2 → …). "Preview emails" → the series preview.
- [flow_config.html](flow_config.html) — wizard-style config (no drag-and-drop canvas in V1). "Preview emails" → the series preview.
- [welcome_series_preview.html](welcome_series_preview.html) — the **3 welcome emails side by side** (Welcome · Brand story · First-order discount) with the Day 0 / 2 / 7 timeline.

> Cart/order triggers come from the e-commerce integration (Flow 7); flows reuse templates (Flow 6) and the campaign send path.

---

## Flow 5 · Grow the list with signup forms

```
Sidebar: Forms                    → forms.html
  "New form" / row                → form_builder.html
      choose mode: Inline / Popup / Hosted page
      configure: list, after-signup flow, fields, hCaptcha
      copy the <script> embed code
      live preview on the right
  "Save form"                     → forms.html
```

- [forms.html](forms.html) → [form_builder.html](form_builder.html)
- A signup can drop the new contact straight into a flow (links Flow 5 → Flow 4).

---

## Flow 6 · Templates → builder

```
Sidebar: Templates                → templates.html   (tabs: All / Client / Agency / Starter library)
  card / "New template"           → builder.html     (blocks palette | canvas | properties)
  "Save"                          → templates.html
```

- [templates.html](templates.html) → [builder.html](builder.html)
- The builder is also entered mid-campaign from the wizard's Template step (Flow 2).

---

## Flow 7 · Connect a platform (integrations)

```
Sidebar: Integrations             → integrations.html
  Inbound (e-commerce sync):  WooCommerce (connected) · Shopify (connect) · Zapier · Daraz (n/a)
  Outbound (ESP export, 6 for V1): Mailchimp · MailerLite · Brevo · SendGrid · HubSpot · Klaviyo
      + escape hatch: raw HTML / MJML / webhook for anything else
```

- [integrations.html](integrations.html) — Tier-1 ESPs show "Connect" (API push); copy/paste ESPs show "Export".

---

## Flow 8 · Verify a sending domain (deliverability)

```
User menu (avatar): Profile & settings  → settings.html
  Left rail: Agency → Sending domain    → in-page tab (right panel)
  copy the 4 DNS records (SPF, DKIM×2, DMARC) to your registrar
  "Recheck now"  (also auto-rechecks hourly)
  status → Verified → sending unblocked
```

- [settings.html](settings.html) (tab: **Sending domain**) — until all required records pass, broadcasts from this client are blocked (the gate referenced in Flow 2's Review step).

---

## Flow 9 · Reporting

```
Sidebar: Reports                  → reports.html      (per-client aggregate + campaign table)
  campaign row                    → campaign_report.html
```

- [reports.html](reports.html) → [campaign_report.html](campaign_report.html). The agency-wide view is the dashboard (Flow 10).

---

## Flow 10 · Manage the agency (multi-client)

```
Top nav: client switcher          change the active client (re-scopes all per-client screens)
Sidebar: Overview                 → agency_dashboard.html   (all clients: metrics, chart, activity, deliverability)
Sidebar: All clients              → clients_list.html       (table of clients; filter Healthy/Watch/Setup)
  row "Open"                      → that client's context (e.g. contacts.html)
  "Add client"                    → (new client form)
```

- [agency_dashboard.html](agency_dashboard.html) ↔ [clients_list.html](clients_list.html)

---

## Flow 11 · Settings

```
Sidebar: Team          → team.html         (members, roles admin/member, pending invites)
Sidebar: Billing       → billing.html      (NPR plans, usage, Khalti/eSewa, manual-renewal note, invoices)
Sidebar: White-label   → whitelabel.html   (custom domain + SSL, branding, client-view preview)
```

- [team.html](team.html) · [billing.html](billing.html) · [whitelabel.html](whitelabel.html)

---

## Per-screen navigation map

| Screen | Purpose | Reached from | Goes to |
|--------|---------|--------------|---------|
| [agency_dashboard.html](agency_dashboard.html) | Agency overview | sidebar · login | clients, campaigns, contacts, reports |
| [clients_list.html](clients_list.html) | All clients | sidebar · dashboard | a client's context, add client |
| [settings.html](settings.html) (tab: Sending domain) | Domain verification | user menu → Settings → Sending domain | — (gate for sending) |
| [contacts.html](contacts.html) | Contact list | sidebar | contact_detail, contact_import |
| [contact_detail.html](contact_detail.html) | One contact | contacts row | back to contacts |
| [contact_import.html](contact_import.html) | CSV import | contacts | back to contacts |
| [templates.html](templates.html) | Template library | sidebar | builder |
| [builder.html](builder.html) | Email editor | templates · campaign wizard | save → templates |
| [campaigns_list.html](campaigns_list.html) | Campaigns | sidebar | campaign_new, campaign_report |
| [campaign_new.html](campaign_new.html) | Send wizard | campaigns · "New campaign" | builder, campaign_report (on send) |
| [campaign_report.html](campaign_report.html) | Campaign analytics | campaigns row · reports | back to campaigns |
| [flows.html](flows.html) | Automation overview | sidebar | flow_config |
| [flow_config.html](flow_config.html) | Configure a flow | flows card | preview, back to flows |
| [welcome_series_preview.html](welcome_series_preview.html) | 3 welcome emails side by side | flows · flow_config | back to flow |
| [forms.html](forms.html) | Signup forms | sidebar | form_builder |
| [form_builder.html](form_builder.html) | Build a form | forms | back to forms |
| [reports.html](reports.html) | Per-client analytics | sidebar | campaign_report |
| [team.html](team.html) | Members & invites | sidebar | — |
| [integrations.html](integrations.html) | Connect platforms | sidebar | — |
| [billing.html](billing.html) | Plans & payment | sidebar | — |
| [whitelabel.html](whitelabel.html) | Branding | sidebar | — |

> Navigation note: the 12 newer screens use the shared shell ([_shell.js](_shell.js)) and link to **every** screen. The 8 earlier screens (dashboard, clients, campaigns ×3, contacts ×3) currently link only to overview/clients/campaigns/contacts — unifying them onto the shared shell would make all sidebar links live everywhere.
