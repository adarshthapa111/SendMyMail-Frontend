# Feature: Send hardening — change log

> The "make it actually shippable to real users" PR. Five tightly-related
> pieces that together unblock real campaign sends:
>
> 1. **Domain verification** — let users verify their own sending domain
>    via Resend's API. Without this, the product can only send to your
>    own Resend signup email.
> 2. **Unsubscribe link injection** — auto-append `{{unsubscribe_url}}`
>    to every campaign email; signed token; one-click public unsubscribe
>    page. Legal requirement (CAN-SPAM, GDPR).
> 3. **Suppression table + pre-send check** — per-agency table of emails
>    we should never mail. Send loop filters recipients against it.
> 4. **Subject merge tags** — extend `{{first_name}}` etc. to subjects.
> 5. **From / Reply-To hardening** — use the verified domain when
>    available; fall back to `onboarding@resend.dev` otherwise.
>
> References:
> - [doc/implementation_doc/feature-sending-domain-verification.md](../../doc/implementation_doc/feature-sending-domain-verification.md)
> - [doc/implementation_doc/feature-deliverability-trust-layer.md](../../doc/implementation_doc/feature-deliverability-trust-layer.md)
> - [doc/mockups/unsubscribe.html](../../doc/mockups/unsubscribe.html)
> - [tasks/feature-test-send/change_log.md](../feature-test-send/change_log.md)
>   — the Resend transport this PR hardens
> - [tasks/feature-campaigns/change_log.md](../feature-campaigns/change_log.md)
>   — the send pipeline this PR modifies

---

## Status: ✅ Done — V1 shipped

Plan-doc proposed 2-3 days; actual implementation completed in one pass.
Full backend + frontend + change_log update + the rate-limit fix bonus.
Manual end-to-end test still pending (requires real DNS access — see
"What's NOT verified yet").

### What landed (file-by-file)

**Backend (sendmymail-backend)**:

- `prisma/schema.prisma` — 2 new models (`SendingDomain`, `Suppression`)
  + 2 enums (`DomainStatus`, `SuppressionReason`) + 2 reverse relations on
  `Agency`.
- `prisma/migrations/20260607045247_sending_foundation/migration.sql` —
  2 tables + 2 enums + 4 indexes + 2 FK constraints.
- `src/lib/resend.ts` (new) — Shared Resend SDK singleton extracted from
  inline `new Resend(...)` calls. `requireResend()` helper throws if not
  configured.
- `src/lib/unsubscribe-token.ts` (new, ~90 lines) — HMAC-SHA256 sign +
  verify of `{ contactId, listId, agencyId }`. Constant-time comparison.
  Reuses JWT_SECRET. No expiry (recipients click old emails years later).
- `src/lib/sending-domain.ts` (new, ~150 lines) — Resend domains API
  wrapper: `createSendingDomain`, `refreshSendingDomain`,
  `removeSendingDomain`, `findVerifiedDomain`. Maps Resend's status enum
  to our `DomainStatus`.
- `src/routes/sending-domains.ts` (new, ~170 lines) — 5 endpoints
  (GET list / GET single / POST add / POST check / DELETE remove).
  Admin-only for writes. Audit logs status TRANSITIONS only (not every
  poll).
- `src/routes/suppression.ts` (new, ~140 lines) — 3 endpoints (cursor-
  paginated GET / POST manual add / DELETE remove). Admin-only for
  writes. Search by email substring.
- `src/routes/unsubscribe.ts` (new, ~110 lines) — public `GET /u/:token`.
  Always returns 200 (never 4xx) so email scanners don't flag the link.
  Body's `ok` field carries the actual outcome (success / already
  unsubscribed / invalid_token). Idempotent — clicking twice renders
  "already unsubscribed" instead of error. Audits both
  `unsubscribe.confirmed` and `.reclicked` separately.
- `src/campaigns/merge.ts` (modified) — extended whitelist to include
  `unsubscribe_url`. New `applyMergeTagsSubject` strips `unsubscribe_url`
  (nonsense in a subject). New `injectUnsubscribeFooter` appends a
  CAN-SPAM-compliant footer before `</body>` ONLY when the template
  doesn't already contain `{{unsubscribe_url}}` — lets advanced users
  override placement.
- `src/campaigns/send.ts` (rewrite of inner loop) — 3 major insertions:
  1. Load agency suppression list into a Set before the loop.
  2. Resolve verified sending domain → use as From override
     (`${agencyName} <campaigns@${domain.name}>`).
  3. Per-recipient: sign HMAC unsub token → substitute into body →
     inject footer if needed → merge subject → call `sendRawHtml` with
     `from` override + `replyTo` + `listUnsubscribe` header.
  Plus: SUPPRESSION CHECK at top of loop skips Resend entirely for
  suppressed emails (recorded as failed Send with reason).
  **Plus: rate-limit fix** — `SEND_RATE_MS: 170 → 220` (Resend's
  5-req/sec ceiling means 170ms = 5.88 req/sec tripped 429s).
