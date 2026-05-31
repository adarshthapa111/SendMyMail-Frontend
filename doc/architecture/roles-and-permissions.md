# Roles & permissions — the final matrix

> 🔒 The single source of truth for who can do what.
> Every UI permission check, every server-side guard, every JWT-claim
> decision must agree with this doc. If a feature spec contradicts it,
> update this doc in the same change.
>
> See [auth-tenancy.md](./auth-tenancy.md) for *how* enforcement works
> (route guards, UI helpers, server). See
> [auth-flow-and-schema.md](./auth-flow-and-schema.md) for the
> `users.role` + `user_client_scopes` schema that stores this.

---

## The 4 roles

| Role | One-line definition | Count per agency |
|---|---|---|
| **Owner** | The person who created the agency. Full control, including billing and ownership transfer. | Exactly **1** |
| **Admin** | A trusted operator. Can do almost everything except billing, white-label, and managing other admins/owners. | 0 – many |
| **Member** | The day-to-day doer. May be **scope-limited** to a subset of clients. | 0 – many |
| **Viewer** | Read-mostly. Often **scope-limited** (this is the "client portal" account). | 0 – many |

**There is no 5th role.** A "client portal" login is a `Viewer` scoped to one client. A "super admin" (you, running SendMyMail) lives on a separate `staff_users` table — out of V1 scope.

---

## Scope — the modifier that narrows Member / Viewer

A user's effective permission set = **role + scope**.

- **Owner** and **Admin** are *always* `scope = all` — enforced at the DB level (CHECK constraint).
- **Member** and **Viewer** can be either:
  - `scope = all` → can see every client in the agency
  - `scope = clients` → can see only the listed clients (via the `user_client_scopes` join table)

In every matrix below, when a capability is **client-scoped** (creating a campaign, viewing contacts, etc.) and the user is a scope-limited Member or Viewer, the permission applies **only to clients in their scope**. This is marked with ◐ instead of ✅.

### Legend

| Symbol | Meaning |
|:---:|---|
| ✅ | Full permission, no scope filter |
| ◐ | Permitted, but only within the user's client scope |
| 👀 | Read-only (cannot edit, send, or delete) |
| ❌ | No access — UI element is hidden; API returns `403` |

---

## A. Agency administration

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View agency dashboard | ✅ | ✅ | ◐ | ◐ |
| View all clients in the agency | ✅ | ✅ | ◐ | ◐ |
| Create a new client | ✅ | ✅ | ❌ | ❌ |
| Edit a client (name, branding, status) | ✅ | ✅ | ◐ | ❌ |
| Archive / restore a client | ✅ | ✅ | ❌ | ❌ |
| Permanently delete a client | ✅ | ❌ | ❌ | ❌ |
| Edit agency profile (name, country, billing email) | ✅ | ✅ | ❌ | ❌ |
| Delete the entire agency | ✅ | ❌ | ❌ | ❌ |

---

## B. Team & invites

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View team list | ✅ | ✅ | ❌ | ❌ |
| Invite a new teammate (Admin/Member/Viewer) | ✅ | ✅ | ❌ | ❌ |
| Re-send / revoke a pending invitation | ✅ | ✅ | ❌ | ❌ |
| Change another user's role | ✅ | Admin → only Member/Viewer roles | ❌ | ❌ |
| Change another user's client scope | ✅ | ✅ | ❌ | ❌ |
| Remove a teammate from the agency | ✅ | Admin → only Member/Viewer | ❌ | ❌ |
| Transfer Owner role to another user | ✅ | ❌ | ❌ | ❌ |
| View audit log of team activity | ✅ | ✅ | ❌ | ❌ |

**Rules:**
- An Admin cannot promote anyone to Admin or Owner, cannot demote an Owner, and cannot remove an Owner. Only the Owner can.
- Owner role is **transferred**, never duplicated — there is always exactly one Owner.
- Removing a teammate immediately invalidates their session on next API call (server checks `users` row exists + `agency_id` matches JWT).

---

## C. Billing

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View current plan and trial countdown | ✅ | ✅ (read-only summary) | ❌ | ❌ |
| View invoices and payment history | ✅ | ❌ | ❌ | ❌ |
| Change plan (upgrade / downgrade) | ✅ | ❌ | ❌ | ❌ |
| Add / remove payment method (eSewa, Khalti, IME Pay, card) | ✅ | ❌ | ❌ | ❌ |
| Update billing email and PAN/VAT details | ✅ | ❌ | ❌ | ❌ |
| Cancel subscription | ✅ | ❌ | ❌ | ❌ |

