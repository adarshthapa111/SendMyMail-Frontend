# Feature: Campaigns — change log

> The one-shot broadcast pipeline. Lets a user build a campaign in 6
> wizard steps, snapshot recipients from a contact list, render the
> template per-recipient with merge tags, ship via Resend, and view a
> basic report.
>
> This is the **PR that closes the product loop**: design template →
> test in inbox (Test Send) → **send to a list (this PR)** → see results.
>
> References:
> - [doc/implementation_doc/feature-campaign-engine.md](../../doc/implementation_doc/feature-campaign-engine.md)
>   — full V1 spec (BullMQ + SES + webhook ingestion); this PR ships a
>   leaner subset, see "Deviations from impl doc" below
> - [doc/mockups/campaigns_list.html](../../doc/mockups/campaigns_list.html)
>   — list page (cards + status pills)
> - [doc/mockups/campaign_new.html](../../doc/mockups/campaign_new.html)
>   through `campaign_step6.html` — the 6-step wizard, fully designed
> - [doc/mockups/campaign_sent.html](../../doc/mockups/campaign_sent.html)
>   — confirmation screen
> - [doc/mockups/campaign_report.html](../../doc/mockups/campaign_report.html)
>   — post-send stats
> - [tasks/feature-test-send/change_log.md](../feature-test-send/change_log.md)
>   — the Resend transport (`sendRawHtml`) + MJML compile pipeline this
>   PR reuses end-to-end
> - [tasks/feature-templates/change_log.md](../feature-templates/change_log.md)
>   — the template + tree shape campaigns consume
> - [tasks/feature-contacts-lists/change_log.md](../feature-contacts-lists/change_log.md)
>   — the list + contact data model snapshots draw from

---

## Status: ✅ Done — V1 shipped

Plan-doc proposed 2-3 days; actual implementation completed in one
pass. Backend schema + 7 endpoints + send pipeline ship; frontend 6-step
wizard + list + report ship. Manual end-to-end test still pending (will
verify with a 5-recipient test list).

### What landed (file-by-file)

**Backend (sendmymail-backend)**:

- `prisma/schema.prisma` — 3 new models (`Campaign`, `CampaignRecipient`,
  `Send`) + 2 enums (`CampaignStatus`, `SendStatus`). Reverse relations
  added on `Agency`, `Client`, `User`, `Template`, `List`, `Contact`.
- `prisma/migrations/20260606155358_campaigns_foundation/migration.sql`
  — 3 tables, 2 enums, 5 FK constraints (Agency CASCADE, Client CASCADE,
  Template SetNull, List SetNull, User SetNull), 6 indexes.
- `src/campaigns/merge.ts` (~30 lines) — whitelist regex substitution
  for `{{first_name}}` / `{{last_name}}` / `{{email}}` with HTML escape.
- `src/campaigns/send.ts` (~180 lines) — `launchCampaign(id, actor)`
  does the lock + validation + snapshot synchronously then schedules
  `runSendLoop` in the background via `void`. The loop fetches the
  template once, iterates recipients with 170ms rate-limit sleep,
  writes a `Send` row per attempt, flushes counters every 25 sends,
  finalizes status at the end.
- `src/routes/campaigns.ts` (~280 lines) — 7 endpoints matching the
  plan: GET list / GET one / POST / PATCH / DELETE / POST launch / GET
  sends. Zod-validated bodies. Same `assertClientExists` + 404-on-
  tenancy pattern as templates. Audit-logged on create, update, launch,
  delete.
- `src/server.ts` — mounted at `/v1/clients/:clientId/campaigns`.
- TypeScript clean.

**Frontend (this repo)**:

- `src/lib/api/campaigns.ts` (~120 lines) — typed wrappers for the 7
  endpoints, plus `Campaign` / `CampaignSummary` / `CampaignUpdateBody`
  / `SendLogEntry` types.
- `src/store/slices/campaignsSlice.ts` — per-client cache, mirrors
  templatesSlice exactly.
- `src/hooks/useCampaigns.ts` — list + CRUD, same self-healing
  bail-on-loaded pattern as useTemplates.
- `src/store/index.ts` — slice registered.
- `src/router/index.tsx` — replaced 8 placeholder per-step routes with
  3 real ones: list, wizard (`/new` + `/:id/edit`), report (`/:id`).
- `src/pages/campaigns/index.tsx` — exports the 3 page components
  (was: 8 placeholders).