- `src/lib/email.ts` (modified) — `EmailJob` gains `from?` (override),
  `listUnsubscribe?` (Gmail bulk-sender header). `dispatch` builds
  `headers: { 'List-Unsubscribe': ..., 'List-Unsubscribe-Post':
  'List-Unsubscribe=One-Click' }` when present. `sendRawHtml` exposes
  both new fields. Imports singleton from `lib/resend.ts`.
- `src/server.ts` — mounts 3 new routers: `/v1/sending-domains`,
  `/v1/clients/:clientId/suppressions`, `/u` (public, root-mounted for
  short URLs in email footers).

**Frontend (this repo)**:

- `src/lib/api/sendingDomains.ts` (new) — typed wrappers for the 5
  sending-domains endpoints + `SendingDomain` / `DnsRecord` types.
- `src/lib/api/suppression.ts` (new) — typed wrappers for the 3
  suppression endpoints.
- `src/lib/api/unsubscribe.ts` (new) — typed wrapper for `GET /u/:token`.
- `src/hooks/useSendingDomains.ts` (new) — load on mount + auto-poll
  every 30s while ANY domain is pending. Stops polling once all
  verified/failed. Exposes add / check / remove.
- `src/hooks/useSuppression.ts` (new) — paginated list with cursor +
  search + add + remove.
- `src/pages/settings.tsx` (rewrite from placeholder) — real tabbed
  page. Sending tab fully implemented; other tabs link to
  Placeholder until their respective PRs land.
- `src/components/settings/DomainCard.tsx` (new) — per-domain card.
  Status header (pending spinner / verified check / failed alert) +
  inline DNS records table + Check / Remove actions. Remove uses
  "click again to confirm" pattern.
- `src/components/settings/DnsRecord.tsx` (new) — per-record row with
  TYPE/NAME/VALUE cells + copy-to-clipboard buttons. Per-record status
  pill if Resend reports one.
- `src/components/settings/AddDomainDialog.tsx` (new) — narrow modal
  for adding a domain. Client-side format validation. "Use a subdomain
  like mail.yourcompany.com" helper. Resend-limit notice (1 of 1 on
  free).
- `src/pages/public/Unsubscribe.tsx` (rewrite from placeholder) —
  public confirmation page outside AppShell. Loading → success /
  already-unsubscribed / invalid states. Always renders something so
  email-link scanners don't flag.
- `src/pages/contacts/SuppressionList.tsx` (new) — real suppression
  page (replaces placeholder). Search + paginated rows with reason
  pill + note + date + remove. "Add manually" modal.
- `src/pages/contacts/index.tsx` — re-exports `SuppressionList` as
  `Suppression` (replaces the placeholder export). Drops the
  `Placeholder` reference for suppression (kept for ListEditor).
- 5 new SCSS modules:
  - `src/styles/components/settings/Settings.module.scss`
  - `src/styles/components/settings/DomainCard.module.scss`
  - `src/styles/components/settings/DnsRecord.module.scss`
  - `src/styles/components/settings/AddDomainDialog.module.scss`
  - `src/styles/components/public/Unsubscribe.module.scss`
  - `src/styles/components/contacts/SuppressionList.module.scss`

### Decisions that came up during implementation (vs plan)

