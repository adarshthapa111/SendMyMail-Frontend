# Feature 08 · Signup forms — Implementation

**Module purpose:** Inline, popup, and hosted forms with proper opt-in and spam
protection — how contacts get *into* the system.
**Spec:** [MVP §Module 08](../MVP.md), [feature_details §08](../feature/feature_details.md)
**Build window:** Weeks 12–13.

---

## V1 scope

- Simple form builder (no drag-and-drop): field picker, required toggles, button text/colour
- Three modes: **inline embed**, **popup** (timer/scroll trigger), **hosted page** (full URL)
- `<script>` embed rendering via **iframe** (avoids CSS conflicts)
- **hCaptcha** on every form
- Auto double-opt-in for **EU** contacts via IP geolocation (MaxMind GeoLite2)
- Confirmation email via **Postmark**
- On confirm: add to chosen list + optional flow entry
- Hosted-page forms get auto SSL via Let's Encrypt

**Out of scope:** form A/B testing, multi-step forms, quizzes/surveys, conditional logic, exit-intent, custom HTML embed.

---

## Data model _(proposed)_

```
form
  id, agency_id, client_id, name,
  mode ENUM('inline','popup','hosted'),
  fields jsonb, button_text, button_color,
  target_list_id, target_flow_id NULL,
  popup_trigger jsonb NULL,    -- {type:'timer'|'scroll', value}
  hosted_slug NULL, created_at

form_submission
  id, form_id, email, payload jsonb,
  status ENUM('pending','confirmed'),
  ip, country, double_optin BOOLEAN, created_at
```

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| GET/POST/PATCH | `/clients/{id}/forms` | Builder CRUD |
| GET | `/embed/{formId}.js` | Returns the iframe-injecting script |
| GET | `/f/{formId}` (or `/h/{slug}`) | Iframe-rendered form / hosted page |
| POST | `/forms/{formId}/submit` | hCaptcha verify → create submission |
| GET | `/forms/confirm/{token}` | Double-opt-in confirm → list/flow |

---

## Key flows

**Embed**
1. Agency copies a `<script>` tag onto the client's site.
2. Script injects an **iframe** → form CSS is sandboxed from the host page (and vice versa).

**Submission → confirmation**
1. Visitor submits → **hCaptcha** verified server-side (blocks bots / spam-trap stuffing).
2. Geolocate IP (GeoLite2). EU → force **double-opt-in**.
3. Send confirmation via **Postmark**; status `pending`.
4. On confirm link → add to `target_list` (status subscribed) + optional flow entry (Module 07).

**Hosted page** → auto SSL via Let's Encrypt.

---

## Implementation notes

- **iframe rendering** is the explicit mechanism to avoid CSS conflicts with arbitrary host sites.
- **hCaptcha on every form** is a deliverability defense — a list polluted by bots generates bounces/complaints.
- **EU double-opt-in** applied selectively by geo keeps GDPR compliance without burdening non-EU signups.
- Confirmation mail via **Postmark** (platform channel) — never the customer's SES.

---

## Edge cases & failure modes

- hCaptcha failure / token replay → reject submission.
- GeoLite2 lookup miss → default to double-opt-in (safer) or configurable.
- Duplicate email already subscribed → idempotent (no duplicate contact).
- Popup trigger on very short pages (scroll never fires) → timer fallback.
- Hosted-page SSL issuance delay → show pending state, retry.

## Acceptance criteria

- [ ] All three modes render; embed is iframe-isolated from host CSS.
- [ ] hCaptcha blocks automated submissions on every form.
- [ ] EU-geolocated submissions get double-opt-in automatically.
- [ ] Confirmation email sends via Postmark; confirming adds to list (+ optional flow).
- [ ] Hosted pages serve over auto-issued HTTPS.

## Dependencies

hCaptcha · MaxMind GeoLite2 · Postmark · Let's Encrypt (Caddy/Vercel) · Contacts/lists (04) · Flows (07).
