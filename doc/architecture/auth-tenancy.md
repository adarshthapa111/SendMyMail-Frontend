# Auth & tenancy — multi-tenant model, roles, scope enforcement

> 🔒 The model is: **agency → clients → resources**. Every screen, every API
> call, every store read enforces this. The rules below tell you how.

## 1. The hierarchy

```
Agency  (the SendMyMail customer — a Nepali digital agency)
  ├─ Users         (team members — owner / admin / member / viewer)
  └─ Clients       (the agency's clients — e.g. Khukri Spices, Himalaya Trekking)
       ├─ Domain   (sending domain, SPF/DKIM)
       ├─ Contacts + Lists
       ├─ Templates
       ├─ Campaigns
       ├─ Flows
       ├─ Forms
       └─ Reports
```

- A **User** belongs to exactly one **Agency** at a time (V1 — switching agencies = logging out and back in with a different identity).
- A **Client** belongs to exactly one **Agency** — the same client never appears under two agencies.
- All **Resources** (contacts, campaigns, etc.) belong to exactly one **Client**.

## 2. The JWT — what's in the token

```json
{
  "sub":        "usr_01J...",       // user id
  "agency_id":  "agc_01J...",       // the user's current agency
  "role":       "admin",            // owner | admin | member | viewer
  "scope":      "all" | ["cli_01J...", "cli_02K..."],
  "iat":        1715723000,
  "exp":        1716327800           // 7-day lifetime, refreshed silently
}
```

- **`scope: "all"`** — user can access every client in the agency (owners, admins, members by default).
- **`scope: [clientId, ...]`** — user is restricted to only these clients (used to limit a member or viewer to a subset).

