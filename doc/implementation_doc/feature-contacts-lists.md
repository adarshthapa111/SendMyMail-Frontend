# Feature 04 · Contacts & lists — Implementation

**Module purpose:** Per-client contact database with lists, tags, segmentation,
custom fields, and suppression.
**Spec:** [MVP §Module 04](../MVP.md), [feature_details §04](../feature/feature_details.md)
**Build window:** Weeks 8–9.

---

## V1 scope

- `contacts` with `UNIQUE (client_id, lowercased_email)`
- Standard fields + `jsonb` for up to **10 custom fields** per client
- Lists with many-to-many membership and **per-list** subscription status
- Free-text multi-select tags
- CSV import via **papaparse** (streaming, UTF-8 detection, BOM strip, in-list dedupe)
- Mandatory **consent declaration** on every import
- Segmentation rule-builder: **max 5 conditions**, AND/OR, compiled to parameterized SQL
- Two-level suppression: client (unsubscribed) + agency (hard bounces, complaints)
- GDPR right-to-erasure cascading through `list_contacts`, `events`, `sends`

**Out of scope:** >10 custom fields, >5 conditions / nested groups, behavioural segments, predictive scoring, cross-list merge.

---

## Data model _(proposed)_

```
contact
  id (pk), agency_id, client_id, email, email_lower,
  first_name, last_name, phone, city, birthday,
  custom jsonb,            -- ≤10 client-defined fields
  created_at
  UNIQUE (client_id, email_lower)

list
  id (pk), client_id, name, created_at

list_contact
  list_id (fk), contact_id (fk),
  status ENUM('subscribed','unsubscribed','pending'),
  PRIMARY KEY (list_id, contact_id)

tag / contact_tag           -- free-text tags, m2m

suppression
  id (pk), agency_id, client_id NULL, email_lower,
  scope ENUM('client','agency'),
  reason ENUM('unsubscribe','hard_bounce','complaint'),
  created_at
```

`scope='agency'` (client_id NULL) = applies across all clients (bounces/complaints).
`scope='client'` = unsubscribe from one client only.

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET/POST/PATCH/DELETE | `/clients/{id}/contacts` | CRUD; DELETE = GDPR cascade |
| POST | `/clients/{id}/contacts/import` | CSV upload, consent flag required |
| GET/POST | `/clients/{id}/lists` | Lists |
| POST | `/clients/{id}/lists/{listId}/contacts` | Membership |
| POST | `/clients/{id}/segments/preview` | Compile rules → count + sample |

---

## Key flows

**CSV import**
1. Upload → papaparse **streams** rows (large files don't blow memory).
2. Detect UTF-8, strip BOM (prevents garbled Devanagari names).
3. Dedupe by `email_lower` within the target list.
4. Require consent declaration checkbox (recorded).
5. Quality check (Module 14): reject if >10% role accounts or scraped patterns.

**Segmentation**
1. UI builds ≤5 conditions with AND/OR.
2. Server compiles to **parameterized** SQL (never string-concatenated → no injection).
3. Preview returns matched count + sample before use.

**GDPR erasure**
- Deleting a contact cascades through `list_contact`, `events`, `sends` — true erasure, not a flag.

---

## Implementation notes

- **`email_lower` uniqueness** prevents `Bob@` / `bob@` double-sends; scoped to `client_id` so the same person can exist under multiple clients.
- **Per-list subscription status** respects "newsletter yes, promos no."
- **Two-level suppression** is central: unsubscribe is client-scoped; bounce/complaint is agency-scoped and must apply everywhere (deliverability signal).
- **10-field cap** keeps `jsonb` sane; liftable in V2.

---

## Edge cases & failure modes

- Mixed-encoding CSV → detect per-stream; reject unrecoverable rows with a report.
- Duplicate email across two lists → one contact, two `list_contact` rows.
- Contact unsubscribes from one client → still mailable by other clients.
- Hard bounce → agency-scoped suppression; never re-sent under any client.
- Erasure mid-campaign → snapshot already taken (Module 06); ensure post-send cleanup honors erasure.

## Acceptance criteria

- [ ] Importing a large UTF-8 CSV with Devanagari names succeeds without garbling or OOM.
- [ ] Consent checkbox is required and recorded on every import.
- [ ] Segment builder rejects >5 conditions and emits only parameterized SQL.
- [ ] Unsubscribe is client-scoped; bounce/complaint is agency-wide.
- [ ] Deleting a contact removes all `list_contact`/`events`/`sends` rows.

## Dependencies

papaparse · Postgres (`jsonb`) · Deliverability layer (14) for import quality + suppression · feeds Campaign engine (06) and Flows (07).
