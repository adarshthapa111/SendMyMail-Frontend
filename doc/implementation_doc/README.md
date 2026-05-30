# SendMyMail · Implementation Docs

Per-feature implementation specs for V1, one file per module. These translate
the scope in [doc/MVP.md](../MVP.md) and the explanations in
[doc/feature/feature_details.md](../feature/feature_details.md) into a
build-oriented plan: data model, API surface, frontend, flows, edge cases,
and acceptance criteria.

> **Status of technical detail:** schema, endpoints, and component names marked
> _(proposed)_ are inferred to give the build a concrete starting point — they
> are not locked by the MVP doc and may change during implementation. Anything
> stated directly in the MVP is cited as such.
>
> ✅ **Stack note:** Frontend is a **Vite + React SPA** (client-rendered, no SSR);
> the email builder is a **custom in-house MJML builder**; ESP export is part of
> Module 09 (V1 exposes **6 first-class platforms** + escape hatch; the repo's
> ~40-entry registry stays defined but hidden). All three match the `sendmymail-frontend`
> repo and are recorded in the MVP §12 decision log. Note the SSR implication:
> white-label brand injection (Module 12) uses edge/proxy injection into
> `index.html` + a client-bootstrap fallback, not server-side rendering.

## Modules

| # | Feature | Doc |
|---|---------|-----|
| 01 | Authentication & workspace | [feature-authentication-workspace.md](./feature-authentication-workspace.md) |
| 02 | Client management | [feature-client-management.md](./feature-client-management.md) |
| 03 | Sending domain verification | [feature-sending-domain-verification.md](./feature-sending-domain-verification.md) |
| 04 | Contacts & lists | [feature-contacts-lists.md](./feature-contacts-lists.md) |
| 05 | Email builder | [feature-email-builder.md](./feature-email-builder.md) |
| 06 | Campaign engine | [feature-campaign-engine.md](./feature-campaign-engine.md) |
| 07 | Marketing automation (flows) | [feature-marketing-automation-flows.md](./feature-marketing-automation-flows.md) |
| 08 | Signup forms | [feature-signup-forms.md](./feature-signup-forms.md) |
| 09 | Integrations | [feature-integrations.md](./feature-integrations.md) |
| 10 | Reporting & analytics | [feature-reporting-analytics.md](./feature-reporting-analytics.md) |
| 11 | Billing | [feature-billing.md](./feature-billing.md) |
| 12 | White-label | [feature-white-label.md](./feature-white-label.md) |
| 13 | Onboarding wizard | [feature-onboarding-wizard.md](./feature-onboarding-wizard.md) |
| 14 | Deliverability trust layer | [feature-deliverability-trust-layer.md](./feature-deliverability-trust-layer.md) |

## Cross-cutting invariants (apply to every module)

1. **Tenant isolation** — every query and table carries `agency_id` (+ `client_id` where applicable). No endpoint returns data outside the caller's agency.
2. **Two mail channels** — customer marketing mail via AWS SES; platform/transactional mail (verification, test sends, opt-in confirmations) via Postmark. Never mixed.
3. **Suppression checked late** — re-verify suppression at render/execution time, not only at scheduling.
4. **Build order** — multi-tenant infra (wk 1–2) → auth/clients (wk 3–4) → deliverability (wk 5–7) → contacts (wk 8–9) → builder/campaigns (wk 10–11) → flows/forms/integrations (wk 12–13) → billing/white-label/reporting (wk 14–15) → hardening (wk 16).