| Decision | What | Why |
|---|---|---|
| **Rate-limit fix shipped in this PR** | `SEND_RATE_MS: 170 → 220` in `src/campaigns/send.ts` | The campaigns PR sized this at 170ms (~5.88 req/sec), which exceeds Resend's 5 req/sec free-tier limit. Was throwing intermittent 429s on >50-recipient campaigns. 1-line fix, ships now. |
| **Routes already wired** | Settings + suppression + public-unsubscribe routes were already in `src/router/index.tsx` pointing at placeholders. No router changes needed. | Earlier shell PRs had the routing scaffold. We just rewrote the placeholder components. |
| **Backend tab labels** | All 5 tabs visible in `/settings`; non-sending tabs render `<Placeholder>` | Avoids hiding tabs that have URLs in `doc/architecture/routes.md`. Clear "land in a later PR" copy when clicked. |
| **DNS records table** | Single component (`DnsRecord`) renders both header AND row layouts via flex/grid | Cleaner than a separate header component. Header is just a `.recordsHead` div in DomainCard with the same column widths. |
| **Suppression page mounted at /clients/:cid/suppression** | Per existing route; no URL changes | Per-agency in DB but per-client in UX URL — matches the mental model of "manage this client's contacts area". Backend respects the per-agency scope regardless. |
| **Empty state on suppression** | Dashed-border card with "When recipients unsubscribe…" copy | Matches the agency dashboard empty states. Sets expectations rather than just "no rows yet". |
| **"Remove" buttons use click-again-to-confirm** | Used on both DomainCard remove + SuppressionRow remove | Cheap "are you sure" without a separate modal. 4-second timeout resets state. |
| **List-Unsubscribe header format** | `<${unsubUrl}>` (angle brackets) + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` | RFC 8058 format. Gmail Feb-2024 bulk-sender rules require both headers for one-click unsubscribe to be honored. |

### Build + lint gates

- Backend `tsc --noEmit`: **clean**
- Backend Prisma migration: applied cleanly to dev DB
- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.51s). New `templates` chunk +1.3 KB
  gzipped (~57 → 58 KB), main chunk +0.13 KB gzipped (~118.5 → 118.7).
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

### What's NOT verified yet

**Manual end-to-end test pending** — requires real DNS access to a
subdomain you control:

1. Sign in to a fresh agency (or use existing).
2. Go to `/settings/sending`. Click "Add domain". Enter
   `mail.yourdomain.com`.
3. Card appears with status `pending` + DNS records table.
4. Copy each record. Add them to your DNS provider (Cloudflare,
   Namecheap, etc.).
5. Wait 5-30 minutes for DNS propagation.
6. Click "Check now". Status flips to `verified`.
7. Create a campaign + recipient list. Launch.
8. Check the inbox of any non-signup-email recipient. Email should
   arrive from `YourAgencyName <campaigns@mail.yourdomain.com>`.
9. Click the unsubscribe footer link. Lands on
   `/u/:token` confirmation page. Suppression row created at
   `/clients/:cid/suppression`.
10. Launch another campaign that includes the unsubscribed email.
    Verify: 1 send recorded as failed with reason "Recipient is in
    agency suppression list".

Race condition where two admins simultaneously verify the same domain
also untested.

### Known V1 limitations (by design)

- **No webhook ingestion** — hard bounces + complaints don't auto-add
  to suppression. V2 PR (Resend webhook ingestion) covers this.
- **Single domain UX** — multi-domain works in the schema; UI shows the
  list but Resend free tier caps at 1. UI copy ("1 of 1 used") makes
  this clear.
- **No bulk suppression import** — single-entry only V1. Bulk CSV
  upload is a V2 follow-up.
- **No per-list suppression view** — "X people unsubscribed from THIS
  list" not surfaced. ListContact.status carries it; we just don't
  display.
- **No List-Unsubscribe mailto fallback** — we emit only the HTTPS
  variant. Acceptable; most clients prefer HTTPS now.

### Files at a glance

**Backend (8 modified / 7 new / 1 migration)**:
- Modified: `prisma/schema.prisma`, `src/server.ts`, `src/lib/email.ts`,
  `src/campaigns/send.ts`, `src/campaigns/merge.ts`
- New: `src/lib/resend.ts`, `src/lib/unsubscribe-token.ts`,
  `src/lib/sending-domain.ts`, `src/routes/sending-domains.ts`,
  `src/routes/suppression.ts`, `src/routes/unsubscribe.ts`
- Migration: `20260607045247_sending_foundation`

**Frontend (3 modified / 13 new)**:
- Modified: `src/pages/settings.tsx`, `src/pages/public/Unsubscribe.tsx`,
  `src/pages/contacts/index.tsx`
- New TS: 3 API clients, 2 hooks, 1 page (`SuppressionList`), 3
  components (`DomainCard`, `DnsRecord`, `AddDomainDialog`)
- New SCSS: 6 modules

---

## Original planning sections below (unchanged):

---

## Why this is next

The product **looks** complete after campaigns + onboarding shipped,
but it's stuck in a half-state where:

- Test Send works for ONE recipient (your signup email).
- Campaigns wizard guides you through 6 steps to "send to a list".
- Launching the campaign sends real emails via Resend.
- **But Resend's free-tier constraint means only the signup email
  actually delivers.** Every other recipient bounces with a Resend
  error.

So a fresh user finishes onboarding, builds a template, creates a
campaign, hits launch, and 95% of their list silently fails. Bad
demo, bad first impression, blocks beta.

This PR removes the constraint AND adds the legal-compliance pieces
(unsubscribe + suppression) you must have before mailing anyone
real. After this ships you can credibly say to a beta customer "yes,
mail your client list".

---

## Scope

### IN V1

- `Domain` table + Resend domains API integration
- Domain verify flow: add → display DNS records → poll status → mark verified
- `Suppression` table + send-loop filter
- Public `GET /u/:token` unsubscribe endpoint + confirmation page
- HMAC-signed unsubscribe tokens
- Auto-injection of `{{unsubscribe_url}}` in campaign body if missing
- Substitution of `{{unsubscribe_url}}` per-recipient at send time
- Subject merge tag support (`{{first_name}}` etc. in subject lines)
- Dynamic From: verified domain when available, `EMAIL_FROM` env fallback
- Reply-To = campaign's `fromEmail` (proper email threading)

### OUT V1 (deferred follow-ups)

| Item | Why deferred | When |
|---|---|---|
| **Hard-bounce auto-suppression** | Needs Resend webhook ingestion (separate V2 PR). For V1, suppression is manual or grows from explicit unsubscribes. | V2 with webhooks |
| **Resend webhook handler** | Larger surface — delivery, bounce, complaint events. Standalone PR. | V2 |
| **Per-campaign suppression** ("don't include audience X this time") | Edge case. Filter at list level. | Future |
| **Multi-domain support** (one agency verifying mail.foo.com + mail.bar.com) | Schema supports it; UI is single-domain V1. Simpler form. | When users ask |
| **DKIM rotation** | Resend handles internally. | Never (Resend's job) |
| **SPF / DMARC visualization** | Resend dashboard already shows. Don't duplicate. | Never |
| **Custom unsubscribe page branding** | Generic page V1. Agency-specific branding (logo, copy) later. | V2 |
| **One-click List-Unsubscribe header** (RFC 8058) | Important for Gmail bulk-sender compliance Feb 2024+. Need to inject HTTP header in Resend send. Worth adding! | Could be V1 — see decisions |

### Phasing options

If 2-3 days feels too big for one PR:

**Phase 1 (~1.5 days)**: Domain verify + Subject merge + From hardening
- Backend: Domain table + Resend API + endpoints + send pipeline
  updates
- Frontend: `/settings/sending` page + add domain + DNS display
- Result: Sends go out from verified domain, subjects can use merge
  tags. Real recipients work.

**Phase 2 (~1.5 days)**: Unsubscribe + Suppression
- Backend: Suppression table + unsubscribe endpoint + token util +
  send-loop filter + auto-injection
- Frontend: public unsubscribe page + suppression management UI
- Result: Legal-compliance done.

**Default recommendation: ship as ONE PR.** The pieces share so much
infrastructure (the send pipeline, the suppression check, the campaign
status updates) that splitting costs more in coordination overhead
than it saves in review effort.

---

## Data model

### Backend additions to `prisma/schema.prisma`

```prisma
// ─── Sending domain verification ──────────────────────────────────

