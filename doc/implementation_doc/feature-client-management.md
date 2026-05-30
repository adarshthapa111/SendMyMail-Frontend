# Feature 02 · Client management — Implementation

**Module purpose:** The unique value-prop — one agency manages many clients from
a single dashboard.
**Spec:** [MVP §Module 02](../MVP.md), [feature_details §02](../feature/feature_details.md)
**Build window:** Weeks 3–4.

---

## V1 scope

- Create / edit / **soft-delete** clients (hard delete deferred for billing-dispute protection)
- Top-nav **client switcher** on every screen, selection persisted in session
- URL pattern `/{agency-slug}/clients/{client-slug}/{module}`
- Per-client: name, brand colour, default from-name, default from-email
- Client list sortable by last activity, contacts count, billing status
- All downstream data scoped by `client_id`

**Out of scope:** client portal, per-client member permissions, cross-client reporting, client groups/tags.

---

## Data model _(proposed)_

```
client
  id (pk), agency_id (fk), name, slug, brand_color,
  default_from_name, default_from_email,
  last_activity_at, created_at, deleted_at NULL
  UNIQUE (agency_id, slug)
```

Every downstream table (`contact`, `campaign`, `template`, `list`, …) carries
`client_id`. Combined with `agency_id`, this is the full tenant key.

---

## API surface _(proposed)_

| Method | Route | Role |
|--------|-------|------|
| GET | `/clients` | any — list with sort params (`last_activity`, `contacts`, `billing`) |
| POST | `/clients` | admin |
| PATCH | `/clients/{id}` | admin |
| DELETE | `/clients/{id}` | admin — soft delete (sets `deleted_at`) |
| GET | `/clients/{id}` | any |

Client switcher reads from `GET /clients`; active client persisted in session
(cookie or session store), not just client-side state, so deep links resolve.

---

## Frontend _(proposed)_

- **ClientSwitcher** — top-nav dropdown, present on every authenticated screen, 2-click switch, shows active client.
- **ClientListScreen** — sortable table (last activity / contacts / billing).
- **ClientForm** — create/edit (name, slug, brand colour, from-name, from-email).
- Route guard resolves `{agency-slug}` + `{client-slug}` → active tenant context for all child modules.

---

## Key flows

**Switching client**
1. User picks a client in ClientSwitcher.
2. Active `client_id` written to session.
3. Current module re-fetches scoped to the new client; URL updates to the new `client-slug`.

**Soft delete**
1. Admin deletes → `deleted_at` set; client hidden from default lists.
2. Historical sends/invoices remain queryable (dispute protection).
3. No cascade to contacts/campaigns (unlike GDPR erasure, which is contact-scoped in Module 04).

---

## Implementation notes

- **Session-persisted selection** matters: a deep link like `/acme/clients/khukri-spices/campaigns` must resolve the client even on first load, independent of any in-memory switcher state.
- **Soft delete vs hard delete** is deliberate — never expose hard delete in V1; it protects the audit trail an agency needs in a billing dispute.
- `last_activity_at` should be touched by downstream actions (send, import) so the sort is meaningful.

---

## Edge cases & failure modes

- Slug collision within an agency → reject/suggest (slugs unique per agency, not globally).
- Deep link to a soft-deleted client → 404 or "archived" state, not a leak.
- Member attempting create/delete → 403 (buttons disabled in UI, enforced server-side).
- Switching client mid-action (e.g. half-built campaign) → warn about unsaved scope change.

## Acceptance criteria

- [ ] Client switcher appears on every authenticated screen and switches in ≤2 clicks.
- [ ] Deep link with `{client-slug}` resolves the correct client on cold load.
- [ ] Soft-deleted clients disappear from lists but their sends/invoices remain.
- [ ] All downstream queries are scoped by `client_id` — no cross-client leakage.
- [ ] Members cannot create or delete clients (server-enforced).

## Dependencies

Auth/workspace (Module 01) · multi-tenant schema · feeds every downstream module.
