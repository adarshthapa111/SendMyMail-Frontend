# Feature 01 · Authentication & workspace — Implementation

**Module purpose:** The shell every other module lives inside — agency signs up,
creates a workspace, invites teammates.
**Spec:** [MVP §Module 01](../MVP.md), [feature_details §01](../feature/feature_details.md)
**Build window:** Weeks 3–4 (built on the multi-tenant engine from weeks 1–2).

---

## V1 scope

- Email + password signup via **Clerk or Supabase Auth** (decide Week 1 — do not build auth from scratch)
- Google OAuth login
- Email verification via **6-digit code** (not magic link)
- Workspace creation with unique slug → `{slug}.sendmymail.np`
- Team invites via email-bound token, **7-day expiry**
- Two roles: `admin`, `member`
- Password reset / forgot-password with **anti-enumeration** messaging
- Optional **TOTP 2FA** with downloadable recovery codes

**Out of scope:** SMS 2FA, WebAuthn/passkeys, SSO/SAML, client-facing logins.

---

## Data model _(proposed)_

```
agency
  id (pk), name, slug (unique), branding_json, created_at, deleted_at

user                         -- mirror of auth-provider identity
  id (pk), auth_provider_id (unique), email (unique), name, created_at

membership                   -- a user's role within an agency
  id (pk), agency_id (fk), user_id (fk), role ENUM('admin','member'),
  created_at
  UNIQUE (agency_id, user_id)

invite
  id (pk), agency_id (fk), email, role, token_hash, expires_at,
  accepted_at NULL, created_by (fk user)
```

`agency_id` is the root of tenant isolation — it propagates onto every table in
every other module.

---

## API surface _(proposed)_

| Method | Route | Notes |
|--------|-------|-------|
| POST | `/auth/signup` | Delegates to provider; creates `user` + `agency` + `membership(admin)` |
| POST | `/auth/login` | Provider session |
| GET  | `/auth/oauth/google` | OAuth redirect |
| POST | `/auth/verify` | Submit 6-digit code |
| POST | `/auth/verify/resend` | Rate-limited resend |
| POST | `/auth/forgot` | Always returns 200 (anti-enumeration) |
| POST | `/auth/reset` | Token + new password |
| POST | `/auth/2fa/setup` | Returns TOTP secret + QR + recovery codes |
| POST | `/auth/2fa/verify` | Enable after confirming a code |
| POST | `/workspaces` | Create workspace (slug) |
| POST | `/workspaces/{id}/invites` | admin only |
| POST | `/invites/{token}/accept` | Validates email-binding + expiry |

---

## Key flows

**Signup → first workspace**
1. Provider creates identity → app upserts `user`.
2. App creates `agency` (slug) + `membership(role=admin)`.
3. Sends 6-digit verification code via Postmark.
4. On verify, route into the onboarding wizard (Module 13).

**Invite acceptance**
1. Admin POSTs invite → token (hash stored), email sent via Postmark.
2. Invitee opens link → server checks token email matches signed-in/entered email and `expires_at > now`.
3. Creates `membership` with the invited role; marks invite `accepted_at`.

---

## Implementation notes

- **6-digit code over magic link** is a deliverability decision: a code is usable from the spam folder and across devices. Keep code TTL short (e.g. 10 min) and rate-limit resends.
- **Anti-enumeration:** forgot-password, signup-with-existing-email, and verify must all return responses that don't reveal account existence.
- **TOTP, not SMS:** SMS is costly in Nepal and SIM-swap-prone. Generate recovery codes once, show once, store only hashes.
- **Provider choice (Clerk vs Supabase)** affects the `user` mirror strategy — keep app-side identity decoupled behind `auth_provider_id`.

---

## Edge cases & failure modes

- Slug collision on workspace creation → reject with suggestion.
- Expired/forwarded invite used by wrong email → reject (email-bound).
- User belongs to multiple agencies → membership is per-agency; UI must pick active agency.
- Lost 2FA device → recovery codes; if exhausted, manual support path.
- OAuth email already exists as password account → link, don't duplicate.

## Acceptance criteria

- [ ] New agency can sign up, verify via code, and reach onboarding in one session.
- [ ] Google OAuth produces the same `user`/`membership` result as email signup.
- [ ] Invite link works only for the bound email and only within 7 days.
- [ ] Member role cannot hit admin-only endpoints (enforced server-side, not just UI).
- [ ] Forgot-password reveals nothing about account existence.
- [ ] TOTP can be enabled, used at login, and recovered via backup codes.

## Dependencies

Clerk/Supabase Auth · Postmark (verification + invite mail) · the multi-tenant schema (weeks 1–2).