---

## D. White-label

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View white-label settings | ✅ | ❌ | ❌ | ❌ |
| Edit branding (logo, colors, app name, favicon) | ✅ | ❌ | ❌ | ❌ |
| Configure custom subdomain (`app.youragency.com`) | ✅ | ❌ | ❌ | ❌ |
| Enable / disable white-label mode | ✅ | ❌ | ❌ | ❌ |

---

## E. Sending domain (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View sending domain status (SPF / DKIM / DMARC) | ✅ | ✅ | ◐ | ◐ |
| Add / edit a sending domain | ✅ | ✅ | ◐ | ❌ |
| Trigger DNS verification | ✅ | ✅ | ◐ | ❌ |
| Remove a sending domain | ✅ | ✅ | ❌ | ❌ |

---

## F. Contacts & lists (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View contacts and lists | ✅ | ✅ | ◐ | 👀 |
| Add / edit / delete a single contact | ✅ | ✅ | ◐ | ❌ |
| Import contacts from CSV | ✅ | ✅ | ◐ | ❌ |
| Bulk edit / bulk tag contacts | ✅ | ✅ | ◐ | ❌ |
| Bulk delete contacts | ✅ | ✅ | ❌ | ❌ |
| Bulk export contacts (CSV download) | ✅ | ✅ | ❌ | ❌ |
| Create / edit / delete a list or segment | ✅ | ✅ | ◐ | ❌ |
| Manage suppression list (unsubscribes, bounces) | ✅ | ✅ | ❌ | ❌ |

**Rule:** "Bulk export" is owner/admin-only because it's the highest data-exfiltration risk action — a compromised Member account can't pull the whole contact list to a CSV.

---

## G. Templates (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View templates | ✅ | ✅ | ◐ | 👀 |
| Create / edit / duplicate a template | ✅ | ✅ | ◐ | ❌ |
| Delete a template | ✅ | ✅ | ◐ | ❌ |
| Lock / unlock a template (prevent further edits) | ✅ | ✅ | ❌ | ❌ |

---

## H. Campaigns (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View campaigns (list + report) | ✅ | ✅ | ◐ | 👀 |
| Create / edit a draft campaign | ✅ | ✅ | ◐ | ❌ |
| Send a test email to self | ✅ | ✅ | ◐ | ✅ (only to self) |
| Schedule a campaign | ✅ | ✅ | ◐ | ❌ |
| Send a campaign immediately | ✅ | ✅ | ◐ | ❌ |
| Cancel a scheduled campaign | ✅ | ✅ | ◐ | ❌ |
| Delete a sent campaign (keeps report) | ✅ | ✅ | ❌ | ❌ |
| Export a campaign report (PDF / CSV) | ✅ | ✅ | ◐ | ✅ |
| Share a campaign report with a client (read-only link) | ✅ | ✅ | ◐ | ❌ |

**Rule:** Viewers can send a test email to themselves (to check formatting) but cannot send to recipients.

---

## I. Flows / Marketing automation (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View flows | ✅ | ✅ | ◐ | 👀 |
| Create / edit a flow | ✅ | ✅ | ◐ | ❌ |
| Activate / pause a flow | ✅ | ✅ | ◐ | ❌ |
| Delete a flow | ✅ | ✅ | ❌ | ❌ |
| View per-contact flow journey | ✅ | ✅ | ◐ | ◐ |

---

## J. Signup forms (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View forms | ✅ | ✅ | ◐ | 👀 |
| Create / edit a form | ✅ | ✅ | ◐ | ❌ |
| Publish / unpublish a form | ✅ | ✅ | ◐ | ❌ |
| Delete a form | ✅ | ✅ | ❌ | ❌ |
| View form submissions | ✅ | ✅ | ◐ | ◐ |

---

## K. Reports & analytics (per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View dashboard, campaign, flow, form reports | ✅ | ✅ | ◐ | ◐ |
| Export a report (PDF / CSV) | ✅ | ✅ | ◐ | ✅ |
| Share a report with a client (read-only link) | ✅ | ✅ | ◐ | ❌ |

