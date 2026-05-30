# Feature 12 · White-label — Implementation

**Module purpose:** The agency's clients see the agency's brand, never
SendMyMail's. One of the three core strategic bets.
**Spec:** [MVP §Module 12](../MVP.md), [feature_details §12](../feature/feature_details.md)
**Build window:** Weeks 14–15.

---

## V1 scope

- ★ Custom domain mapping: agency CNAMEs `mail.theiragency.com` → `cname.sendmymail.np`
- ★ Auto SSL via **Let's Encrypt** (Caddy reverse proxy or Vercel custom-domain API)
- Branding as agency-level JSON: logo URL, primary colour, accent colour
- `window.__BRAND__` resolved by requesting domain — **edge/proxy injection into `index.html`** (Vite SPA, no SSR), with a client-bootstrap `/branding?host=` fallback
- Branded forms, opt-in confirmation pages, unsubscribe pages
- "Powered by SendMyMail" footer — removable only on **Scale** plan
- **(V1.5)** custom tracking-link domain `track.theiragency.com`

**Out of scope:** full dashboard white-label with custom domain, per-client branding within an agency, branded mobile app, custom font upload.

---

## Data model _(proposed)_

```
agency.branding_json = {
  logo_url, primary_color, accent_color,
  custom_domain, ssl_status, remove_powered_by  // Scale only
}

custom_domain
  id, agency_id, domain, cname_target,
  ssl_status ENUM('pending','issued','failed'), verified_at
```

---

## API surface _(proposed)_

| Method | Route | Role |
|--------|-------|------|
| GET/PATCH | `/agency/branding` | admin |
| POST | `/agency/domains` | admin — register custom domain, begin SSL |
| GET | `/agency/domains/{id}/status` | SSL/verification status |
| GET | `/branding?host=` | Resolve branding by hostname (SPA bootstrap fallback) |
| (edge/proxy) | Caddy/Vercel: resolve `Host` → inject `window.__BRAND__` into `index.html` |

---

## Key flows

**Custom domain + SSL**
1. Admin adds `mail.theiragency.com`; UI shows the CNAME to `cname.sendmymail.np`.
2. On DNS resolve, Caddy / Vercel auto-issues SSL via Let's Encrypt.
3. `ssl_status` → issued; domain now serves branded public pages.

**Brand injection (by requesting domain)** — Vite SPA, so no SSR:
1. Request arrives on a custom/white-label domain; the **edge/proxy (Caddy/Vercel)** matches `Host` → agency and injects `<script>window.__BRAND__={…}</script>` into the static `index.html` **before the SPA boots** → no flash.
2. **Fallback** (if edge injection is unavailable): the SPA reads `location.hostname`, fetches `/branding?host=`, and gates first paint behind a brand-neutral splash until branding resolves.
3. Forms, opt-in, unsubscribe pages render with agency logo/colours.

**Powered-by footer** — present on every email except for Scale-plan agencies (upsell lever).

---

## Implementation notes

- **Edge/proxy injection by `Host`** (into `index.html`, before the SPA boots) prevents any flash of SendMyMail branding on first paint — the Vite-SPA equivalent of the SSR approach. The client-fetch fallback must gate render behind a neutral splash to preserve the no-flash guarantee.
- These public pages (forms/opt-in/unsubscribe) are exactly where a *client's customers* land — branding leaks here would break the entire white-label promise.
- **Powered-by removal gated to Scale** turns white-label completeness into a concrete reason to upgrade.
- V1.5 tracking domain ties into Reporting (Module 10) — same Let's Encrypt path.

---

## Edge cases & failure modes

- DNS not propagated → SSL pending; show clear status, retry issuance.
- SSL issuance fails (CAA records, rate limits) → surface reason, allow retry.
- Requesting domain not mapped to any agency → fall back to default SendMyMail branding.
- Plan downgrade from Scale → re-enable powered-by footer at next cycle.

## Acceptance criteria

- [ ] Custom domain maps via CNAME and auto-issues SSL.
- [ ] Public pages render agency branding with no SendMyMail flash (server-injected).
- [ ] Forms, opt-in, and unsubscribe pages all reflect agency branding.
- [ ] Powered-by footer present on all plans except Scale.

## Dependencies

Caddy / Vercel custom-domain API · Let's Encrypt · agency branding store · Forms (08) & email render (05) consume branding · Reporting (10) for V1.5 tracking domain.
