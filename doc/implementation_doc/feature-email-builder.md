# Feature 05 · Email builder — Implementation

**Module purpose:** Visual editor producing reliable, MJML-rendered emails. Built
**in-house** as a block-based drag-and-drop builder.
**Spec:** [MVP §Module 05](../MVP.md), [feature_details §05](../feature/feature_details.md)
**Build window:** Weeks 10–11 (largely already built in `sendmymail-frontend`).

> ✅ **Decision resolved.** SendMyMail uses its **own custom MJML builder**, not
> Unlayer (reverses the earlier MVP decision — see §12). This already exists in
> the `sendmymail-frontend` repo: an `IMjmlNode` tree as the single source of
> truth, pure tree operations (immer), a block registry, an inspector, and a
> canvas. Compilation is server-side via `/getHtml` and `/getMjml`. This doc is
> now written against that architecture — see the repo's `CLAUDE.md` and
> `src/tree/`, `src/blocks/`, `src/canvas/`, `src/api/renderTemplate.ts`.

---

## V1 scope

- **Custom MJML drag-and-drop builder** — block-based (tree + registry + inspector + canvas)
- Save **MJML source** to DB; render HTML at **send time** (fixes propagate)
- Merge tags: `{{first_name|fallback}}`, `{{email}}`, `{{custom.field_name}}`
- Desktop + mobile previews
- Send-test via **Postmark** (not customer SES)
- **8 starter templates**, tested in Gmail / Outlook 2016+ / Apple Mail
- Agency-level reusable templates with brand-colour swap

**Out of scope:** third-party embedded editors (Unlayer), 200+ library, AI content, marketplace, AMP for Email.

---

## Data model _(proposed)_

```
template
  id (pk), agency_id, client_id NULL,   -- NULL = agency-level reusable
  name, mjml_source TEXT, thumbnail_url,
  is_starter BOOLEAN, created_at, updated_at
```

Agency-level templates (`client_id NULL`) are reused across clients with a
brand-colour swap applied at render.

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET/POST/PATCH | `/templates` | CRUD; stores MJML source |
| POST | `/templates/{id}/render` | MJML → HTML (merge tags + brand colour) |
| POST | `/templates/{id}/test-send` | Send via **Postmark** to a test address |
| GET | `/templates/starters` | The 8 tested starters |

---

## Key flows

**Edit → save → send-time render**
1. Builder edits mutate the `IMjmlNode` tree; on save, strip editor-only fields and persist the MJML/tree as `mjml_source` (not HTML).
2. At campaign send, render MJML → HTML per recipient via `/getHtml` (merge tags resolved, brand colour swapped, `thirdPartyClientName` attributes injected for the target ESP).
3. Rendering at send time means pipeline fixes propagate to all templates with no re-save.

**Merge-tag resolution**
- `{{first_name|fallback}}` resolves from contact fields; `{{custom.x}}` from `contact.custom` jsonb; empty → fallback (never "Hi ,").

**Test send**
- Always via Postmark, never the customer's SES — test mail must not touch customer sending reputation.

---

## The 8 starter templates

Welcome · Newsletter · Promo · Order confirmation · Abandoned cart · Birthday ·
Re-engagement · **Festive (Dashain/Tihar — Devanagari tested)**.
Each must render correctly in Gmail, Outlook 2016+, and Apple Mail. Quality of 8 > quantity of 200.

---

## Implementation notes

- **Store MJML, render at send** is the load-bearing decision — it decouples authoring from output and makes fixes global.
- **Merge-tag syntax** must be consistent across builder, campaign engine, and flows.
- **Devanagari** in the Festive template needs font/encoding verification across clients.
- **The builder already exists** in `sendmymail-frontend`: tree (`src/tree/`), block registry (`src/blocks/`), canvas (`src/canvas/`), render API (`src/api/renderTemplate.ts`). Work here is integrating it into the multi-tenant platform (per-client/agency templates, send-time render in the campaign pipeline), not building from scratch.
- The `thirdPartyClientName` parameter on the render call is what ties the builder to the ESP-export integrations (Module 09) — owning the tree is precisely what lets us inject platform-specific attributes.

---

## Edge cases & failure modes

- Missing merge field → fallback applied; never render an empty salutation.
- Outlook conditional rendering quirks → why MJML is used; test every starter.
- Very large template → render timeout handling at send.
- Brand colour swap on a template without a defined colour slot → no-op gracefully.

## Acceptance criteria

- [ ] Templates persist as MJML; HTML is produced at send time, not stored.
- [ ] All 8 starters render correctly in Gmail, Outlook 2016+, Apple Mail (incl. Devanagari).
- [ ] Merge tags resolve with working fallbacks.
- [ ] Test sends go through Postmark, never customer SES.
- [ ] Agency-level template reused across clients with correct per-client brand colour.

## Dependencies

Custom builder (existing repo tree + render API) · server-side MJML renderer (`/getHtml`, `/getMjml`) · Postmark (test sends) · Contacts (04) for merge data · ESP-export targets (09) via `thirdPartyClientName` · consumed by Campaign engine (06) & Flows (07).