enum DomainStatus {
  pending      // Just added, awaiting DNS propagation + verification
  verified     // Resend confirmed all DKIM/SPF/MX records pass
  failed       // Verification failed after retries (user can re-check)
}

model SendingDomain {
  id           String        @id @default(cuid())
  agencyId     String        @map("agency_id")
  name         String                              // e.g. "mail.khukrispices.com"
  resendId     String?       @unique @map("resend_id")  // Resend's domain id (for API ops)
  status       DomainStatus  @default(pending)
  /// DNS records returned by Resend.domains.create — array of
  /// { record: 'CNAME'|'TXT'|'MX', name, value, ttl, priority? }
  records      Json
  verifiedAt   DateTime?     @map("verified_at")
  lastCheckedAt DateTime?    @map("last_checked_at")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  agency Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  @@map("sending_domains")
  @@unique([agencyId, name])                    // one agency can't add the same domain twice
  @@index([agencyId, status])                   // hot path: agency's verified domain
}

// ─── Suppression (don't-mail list) ────────────────────────────────

enum SuppressionReason {
  manual        // Added by admin via UI
  unsubscribe   // User clicked the unsubscribe link
  hard_bounce   // V2 — when webhook ingestion lands
  complaint     // V2 — same
}

model Suppression {
  id         String             @id @default(cuid())
  agencyId   String             @map("agency_id")
  email      String                                  // canonicalised to lowercase
  reason     SuppressionReason
  /// Optional context for audit / display ("Unsubscribed from list X")
  note       String?
  createdAt  DateTime           @default(now()) @map("created_at")

  agency Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  @@map("suppressions")
  @@unique([agencyId, email])                   // one row per (agency, email)
  @@index([agencyId])
}
```

**Reverse relations on `Agency`**:
```prisma
sendingDomains  SendingDomain[]
suppressions    Suppression[]
```

### Why these shapes

- **`SendingDomain` is per-agency**, not per-client. A Nepali agency
  mailing for 5 clients uses ONE verified domain (`mail.theiragency.com`)
  with multiple From addresses. Multi-domain UI is V2.
- **`records` is jsonb**, not separate rows. Resend returns a small
  array (~3-5 records). Querying-by-record is never needed.
- **`Suppression` is per-agency**, not per-client. If a user
  unsubscribes from any list under the agency, we never mail them
  again from THAT agency — across all that agency's clients. Stricter
  than per-list but right thing legally. Per-list status already exists
  on `ListContact` for fine-grained subscription tracking.
- **`reason` enum** lets us distinguish "explicitly unsubscribed" from
  "bounced once" for future analytics + maybe-re-add flows.

---

## Backend

### Files

```
src/lib/resend.ts                            (new — Resend SDK singleton, replaces inline `new Resend(...)` calls)
src/lib/unsubscribe-token.ts                 (new — HMAC sign/verify)
src/lib/sending-domain.ts                    (new — Resend domains API wrapper)
src/routes/sending-domains.ts                (new — 5 endpoints)
src/routes/suppression.ts                    (new — 3 endpoints)
src/routes/unsubscribe.ts                    (new — public GET /u/:token)
src/campaigns/send.ts                        (modify — suppression check, unsubscribe injection, merge subject)
src/campaigns/merge.ts                       (modify — process subject too)
src/lib/email.ts                             (modify — dynamic FROM based on verified domain)
prisma/schema.prisma                         (+2 models, +2 enums, +2 reverse relations)
prisma/migrations/<ts>_sending_foundation/migration.sql
src/server.ts                                (mount 3 new routers)
```

### Endpoints

**`/v1/sending-domains`** — agency-scoped:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | requireAuth | List the agency's domains + statuses |
| `POST` | `/` | requireRole('admin') | Add new domain → calls Resend → stores returned DNS records |
| `GET` | `/:id` | requireAuth | Single domain + records (for "show me the records again" UI) |
| `POST` | `/:id/check` | requireRole('admin') | Poll Resend for verification status; update DB |
| `DELETE` | `/:id` | requireRole('admin') | Remove from Resend + delete locally |

**`/v1/clients/:cid/suppressions`** — client-scoped (suppression is
per-agency in storage but per-client in UX so admins manage it from
the contacts area):

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | requireAuth + requireClientScope | List the agency's suppressions (paginated) |
| `POST` | `/` | requireRole('admin') | Manually add an email to suppression |
| `DELETE` | `/:id` | requireRole('admin') | Remove (re-allow mailing) |

**`/u/:token`** — public:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/u/:token` | none | Verify HMAC token → flip `ListContact.status` to `unsubscribed` AND insert into `Suppression` → render confirmation HTML page |
| `GET` | `/u/:token/already` | none | Idempotent endpoint for "you're already unsubscribed" view (in case user revisits) |