---

## L. Integrations (agency-wide, not per client)

| Capability | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View connected integrations | ✅ | ✅ | ✅ | ❌ |
| Connect a new ESP / e-commerce integration | ✅ | ✅ | ❌ | ❌ |
| Edit / disconnect an integration | ✅ | ✅ | ❌ | ❌ |
| Push a campaign to a connected ESP | ✅ | ✅ | ◐ | ❌ |
| View integration sync history | ✅ | ✅ | ✅ | ❌ |

**Rule:** Integrations are connected at the **agency** level — the credentials and connection state apply across all clients in the agency. Only Owner/Admin can connect because it commits the whole agency to that platform.

---

## M. Self (every user, regardless of role)

| Capability | Everyone |
|---|:---:|
| View own profile | ✅ |
| Edit own name and avatar | ✅ |
| Change own password | ✅ |
| Link / unlink own Google account *(unlink is post-V1)* | ✅ |
| Configure own notification preferences | ✅ |
| View own login history | ✅ |
| Delete own account *(removes them from the agency)* | ✅ |

**Edge case:** the Owner cannot delete their own account without first transferring ownership to another user. If they're the only user in the agency, they can delete the entire agency (which deletes themselves).

---

## N. Quick comparison — what makes each role distinct

If you're trying to remember the difference between two roles, this is the short version:

| | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| Can do billing | ✅ | ❌ | ❌ | ❌ |
| Can do white-label | ✅ | ❌ | ❌ | ❌ |
| Can manage team | ✅ | ✅ (limited) | ❌ | ❌ |
| Can manage Owners/Admins | Owner only | ❌ | ❌ | ❌ |
| Can connect integrations | ✅ | ✅ | ❌ | ❌ |
| Can send campaigns | ✅ | ✅ | ✅ | ❌ |
| Can edit content (templates / flows / forms) | ✅ | ✅ | ✅ | ❌ |
| Can be client-scoped | ❌ | ❌ | ✅ | ✅ |
| Can be the "client portal" account | ❌ | ❌ | ❌ | ✅ |

---

## O. Hard rules (validated server-side)

These are invariants — the DB and API must reject anything that violates them, regardless of what the UI lets through:

1. **Exactly one Owner per agency.** Creating a second is rejected. Transferring demotes the previous one to Admin.
2. **Owner and Admin always have `scope = all`.** Enforced by CHECK constraint on `users` table.
3. **You can never invite or promote *above* your own role.** Admins can create Member/Viewer; Owners can create any role (and transfer ownership).
4. **You can never remove or demote a user whose role is *above* yours.** Admins cannot touch Owners; Members/Viewers cannot touch anyone.
5. **Every client-scoped API call validates that `:clientId` is in the user's `user_client_scopes`** (or that `scope_type = 'all'`). Otherwise → `404` (we don't leak that the client exists in another agency).
6. **An invitation token captures the role + scope at invite time.** Changing the inviter's role afterward doesn't change what the invitee gets.
7. **Removing the last Owner is impossible** without a successful transfer first.

---

## P. Open questions (decide before implementation)

- **Should we add a "Billing-only" role?** For agencies that want a finance person who only sees invoices. → **Deferred.** Realistic ask but post-V1; just give them Owner access for now or share invoices via PDF.
- **Should Admins be able to view billing summary (just plan + amount due) without invoice history?** Currently yes per §C. → Stay with this.
- **Can a scope-limited Member see the agency's *total* contact count across all clients?** No — they only see counts for clients in their scope. The agency dashboard rolls up only their accessible clients.
- **Per-template ownership (Member A created it, Member B can't edit)?** → **Deferred.** No per-resource ownership in V1; if you have access to the client, you have access to all its templates.

---

## How to read changes to this doc

If you change any cell in any matrix above, you must:

1. Update [auth-flow-and-schema.md](./auth-flow-and-schema.md) if the change implies a schema/JWT shape difference.
2. Update [auth-tenancy.md](./auth-tenancy.md) §3 if the high-level summary there now disagrees.
3. Update the relevant feature impl doc in [doc/implementation_doc/](../implementation_doc/) — the affected capability lives in a feature's spec.
4. Touch the route table in [routes.md](./routes.md) if you change which routes a role can reach.

This is the **only** doc that owns the role × capability mapping. Everything else references it.
