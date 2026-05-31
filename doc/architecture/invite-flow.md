# Invite flow — adding a teammate (or a client viewer)

> ✉️ The end-to-end story of "Sushant invites Sushma to Nirvana Agency" —
> every screen, every API call, every DB write, every email, every edge case.
>
> This is one specific flow drawn from the rules in
> [auth-tenancy.md](./auth-tenancy.md), the schema in
> [auth-flow-and-schema.md](./auth-flow-and-schema.md), and the role matrix in
> [roles-and-permissions.md](./roles-and-permissions.md). If any of those
> contradict this doc, fix this doc.

---

## 1. What an invite actually does

An invitation creates a **pending row** in `invitations` and sends an email with a single-use link. When the invitee accepts, we **create a new `users` row** under the inviter's agency with the role + scope that was captured in the invitation row. They land signed-in.

Key invariants:
- **The role and scope are locked at invite time.** If the inviter is promoted/demoted after sending the invite, what the invitee gets doesn't change.
- **The token in the URL is single-use.** Once accepted (or revoked), the invitation is dead.
- **An invite is tied to one specific email address.** The invitee can't accept it from a different email.
- **The same email can't have two pending invites to the same agency** — we replace the older one.

---

## 2. Who can invite whom

From [roles-and-permissions.md §B](./roles-and-permissions.md):