The JWT lives in `localStorage['sendmymail_jwt']` and is attached to every API call as `Authorization: Bearer <jwt>` (see [api-conventions.md §2](./api-conventions.md#2-headers)). The server **re-validates `agency_id` + `scope` on every request** — the client is not trusted to enforce tenancy.

## 3. Role matrix

**The canonical role × capability matrix lives in [roles-and-permissions.md](./roles-and-permissions.md).** That doc owns every cell — every UI guard, server check, and JWT decision must agree with it. Don't duplicate the matrix here; update the canonical doc and reference it.

Short overview of what each role gets:

| Role | One-line summary | Scope |
|---|---|:---:|
| **Owner** | Full control, including billing, white-label, and ownership transfer. Exactly one per agency. | Always `all` |
| **Admin** | Almost everything except billing, white-label, and managing other Admins/Owners. | Always `all` |
| **Member** | Day-to-day operator — campaigns, contacts, templates, flows, forms. No team / billing. | `all` or scoped to specific clients |
| **Viewer** | Read-mostly. The role for "client portal" accounts (scoped to one client). | `all` or scoped to specific clients |

Quick "what makes each role distinct" cheat-sheet:

| | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| Billing | ✅ | ❌ | ❌ | ❌ |
| White-label | ✅ | ❌ | ❌ | ❌ |
| Manage team | ✅ | limited | ❌ | ❌ |
| Connect integrations | ✅ | ✅ | ❌ | ❌ |
| Send campaigns | ✅ | ✅ | ✅ | ❌ |
| Edit content (templates / flows / forms) | ✅ | ✅ | ✅ | ❌ |
| Can be client-scoped | ❌ | ❌ | ✅ | ✅ |

For the full ~80-row matrix per capability area (agency, team, billing, white-label, domain, contacts, templates, campaigns, flows, forms, reports, integrations, self), go to **[roles-and-permissions.md](./roles-and-permissions.md)**.

## 4. Scope enforcement — three layers

A failed check at any layer aborts the request. The client guards are for UX (show the right screen); the server guards are for security.

### Layer A — Route guards (client)
Every route has an auth gate from [routes.md §3](./routes.md#3-auth-gates--what-each-one-means). The router resolves guards top-down and short-circuits on the first failure. `ClientScoped` routes additionally check that the user's JWT `scope` includes `:clientId` (or is `"all"`).

### Layer B — UI permission helpers (client)
A single `usePermission(capability)` hook returns `boolean` for every row in §3. Buttons that the user can't use are **hidden**, not disabled with a tooltip — disabled buttons make the UI feel broken when a viewer browses an admin's screen. Exception: row-level actions in a shared table (e.g. delete column for an admin) show as ghost icons that are disabled with a tooltip explaining why.

### Layer C — Server enforcement (authoritative)
The backend re-validates *everything* on every request:
- JWT signature + expiry
- `agency_id` matches the resource's agency
- `scope` includes the client (for client-scoped routes)
- `role` meets the endpoint's minimum

A client that tries to access a forbidden resource gets `404` (never `403` for cross-tenant probes — we don't leak that the resource exists in another agency). `403` is used only for in-agency role failures.

## 5. The active-user vs. the JWT

Two things you might mean by "current user":

- **`auth.user`** in Redux — name, email, avatar, role. Used for display.
- **The JWT** in localStorage — the actual bearer. Used by every API call.

These can briefly disagree (e.g. immediately after a role change). The JWT is always the truth for *what the server will let you do*; the Redux user is a presentation cache. On any `401` response, both are cleared and the user is sent to `/login?next=<path>`.

## 6. Lifecycle moments

### Sign up → first session
1. `POST /v1/auth/signup` with email + password.
2. Server creates the user as **owner** of a new (empty) agency, returns JWT.
3. Client stores JWT, navigates to `/verify` (a one-time code-by-email screen).
4. After verify, route → `/workspace-setup` (agency name, country, billing email).
5. After setup, route → `/onboarding`.

### Invite → join an existing agency
1. Owner/admin enters email + role + optional client scope in [team.html](../mockups/team.html).
2. Server emails the invitee a one-time `/invite/:token` link.
3. Recipient sets password, server creates the user with the invited role + scope, returns JWT (already in the inviting agency — no separate signup).
4. Route → `/onboarding` (if their role gives them access to the checklist) or `/dashboard`.

### Role change
A user's role can be changed by an owner (or by an admin for non-admin/owner roles). The change is server-side; on the affected user's next API request the server reissues the JWT with the new role + scope. Client receives the new JWT in the response header (`X-Refreshed-Token`) and swaps it into localStorage. UI permission helpers update reactively.

### Owner transfer
Owner picks another team member, server swaps `role` on both records atomically, both users' JWTs get reissued on their next request. The outgoing owner becomes an admin by default.

### Logout
1. `POST /v1/auth/logout` (best-effort — server can blacklist the token).
2. Clear all three keys from localStorage (`sendmymail_jwt`, `sendmymail_integrations`, `sendmymail_prefs`).
3. Clear the entire Redux store.
4. Route → `/login`.

### Token expiry / `401`
Same as logout — except the redirect carries a `next=<currentPath>` so the user lands back where they were after re-auth.

## 7. Special tokens (not the session JWT)

| Token | Purpose | Lifetime | Where it lives |
|---|---|---|---|
| `/reset/:token` | Password reset link | 1 hour, single-use | Email only |
| `/invite/:token` | Team invite link | 7 days, single-use | Email only |
| `/verify` code | Email verification | 15 minutes, 5 attempts | Email + transient server state |
| Idempotency key | Replay-safe POSTs ([api-conventions.md §6](./api-conventions.md#6-idempotency--required-for-actions-that-move-money-or-send-mail)) | 24h server-side dedupe window | Client-generated UUID, sent as header |
| Public preview token | Sharing a template preview without sign-in | 90 days | URL only (no DB row needed if signed) |

None of these are stored in localStorage. They appear in URLs, are consumed once, and never enter the store.

## 8. Open questions (flag during impl)

- **Multiple agencies per user?** V1 is "one user, one agency at a time." If a freelancer wants to belong to two agencies, they sign up twice with different emails. If this becomes a frequent ask, add an agency switcher in V2 — design implications: JWT carries an array of memberships, switcher reissues a scoped JWT per agency.
- **Client-as-user logins** — the `viewer` role exists so an agency can grant a client read-only access to their own data. Open question: should we surface this as a "client portal" with its own branded login screen? Defer to post-V1 unless asked.
- **2FA** — out of scope for V1; spec'd to add as a `/settings/security` flow later. The JWT shape already supports an `mfa_required` claim for the future.
- **SSO** — Google is **in V1** (full flow + schema spec'd in [auth-flow-and-schema.md §3](./auth-flow-and-schema.md#3-google-oauth-signup-or-sign-in--same-endpoint)). Microsoft / Workspace SSO are deferred — same `oauth_identities` table, different provider value.
