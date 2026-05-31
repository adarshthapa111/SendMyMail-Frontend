# Auth flow & DB schema — agencies and their clients

> 🔑 **What this doc explains:** the end-to-end auth process for an agency
> (the SendMyMail customer), the people on its team, and the clients it
> manages — plus the database tables that back it all.
>
> Companion to [auth-tenancy.md](./auth-tenancy.md) (which defines the
> *rules*) — this doc shows the *mechanics*.

---

## 1. The four kinds of "user" — get this straight first

The word "client" gets overloaded. Here's the model:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Agency  (the SendMyMail customer — e.g. Nirvana Agency)             │
│  ─────                                                                │
│                                                                       │
│  Agency users (real human logins under this agency):                  │
│    • Owner    — Prasiddha (signed up, owns the workspace)             │
│    • Admin    — Sushma (can do almost everything)                     │
│    • Member   — Aastha (day-to-day operator, may be client-scoped)    │
│    • Viewer   — read-mostly                                           │
│                                                                       │
│  Clients (the agency's customers — they are DATA, not user accounts): │
│    • Khukri Spices                                                    │
│    • Himalaya Trekking                                                │
│    • Pashmina Co.                                                     │
│       └─ Each client owns: contacts, lists, templates, campaigns,     │
│          flows, forms, reports, sending domain.                       │
│                                                                       │
│  Optionally — a real human at the client logs in (rare, opt-in):      │
│    • client@khukrispices.com                                          │
│       └─ Created as a Viewer user under the agency,                   │
│          scoped to ONLY the Khukri Spices client.                     │
│          They see only their own data.                                │
└──────────────────────────────────────────────────────────────────────┘
```

**The key insight:** clients in V1 are **data entities** owned by the agency. They don't have logins by default. If the agency *chooses* to give a real human at the client read access, that human becomes a **Viewer user under the agency**, scoped to just that one client. There is no separate "clients" auth realm — just one auth system with **scope** narrowing visibility.

This keeps the architecture simple: one users table, one auth flow, one JWT shape.

---

## 2. The agency-owner journey (the canonical signup flow)

```
┌─────────────┐   POST /v1/auth/signup           ┌─────────────────────┐
│   Browser   │ ────────────────────────────────►│   Server            │
│  (signup    │ { name, email, password }        │                     │
│   form)     │                                  │  ┌────────────────┐ │
└─────────────┘                                  │  │ 1. Hash pw     │ │
       ▲                                         │  │    (argon2)    │ │
       │                                         │  │ 2. Create user │ │
       │ { jwt, user, agency }                   │  │ 3. Create new  │ │
       │ JWT: { email_verified: false,           │  │    agency,     │ │
       │        agency_setup: false }            │  │    link as     │ │
       │                                         │  │    owner       │ │
       └─────────────────────────────────────────│  │ 4. Send 6-digit│ │
                                                 │  │    code email  │ │
                                                 │  └────────────────┘ │
                                                 └─────────────────────┘
                          │
                          ▼
                  Browser stores JWT in localStorage
                  Router redirects → /verify (because email_verified=false)

┌─────────────┐   POST /v1/auth/verify           ┌─────────────────────┐
│   Browser   │ ────────────────────────────────►│   Server            │
│  (/verify)  │ { code: "402199" }               │  Validate code      │
└─────────────┘ Authorization: Bearer <jwt>      │  Mark email_verified│
       ▲                                         │  Reissue JWT        │
       └─────────────────────────────────────────│                     │
              { jwt: <new, email_verified:true> }└─────────────────────┘

                          │
                          ▼
                  Router redirects → /workspace-setup (agency_setup=false)

┌─────────────┐   POST /v1/agencies/me           ┌─────────────────────┐
│   Browser   │ ────────────────────────────────►│   Server            │
│ (workspace  │ { name, country, billing_email } │  Update agency      │
│  setup)     │                                  │  Mark setup_complete│
└─────────────┘                                  │  Reissue JWT        │
       ▲                                         └─────────────────────┘
       └──── { jwt: <new, agency_setup:true> }

                          │
                          ▼
                  Router redirects → /onboarding (the 4-step checklist)
```

The JWT is reissued at each step so its **claims always reflect the latest server-side state** — the client never has to refresh manually.

---

## 3. Google OAuth (signup OR sign in — same endpoint)

Both `/signup` and `/login` show a "Continue with Google" button. They route to the same OAuth flow — the server decides at callback time whether this is a signup or a sign-in based on what's in the database.

```
┌─────────────┐
│  /signup OR │  Click "Continue with Google"
│   /login    │
└─────────────┘
       │
       ▼
GET /v1/auth/google/start                ──► 302 redirect to Google OAuth consent
       │                                     (we generate + store a `state` nonce
       │                                      in a short-lived signed cookie for
       │                                      CSRF protection)
       ▼  (user signs in / consents on accounts.google.com)
       │
       ▼
GET /v1/auth/google/callback?code=...&state=...   ──► Server:
                                                       1. Verify `state` matches the cookie
                                                       2. Exchange `code` for tokens (Google API)
                                                       3. Fetch userinfo:
                                                          { sub, email, email_verified, name, picture }
                                                       4. Reject if email_verified=false at Google
                                                       5. Decision tree below ↓
                                                       6. Return JWT (set via fragment redirect
                                                          or POST-message back to /auth/google/done)
```

### Decision tree at the callback

```
       Google says: { sub, email, email_verified=true, name }
                       │
                       ▼
   Is there an oauth_identities row for (provider='google', provider_uid=<sub>)?
       │                                    │
      YES                                  NO
       │                                    │
       ▼                                    ▼
   SIGN IN                  Is there a user with this email already?
   (find user via FK,            │                       │
    update last_login_at,       NO                      YES
    issue JWT)                   │                       │
                                 ▼                       ▼
                       CREATE NEW AGENCY        LINK Google to the existing user
                       • Create user            (only if both emails verified,
                         (email_verified=true,    which they are: Google verified
                          password_hash=NULL,     theirs, we verified ours)
                          name from Google)     • Insert oauth_identities row
                       • Create agency,         • Update last_login_at
                         link user as OWNER     • Issue JWT
                       • Insert oauth_identities
                         row (links the Google
                         account to this user)
                       • Issue JWT
                       • Redirect → /workspace-setup
                         (since agency_setup=false)
```

### Why `sub` is the link key (not the email)

Google's `sub` (subject id) is the **stable, immutable identifier** for a Google account — it never changes, even if the user renames their email. Linking by email would silently break if a user changed their Google email. We store `provider_email` separately for display only.

### What happens if the email already exists but isn't email-verified?

This shouldn't happen in practice because:
- Email signup forces verification before any further action (you're stuck on `/verify`).
- Google signup auto-marks the user as verified because Google has already done it.

Edge case for completeness: if it does happen (e.g. signup started but never completed verify), the callback rejects with: *"This email has a pending account. Please complete email verification before linking Google."*

### Pending invites (V1 behaviour — Option A from the design discussion)

If the email signing up via Google has an unaccepted pending invitation in `invitations`:

- **V1:** the signup proceeds normally — we create them as a new agency owner. The pending invitation stays in the database but becomes effectively dead (accepting it would fail `UNIQUE(email)` on `users`). Cleanup job removes invitations past `expires_at`.
- **Post-V1:** show a chooser on signup ("Accept invitation to Nirvana Agency, or create your own?") — needs the multi-membership rework first.

### Google sign-in for users who originally signed up with password

This is the second branch of the decision tree — "user exists, no OAuth row." On first Google sign-in, we **auto-link**: insert an `oauth_identities` row attached to their existing user. From that point on they can sign in with either password or Google. They don't lose their password unless they explicitly unlink (a post-V1 feature).

Auto-link is safe because both sides have proven control of the email (Google verified it; we verified it during signup). If we weren't sure about either side, we'd require a password challenge first — but in V1 we are.

---

## 4. Returning login (email + password)

Simpler — no state machine, just credential check.

```
POST /v1/auth/login
  ↓ { email, password }
Server:
  • Lookup user by email
  • argon2 verify(password, user.password_hash)
  • If valid: issue JWT, update users.last_login_at
  • If invalid: 401 + brute-force counter increment
  ↓
{ jwt, user, agency }
```

The frontend then:
1. Stores `jwt` in `localStorage['sendmymail_jwt']`
2. Hydrates `auth.user` and `auth.agency` slices
3. Redirects to `/dashboard` (or `?next=` query param if it was set on the way to `/login`)

---

## 5. Team invite flow (owner/admin invites a teammate)

```
┌─────────────────────────┐
│  Owner is on /team      │  POST /v1/team/invitations
│  Clicks "Invite member" │ ─────────────────────────────►  Server
│  Enters:                │  { email, role:"member",        │
│   • email               │    scope:{type:"clients",       │   • Generate token (UUID v4)
│   • role                │      ids:["cli_01J...","..."]} }│   • Hash token (sha256)
│   • scope (clients)     │                                 │   • Store invitation row
└─────────────────────────┘                                 │   • Email link to invitee:
                                                            │     https://app.sendmymail.io/
                                                            │       invite/<raw-token>

           ▼ invitee opens email, clicks link

┌─────────────────────────┐
│  /invite/<token>        │  GET /v1/auth/invitations/<token>
│  Shows invite details   │ ───────────────────────────────► Server
│  + "set password" form  │                                  • Hash incoming token
└─────────────────────────┘                                  • Look up row by hash
                                                             • Return { agency_name,
                                                                inviter_name, role,
                                                                expires_at }

           ▼ invitee sets password and submits

┌─────────────────────────┐  POST /v1/auth/invitations/<token>/accept
│  Submit                 │  { name, password }
└─────────────────────────┘ ───────────────────────────────► Server
                                                             • Verify token + not expired
                                                             • Verify not already accepted
                                                             • Create user row with:
                                                                 agency_id from invitation
                                                                 role from invitation
                                                                 scope from invitation
                                                                 email_verified = true
                                                                   (proven by email link)
                                                             • Mark invitation accepted
                                                             • Return JWT
```

**The raw token only lives in the URL** — never stored. The server stores only the **hash** of the token. If the DB leaks, leaked rows can't be used to accept the invitation.

The same pattern works for **password reset** (`/v1/auth/forgot` issues a token, `/v1/auth/reset/<token>` consumes it).

---

## 6. Client-portal login (the optional "let our client see their reports")

V1 doesn't have a separate client portal. If an agency wants to let their client log in:

1. Owner/admin invites `marketing@khukrispices.com` as a **`viewer`** with `scope: { type: "clients", ids: ["cli_khukri_id"] }`.
2. Client receives the standard invite email, accepts at `/invite/<token>`, sets a password.
3. They log in at the agency's white-label URL (or `app.sendmymail.io` if not yet branded).
4. Their JWT has `role: "viewer"` and `scope: { clients: ["cli_khukri_id"] }`.
5. Every API call is auto-scoped server-side: they can `GET /v1/clients/cli_khukri_id/contacts` but `GET /v1/clients/cli_himalaya_id/contacts` returns `404`.
6. The UI hides everything they can't reach (agency-level dashboard, billing, white-label, other clients).

**Same auth system, narrower scope.** No second login flow to build.

(Post-V1: a properly branded `/client-portal/login` URL with the agency's white-label colors. For V1, they use the regular login.)

---

## 7. The JWT — what's in it, how long it lives

```jsonc
{
  "sub":          "usr_01J7AC...",       // user id
  "agency_id":    "agc_01J7AB...",       // user's agency
  "role":         "owner",               // owner | admin | member | viewer
  "scope":        { "type": "all" },     // or { "type": "clients", "ids": [...] }
  "email_verified": true,
  "agency_setup":   true,                // workspace-setup completed?
  "iat":          1717123000,            // issued at
  "exp":          1717727800,            // 7 days later
  "jti":          "jwt_01J..."           // unique id — used for revocation
}
```

- **Algorithm:** HS256 with a strong server secret (rotated yearly) — or RS256 if multiple services need to verify without sharing the secret.
- **Lifetime:** 7 days. No refresh token in V1 — when it expires, the user logs in again. Short-enough that a compromised token has a bounded blast radius.
- **Re-issue moments:** signup, verify, workspace-setup, login, role change, scope change. Server returns a fresh JWT in either the response body or an `X-Refreshed-Token` header; the client swaps it into localStorage.
- **Storage:** `localStorage['sendmymail_jwt']`. Cleared on logout and on any `401`.
- **Transport:** `Authorization: Bearer <jwt>` on every request — see [api-conventions.md §2](./api-conventions.md#2-headers).
- **Revocation (V1):** none — JWTs are stateless. If a user is removed, their JWT remains valid until `exp`. Worst-case 7 days of exposure. If this becomes a real concern, add a small `revoked_jwts(jti, expires_at)` table and check on every request. Deferred.

---

## 8. Other tokens (not the session JWT)

| Token | Lifetime | Storage | Used for |
|---|---|---|---|
| **Email verification code** | 15 min, 5 attempts | `email_verifications` row, plaintext (6 digits, low entropy is OK for short-lived) | `/verify` |
| **Password reset token** | 1 hour, single use | `password_resets.token_hash` (SHA-256 of the URL token) | `/reset/<token>` |
| **Invitation token** | 7 days, single use | `invitations.token_hash` (SHA-256 of the URL token) | `/invite/<token>` |
| **Idempotency key** | 24 h server dedupe window | `idempotency_keys(key, response)` | replay-safe POSTs ([api-conventions.md §6](./api-conventions.md#6-idempotency--required-for-actions-that-move-money-or-send-mail)) |
| **Public preview share token** | 90 days | URL only (HMAC-signed, no DB row) | sharing a template preview without sign-in |

**Rule:** tokens that arrive in URLs (`invite`, `reset`) are **never stored raw** — only their hash. Verification = hash the incoming token and look it up.

---

## 9. Database schema

PostgreSQL-flavored DDL. IDs use **ULID** (prefixed: `usr_`, `agc_`, `cli_`, `inv_`, etc.) — sortable like timestamps, more URL-safe than UUIDs.

### `agencies` — the customer organization

```sql
CREATE TABLE agencies (
  id              TEXT        PRIMARY KEY,                    -- agc_01J7AB...
  name            TEXT        NOT NULL,
  country         CHAR(2)     NOT NULL DEFAULT 'NP',          -- ISO-3166 alpha-2
  billing_email   TEXT        NOT NULL,
  plan            TEXT        NOT NULL DEFAULT 'trial',       -- trial | starter | growth | ...
  trial_ends_at   TIMESTAMPTZ,
  setup_complete  BOOLEAN     NOT NULL DEFAULT FALSE,         -- /workspace-setup done?
  subdomain       TEXT        UNIQUE,                          -- nullable; for white-label
  branding_json   JSONB,                                       -- white-label colors / logo (M12)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agencies_subdomain ON agencies(subdomain) WHERE subdomain IS NOT NULL;
```

### `users` — every human login (owners, admins, members, viewers)

```sql
CREATE TABLE users (
  id               TEXT        PRIMARY KEY,                   -- usr_01J7AC...
  agency_id        TEXT        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email            TEXT        NOT NULL,
  email_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  password_hash    TEXT,                                       -- argon2id; NULL if SSO-only (post-V1)
  name             TEXT        NOT NULL,
  role             TEXT        NOT NULL CHECK (role IN ('owner','admin','member','viewer')),
  scope            JSONB       NOT NULL DEFAULT '{"type":"all"}'::jsonb,
                                                               -- {"type":"all"} OR
                                                               -- {"type":"clients","ids":["cli_...","cli_..."]}
  avatar_url       TEXT,
  last_login_at    TIMESTAMPTZ,
  failed_login_count INT       NOT NULL DEFAULT 0,             -- for brute-force lockout
  locked_until     TIMESTAMPTZ,                                -- after 5 failed attempts, lock 15 min
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (email)                                               -- one human, one account, globally
);

CREATE INDEX idx_users_agency       ON users(agency_id);
CREATE INDEX idx_users_email_lower  ON users(LOWER(email));    -- case-insensitive lookup
```

**Why `email` is globally unique (not per-agency):** a single human shouldn't accidentally have two accounts under two agencies. Cleaner UX, simpler password reset. If a freelancer needs to belong to two agencies in V1, they sign up with two different emails.

**Why `password_hash` is nullable:** a user who only ever signs in via Google has no password. They authenticate via the `oauth_identities` link (below).

### `oauth_identities` — links a user to a Google (or future Microsoft) account

```sql
CREATE TABLE oauth_identities (
  id              TEXT        PRIMARY KEY,                   -- oid_01J7AF...
  user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT        NOT NULL CHECK (provider IN ('google')),
                                                              -- 'microsoft' post-V1
  provider_uid    TEXT        NOT NULL,                       -- Google's stable 'sub' claim
                                                              -- (never changes for the lifetime
                                                              -- of the Google account)
  provider_email  TEXT        NOT NULL,                       -- email at provider, for display
                                                              -- (may differ from users.email
                                                              -- if the user later changes it)
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at   TIMESTAMPTZ,                                 -- updated on every successful Google sign-in

  UNIQUE (provider, provider_uid)                             -- one Google account → one user
);

CREATE INDEX idx_oauth_user ON oauth_identities(user_id);
```

A user can have **multiple oauth_identities rows** (one Google account *and* one Microsoft account once we add it). They can also have a `password_hash` AND oauth identities — both auth paths land them in the same user.

### `clients` — the agency's customers (data, not auth)

```sql
CREATE TABLE clients (
  id            TEXT        PRIMARY KEY,                      -- cli_01J7AD...
  agency_id     TEXT        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL,                          -- url-safe, unique per agency
  domain        TEXT,                                          -- sending domain (mail.khukrispices.com)
  avatar_color  TEXT,                                          -- gradient hex pair for the icon
  status        TEXT        NOT NULL DEFAULT 'trial'           -- trial | active | paused | archived
                CHECK (status IN ('trial','active','paused','archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (agency_id, slug)
);

CREATE INDEX idx_clients_agency ON clients(agency_id);
```

### `email_verifications` — the 6-digit code sent at signup

```sql
CREATE TABLE email_verifications (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        CHAR(6)     NOT NULL,                            -- numeric only, 000000-999999
  expires_at  TIMESTAMPTZ NOT NULL,                            -- 15 min from issue
  attempts    INT         NOT NULL DEFAULT 0,                  -- max 5
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verif_user ON email_verifications(user_id, used);
```

Cleanup job nightly: `DELETE FROM email_verifications WHERE expires_at < now() - INTERVAL '7 days';`

### `password_resets` — forgot-password tokens

```sql
CREATE TABLE password_resets (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,                     -- SHA-256(raw_token)
  expires_at  TIMESTAMPTZ NOT NULL,                            -- 1 hour from issue
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pwreset_user ON password_resets(user_id, used);
```

### `invitations` — team & viewer-scoped invites

```sql
CREATE TABLE invitations (
  id                TEXT        PRIMARY KEY,                  -- inv_01J7AE...
  agency_id         TEXT        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  inviter_user_id   TEXT        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  email             TEXT        NOT NULL,
  role              TEXT        NOT NULL CHECK (role IN ('admin','member','viewer')),
                                                              -- can't invite as owner
  scope             JSONB       NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  token_hash        TEXT        NOT NULL UNIQUE,              -- SHA-256(raw_token)
  expires_at        TIMESTAMPTZ NOT NULL,                     -- 7 days
  accepted_at       TIMESTAMPTZ,
  accepted_user_id  TEXT        REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_agency ON invitations(agency_id, accepted_at);
CREATE INDEX idx_invitations_email  ON invitations(LOWER(email), accepted_at);
```

### `audit_log` — who did what (recommended even in V1)

Small but invaluable for security investigations and customer-facing "activity" timelines.

```sql
CREATE TABLE audit_log (
  id            BIGSERIAL   PRIMARY KEY,
  agency_id     TEXT        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  actor_user_id TEXT        REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,        -- 'auth.login', 'auth.failed_login',
                                              -- 'team.invite_sent', 'team.role_changed',
                                              -- 'client.created', 'campaign.sent', ...
  target_type   TEXT,                         -- 'user' | 'client' | 'campaign' | 'agency'
  target_id     TEXT,
  metadata      JSONB,
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_agency_time ON audit_log(agency_id, created_at DESC);
CREATE INDEX idx_audit_actor_time  ON audit_log(actor_user_id, created_at DESC);
```

### Schema summary (relationships at a glance)

```
agencies (1) ─┬─ (N) users
              ├─ (N) clients ─── (N) contacts/lists/templates/campaigns/flows/forms/...
              ├─ (N) invitations
              └─ (N) audit_log

users    (1) ─┬─ (N) email_verifications
              ├─ (N) password_resets
              ├─ (N) oauth_identities       ← Google account links (and future Microsoft)
              └─ (referenced from) invitations.accepted_user_id, audit_log.actor_user_id
```

---

## 10. Security guardrails (build these from day one)

| Concern | Mitigation |
|---|---|
| **Password storage** | argon2id, `memory_cost=64MB, time_cost=3, parallelism=1`. Never bcrypt-MD5 stack, never plaintext. |
| **Brute force on login** | After 5 failed attempts, lock account for 15 min (`users.locked_until`). Surface generic error "invalid credentials" — never "wrong password" vs "no such user" (account-enumeration leak). |
| **Brute force on signup** | Rate-limit by IP — 5 signups / hour / IP. CAPTCHA for the 6th+. |
| **Email enumeration** | `/forgot` returns the same 200 response whether the email exists or not. |
| **Token leakage in logs** | Never log full JWT, never log raw reset/invite tokens. Truncate to first 8 chars + ellipsis. |
| **CSRF** | Not applicable for Bearer-token auth (the browser only sends the JWT if your JS does — no cookie auto-submit). |
| **XSS** | React escapes by default. Never use `dangerouslySetInnerHTML` with anything that contains user content unless sanitized server-side. |
| **JWT secret rotation** | One signing secret + one verify-only previous secret. Rotate the active secret yearly (or after any incident). |
| **Replay** | The `jti` claim in the JWT enables a future revocation table without breaking the schema. |
| **Audit trail** | Every auth-relevant action writes a row to `audit_log` (login, failed login, role change, invitation sent/accepted, password reset). |

---

## 11. Deferred to post-V1 (designed-around, not built)

- **2FA / TOTP** — JWT shape already supports an `mfa_required` claim; add `users.mfa_secret` column and a `mfa_required_until` claim flow. Don't build the UI until asked.
- **Microsoft / Workspace SSO** — Google is in V1 (see §3). Microsoft uses the same `oauth_identities` table — just add `'microsoft'` to the `provider` CHECK and implement the OAuth dance against Microsoft's endpoints. Workspace-style provisioning (auto-create teammates from a verified domain) is a separate spec.
- **Unlinking OAuth identities** — V1 lets you only *add* Google. Letting a user unlink it requires UX to confirm they still have a working password / second identity (so they can't accidentally lock themselves out).
- **One user, multiple agencies** — V1 forces one agency per email. To support membership in N agencies later: add a `memberships(user_id, agency_id, role, scope)` table, drop the `agency_id`/`role`/`scope` columns from `users`, and add an agency switcher that reissues a scoped JWT.
- **Branded client portal** — a properly themed `/client-portal/login` URL per agency. The white-label data (`agencies.branding_json` + `agencies.subdomain`) is already there; just needs UI.
- **JWT revocation table** — only build it if a real incident or compliance need shows up.

---

## See also

- [auth-tenancy.md](./auth-tenancy.md) — the *rules* (role × capability matrix, where scope is enforced)
- [api-conventions.md](./api-conventions.md) — request/response shapes, error format, idempotency
- [routes.md](./routes.md) — every URL and its auth gate
- [state.md](./state.md) — how the JWT and `auth` slice live in the client
- [feature-authentication-workspace.md](../implementation_doc/feature-authentication-workspace.md) — feature-level scope and acceptance criteria