| Inviter role | Can invite these roles | Cannot invite |
|---|---|---|
| **Owner** | Admin · Member · Viewer | (cannot mint a second Owner — there's only one, transferred not invited) |
| **Admin** | Member · Viewer | Owner · Admin |
| **Member / Viewer** | — | anyone (no team-management capability) |

Plus the **scope** the invitee gets:

| Invited as | Scope choice |
|---|---|
| Admin | Always `scope = all` (forced — admins see everything) |
| Member | Inviter picks: `all` OR a subset of clients |
| Viewer | Inviter picks: `all` OR a subset of clients (subset is the common "client portal" case) |

---

## 3. End-to-end happy path (the timeline)

```
T+0      Sushant (Owner) on /team → clicks "Invite member"
T+5s     Fills form: sushma@nirvanaagency.com · role=Admin · scope=all
T+6s     Submits → server creates invitation row + sends email
T+7s     Sushma receives email in her Gmail inbox
T+30s    Sushma clicks "Accept invitation" link
T+31s    Browser loads /invite/<token> → server validates token, shows acceptance form
T+45s    Sushma enters name + password (or clicks Continue with Google)
T+46s    Server creates users row, marks invitation accepted, issues JWT, audit row
T+47s    Sushma redirected to /dashboard, lands signed in
T+48s    Sushant receives in-app notification "Sushma joined the team"
```

Now the long version with every screen and call.

---

## 4. Step-by-step

### Step 1 · Inviter opens the invite modal

**Screen:** [team.html](../mockups/team.html)
**Trigger:** Click the "Invite member" primary button at the top right.

What's visible:
- Members table (current team)
- "Pending invites (N)" section showing any unaccepted invites with **Resend** / **Revoke** actions
- The modal opens over the page

### Step 2 · Inviter fills the form

The modal collects:
| Field | Notes |
|---|---|
| **Email** | The invitee's email. Required. Validated as a real email; warned if domain doesn't match agency's |
| **Role** | Dropdown: Admin / Member / Viewer (Owner is not an option — see §2) |
| **Scope** | Radio: "All clients" OR "Specific clients". If Specific, a multi-select of clients appears. **Disabled and forced to "All clients" if role = Admin.** |
| **Personal note (optional)** | Free-text, appears in the email. "Hey Sushma, joining you as admin so you can help me with Khukri Spices…" |

The inviter clicks **"Send invitation"**.

### Step 3 · Server creates the invitation

```http
POST /v1/team/invitations
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "email":  "sushma@nirvanaagency.com",
  "role":   "admin",
  "scope":  { "type": "all" },
  "note":   "Joining you as admin so you can help me with Khukri Spices."
}
```

Server runs (in one transaction):

1. **Authz check** — `inviter.role` allows inviting `role` (per the matrix in §2). Reject `403` if not.
2. **Email check** — if a user with this email already exists in *any* agency, return `409 Conflict` with code `email_already_registered`. The inviter sees: *"sushma@…com already has a SendMyMail account. Ask them to sign in and contact you to be added."* (V1 limitation per [auth-tenancy.md §8](./auth-tenancy.md#8-open-questions-flag-during-impl) — one user one agency.)
3. **Dedupe pending** — if a pending invitation already exists for `(agency_id, lower(email))`, mark the old one `superseded_at = now()` and create the new one.
4. **Generate token** — 32-byte random URL-safe string (`raw_token`). Hash with SHA-256 → `token_hash`.
5. **Insert** the `invitations` row:
   ```sql
   INSERT INTO invitations (id, agency_id, inviter_user_id, email, role, scope,
                            token_hash, expires_at, note)
   VALUES ('inv_01J7AE...', :agency, :inviter, LOWER(:email), :role, :scope::jsonb,
           :token_hash, now() + interval '7 days', :note);
   ```
6. **Audit log** — `team.invite_sent` action with metadata `{ invitee_email, role, scope }`.
7. **Queue email send** (transactional — don't block the API response).
8. **Respond** `201 Created` with the new pending row (minus token):
   ```json
   { "data": { "id": "inv_01J7AE...", "email": "sushma@nirvanaagency.com",
               "role": "admin", "scope": {"type":"all"},
               "expires_at": "2026-06-06T11:48:00Z" } }
   ```

The frontend optimistically adds the row to the "Pending invites" table (RTK Query cache invalidation on `team.invitations`).

### Step 4 · Email is delivered

The transactional email (sent via SendGrid/Brevo/whatever's wired up for transactional):

```
Subject: Sushant Karki invited you to join Nirvana Agency on SendMyMail

Hi Sushma 👋

Sushant Karki invited you to join Nirvana Agency on SendMyMail as an
Admin.

> "Joining you as admin so you can help me with Khukri Spices."
>   — Sushant Karki

[Accept invitation]   ← https://app.sendmymail.io/invite/<raw_token>

This link is valid for 7 days. If you don't recognize this invitation,
you can safely ignore this email.

— The SendMyMail team
```

Plain text version included. From address: `invites@sendmymail.io` with `Reply-To: sushant@nirvanaagency.com` (so a confused invitee replies to the inviter, not us).

**Only the `raw_token` exists in the email.** It is never stored anywhere on our side. We store only its SHA-256 hash.

### Step 5 · Invitee opens the link

**Screen:** [invite.html](../mockups/invite.html)
**URL:** `https://app.sendmymail.io/invite/<raw_token>`

On page load, the frontend calls:

```http
GET /v1/auth/invitations/<raw_token>
```

Server:
1. SHA-256 the incoming token → `incoming_hash`.
2. Look up `invitations` WHERE `token_hash = :incoming_hash`.
3. If not found → `404` with code `invitation_invalid`. Frontend shows: *"This invitation link is invalid or has been revoked."*
4. If `accepted_at IS NOT NULL` → `410 Gone`, code `invitation_already_accepted`. Frontend shows: *"Already accepted — sign in instead."* with a Sign in button.
5. If `revoked_at IS NOT NULL` → `410 Gone`, code `invitation_revoked`. *"This invitation was revoked by the inviter."*
6. If `expires_at < now()` → `410 Gone`, code `invitation_expired`. *"This invitation expired on 5 Jun. Ask Sushant to send a new one."*
7. Otherwise return invitation metadata (no token):
   ```json
   {
     "data": {
       "agency_name":   "Nirvana Agency",
       "agency_logo":   "https://.../logo.png",
       "inviter_name":  "Sushant Karki",
       "inviter_email": "sushant@nirvanaagency.com",
       "invitee_email": "sushma@nirvanaagency.com",
       "role":          "admin",
       "scope":         { "type": "all" },
       "note":          "Joining you as admin…",
       "expires_at":    "2026-06-06T11:48:00Z"
     }
   }
   ```

The frontend renders the acceptance form with this context — invitee sees:
- "**Nirvana Agency** invited you" (with logo)
- "by Sushant Karki" (with their note in a callout)
- "as an **Admin**"
- A "Create your account" form below

### Step 6 · Invitee accepts — two paths

#### Path A — email + password

Form fields on [invite.html](../mockups/invite.html):
- **Name** (required)
- **Email** (pre-filled from invitation, **disabled** — they cannot change it)
- **Password** (required, strength validated)
- T&C checkbox

POST:
```http
POST /v1/auth/invitations/<raw_token>/accept
Content-Type: application/json

{
  "name":     "Sushma Karki",
  "password": "<plaintext>"
}
```

Server (one transaction):
1. Re-verify the token (same checks as Step 5).
2. Re-check `users.email` is still globally unique (race condition guard).
3. Hash password (argon2id).
4. Insert `users` row:
   - `agency_id` = invitation's agency
   - `email` = invitation's email
   - `email_verified = TRUE` (proven by access to the email link)
   - `name`, `password_hash`
   - `role`, `scope_type` from invitation
5. If `scope_type = 'clients'`, insert one `user_client_scopes` row per client id.
6. Update invitation row: `accepted_at = now()`, `accepted_user_id = <new user>`.
7. Audit log: `team.invitation_accepted` with metadata `{ invitation_id, role, scope }`.
8. Issue JWT for the new user.
9. Respond `200 OK` with `{ jwt, user, agency }`.

#### Path B — Continue with Google

Same form, but the invitee clicks "Continue with Google" instead. Frontend redirects to:

```
GET /v1/auth/google/start?invite=<raw_token>
```

The OAuth dance happens (see [auth-flow-and-schema.md §3](./auth-flow-and-schema.md#3-google-oauth-signup-or-sign-in--same-endpoint)). At the callback:

1. The `invite` token is decoded from state.
2. Server verifies Google's `email` matches the invitation's `invitee_email` **exactly** (case-insensitive). If not → `403 invitation_email_mismatch` with: *"You signed in with `other@gmail.com` but the invitation is for `sushma@nirvanaagency.com`. Please sign in with the invited email."*
3. If a `users` row already exists for that email → `409`, same as Step 3's check. This shouldn't happen because the invite-send step already rejected this case, but it's a belt-and-braces guard.
4. Otherwise: create the user (no password), insert `oauth_identities` row linking Google's `sub`, mark invitation accepted, audit, issue JWT.

### Step 7 · Invitee lands signed in

Browser stores the new JWT. Router checks claims and routes:
- If `role = admin` and `email_verified = true` and `agency_setup = true` → `/dashboard`
- Otherwise the appropriate stop on the way (the agency is already set up, so they skip workspace-setup and onboarding by default).

The invitee sees the agency dashboard scoped to whatever their role allows. A small one-time toast appears: *"Welcome to Nirvana Agency, Sushma. Sushant invited you as Admin."*

### Step 8 · Inviter gets notified

When the server commits Step 6, it also writes:
- Audit log: `team.invitation_accepted`
- An in-app notification row for `sushant_user_id`: *"Sushma Karki accepted your team invite — joined as Admin."*

When Sushant next loads any page, the topbar bell shows the dot indicator. The notification appears on [notifications.html](../mockups/notifications.html) under "Today" with a green ✔ icon and link to the new member's row on `/team`.

---

## 5. State machine — what an `invitations` row can be

```
                  ┌─────────────────────────────────────┐
                  │                                     │
                  │   (created in Step 3)               │
                  ▼                                     │
              ┌─────────┐                               │
              │ PENDING │ ──── inviter clicks "Resend" ─┘ (just re-sends email, same row)
              └─────────┘
                  │
       ┌──────────┼──────────┬───────────────┬──────────────┐
       │          │          │               │              │
   accepted   revoked    expired      superseded       inviter
       │          │          │               │           removed
       ▼          ▼          ▼               ▼              │
   ┌────────┐ ┌────────┐ ┌────────┐    ┌────────────┐      │
   │ACCEPTED│ │REVOKED │ │EXPIRED │    │ SUPERSEDED │      ▼
   └────────┘ └────────┘ └────────┘    └────────────┘  (stays as
                                                        pending —
                                                        inviter_user_id
                                                        becomes NULL
                                                        via ON DELETE
                                                        SET NULL)
```

Transitions:
- `PENDING → ACCEPTED` when Step 6 commits successfully
- `PENDING → REVOKED` when inviter clicks "Revoke" on /team
- `PENDING → EXPIRED` lazily — the `GET /invitations/:token` returns 410 once `expires_at < now()`; a nightly job purges rows where `expires_at < now() - interval '30 days'`
- `PENDING → SUPERSEDED` when the same email gets a new invitation (Step 3.3 — old row marked with `superseded_at`, new row created)

Once in a terminal state (ACCEPTED / REVOKED / EXPIRED / SUPERSEDED), the row never goes back to PENDING. Resend doesn't change state — it re-sends the email for an already-pending row.

---

## 6. Pending invite management on `/team`

[team.html](../mockups/team.html) shows a "Pending invites" section. For each row:

| Column | Value |
|---|---|
| Email | `sushma@nirvanaagency.com` |
| Role | `Admin` (pill, terracotta) |
| Scope | `All clients` or `2 clients` (pill) |
| Invited | `2 days ago` (relative time) |
| Expires | `in 5 days` (warns red if < 24h) |
| Actions | **Resend** / **Revoke** (overflow ⋮ menu) |

**Resend:** `POST /v1/team/invitations/:id/resend` — re-sends the email with the same token, optionally bumps `expires_at` if extended. Rate-limited: max 1 resend per 5 minutes per invitation. Audit logged.

**Revoke:** `POST /v1/team/invitations/:id/revoke` — sets `revoked_at = now()`. The token becomes invalid immediately. Audit logged. The row stays for audit history; it just won't accept.

Inviter can also **edit a pending invite's role/scope** before it's accepted — `PATCH /v1/team/invitations/:id` with new role/scope. Audit logged.

---

## 7. Edge cases & failure modes

| Case | What happens |
|---|---|
| **Email already has a SendMyMail account** | Step 3 returns `409 email_already_registered`. Inviter sees a clear error. V2 will allow multi-agency membership; for V1, the answer is "ask them to sign up with a different email or transfer their existing agency". |
| **Email typo** (`sushmaa@…`) | Invite goes through. Real Sushma never gets the email; the invite expires after 7 days. Bounce-back emails to `invites@sendmymail.io` are monitored — a hard bounce on an invite address can auto-mark the invitation as `revoked` and notify the inviter. |
| **Invitee already opened the link but didn't complete signup** | The token is still valid. They can re-open the same email link any time before expiry. |
| **Invitee opens the link twice in two tabs** | Both load Step 5 (GET succeeds). Whichever tab POSTs Step 6 first wins; the second gets `410 invitation_already_accepted`. |
| **Inviter is removed from the agency before invite is accepted** | Invitation stays valid (`inviter_user_id` becomes NULL via `ON DELETE SET NULL`). Invitee sees "Invited to Nirvana Agency" without the named inviter. |
| **Inviter's role changes (Admin → Member) before accept** | Invitation still works — role and scope are captured at invite time, not re-evaluated. (Audit log shows the original inviter's name + role at the time.) |
| **Inviter tries to invite themselves** | `400 cannot_invite_self`. |
| **Inviter selects "specific clients" scope but unchecks all clients** | Form validation rejects before submit — must select ≥1 client. |
| **Inviter selects a client they themselves don't have access to** (scoped Member) | Scoped Members can't invite anyone in V1 (per §2 — only Owner/Admin can), so this can't happen. If V1.5 allows scoped invites, server validates the inviter's scope covers the invitee's scope. |
| **Invitee signs in with Google using a DIFFERENT email than invited** | Step 6 Path B returns `403 invitation_email_mismatch`. They have to use the invited email. |
| **Invitation expires while the invitee is on the form** | POST Step 6 returns `410 invitation_expired`. Frontend shows: *"This invitation just expired. Ask Sushant to resend."* |
| **Invitee clicks "Decline"** (V1.5 feature, not in V1) | Server marks invitation `declined_at = now()`. Inviter is notified. For V1, "decline" is just ignoring the email. |
| **Resending too many times** | Rate-limited at 1/5min per invitation server-side. Frontend shows: *"Wait a few minutes before resending."* |
| **Token leaked in logs / referrer** | We never log the raw token. The token is in the URL path, which can leak via Referer header to embedded content — but `/invite/<token>` pages contain no embedded third-party content, and the token is single-use, so the practical risk is low. Mitigation: meta-referrer `no-referrer` on the invite page. |

---

## 8. API surface (summary)

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /v1/team/invitations` | Owner/Admin JWT | Create a new invitation (Step 3) |
| `GET /v1/team/invitations` | Owner/Admin JWT | List pending invites for the agency |
| `PATCH /v1/team/invitations/:id` | Owner/Admin JWT | Edit role/scope of a pending invite |
| `POST /v1/team/invitations/:id/resend` | Owner/Admin JWT | Re-send the email (same token) — rate limited |
| `POST /v1/team/invitations/:id/revoke` | Owner/Admin JWT | Revoke a pending invite |
| `GET /v1/auth/invitations/:raw_token` | Public | Fetch invite metadata for the acceptance screen (Step 5) |
| `POST /v1/auth/invitations/:raw_token/accept` | Public | Accept with email + password (Step 6A) |
| `GET /v1/auth/google/start?invite=:raw_token` | Public | Start OAuth, carrying the invite token in `state` (Step 6B) |

All follow [api-conventions.md](./api-conventions.md) — Bearer JWT for authed routes, error shape `{ error: { code, message, ... }, request_id }`.

---

## 9. UI surfaces touched

| Screen | What it shows about invites |
|---|---|
| [team.html](../mockups/team.html) | "Invite member" button (Step 1), pending invites table, Resend / Revoke actions |
| [invite.html](../mockups/invite.html) | Invite acceptance form — name + email (disabled) + password, OR Continue with Google |
| Invite-modal (lives inside team.html) | Form to capture email, role, scope, personal note |
| [notifications.html](../mockups/notifications.html) | "Sushma joined the team", "You invited marketing@khukrispices.com as a Viewer", "Invite to bibek@example.com expired" |
| [agency_dashboard.html](../mockups/agency_dashboard.html) | (Future) "1 pending invite — view" reminder if it's been >3 days |

---

## 10. Audit log entries written by this flow

| Action | When | Metadata |
|---|---|---|
| `team.invite_sent` | Step 3 | `{ invitation_id, invitee_email, role, scope }` |
| `team.invite_resent` | Resend | `{ invitation_id }` |
| `team.invite_edited` | PATCH | `{ invitation_id, before: {role,scope}, after: {role,scope} }` |
| `team.invite_revoked` | Revoke | `{ invitation_id, invitee_email }` |
| `team.invitation_accepted` | Step 6 commit | `{ invitation_id, new_user_id, role, scope, accepted_via: "password" | "google" }` |
| `auth.signup` | Step 6 commit (because a user is created) | `{ new_user_id, agency_id, source: "invitation" }` |

Every row sits in `audit_log` (per [auth-flow-and-schema.md §9](./auth-flow-and-schema.md#9-database-schema)) and is queryable by inviter/invitee for the "team activity" filter on [notifications.html](../mockups/notifications.html).

---

## See also

- [auth-flow-and-schema.md §5](./auth-flow-and-schema.md#5-team-invite-flow-owneradmin-invites-a-teammate) — the same flow summarized inside the bigger auth doc
- [auth-flow-and-schema.md §9](./auth-flow-and-schema.md#9-database-schema) — the `invitations` table definition
- [roles-and-permissions.md §B](./roles-and-permissions.md#b-team--invites) — who can do what on team & invites
- [api-conventions.md](./api-conventions.md) — error shape, idempotency, pagination
- [routes.md](./routes.md) — `/team` and `/invite/:token` URL definitions
