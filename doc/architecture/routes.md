# Routes — URL ↔ Screen ↔ Impl doc

> 🗺️ The map between every URL the app serves, the mockup it renders, the
> impl doc that backs it, and the auth gate that protects it.

## 1. Routing principles

1. **Path-based tenancy.** The agency is implicit in the JWT — there is no `/a/:agencyId` segment. Switching agencies = re-issuing the JWT. The active client *is* in the URL (`/clients/:clientId/...`), so links are shareable and the browser's back/forward works as expected.
2. **One URL per screen.** Every mockup file has exactly one canonical URL. Modal-style mockups (e.g. `modals.html`, `welcome_series_preview.html`) are demos of overlay components, not routes.
3. **Lazy-load by feature.** Each top-level group (`clients`, `campaigns`, `flows`, `forms`, `reports`, `billing`, `team`, `integrations`, `whitelabel`) is a separate code-split chunk. Pre-auth screens are their own bundle (no app shell pulled in).
4. **Guards run top-down.** `Public` < `AuthOnly` < `AgencyReady` < `ClientScoped` < `RoleGated`. A failing guard redirects, never renders the screen partially.
5. **Unknown routes** redirect to `/dashboard` (auth'd) or `/login` (anon).

## 2. The route table

| URL pattern | Screen mockup | Auth gate | Owning impl doc |
|---|---|---|---|
| **Public / pre-auth** | | | |
| `/login` | [login.html](../mockups/login.html) | Public · redirects to `/dashboard` if signed in | [feature-authentication-workspace.md](../implementation_doc/feature-authentication-workspace.md) |
| `/signup` | [signup.html](../mockups/signup.html) | Public · redirects to `/dashboard` if signed in | same |
| `/verify` | [verify.html](../mockups/verify.html) | AuthOnly (email not yet confirmed) | same |
| `/forgot` | [forgot.html](../mockups/forgot.html) | Public | same |
| `/reset/:token` | [reset.html](../mockups/reset.html) | Public · token validated server-side | same |
| `/invite/:token` | [invite.html](../mockups/invite.html) (success) · [invite_error.html](../mockups/invite_error.html) (gallery of 4 error states) | Public · token validated server-side, sign-up inline | same |
| `/u/:unsubToken` | [unsubscribe.html](../mockups/unsubscribe.html) | Public · token in URL, no auth | [feature-deliverability-trust-layer.md](../implementation_doc/feature-deliverability-trust-layer.md) |
| **First-run (signed in, agency may not be ready)** | | | |
| `/workspace-setup` | [workspace_setup.html](../mockups/workspace_setup.html) | AuthOnly · only if agency profile is incomplete | [feature-authentication-workspace.md](../implementation_doc/feature-authentication-workspace.md) |
| `/onboarding` | [onboarding.html](../mockups/onboarding.html) | AgencyReady · only if checklist incomplete | [feature-onboarding-wizard.md](../implementation_doc/feature-onboarding-wizard.md) |
| **Agency-scoped (need an agency, no client picked)** | | | |
| `/` | — | redirect → `/dashboard` (auth) or `/login` (anon) | — |
| `/dashboard` | [agency_dashboard.html](../mockups/agency_dashboard.html) | AgencyReady | [feature-reporting-analytics.md](../implementation_doc/feature-reporting-analytics.md) |
| `/clients` | [clients_list.html](../mockups/clients_list.html) | AgencyReady | [feature-client-management.md](../implementation_doc/feature-client-management.md) |
| `/clients/new` | [client_create.html](../mockups/client_create.html) | RoleGated · owner/admin only | same |
| `/team` | [team.html](../mockups/team.html) | RoleGated · owner/admin only | [feature-authentication-workspace.md](../implementation_doc/feature-authentication-workspace.md) |
| `/audit` | [audit_log.html](../mockups/audit_log.html) | RoleGated · owner/admin only | same |
| `/integrations` | [integrations.html](../mockups/integrations.html) | AgencyReady | [feature-integrations.md](../implementation_doc/feature-integrations.md) |
| `/billing` | [billing.html](../mockups/billing.html) | RoleGated · owner only | [feature-billing.md](../implementation_doc/feature-billing.md) |
| `/whitelabel` | [whitelabel.html](../mockups/whitelabel.html) | RoleGated · owner only | [feature-white-label.md](../implementation_doc/feature-white-label.md) |
| **Client-scoped (need `:clientId` + access to that client)** | | | |
| `/clients/:clientId` | — | redirect → `/clients/:clientId/contacts` | — |
| `/clients/:clientId/contacts` | [contacts.html](../mockups/contacts.html) | ClientScoped | [feature-contacts-lists.md](../implementation_doc/feature-contacts-lists.md) |
| `/clients/:clientId/contacts/import` | [contact_import.html](../mockups/contact_import.html) | ClientScoped | same |
| `/clients/:clientId/contacts/:contactId` | [contact_detail.html](../mockups/contact_detail.html) | ClientScoped | same |
| `/clients/:clientId/lists` | [lists.html](../mockups/lists.html) | ClientScoped | same |
| `/clients/:clientId/lists/:listId/edit` | [list_editor.html](../mockups/list_editor.html) | ClientScoped | same |
| `/clients/:clientId/suppression` | [suppression.html](../mockups/suppression.html) | RoleGated · owner/admin only | [feature-deliverability-trust-layer.md](../implementation_doc/feature-deliverability-trust-layer.md) |
| `/clients/:clientId/templates` | [templates.html](../mockups/templates.html) | ClientScoped | [feature-email-builder.md](../implementation_doc/feature-email-builder.md) |
| `/clients/:clientId/templates/:templateId/edit` | [builder.html](../mockups/builder.html) | ClientScoped | same |
| `/clients/:clientId/campaigns` | [campaigns_list.html](../mockups/campaigns_list.html) | ClientScoped | [feature-campaign-engine.md](../implementation_doc/feature-campaign-engine.md) |
| `/clients/:clientId/campaigns/new` | [campaign_new.html](../mockups/campaign_new.html) | ClientScoped | same |
| `/clients/:clientId/campaigns/new/audience` | [campaign_step2.html](../mockups/campaign_step2.html) | ClientScoped | same |
| `/clients/:clientId/campaigns/new/content` | [campaign_step3.html](../mockups/campaign_step3.html) | ClientScoped | same |
| `/clients/:clientId/campaigns/new/schedule` | [campaign_step4.html](../mockups/campaign_step4.html) | ClientScoped | same |
| `/clients/:clientId/campaigns/new/review` | [campaign_step5.html](../mockups/campaign_step5.html) | ClientScoped | same |
| `/clients/:clientId/campaigns/new/done` | [campaign_step6.html](../mockups/campaign_step6.html), [campaign_sent.html](../mockups/campaign_sent.html) | ClientScoped | same |
| `/clients/:clientId/campaigns/:campaignId` | [campaign_report.html](../mockups/campaign_report.html) | ClientScoped | same |
| `/clients/:clientId/flows` | [flows.html](../mockups/flows.html) | ClientScoped | [feature-marketing-automation-flows.md](../implementation_doc/feature-marketing-automation-flows.md) |
| `/clients/:clientId/flows/:flowId` | [flow_config.html](../mockups/flow_config.html) | ClientScoped | same |
| `/clients/:clientId/forms` | [forms.html](../mockups/forms.html) | ClientScoped | [feature-signup-forms.md](../implementation_doc/feature-signup-forms.md) |
| `/clients/:clientId/forms/:formId/edit` | [form_builder.html](../mockups/form_builder.html) | ClientScoped | same |
| `/clients/:clientId/reports` | [reports.html](../mockups/reports.html) | ClientScoped | [feature-reporting-analytics.md](../implementation_doc/feature-reporting-analytics.md) |
| **Cross-cutting (reached via user menu / chrome)** | | | |
| `/settings` | [settings.html](../mockups/settings.html) (default tab: Profile) | AgencyReady | [feature-authentication-workspace.md](../implementation_doc/feature-authentication-workspace.md) |
| `/settings/profile` | [settings.html](../mockups/settings.html) (tab=profile) | AgencyReady | same |
| `/settings/notifications` | [settings.html](../mockups/settings.html) (tab=notifications) | AgencyReady | same |
| `/settings/security` | [settings.html](../mockups/settings.html) (tab=security) | AgencyReady | same |
| `/settings/agency` | [settings.html](../mockups/settings.html) (tab=agency) | RoleGated · owner/admin only | same |
| `/settings/domain` | [settings.html](../mockups/settings.html) (tab=domain) — uses active client from top-bar switcher | ClientScoped · owner/admin/member only (per [roles-and-permissions.md §E](./roles-and-permissions.md#e-sending-domain-per-client)) | [feature-sending-domain-verification.md](../implementation_doc/feature-sending-domain-verification.md) |
| `/help` | [help.html](../mockups/help.html) | AgencyReady | — |
| `/notifications` | [notifications.html](../mockups/notifications.html) | AgencyReady | — |

**Non-routes** — demo / overlay files in `doc/mockups/` that don't get their own URL:
- [modals.html](../mockups/modals.html) — modal component variants. Rendered inline over whatever page triggers them.
- [welcome_series_preview.html](../mockups/welcome_series_preview.html) — preview slide-over rendered inside the flow config screen.

## 3. Auth gates — what each one means

| Gate | Resolves to | Fail action |
|---|---|---|
| **Public** | always allowed. If a valid session exists, redirect signed-in users away from sign-in screens. | redirect → `/dashboard` (if already signed in) |
| **AuthOnly** | JWT present + valid + email verified (for screens after `/verify`). | redirect → `/login?next=<path>` |
| **AgencyReady** | AuthOnly + the JWT's agency has completed `/workspace-setup` (name, country, billing email). | redirect → `/workspace-setup` |
| **ClientScoped** | AgencyReady + `:clientId` exists + the current user has access to that client (see [auth-tenancy.md](./auth-tenancy.md)). | 404 if client doesn't exist; redirect → `/clients` if no access |
| **RoleGated** | AgencyReady + the user's role meets the route's minimum (owner, admin, member, viewer). | 404 with "you don't have permission" copy |

The first failing gate wins — never render a partial screen and *then* show a permission error.

## 4. The `:clientId` switcher

Two ways a user can land on a client-scoped URL:

1. **Direct link / refresh** — URL is the truth. The active-client store value is hydrated *from* the URL on mount.
2. **Top-bar switcher click** — the user picks a different client from the dropdown. The router pushes the new URL (`/clients/:newId/contacts`) and the store updates *from* the new URL.

In both cases **URL is the source of truth**; the store reflects it. See [state.md §3](./state.md) for the active-client model.

## 5. Code split boundaries

Each row in this table is one lazy-loaded chunk:

| Chunk | Routes |
|---|---|
| `auth` | `/login`, `/signup`, `/verify`, `/forgot`, `/reset/:token`, `/invite/:token` |
| `setup` | `/workspace-setup`, `/onboarding` |
| `dashboard` | `/dashboard` |
| `clients` | `/clients`, `/clients/new`, `/clients/:clientId` (redirect) |
| `contacts` | `/clients/:clientId/contacts`, `/clients/:clientId/contacts/import`, `/clients/:clientId/contacts/:contactId` |
| `templates` | `/clients/:clientId/templates`, `/clients/:clientId/templates/:templateId/edit` |
| `campaigns` | all `/clients/:clientId/campaigns/*` |
| `flows` | `/clients/:clientId/flows`, `/clients/:clientId/flows/:flowId` |
| `forms` | `/clients/:clientId/forms`, `/clients/:clientId/forms/:formId/edit` |
| `reports` | `/clients/:clientId/reports` |
| `team` | `/team` |
| `integrations` | `/integrations` |
| `billing` | `/billing` |
| `whitelabel` | `/whitelabel` |
| `settings` | all `/settings/*` (one bundle, all tabs render inside `settings.html`) |
| `help` | `/help` |
| `notifications` | `/notifications` |

The shared shell (sidebar, top-bar, design tokens) is in the main bundle.

## 6. Open questions (flag during impl)

- **Settings page** — no mockup yet. Likely `/settings` (agency profile, user account, security). Add when designed.
- **Per-client settings** — currently scattered across `/clients/:clientId/domain` and inside other screens. May need a dedicated `/clients/:clientId/settings` later.
- **Per-template preview URL** — sharing a preview link with a client may need a public unauth route like `/p/:shareToken`.