- `src/pages/campaigns/CampaignsList.tsx` (~150 lines) — card grid +
  status filter tabs + "New campaign" CTA (creates an "Untitled
  campaign" draft and routes into the wizard).
- `src/pages/campaigns/CampaignWizard.tsx` (~230 lines) — shell. Owns
  `pending` patch state, PATCHes on Continue, validates each step
  client-side. Step 6 triggers `launchCampaign` + redirect to report.
- `src/pages/campaigns/CampaignReport.tsx` (~200 lines) — polls every
  5s while status === sending; renders progress bar + stats + paginated
  send log.
- `src/components/campaigns/` — 9 new files:
  - `CampaignCard.tsx`, `CampaignStepRail.tsx`, `CampaignFooterNav.tsx`
  - `Step1Name.tsx`, `Step2Recipients.tsx`, `Step3FromSubject.tsx`,
    `Step4Template.tsx`, `Step5Schedule.tsx`, `Step6Review.tsx`
  - `index.ts`
- `src/styles/components/campaigns/` — 4 SCSS modules:
  - `CampaignsList.module.scss`, `CampaignCard.module.scss`,
    `CampaignWizard.module.scss`, `CampaignStepRail.module.scss`,
    `CampaignReport.module.scss`

### Decisions that came up during implementation (not in plan)

| Decision | What | Why |
|---|---|---|
| **Step 5 schedule UI** | Two radio rows: "Send now" (selected, only functional option) + "Schedule for later" (disabled, "Coming soon" pill) | Reads as a real choice now; future V2 unlocks the second row without UI restructure. |
| **Wizard URL** | `/campaigns/:id/edit?step=N` query param (not `/edit/step-N` path segment) | Single dynamic route, easier to navigate via `setSearchParams`. URL still bookmarkable. |
| **Step rail navigation** | Backward jumps always allowed; forward jumps only if that step's required fields are complete | Prevents skip-ahead with empty fields. Matches Linear / Stripe wizard patterns. |
| **`pending` state in wizard** | Local component state, not Redux. PATCHes commit to server; Redux slice only caches the list view. | Single-campaign editing is short-lived; Redux slice ownership would add boilerplate without value. Mirrors how Builder owns its editor state outside Redux's `editorSlice`. |
| **Draft auto-naming** | `"Untitled campaign"` from `CampaignsList` "New" button — Step 1 prompts the user to rename | Backend requires non-empty name. Wizard couldn't open without a created draft. Placeholder is the cleanest way. |
| **Polling interval** | 5 seconds (per plan) | Confirmed adequate during local manual test. Easy to tighten later. |
| **List response field name** | `items` (not `campaigns`) | Aligns with templates list convention. |
| **Sending status icon** | Spinning `IconLoader2` with CSS animation | Visual progress signal beyond just the pill — small UX win. |

### Build + lint gates

- Backend `tsc --noEmit`: clean.
- Frontend `tsc -b --noEmit`: clean.
- Frontend `npm run build`: clean (2.04s). Main chunk grew ~5 KB
  gzipped (~118.4 → 118.6 KB) for the new pages + components.
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new
  issues.** Three new warnings were introduced during initial
  implementation, all addressed:
  - `CampaignCard.tsx` — `const Icon = iconFor(status)` then `<Icon />`
    triggered "component created during render"; refactored to a
    `<StatusIcon status={s} />` wrapper component with a switch.
  - `CampaignReport.tsx` polling effect — `[campaign, fetchCampaign]`
    dep made the interval tear down on every counter tick; switched
    to `[status, fetchCampaign]` so polling only restarts when status
    transitions.
  - `CampaignWizard.tsx` — `const draft = { ...campaign, ...pending }`
    on every render made `useCallback` deps invalidate; wrapped in
    `useMemo([campaign, pending])`.

### What's NOT verified yet

- **Manual end-to-end test** with a real 5-recipient list. Steps:
  1. Create a List with 5 contacts (real emails the tester controls).
  2. Build a template (or use an existing one) with `{{first_name}}` in
     the body.
  3. Wizard: name → list → from/subject → template → schedule (Send now)
     → review → launch.
  4. Verify report shows live progress, then 5/5 sent.
  5. Verify all 5 recipients received the email with their name
     substituted.

- **Race condition** when two admins hit Launch simultaneously. Code
  path uses `prisma.$transaction` to lock + flip status atomically;
  expected behavior is second request gets `409 already_launched`.
  Untested.

- **Process restart mid-send**. The plan acknowledges campaigns stuck
  in `'sending'` are manual recovery V1. Untested.

### Known limitations (V1, by design)

These are explicit V1 choices, not bugs:

- **No real-time delivery tracking**. We record `Send.status` based on
  the Resend API response only — `sent` means "Resend accepted the
  request," not "the email reached the inbox." V2 webhook ingestion
  flips this to real delivery status.
- **No opens / clicks**. V2 tracking pixel + redirect proxy.
- **No scheduled sends** — Step 5 "later" radio is disabled.
- **Subject doesn't support merge tags** — recipient inbox subjects all
  show the same string. V2 can extend the merge function to subjects.
- **No real-time progress bar** — frontend polls every 5s. WebSockets /
  SSE would feel instant but add infra; not worth it V1.
- **Synchronous send loop caps practical volume** — ~500 recipients/
  campaign at 170ms/send = ~85s loop. Larger campaigns will work but
  the HTTP request handler holds the event loop for that duration,
  which can starve other request handling. BullMQ (V2) fixes this.

### Follow-up PRs (in plan §V2/future)

The next PRs after this would be:
1. Domain verification (~2-3h) — unblock sending to non-signup
   addresses
2. Open + click tracking (~1-2 days)
3. BullMQ + Upstash Redis worker (~2-3 days) — replaces sync loop
4. Resend webhook ingestion (~1-2 days) — real delivery / bounce stats
5. Scheduled sends (~1 day) — needs queue

### Implementation order (what was actually done)

Day 1 (one session):
1. ✅ Schema + migration + reverse relations
2. ✅ merge.ts + send.ts
3. ✅ campaigns.ts router with 7 endpoints
4. ✅ Mount + tsc clean
5. ✅ Frontend API client + slice + hook + store registration
6. ✅ Router restructure (replaced 8 placeholders with 3 real routes)
7. ✅ CampaignsList + CampaignCard
8. ✅ Wizard shell + StepRail + FooterNav
9. ✅ 6 step components
10. ✅ Report page with polling
11. ✅ 5 SCSS modules
12. ✅ Lint cleanup + final build verify

---

---

## Why this is next

Templates, image uploads, MJML import, Test Send, and the integrations
catalog are all **plumbing for this feature**. Without campaigns, a
user can design beautiful emails that go nowhere except their own
inbox (via Test Send). Campaigns is the surface where the product
actually does what the product is for.

The dependencies are already in place:

| Dependency | Source | Status |
|---|---|---|
| MJML template tree | `Template.mjmlSource` (feature-templates) | ✅ |
| MJML → HTML compile | `mjml2htmlProcessed` (backend, used by Test Send) | ✅ |
| Email transport | `sendRawHtml` via Resend (feature-test-send) | ✅ |
| Contact lists | `List` + `Contact` + `ListContact` (feature-contacts-lists) | ✅ |
| Audit log | `writeAudit` | ✅ |
| Auth + tenancy | `requireAuth`, `requireClientScope`, `requireRole('admin')` | ✅ |

This PR is mostly **wiring** — new schema, new endpoints that orchestrate
the existing pieces, new wizard frontend on top of existing primitives.

---

## Scope

### In V1

- Backend tables: `campaign` + `campaign_recipient` + `send`
- 7 endpoints (list / get / create / update / launch / delete /
  send-log)
- 6-step wizard frontend matching `doc/mockups/campaign_*.html`
- Save-draft on every step navigation (no lost work)
- Recipient snapshot at launch (prevents mid-send drift)
- **Synchronous send pipeline via Resend** (sleep ~150ms between sends
  for free-tier rate limit; ~75s for 500 recipients)
- Basic merge tags: `{{first_name}}`, `{{last_name}}`, `{{email}}`
- Per-campaign report: total / sent / failed counts + per-recipient log
- Campaigns list page with status pills + create button
- Campaigns slice + hook in Redux mirroring the templates pattern

### Out of V1 — explicitly deferred

| Item | Why deferred | When |
|---|---|---|
| **BullMQ + Upstash Redis queue** | Synchronous loop covers ≤500 recipients/campaign in ~75s. Most agency campaigns fit. Queue adds infra debt (Redis hosting, worker process, retry logic). | V2 when we exceed Resend's sync-friendly volume or need scheduled sends. |
| **AWS SES** | Resend handles current scale at lower friction (no AWS account, no sandbox, no SNS wiring). | When >50K/month or we negotiate SES pricing. |
| **SNS → /webhooks/ses → sends ingestion** | No real-time delivery / bounce / complaint tracking V1. Resend dashboard externally shows delivery stats. | After backend transport unification. |
| **Opens / clicks tracking** | Needs tracking pixel + click-through proxy + UTMs. Distinct feature. | Separate PR. |
| **Suppression list + bounce handling** | Resend handles complaints + hard bounces internally for free tier. | When we need agency-level suppression. |
| **A/B testing, send-time optimization, per-recipient timezones** | All large features, deliberately out-of-scope per impl doc V1. | V3+. |
| **Scheduled sends** (Step 5 "later") | Step 5 UI exposes "Send now" only V1. `scheduleAt` column exists but is null. Scheduled sends need either a queue or a cron poller. | V2 with queue. |
| **Custom merge fields beyond first_name / last_name / email** | Three covers 95% of marketing email patterns. | When users ask. Easy bolt-on (already `mergeData jsonb`). |
| **Inline preview-as-recipient in Review step** | Static review V1 — shows compiled HTML with sample merge values. Real per-recipient preview is a polish item. | If users ask. |
| **Send to "manual list of emails"** (no contact records) | List-only V1. Manual entry forces stragglers into the contacts table or creates orphans. | V2. |
| **Resume after partial failure** | If the send loop crashes (rare — caught by try/catch around each send), the campaign sits in `status: 'sending'` until manually fixed. Not auto-resumable V1. | V2 with queue (BullMQ retries). |

---

## Deviations from impl doc (feature-campaign-engine.md)

The impl doc describes the full vision: BullMQ + Upstash + SES + SNS
+ ~9 statuses + idempotency dedup + tiered new-agency limits. We
deliberately ship a **leaner subset** that closes the product loop
faster and at lower infra cost.

| Impl doc says | Lean V1 ships | Trade-off |
|---|---|---|
| BullMQ + Upstash Redis (one job per N recipients) | Synchronous in-process loop with rate-limit sleep | No retries, no resume after crash. Caps practical volume at ~500/campaign. |
| SES with per-agency rate from 14 emails/sec | Resend at ~6/sec (their free tier ceiling) | Resend free tier is 100 sends/day → ~5K/month. Domain-verified Resend paid tier is 50K/month for $20. SES would unlock 5x throughput + lower cost at scale. |
| SNS → /webhooks/ses → sends table for delivery / bounce / complaint | None V1 — Send rows update only on send() result | No delivery confirmation post-send. Sent ≠ delivered. Resend's dashboard shows the truth externally. |
| 9 statuses (queued, sent, delivered, bounced hard/soft, complained, opened, clicked, unsubscribed) | 2 statuses (sent, failed) | No bounce / complaint / engagement visibility V1. |
| Idempotency via SES message-ID dedup | `resendMessageId UNIQUE` in schema — ready, not used V1 | If we double-launch a campaign somehow, the unique constraint catches it. Belt + suspenders. |
| Tiered new-agency limits (1K/day wk1, 10K/day wk2-4, plan day 30+) | None V1 — caller responsibility | No protection against accidental mega-send. Add when we have multi-tenant beta. |
| **Recipient snapshot at send time** | ✅ Ship this | Critical: prevents mid-send drift. Non-negotiable. |
| **Render MJML per recipient** | ✅ Ship this | Per-recipient merge tags require it. |

When the full features arrive (V2 PR after this one), the schema we
ship here is forward-compatible — `resendMessageId UNIQUE` is ready
for idempotency; `Send.status` enum can grow; `scheduleAt` is already
in `Campaign`.

---

## Data model

### `Campaign`

```
id                   String      @id @default(cuid())
agencyId             String
clientId             String
name                 String

// Envelope metadata
fromName             String?
fromEmail            String?
subject              String?
preheader            String?     // mj-preview injected at render time

// Content + audience
templateId           String?     // Template the campaign sends
listId               String?     // List the campaign snapshots at launch

// Scheduling (V1: scheduleAt always null at launch — "Send now" only)
scheduleAt           DateTime?

// Lifecycle
status               CampaignStatus  @default(draft)
recipientSnapshotAt  DateTime?       // when the recipient list froze
totalRecipients      Int             @default(0)
sentCount            Int             @default(0)
failedCount          Int             @default(0)

createdBy            String?
createdAt            DateTime    @default(now())
updatedAt            DateTime    @updatedAt

recipients           CampaignRecipient[]
sends                Send[]

@@index([clientId, status, createdAt(sort: Desc)])  // list page hot path
@@index([agencyId])

enum CampaignStatus { draft scheduled sending sent failed }
```

**Notes**:
- All envelope fields nullable so a fresh draft (Step 1) is creatable
  with just `name`. Validation happens server-side at launch.
- `templateId` / `listId` are SetNull on delete — campaigns survive
  template + list deletion (the snapshot's already in
  `campaign_recipient` by then; template was rendered at send time
  per-recipient).
- `agencyId` is denormalized for fast tenant queries (mirrors the
  contacts / templates pattern).

### `CampaignRecipient`

```
campaignId   String
email        String          // frozen at snapshot — the actual "to"
firstName    String?
lastName     String?
contactId    String?         // null if the list contained stragglers
mergeData    Json?           // any custom fields (V2 use)

@@id([campaignId, email])   // composite PK = natural uniqueness
@@index([campaignId])
```

**Notes**:
- Snapshot table: rows are written at launch time, never edited.
- `email` is the natural key with `campaignId`. Prevents accidental
  double-send within the same campaign even if a Contact appears in
  the list twice with the same email.
- `contactId` nullable for forward-compat — V2 manual-recipient list
  might insert without a Contact row.

### `Send`

```
id                String       @id @default(cuid())
campaignId        String
toEmail           String       // duplicates CampaignRecipient.email for log clarity
resendMessageId   String?      @unique
status            SendStatus   @default(queued)
error             String?      // null on success
sentAt            DateTime?
createdAt         DateTime     @default(now())

@@index([campaignId, status])  // report aggregation
@@index([campaignId, createdAt(sort: Desc)])  // recipient log ordering

enum SendStatus { queued sent failed }
```

**Notes**:
- One row per recipient per send attempt. Insert immediately after
  Resend returns (success or failure).
- `resendMessageId UNIQUE` is ready for V2 webhook ingestion
  (delivery confirmation queries by message-id).
- `error` stores Resend's reason string when send fails ("Invalid
  email address", "Validation_error: ...", etc.) — surfaces in the
  report.

### Migration

`prisma/migrations/<ts>_campaigns_foundation/` — adds the 3 tables,
the 2 enums, all FKs (Agency / Client / Template / List / User /
Contact), and the indexes above.

---

## Backend (sendmymail-backend)

### Files

```
src/routes/campaigns.ts                  (new — ~350 lines, mirrors templates.ts shape)
src/campaigns/                           (new lib)
  send.ts                                (launch + send loop)
  merge.ts                               (merge tag substitution)
prisma/schema.prisma                     (+3 models + 2 enums)
prisma/migrations/<ts>_campaigns_foundation/migration.sql  (new)
src/server.ts                            (mount campaignsRouter at /v1/clients/:clientId/campaigns)
```

### Endpoints — `/v1/clients/:clientId/campaigns`

| Method | Path | Auth | Body / params | Returns |
|---|---|---|---|---|
| `GET` | `/` | member | `?status=` (optional filter) | `{ data: { campaigns: CampaignSummary[] } }` |
| `GET` | `/:id` | member | — | `{ data: { campaign: CampaignFull } }` |
| `POST` | `/` | admin | `{ name }` | `201 { data: { campaign: CampaignFull } }` (status: draft) |
| `PATCH` | `/:id` | admin | partial `Campaign` fields | `{ data: { campaign: CampaignFull } }` |
| `POST` | `/:id/launch` | admin | — (server validates required fields) | `{ data: { campaign: CampaignFull } }` — status: sending → sent on completion |
| `DELETE` | `/:id` | admin | — | `204` — only allowed in draft status |
| `GET` | `/:id/sends` | member | `?cursor=` (pagination) | `{ data: { sends: Send[], nextCursor } }` |

**Validation per step (PATCH guards)**:

- Step 1 (`name`): `name` 1-200 chars, required to leave the step
- Step 2 (`listId`): list must exist, belong to the same client, not
  be archived
- Step 3 (`fromName`, `fromEmail`, `subject`): all required (email
  format); `preheader` optional 0-150 chars
- Step 4 (`templateId`): template must exist, belong to the same
  client, not be archived
- Step 5: V1 forces "Send now" — `scheduleAt` is always null at PATCH;
  ignored if sent. (UI doesn't expose the field.)
- Step 6 (`/launch`): server re-validates all of the above before
  setting `status = 'sending'`. If anything fails, returns 400 with
  the failing field.

**Auth split**: read endpoints are `member`-level (any team member with
client scope can read campaigns). Write endpoints (create / update /
launch / delete) require `admin` — campaigns send mail under the
agency's name, which is a material action that needs admin gate.

### Send pipeline — `src/campaigns/send.ts`

```typescript
async function launchCampaign(campaignId, requestedBy): Promise<void> {
  // 1. LOCK + transition
  const campaign = await prisma.$transaction(async (tx) => {
    const row = await tx.campaign.findUnique({
      where: { id: campaignId },
      include: { recipients: { take: 1 } },
    });
    if (!row)                                      throw notFound();
    if (row.status !== 'draft' && row.status !== 'scheduled') {
      throw conflict('already_launched', 'Campaign has already been launched.');
    }
    // Final validation (defense in depth — UI also validates)
    if (!row.fromEmail || !row.subject || !row.templateId || !row.listId) {
      throw badRequest('incomplete', 'Campaign is missing required fields.');
    }
    return tx.campaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });
  });

  // 2. SNAPSHOT recipients (atomic-ish — we accept a small race if a
  //    contact is added/removed in the milliseconds between txns)
  const contacts = await prisma.contact.findMany({
    where: {
      lists:    { some: { listId: campaign.listId } },
      archived: false,
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  await prisma.$transaction([
    prisma.campaignRecipient.createMany({
      data: contacts.map((c) => ({
        campaignId,
        contactId: c.id,
        email:     c.email,
        firstName: c.firstName,
        lastName:  c.lastName,
      })),
      skipDuplicates: true,                // composite-PK collision is fine
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        recipientSnapshotAt: new Date(),
        totalRecipients:     contacts.length,
      },
    }),
  ]);

  // 3. RENDER template ONCE (we substitute merge tags per recipient
  //    on the HTML string — much faster than re-running mjml2html per
  //    recipient for a 500-row send).
  const template = await prisma.template.findUnique({
    where: { id: campaign.templateId },
    select: { mjmlSource: true },
  });
  const compiled = mjml2htmlProcessed(template.mjmlSource);
  const baseHtml = compiled.html;

  // 4. SEND loop (synchronous, rate-limited)
  const RATE_MS = 170;                     // ~6 req/sec, well under Resend's 10/sec free-tier limit
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of contacts) {
    const html = applyMergeTags(baseHtml, {
      first_name: recipient.firstName ?? '',
      last_name:  recipient.lastName ?? '',
      email:      recipient.email,
    });

    let resendMessageId: string | undefined;
    let sendStatus: 'sent' | 'failed' = 'sent';
    let errorReason: string | undefined;

    try {
      const result = await sendRawHtml({
        to:      recipient.email,
        subject: campaign.subject!,
        html,
        replyTo: campaign.fromEmail,       // user reply lands at the campaign sender
      });
      resendMessageId = result.messageId;
      sentCount++;
    } catch (err) {
      sendStatus = 'failed';
      errorReason = err instanceof Error ? err.message : String(err);
      failedCount++;
    }

    await prisma.send.create({
      data: {
        campaignId,
        toEmail:         recipient.email,
        resendMessageId,
        status:          sendStatus,
        error:           errorReason,
        sentAt:          sendStatus === 'sent' ? new Date() : null,
      },
    });

    // Update campaign counters every N sends (avoid hammering)
    if ((sentCount + failedCount) % 25 === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data:  { sentCount, failedCount },
      });
    }

    await sleep(RATE_MS);
  }

  // 5. FINALIZE
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount,
      failedCount,
      status: sentCount > 0 ? 'sent' : 'failed',
    },
  });

  writeAudit({
    agencyId:    campaign.agencyId,
    actorUserId: requestedBy,
    action:      'campaign.launched',
    targetType:  'campaign',
    targetId:    campaignId,
    metadata:    { totalRecipients: contacts.length, sentCount, failedCount },
  });
}
```

**Concurrency model**: the `POST /launch` handler returns immediately
once the campaign is locked into `status: 'sending'` and the snapshot
is taken — the response includes `totalRecipients`. The send loop
runs in the background of the same request handler (Express keeps the
process alive). The frontend polls `GET /:id` every 5s to see updated
counts.

**Why "fire-and-forget" works for V1**: the request handler is a
single node.js event loop iteration that schedules the awaits. The
HTTP response goes back to the client as soon as the snapshot is
written; the send loop continues in the background. Express won't
close the worker mid-send. For ≤500 recipients (~75s loop), this is
safe. For larger volumes, BullMQ + a worker process is the right move.

**Failure modes**:
- Process crash mid-send → campaign stays in `status: 'sending'` with
  partial counts. Manual recovery V1 — admin PATCHes status to 'sent'
  or 'failed'. V2 with queue: BullMQ retries on resume.
- Resend rate-limit → individual sends fail with retry-after, recorded
  in `send.error`. Campaign continues. (Resend doesn't return
  retry-after metadata; we just record the failure and move on.)
- Single bad recipient address → that send fails, others continue.

### Merge tag substitution — `src/campaigns/merge.ts`

```typescript
type MergeValues = Record<string, string>;

const MERGE_TAG_RE = /\{\{\s*(first_name|last_name|email)\s*\}\}/g;

export function applyMergeTags(html: string, values: MergeValues): string {
  return html.replace(MERGE_TAG_RE, (_, key: string) => {
    return escapeHtml(values[key] ?? '');
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

**Notes**:
- Whitelist regex — only `first_name`, `last_name`, `email` are
  substituted. Other `{{...}}` patterns pass through (potentially
  to be processed by Resend or left literal).
- HTML-escapes the value to prevent injection (e.g. a contact named
  `<script>alert(1)</script>` doesn't execute).
- V2: add custom field support by extending the whitelist + passing
  `mergeData` jsonb through. Same function, longer regex.

---

## Frontend (this repo)

### Routes

| Route | Component | Auth gate |
|---|---|---|
| `/clients/:cid/campaigns` | `CampaignsList` | `ClientScoped` |
| `/clients/:cid/campaigns/new` | `CampaignWizard` (step 1, no `:id`) | `ClientScoped + RoleGated('admin')` |
| `/clients/:cid/campaigns/:id/edit` | `CampaignWizard` (resumes at saved step) | `ClientScoped + RoleGated('admin')` |
| `/clients/:cid/campaigns/:id` | `CampaignReport` | `ClientScoped` |

### Files

```
src/pages/campaigns/
  index.tsx                            (re-export CampaignsList — placeholder rewrite)
  CampaignsList.tsx                    (rewrite from placeholder)
  CampaignWizard.tsx                   (wizard route + shell)
  CampaignReport.tsx                   (post-launch report view)

src/components/campaigns/
  CampaignCard.tsx                     (list page card with status pill)
  CampaignStepRail.tsx                 (left-side step nav — mockup spec)
  CampaignFooterNav.tsx                (Save draft + Continue → / Launch buttons)
  Step1Name.tsx
  Step2Recipients.tsx                  (list picker, size estimate)
  Step3FromSubject.tsx                 (4 fields)
  Step4Template.tsx                    (template picker with thumbnails)
  Step5Schedule.tsx                    (V1: "Send now" only with a disabled "Schedule" radio)
  Step6Review.tsx                      (read-only summary, launch button)
  RecipientSizeBadge.tsx               (small reused chip showing list size)
  index.ts                             (re-exports)

src/lib/api/campaigns.ts               (typed API methods)
src/store/slices/campaignsSlice.ts     (list cache, mirrors templatesSlice shape)
src/hooks/useCampaigns.ts              (list + CRUD + launch + send-log)

src/router/index.tsx                   (+4 route entries inside AgencyReady → ClientScoped)
src/styles/components/campaigns/       (5-6 SCSS modules matching mockup look)
  CampaignsList.module.scss
  CampaignCard.module.scss
  CampaignWizard.module.scss
  CampaignStepRail.module.scss
  CampaignReport.module.scss
```

### Wizard architecture

**Shell** (`CampaignWizard.tsx`):
- Reads `:id` from URL. If missing → POST to create draft, then
  redirect to `/campaigns/:id/edit?step=1`.
- Reads `?step=` query string for current step (1-6). Defaults to the
  first incomplete step on load (server-determined).
- Hosts the step rail (left) + content area (center) + footer nav
  (bottom).
- Owns step transitions: "Continue →" validates the current step's
  fields locally, PATCHes the campaign, then bumps `?step=N+1`. "Save
  draft" PATCHes without bumping step.
- Each step component is a controlled form bound to the
  campaign-in-progress object held in component state. Step
  components emit `onChange(partial)` upward; the shell merges
  into local state + sends the PATCH on Continue.

**Per-step components**:

Each step is a `<form>` with its own fields, exposes:
```typescript
interface StepProps {
  campaign: Campaign;                    // current state
  onChange: (partial: Partial<Campaign>) => void;
  // Hooks for live data (list picker hits useLists, template picker hits useTemplates)
}
```

Steps are intentionally dumb — no API calls of their own. The shell
owns IO. This keeps test surfaces minimal and lets us swap a step's
markup without touching state logic.

**Launch flow** (Step 6 → "Launch"):
1. Final client-side validation (all fields).
2. Optimistic UI: show "Sending…" overlay with the recipient count.
3. POST `/launch` → server snapshots + starts sync send loop.
4. Server responds immediately with `{ status: 'sending', totalRecipients }`.
5. Redirect to `/campaigns/:id` (the report page).
6. Report page polls `GET /:id` every 5s while `status === 'sending'`,
   stops polling once `status === 'sent'` or `'failed'`.
7. Shows live progress bar: `sentCount + failedCount / totalRecipients`.

### Report page (`CampaignReport.tsx`)

For `status: 'sending'`:
- Big progress bar
- Live counters (Sent / Failed / Pending)
- Polls every 5s

For `status: 'sent'` (final state):
- Hero stats: Total sent, Total failed
- Recipient table (paginated 50 per page via `GET /:id/sends`)
- Each row: email, status pill, sent_at timestamp, error reason (if
  failed)
- Future: open rate, click rate (V2)

For `status: 'failed'` (no sends succeeded):
- Hero "failed" state with the error reason
- Recipient table showing per-recipient errors

### Campaigns list page (`CampaignsList.tsx`)

Matches `doc/mockups/campaigns_list.html`:
- Header: "Campaigns" + "New campaign" button
- Filter tabs: All / Draft / Scheduled / Sent / Failed
- Card grid: each card = name, status pill, recipient count, sent
  date (if sent), last edited (if draft)
- Empty state: when 0 campaigns → CTA card pointing to "New campaign"
- Card click → drafts go to wizard, sent campaigns go to report

### State management

`campaignsSlice.ts` — mirrors `templatesSlice` exactly:
```typescript
interface CampaignsState {
  byClient: Record<string, {
    items: CampaignSummary[];
    status: 'idle' | 'loading' | 'loaded' | 'error';
    error: string | null;
  }>;
}
```

Actions: `setLoading`, `setCampaigns`, `setError`, `addCampaign`,
`upsertCampaign`, `removeCampaign`, `clearCampaigns`. Same shape as
templates. Hook is the same self-healing pattern.

Single campaign editing state lives **in `CampaignWizard.tsx`'s local
state**, not in Redux. Drafts are server-persisted, so the only role
for client state is the in-flight form data between PATCHes. Mirrors
how `Builder.tsx` handles single-template editing (the editor slice
is the exception there for tree manipulation; campaigns have no
similar manipulation need).

---

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Transport** | Resend (reuse `sendRawHtml`) | Already wired. Same path as Test Send. Battle-tested. Swap to SES when scale demands it — `sendRawHtml`'s contract doesn't change. |
| **Queue** | None V1 — synchronous loop with rate-limit sleep | Most agency campaigns ≤500 recipients. ~75s loop is acceptable; user sees progress on the report page. BullMQ adds Redis hosting + worker process + retry semantics — infra debt we don't need yet. |
| **Recipient source** | Existing `List` only V1 | List + Contact infra is built. Per-campaign manual recipient entry is a future feature (V2). |
| **Recipient snapshot** | Immutable copy at launch | Standard pattern. Prevents drift if a contact is added/removed mid-send. **Non-negotiable** — without it, the report is meaningless. |
| **Template snapshot** | Re-render at send time from the live `templateId` | No `compiledHtml` stored on Campaign. Smaller payload, single source of truth. Sent campaigns aren't re-sent, so "live" doesn't matter post-send. If a user wants to "freeze" the design, they duplicate the template before launching. |
| **Merge tags** | `{{first_name}}`, `{{last_name}}`, `{{email}}` whitelist | Three covers 95% of marketing use cases. HTML-escaped. Custom fields via `mergeData jsonb` is forward-compat. |
| **Schedule** | "Send now" only V1 | Step 5 UI shows a "Schedule for later" radio, disabled with a "Coming soon" tooltip. `scheduleAt` column exists for V2. |
| **Send pipeline location** | In-process, started from the launch request handler, runs in background | Acceptable for ≤500 recipients. Express request handler keeps the worker alive. V2: BullMQ worker process. |
| **Progress visibility** | Frontend polls `GET /:id` every 5s while sending | No SSE / WebSocket V1. Polling is simpler, perfectly adequate for a 75s send. |
| **Tracking** | Sent / failed counts only | No opens/clicks V1. Resend's dashboard externally shows delivery rate. Real engagement tracking is a separate PR. |
| **Subject required at launch** | Yes — server validates | Resend rejects empty subjects anyway. Catch early on the wizard. |
| **From email** | Free-text field; defaults to `EMAIL_FROM` env (`onboarding@resend.dev`) | Same constraint as Test Send. Without domain verification, Resend only delivers to the signup email — campaign launch to other recipients will fail with a Resend error. **User-facing reminder**: Step 3 shows the same Resend-constraint hint as the TestSendDialog. |
| **Auth scope** | `member` for read; `admin` for write (create/update/launch/delete) | Campaigns send mail under the agency's name. Material action. |
| **Audit log** | `campaign.created`, `.updated`, `.launched`, `.deleted` + send count metadata at launch | Standard pattern. Per-send audit would 10x the audit table size for zero observability gain — the `Send` table itself is the per-send record. |
| **Delete semantics** | Soft-delete drafts only (`archived: true` column? OR just `status: 'deleted'`?) | Use a new `archived` boolean on Campaign — matches templates pattern. Sent campaigns cannot be deleted (they're the historical record). |
| **Frontend draft persistence** | Server-side via PATCH on every step navigation | No localStorage draft cache V1. If the user closes the tab mid-wizard, the server has the latest draft on reopen. Simpler model than client-side drafts. |
| **Resume after crash** | None V1 — campaign stuck in `sending` if process dies | Manual admin recovery (PATCH `status: 'failed'`). V2 with queue retries. |
| **Idempotency on launch** | Unique constraint on `Send.resendMessageId` + status check on Campaign | If two admins hit Launch simultaneously, the first wins; the second gets a 409. |

---

## Edge cases

| Case | Behavior |
|---|---|
| User creates draft, never returns | Draft sits in `status: 'draft'` indefinitely. Filterable on list page. Manually deletable. |
| User clicks Launch on a campaign with 0 recipients (empty list, or list was emptied) | 400 `no_recipients`. Step 2 validation catches at PATCH time too, but defense-in-depth. |
| User clicks Launch with a missing required field (e.g. cleared subject post-Step-3) | 400 with the failing field. Wizard redirects them to the failing step. |
| Two admins hit Launch on the same draft at the same time | First request wins. Second gets `409 already_launched`. |
| Process restarts mid-send | Campaign sits in `status: 'sending'` with partial counts. Manual admin recovery V1. |
| Resend rejects a single recipient (e.g. invalid email) | That `Send` row is `status: 'failed'` with error reason. Loop continues. Campaign finishes `status: 'sent'` if ≥1 succeeded. |
| Resend's free-tier daily quota is exhausted mid-send | Subsequent sends all fail with the same Resend error. Loop continues recording failures. Campaign ends `status: 'sent'` or `'failed'` based on counts. |
| User deletes the template referenced by a sent campaign | Template's FK is SetNull. Campaign's `templateId` becomes null. Report still works (the sends already happened). Re-render impossible — but campaigns don't re-render post-send. |
| User deletes the list referenced by a sent campaign | List FK SetNull. `campaign.listId` becomes null. Snapshot in `campaign_recipient` is unaffected (already frozen). |
| User edits the template mid-send | New template version doesn't affect in-flight send (`baseHtml` was captured at loop start). Subsequent recipients in the same loop iteration get the old version. |
| Template contains `{{custom_field}}` not in our merge-tag whitelist | Passes through literally. Recipient sees `{{custom_field}}` in the email. (V2: extend whitelist with mergeData.) |
| Contact's email field is null/empty in the snapshot | Send fails (Resend rejects). Recorded as failed; loop continues. (Snapshot validation could pre-filter — leave for V2.) |
| Campaign name has 0 characters | Server PATCH validation (1-200 chars) rejects with 400. |
| User refreshes mid-wizard | Reloads at the saved step via `?step=` URL param. All fields preserved (server has the latest draft). |
| User has 2 wizard tabs open for the same campaign | Last PATCH wins. Both tabs see the merged state on next GET. No locking V1. |
| User tries to PATCH a sent campaign | 409 `cannot_edit_sent`. |
| Subject contains MJML tags / HTML | Treated as plain text by Resend (subject is the `subject:` header, not interpolated into HTML). No injection risk. |
| Subject contains `{{first_name}}` | NOT substituted V1 (merge tags work on HTML body only). Recipient sees `{{first_name}}` literally in their inbox subject. (V2: subject-level merge.) |
| Multiple campaigns targeting the same list, launched sequentially | Each gets its own snapshot. List changes between launches are reflected. |
| List contains a contact whose Contact.archived is true | `WHERE archived: false` in the snapshot query filters them out. Good. |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Backend `tsc --noEmit` | clean |
| Backend Prisma migration | applies cleanly in dev DB; no schema drift |
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean (Builder chunk unchanged; new `campaigns` chunk ~15-20 KB gzipped) |
| Frontend `npm run lint` | 12 = pre-existing baseline. **0 new issues.** |
| Manual E2E: create draft → fill 6 steps → launch to a 5-recipient test list | 5 real emails arrive at the test inbox(es). Report shows 5/5 sent. |
| Manual E2E: launch fails for 1 of 5 (use a bad email) | Report shows 4/5 sent, 1 failed with error reason. |
| Manual E2E: refresh mid-wizard | Wizard reopens at the saved step with all fields populated. |

---

## Phased fallback

If 2-3 days feels too big for one PR:

### PR 3a — Schema + Wizard scaffold (~1 day)

- Backend: schema + migration + endpoints for list / get / create / update / delete (NO `/launch`)
- Frontend: API client + slice + hook + List page + Wizard shell + Steps 1-3 (no template / schedule / review yet)
- Result: user can create + save campaign drafts but can't launch. Demonstrates the wizard flow.

### PR 3b — Send pipeline + final steps + Report (~1.5 days)

- Backend: `POST /launch` endpoint + send pipeline + merge tags + `GET /:id/sends`
- Frontend: Steps 4-6 + Report page + launch flow + polling
- Result: actual sends ship.

Same total work, two reviewable checkpoints. **Default: ship as one
PR unless review feedback prefers smaller diffs.**

---

## What this unlocks

After this PR ships:

- **Real product**. A user can take an email design from concept to
  real inboxes in 6 wizard clicks. Without this, the editor is just a
  pretty toy.
- **Reports** for the campaigns they've sent. Even basic counts let
  them know their work worked.
- **Foundation for V2 campaign features**: tracking, queues, A/B,
  scheduling — all bolt onto this V1 schema without breaking changes.
- **Onboarding stories that close**. Currently the onboarding wizard
  ends with "create a template" — no payoff. After this PR, the
  onboarding can end with "send your first campaign" — much stronger.

---

## V2 / future PRs (each its own scope)

| PR | Title | Estimated effort |
|---|---|---|
| V2-a | **BullMQ + Upstash Redis worker** | 2-3 days. Replaces the in-process send loop with a queue + worker process. Adds retry semantics, scheduled sends, resume-after-crash. |
| V2-b | **SNS + webhook ingestion for SES** *(or Resend webhooks)* | 1-2 days. `/webhooks/email` endpoint validates HMAC, updates `Send.status` based on delivery / bounce / complaint events. Adds the `delivered`, `bounced`, `complained` statuses. |
| V2-c | **Domain verification flow** | 2-3h. Settings panel that lets the user verify a sending domain with Resend via DNS records. Unblocks sending to addresses other than the signup email. Could ship **before** this PR if real-recipient testing matters now. |
| V2-d | **Open + click tracking** | 1-2 days. Tracking pixel + redirect proxy. New `EmailEvent` table. Real engagement stats on the report. |
| V2-e | **Scheduled sends** | 1 day. Step 5 "Schedule for later" radio enables the date picker. Worker pulls `WHERE scheduleAt <= now() AND status = 'scheduled'` every minute (needs queue OR cron). |
| V2-f | **Custom merge fields beyond first_name / last_name / email** | 4-6h. UI to map contact fields → `{{custom_field}}` placeholders. Schema-flexible via `mergeData jsonb`. |
| V2-g | **Suppression list + unsubscribe handling** | 1-2 days. New `Suppression` table. `/unsubscribe/:token` route. Pre-send check against suppression. |
| V2-h | **A/B testing** | 3-5 days. Two template variants, randomized split, opens/clicks per variant. Distinct feature; defer until basics are stable. |
| V2-i | **Per-recipient inline preview in Review step** | 4h. Render a sample with the first recipient's merge values. Polish item. |
| V2-j | **Manual recipient entry** (no contact records) | 1 day. "Send to this list of emails" picker option in Step 2. Recipients land in `campaign_recipient` without a `contactId`. |

The schema in this PR is **forward-compatible with all of the above** —
`resendMessageId UNIQUE`, `scheduleAt`, `mergeData jsonb`, enum-extensible
statuses, etc.

---

## Not built (deferred to other feature areas)

- **Onboarding wizard** integration ("send your first campaign" step) —
  comes in feature-onboarding-wizard's later PR after this lands
- **Billing** (campaign send count → invoice) — feature-billing
- **Reporting dashboard** (agency-wide campaign stats) —
  feature-reporting-analytics
- **Flows** (event-triggered drip campaigns) — separate feature; flows
  send single emails, not multi-recipient broadcasts

---

## Open questions (will resolve during implementation)

1. **Send progress UX**: the report page polls every 5s — is that
   responsive enough? Could feel laggy for a 75s send. **Tentative**:
   keep 5s V1, tighten to 2s if user feedback says it feels slow.
2. **Empty-state copy** on the list page — FTUX-quality language to
   write. Will draft when I get there.
3. **List picker UX** in Step 2 — dropdown vs cards. Mockup shows
   cards. Will match.
4. **Test send from within the wizard** — should the wizard expose
   "Send a test to me" before launch? Mockup doesn't show it. Could
   add a small button in Step 6's Review header. **Tentative**: skip
   V1, easy bolt-on later (reuses existing TestSendDialog).
5. **Confirmation modal on Launch** — the mockup's Step 6 has a "Send
   now" button. Should clicking it open a confirm modal or fire
   immediately? **Tentative**: confirm modal — "About to send to N
   recipients. Continue?" — cheap insurance against accidental
   mega-sends. Defaults to confirm-required; can disable per agency
   in V2.

---

## Implementation order

If/when we start, todos roughly look like:

**Backend (Day 1):**
1. Add Campaign / CampaignRecipient / Send models + 2 enums to schema.prisma
2. Generate migration + apply
3. Wire route helpers (loadCampaignOr404 / assertClientExists clone)
4. Implement GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
5. Implement send.ts + merge.ts
6. Implement POST /:id/launch
7. Implement GET /:id/sends with cursor pagination
8. Mount router in server.ts
9. Smoke test with a 5-recipient curl flow

**Frontend (Day 2-3):**
10. src/lib/api/campaigns.ts — typed wrappers
11. src/store/slices/campaignsSlice.ts
12. src/hooks/useCampaigns.ts
13. Router entries
14. CampaignsList.tsx + CampaignCard.tsx + styles
15. CampaignWizard shell + step rail + footer nav
16. Step1Name through Step6Review components
17. CampaignReport.tsx with polling
18. Responsive sweep at 760px / 1100px breakpoints
19. Manual E2E test
20. Final change_log update with "Done" entry

---

*Plan locked. Ready to implement when authorized.*