Public route mounted at root (not `/v1/`) so the URL is short and
brandable when it appears in email footers.

### Unsubscribe token format

```typescript
// src/lib/unsubscribe-token.ts

interface UnsubPayload {
  contactId: string;
  listId:    string;
  agencyId:  string;
  // Optional: issuedAt for replay-prevention (V2)
}

// Token: base64url(JSON.stringify(payload)) + '.' + base64url(HMAC-SHA256(payload, JWT_SECRET))
// 1-line format, URL-safe, no expiry V1 (intentional — users may click old links years later)
```

**Why reuse `JWT_SECRET`**: avoids adding another env var; the secret
already exists, is already long enough, and rotation already requires
a deploy. If we ever want to invalidate ALL unsubscribe links (we
won't), rotating JWT_SECRET does it.

**Why no expiry**: a recipient receiving a campaign email and clicking
unsubscribe 2 years later should still unsubscribe successfully. Email
links are durable; the token must be too.

### Send pipeline changes — `src/campaigns/send.ts`

Three insertions into the existing loop:

```typescript
// 1. SUPPRESSION FILTER (before loop)
const suppressedEmails = await prisma.suppression.findMany({
  where: { agencyId: campaign.agencyId },
  select: { email: true },
});
const suppressionSet = new Set(suppressedEmails.map((s) => s.email.toLowerCase()));

for (const recipient of contacts) {
  // 2. SKIP IF SUPPRESSED
  if (suppressionSet.has(recipient.email.toLowerCase())) {
    await prisma.send.create({
      data: {
        campaignId,
        toEmail: recipient.email,
        status:  'failed',
        error:   'Recipient is in agency suppression list',
        sentAt:  null,
      },
    });
    failedCount++;
    continue;
  }

  // 3. RENDER WITH UNSUBSCRIBE TOKEN (per-recipient)
  const unsubToken = signUnsubToken({
    contactId: recipient.contactId ?? '',
    listId:    campaign.listId ?? '',
    agencyId:  campaign.agencyId,
  });
  const unsubUrl = `${process.env.APP_URL}/u/${unsubToken}`;

  let html = applyMergeTags(baseHtml, {
    first_name:      recipient.firstName ?? '',
    last_name:       recipient.lastName ?? '',
    email:           recipient.email,
    unsubscribe_url: unsubUrl,
  });

  // 3b. AUTO-INJECT UNSUBSCRIBE FOOTER if template doesn't already
  //     contain {{unsubscribe_url}}
  if (!baseHtml.includes('{{unsubscribe_url}}') && !baseHtml.includes(unsubUrl)) {
    html = injectUnsubFooter(html, unsubUrl);
  }

  // 4. NEW: SUBJECT MERGE TAGS
  const subject = applyMergeTags(campaign.subject!, mergeValues);

  // 5. SEND
  await sendRawHtml({ to: recipient.email, subject, html, replyTo: campaign.fromEmail });
}
```

### `injectUnsubFooter` helper

Appends a small footer block before `</body>`. Match the warm-editorial
theme tokens but inline (it's email HTML):

```html
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:32px;border-top:1px solid #e5e2db;padding-top:16px;font-family:Arial,sans-serif;font-size:12px;color:#9c958a;text-align:center;">
  <tr><td>
    Don't want these emails?
    <a href="{{unsub_url}}" style="color:#9c958a;text-decoration:underline;">Unsubscribe</a>
    · Sent by {{agency_name}}
  </td></tr>
</table>
```

`{{unsub_url}}` gets substituted directly (not via the merge regex,
since we control the footer's content).

### Subject merge tag changes — `src/campaigns/merge.ts`

Extend the regex whitelist to include `unsubscribe_url`:

```typescript
const MERGE_TAG_RE = /\{\{\s*(first_name|last_name|email|unsubscribe_url)\s*\}\}/g;
```

And export a `MergeValues` type that includes `unsubscribe_url`.

The send pipeline calls `applyMergeTags` for both `baseHtml` (body)
and `campaign.subject` (new). Subject substitution gets the same
HTML-escape treatment by default. Edge: if a contact's name contains
`<>&"'` it gets escaped in body (good) AND subject (also fine —
recipients see "Hi &lt;Alice&gt;" which is honest).

### Dynamic FROM resolution — `src/lib/email.ts`

```typescript
async function resolveFromAddress(agencyId: string): Promise<string> {
  const domain = await prisma.sendingDomain.findFirst({
    where:    { agencyId, status: 'verified' },
    select:   { name: true },
    orderBy:  { verifiedAt: 'desc' },         // most recently verified wins (V2 multi-domain matters here)
  });
  if (!domain) return process.env.EMAIL_FROM ?? 'SendMyMail <onboarding@resend.dev>';
  // V1: hardcode "SendMyMail <campaigns@{verified-domain}>"
  // Future: per-agency configurable sender username
  return `${agency.name} <campaigns@${domain.name}>`;
}
```

Existing `sendRawHtml` keeps its signature; internally calls this
resolver when no explicit `from` is passed.

---

## Frontend

### Routes

| Route | Component | Auth gate |
|---|---|---|
| `/settings/sending` | `SendingDomains` | `RoleGated('admin')` |
| `/u/:token` | `Unsubscribe` | Public (no AppShell, no auth) |
| `/clients/:cid/suppression` | `SuppressionList` (existing placeholder → real) | `RoleGated('admin')` |

### Files

```
src/pages/settings/SendingDomains.tsx            (new — main page)
src/components/settings/AddDomainDialog.tsx      (new — modal)
src/components/settings/DomainCard.tsx           (new — per-domain card with records)
src/components/settings/DnsRecord.tsx            (new — copyable record row)

src/pages/contacts/SuppressionList.tsx           (rewrite from placeholder)
src/components/contacts/AddSuppressionDialog.tsx (new)

src/pages/public/Unsubscribe.tsx                 (new — confirmation page)

src/lib/api/sendingDomains.ts                    (new — typed wrappers)
src/lib/api/suppression.ts                       (new)
src/lib/api/unsubscribe.ts                       (new — public read of "did unsubscribe succeed")

src/hooks/useSendingDomains.ts                   (new)
src/hooks/useSuppression.ts                      (new)

src/router/index.tsx                             (+3 routes)
```

### `/settings/sending` page

Matches the warm editorial theme. Structure per impl-doc mockup:

```
┌─────────────────────────────────────────────────────────────────┐
│ Sending domain                                                   │
│ Verify a domain so campaigns send from your address, not         │
│ onboarding@resend.dev.                                            │
├─────────────────────────────────────────────────────────────────┤
│ ✨ Recommended: use a subdomain like mail.yourcompany.com        │
│    (keeps your main DNS clean and lets Resend manage records)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ mail.khukrispices.com                ● VERIFIED           │   │
│  │ Added 3 days ago · 4 DNS records · verified March 5      │   │
│  │                                                          │   │
│  │ [Check again]  [Remove]                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Add sending domain]                                          │
└─────────────────────────────────────────────────────────────────┘
```

If status `pending`: card expands to show the DNS records as a
copyable table:

```
Add these records to your DNS provider:

┌─────┬──────────────────────────┬──────────────────────┐
│TYPE │NAME                       │VALUE                  │
├─────┼──────────────────────────┼──────────────────────┤
│CNAME│send.mail.khukrispices.com │feedback-…sendgrid.net│ [copy]
│TXT  │mail.khukrispices.com      │v=spf1 include:…       │ [copy]
│TXT  │resend._domainkey…         │v=DKIM1; p=MIGfMA0G…   │ [copy]
└─────┴──────────────────────────┴──────────────────────┘

DNS changes take 5-30 minutes to propagate.
[Check verification status]
```

Polling: when card status is `pending`, the page polls
`/v1/sending-domains/:id/check` every 30 seconds while the tab is
visible. Updates the status pill when it flips to `verified`.

### `/u/:token` page

Public, NO AppShell, NO auth. Minimal layout matching
`doc/mockups/unsubscribe.html`:

```
                  ┌─────────────────────────────┐
                  │                             │
                  │  ✓                          │
                  │                             │
                  │  Unsubscribed                │
                  │                             │
                  │  We've removed your-email-   │
                  │  here@example.com from this  │
                  │  list. You won't receive any │
                  │  more emails from {AgencyName}│
                  │  through this list.          │
                  │                             │
                  │  Wrong email? Just ignore    │
                  │  this page.                  │
                  │                             │
                  └─────────────────────────────┘

                          Powered by SendMyMail
```

Server-rendered or client-rendered? Server-rendered HTML is friendlier
to email clients that show link previews. But our backend doesn't
have a template engine for this; client-rendered is simpler. **V1:
client-rendered React** — page calls the API in `useEffect`, shows
loading then success. Acceptable; if SEO ever matters for /u/* we
move server-side.

### Suppression management page (`/clients/:cid/suppression`)

Already has a placeholder route. Rewrite as:

```
Suppressed emails

   Search: [_______________]

   ┌──────────────────────────────────────────────────────┐
   │ alice@example.com  Manual    "Marked spammy"  Mar 5  │ [×]
   │ bob@example.com    Unsubsc.  via Welcome list  Mar 6 │ [×]
   │ chad@example.com   Hard b.   delivery failed   Mar 7 │ [×]
   └──────────────────────────────────────────────────────┘

   [+ Add suppression manually]
```

Each row's [×] removes the suppression (with confirm modal). New PR
to add bulk-import is V2.

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Domain table** | One row per (agency, domain). Multi-domain supported in schema, single-domain in UI V1. | Most agencies use one. Schema doesn't need re-migration when we add multi-domain UI. |
| **Subdomain recommendation** | UI suggests `mail.theirdomain.com` not root | Keeps root DNS clean. Resend best practice. |
| **HMAC secret** | Reuse `JWT_SECRET` | Avoid env var sprawl. Long-enough, rotation already requires deploy. |
| **Unsubscribe token expiry** | None V1 | Recipients may click 2-year-old emails; should still work. |
| **Unsubscribe URL scope** | Per-(contact, list, agency) | One click unsubscribes from THIS list. The user can mass-suppress via a different flow. |
| **Suppression scope** | Per-agency | If you unsubscribe from any list, the agency doesn't mail you from any list. Strict; right thing legally. |
| **Auto-inject footer** | Only when template doesn't contain `{{unsubscribe_url}}` already | Lets advanced users keep their custom footer; gives non-advanced users compliance without effort. |
| **Subject merge tags** | Same whitelist as body (`first_name`, `last_name`, `email`) — but NOT `unsubscribe_url` in subject | Tracking pixel in subject = nonsense. Whitelist enforces. |
| **From address format** | `{{agency.name}} <campaigns@{{verified-domain}}>` once verified, else `EMAIL_FROM` env (`SendMyMail <onboarding@resend.dev>`) | Recognizable sender. Resend doc says agency name in From improves deliverability. |
| **List-Unsubscribe header** | YES — V1 includes it | Gmail bulk-sender rules (Feb 2024+) require it. Resend's `headers` param accepts it. Tiny addition; massive deliverability impact. |
| **Reply-To** | Campaign's `fromEmail` | If user sets fromEmail = sabitra@khukrispices.com, replies go to her. Matches user mental model. |
| **Unsubscribe page** | Generic SendMyMail-branded V1; per-agency branding V2 | Cheap to ship; matches mockup. |
| **Polling for domain verify** | Every 30s while tab visible + on focus | Better than backend cron (we'd need a worker). 30s feels responsive without spamming. |
| **Domain delete** | Removes from Resend AND from local DB | Lets users re-add cleanly if they messed up. Resend's `domains.remove` API supports this. |
| **Suppression import** | Manual single-entry V1; bulk-import V2 | Most agencies start with 0 suppressions; bulk is for migrators. |

---

## Edge cases

| Case | Behavior |
|---|---|
| User adds a domain, never verifies | Stays `pending` forever. Campaigns use `EMAIL_FROM` env fallback. No timeout — user can come back later. |
| User adds same domain twice | Returns the existing record with a 409. Frontend shows toast "already added". |
| User adds domain, gets DNS records, deletes BEFORE verifying | Removes from Resend + local DB. Clean reset. |
| User's domain fails verification (e.g. wrong CNAME) | Status flips to `failed`. UI shows error from Resend. "Check again" lets them retry after fixing DNS. |
| Resend API down when adding domain | POST returns 502. Frontend toasts the error. No partial state (we only insert locally AFTER Resend confirms create). |
| Resend API down during /check poll | Silent failure — keep status `pending`. Next poll tries again. |
| User unsubscribes, then is re-added to the contact list manually | We still respect the agency-wide suppression — send pipeline skips them. UI should show this in the contact's profile. |
| User unsubscribes via two different campaigns' links | Idempotent — second click renders "you're already unsubscribed" instead of "wait, were you unsubscribed before?" |
| Token tampered with (invalid HMAC) | `GET /u/:token` returns 404 (not 401 — we don't want to leak that tokens exist). Frontend page shows "this link expired or is invalid". |
| Token references a deleted contact / list / agency | `contactId` may be null after soft-delete; we still record the suppression by email. If list is gone, suppression still applies agency-wide. |
| Campaign template has its own `{{unsubscribe_url}}` placement | We substitute it; we DON'T auto-inject a footer. Template owner controls placement. |
| Campaign template has NO `{{unsubscribe_url}}` AND no auto-inject would render | Won't happen — `injectUnsubFooter` fallback always fires when template lacks the placeholder. |
| User's subject contains `{{first_name}}` but contact has no first name | Substitutes empty string. Subject becomes "Hi , your order is ready" — ugly but acceptable V1. V2: smart fallback ("Hi there"). |
| Suppression list has 100K entries (huge migrated list) | We load all into a Set per send. Memory: ~10 KB per 1K entries = 1 MB. Acceptable. If it grows to 1M, swap to a Bloom filter or per-recipient query. |
| Recipient is also the sender | Send still goes out (no special handling). User is presumably testing. |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Add domain via /settings/sending | Returns DNS records. Status: pending. Card shows records. |
| Add CORRECT DNS records, wait, click "Check now" | Status flips to verified. Card shows "Verified March 5". |
| Add INCORRECT DNS records, click check | Status flips to failed. UI shows Resend's error. Card stays. |
| Delete a domain | Removed from Resend + local DB. Card disappears. |
| Launch campaign WITHOUT verified domain | From: SendMyMail <onboarding@resend.dev>. Sends to YOUR signup email succeed, others fail (Resend constraint). |
| Launch campaign WITH verified domain | From: {AgencyName} <campaigns@mail.foo.com>. Sends to any address succeed. |
| Click unsubscribe link in delivered email | Confirmation page renders. Recipient added to suppression. ListContact.status flipped to 'unsubscribed'. |
| Click same link twice | Second click renders "you're already unsubscribed" — no error. |
| Launch a campaign that includes a suppressed email | Send row created with status: failed, error: "Recipient is in agency suppression list". Campaign continues for other recipients. |
| Subject has `{{first_name}}` and contact's name is "Alice" | Recipient sees "Hi Alice" in their inbox. |
| Template has NO `{{unsubscribe_url}}` placeholder | Auto-injected footer appears at email bottom with clickable unsubscribe link. |
| Template HAS its own `{{unsubscribe_url}}` placement | No footer injected. User's link substitutes correctly per-recipient. |
| Manually add suppression via Contacts area | Email added to suppression. Future sends skip them. |
| Manually remove suppression | Email removed. Future sends include them. |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Backend `tsc --noEmit` | clean |
| Backend Prisma migration | applies in dev DB; no schema drift |
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. New `settings` chunk ~10-15 KB gzipped. |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual E2E #1: domain verify with real DNS | Status flips to verified after real CNAME propagation. |
| Manual E2E #2: campaign with verified domain | Sends to a non-signup email; arrives. |
| Manual E2E #3: unsubscribe + suppression | Clicking unsub link skips that recipient on next campaign send. |

---

## Implementation order (when authorized)

**Day 1 — Backend foundation**
1. Schema + migration (Domain + Suppression models)
2. `src/lib/unsubscribe-token.ts` (HMAC sign/verify)
3. `src/lib/sending-domain.ts` (Resend domains API wrapper)
4. `src/lib/resend.ts` (extract Resend SDK singleton from email.ts)
5. `src/routes/sending-domains.ts` (5 endpoints)
6. `src/routes/suppression.ts` (3 endpoints)
7. `src/routes/unsubscribe.ts` (public GET /u/:token)
8. Modify `src/campaigns/send.ts` — suppression check, unsub injection, subject merge
9. Modify `src/campaigns/merge.ts` — extend to subject + add unsubscribe_url
10. Modify `src/lib/email.ts` — dynamic FROM based on verified domain
11. Mount routers in `server.ts`
12. tsc clean

**Day 2 — Frontend**
13. `src/lib/api/sendingDomains.ts`, `src/lib/api/suppression.ts`, `src/lib/api/unsubscribe.ts`
14. `src/hooks/useSendingDomains.ts`, `src/hooks/useSuppression.ts`
15. `src/pages/settings/SendingDomains.tsx` + `AddDomainDialog` + `DomainCard` + `DnsRecord`
16. Public `/u/:token` page (no AppShell)
17. Suppression management page (rewrite placeholder)
18. Router updates
19. Build + lint verify

**Day 3 — Manual E2E + polish**
20. Set up DNS records for a test subdomain (mail.test.something.com)
21. Walk through verification flow end-to-end
22. Send a real campaign through verified domain
23. Click unsubscribe link, verify suppression
24. Final change_log update with "Done" entry

---

## What this unlocks

- **Real beta customers**. After this PR you can credibly say "yes,
  mail your client list" to a friendly agency owner.
- **Legal compliance** — CAN-SPAM, GDPR. Required before mailing anyone.
- **Cleaner sender reputation** — verified domains get higher
  deliverability than `onboarding@resend.dev` aliases.
- **Domain rep accrual** — every campaign sent from `mail.foo.com`
  builds reputation. Without this, you're sharing the rep of a shared
  Resend sandbox.
- **Foundation for Resend webhook ingestion** (V2) — hard-bounce
  auto-suppression slots into the same Suppression table.

---

## V2 / future PRs

| PR | Title | Estimated effort |
|---|---|---|
| V2-a | **Resend webhook ingestion** — receive delivery / bounce / complaint events, update Send rows + auto-suppress hard bounces | 1-2 days |
| V2-b | **Multi-domain UI** — agencies that mail for multiple clients with different domains | 1 day |
| V2-c | **Custom unsubscribe page branding** — agency logo + custom copy | 4-6h |
| V2-d | **Open + click tracking** (still a separate PR) | 1-2 days |
| V2-e | **Bulk suppression import** — CSV upload | 4h |
| V2-f | **Per-list suppression view** — "X people unsubscribed from THIS list" | 4h |
| V2-g | **Smart merge fallbacks** — "Hi there" when first_name is empty, etc. | 2h |
| V2-h | **Domain rep dashboard widget** — Resend gives stats; surface them | 6h |

---

*Plan locked. Ready to implement when authorized.*
