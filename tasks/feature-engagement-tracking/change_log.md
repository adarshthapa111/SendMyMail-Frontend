# Feature: Engagement tracking — change log

> Open + click tracking for sent campaigns. Turns the report page from
> "we sent X, failed Y" into real engagement metrics (open rate, click
> rate, top URLs) that match what users expect from Mailchimp / Klaviyo.
>
> References:
> - [tasks/feature-campaigns/change_log.md](../feature-campaigns/change_log.md)
>   — the campaign infrastructure this builds on
> - [tasks/feature-send-hardening/change_log.md](../feature-send-hardening/change_log.md)
>   — the send pipeline + Send table this hooks into
> - [doc/architecture/api-conventions.md](../../doc/architecture/api-conventions.md)
>   — error shapes + auth conventions

---

## Status: ✅ Done — V1 shipped

Plan proposed 1-2 days; implemented in one focused pass. Backend +
frontend + change_log Done entry. Manual E2E test pending (requires
public-internet-reachable backend + real Gmail open with images on).

### What landed (file-by-file)

**Backend (sendmymail-backend)**:

- `prisma/schema.prisma` — 1 new enum (`EmailEventType`), 1 new model
  (`EmailEvent`), 4 new aggregate columns on `Send`
  (`openCount`, `clickCount`, `firstOpenedAt`, `lastClickedAt`), 1
  reverse relation on `Send`.
- `prisma/migrations/20260607063049_engagement_tracking/migration.sql`
  — 1 new table + enum + 4 added columns + 2 indexes + 1 FK.
- `src/lib/tracking-token.ts` (new, ~95 lines) — HMAC-SHA256 sign +
  verify of two payload shapes: `{ t: 'o', sendId }` (opens) and
  `{ t: 'c', sendId, url }` (clicks). 1-char `t` prefix prevents
  cross-domain replay. Constant-time signature comparison. Reuses
  `JWT_SECRET`. No expiry.
- `src/campaigns/html-tracking.ts` (new, ~85 lines) —
  `injectTracking(html, sendId)`. Two transformations:
  1. Rewrite every `<a href="X">` → `<a href="${APP_URL}/e/c/{token}">`,
     skipping `mailto:` / `tel:` / `#fragment` / `javascript:` / `data:`
     hrefs + already-rewritten links pointing at our domain.
  2. Inject a 1×1 transparent tracking pixel before `</body>` (or at
     the end if no `</body>` tag).
  Idempotent — detects already-rewritten links via APP_URL substring.
  HTML entity decoder for href values (`&amp;` → `&` before signing) so
  recipients land at the URL the template author wrote.
- `src/routes/tracking.ts` (new, ~140 lines) — 2 public endpoints
  mounted at `/e`:
  - `GET /e/o/:token` — verify HMAC → INSERT EmailEvent (type: open) +
    `updateMany` Send (where firstOpenedAt is null) — ensures we only
    increment Send.openCount on the FIRST open. Always returns the
    pixel (even on invalid token) so email scanners don't flag the
    URL as broken. `no-store` cache headers to keep repeat opens
    firing repeat requests.
  - `GET /e/c/:token` — verify HMAC → check if URL clicked before →
    INSERT EmailEvent (type: click, url) → conditionally increment
    Send.clickCount (only on first click of THIS URL on THIS Send) +
    set lastClickedAt + opportunistically set firstOpenedAt (a click
    without prior image-load still counts as engagement). 302
    redirect to original URL. Returns **404 on invalid token** —
    prevents open-redirect abuse via crafted phishing URLs.
- `src/server.ts` — mounts the tracking router at `/e` (public, root-mounted
  for short URLs in email body).
- `src/campaigns/send.ts` (restructure) — flipped the per-recipient
  ordering:
  - **Before:** apply merge → sendRawHtml → INSERT Send
  - **After:**  apply merge → INSERT Send (status: queued) →
    `injectTracking(html, sendRow.id)` → sendRawHtml → UPDATE Send
    (status + messageId + sentAt)
  The `SendStatus.queued` enum value (reserved in schema but unused V1)
  is now the legitimate intermediate state. Pre-launch suppression
  filter still creates a `failed` Send row directly without a queued
  intermediate (no Resend call to track).
- `src/routes/campaigns.ts` — extended `GET /:id` with a
  `computeEngagement(campaignId, sentCount)` helper that builds:
  - `uniqueOpens`  — count of Sends where `firstOpenedAt IS NOT NULL`
  - `uniqueClicks` — count of Sends where `clickCount > 0`
  - `openRate`     — uniqueOpens / sentCount (null if sentCount is 0)
  - `clickRate`    — uniqueClicks / sentCount
  - `topLinks`     — `prisma.emailEvent.groupBy` on url, ordered by
    `_count.id desc`, limit 10. Skipped entirely when `uniqueClicks === 0`.
  Drafts short-circuit (no Sends exist; return zeros).

**Frontend (this repo)**:

- `src/lib/api/campaigns.ts` — `Campaign` interface extended with
  `uniqueOpens`, `uniqueClicks`, `openRate`, `clickRate`, `topLinks`.
  `SendLogEntry` extended with `openCount`, `clickCount`,
  `firstOpenedAt`, `lastClickedAt`.
- `src/pages/campaigns/CampaignReport.tsx`:
  - Stats hero went from 3 cards (Sent / Failed / Total) → 4 cards
    (Sent / Opened / Clicked / Failed). Each engagement card shows a
    subtitle with the rate (`68.6%`). When a campaign has 0 opens, the
    subtitle is em-dash, not `0.0%`.
  - New "Top links" section rendered when `topLinks.length > 0`.
    Numbered rank + truncated monospace URL + click count. URLs open
    in new tab with `rel="noopener noreferrer"`.
  - Recipient log rows now render two new pills:
    - **Opened** pill (primary-tint) when `firstOpenedAt` is set; shows
      `×N` suffix when openCount > 1
    - **Clicked** pill (green-tint) when `clickCount > 0`; same
      `×N` suffix
    - Title attributes show timestamp on hover (`First opened …`)
  - Row layout converted from CSS grid (fixed 4 columns) to flexbox
    wrap to accommodate the variable-count pills cleanly.
- `src/styles/components/campaigns/CampaignReport.module.scss` —
  added `.statCard_engaged` tone, `.statSubtitle`, full
  `.topLinksSection` block, `.logPill` + `.logPill_opened` +
  `.logPill_clicked`. Restructured `.logRow` to flexbox.
- `tasks/feature-engagement-tracking/change_log.md` — Done entry +
  rationale below.

### Decisions that came up during implementation (vs plan)

| Decision | What | Why |
|---|---|---|
| **CampaignCard sent variant deferred** | Plan said "card surface shows open rate"; deferred to V2 | Would require per-campaign aggregation on the LIST endpoint (currently each card just reads CampaignSummary which has sentCount but not openCount). Adding it means N+1 queries on the list page OR a new `Campaign.uniqueOpens` aggregate column maintained at tracking time. Both add scope. Report page surfaces the engagement clearly; card-level can be a clean V2 follow-up. |
| **Click event also marks open** | Track endpoint atomically increments openCount when a click arrives without prior firstOpenedAt | A recipient with images-off who still clicks IS engaged. Otherwise we under-count opens. Industry-standard behavior. |
| **404 on invalid click token** | Plan said "redirect to root or 404"; chose 404 | Don't want anyone using us as an open redirect for phishing. Pixel endpoint still ALWAYS returns the pixel (different threat model — invalid pixel tokens are just typos, not malicious redirect targets). |
| **Token format: 1-char prefix discriminator** | `{ t: 'o' | 'c', sendId, url? }` instead of two completely separate signing functions | Single sign/verify pair internally; cleaner code. The `t` field is in the signed payload so cross-replay (using an open token as a click token) fails signature check. |
| **HTML entity decoding for hrefs** | href="...?a=1&amp;b=2" → decoded to ...?a=1&b=2 BEFORE signing | Recipients should land at the URL the template author wrote. If we signed the encoded version, they'd land at a different URL than intended. |
| **Stats hero: 4 columns, not 5** | Dropped "Total" stat card | Sent + Failed = Total. Showing all three is redundant. Engagement (Opened / Clicked) is what users actually want. |
| **Engaged tone color = primary** | Used `var(--color-primary)` (terra) for opened/clicked card highlights | Distinct from green (Sent ok) and red (Failed bad). Makes engagement read as "this is the thing to track" without competing with status. |
| **Pill `×N` multiplier** | "Opened ×3" instead of separate count column | Inline + scannable. Most recipients open once (no multiplier shown); the few who refresh many times get the visible count. |
| **logRow layout: grid → flexbox** | Plan didn't account for variable-count pills changing column requirements | Flexbox wrap handles 0-2 pills cleanly without column-count guessing. |

### Build + lint gates

- Backend `tsc --noEmit`: **clean**
- Backend Prisma migration `20260607063049_engagement_tracking`: applied
- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.22s). Main chunk +0.01 KB gzipped
  (essentially unchanged — frontend changes are all SCSS + small JSX).
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

### What's NOT verified yet

**Manual end-to-end test pending** — requires the backend to be reachable
from the public internet so the tracking pixel in emails can actually
hit it. Local dev needs `ngrok` or similar (or temporarily set
`APP_URL` to a deployed staging URL during testing).

E2E sequence:
1. Set `APP_URL` to a public-internet-reachable URL (or ngrok forward).
2. Launch a campaign with verified domain to a real Gmail inbox.
3. View HTML source of received email; confirm:
   - All `<a href>` rewritten to `${APP_URL}/e/c/{token}`
   - 1×1 pixel `<img>` before `</body>` pointing at `${APP_URL}/e/o/{token}`
4. Open email with images enabled → /e/o/:token fires → `Send.openCount = 1`,
   `firstOpenedAt` populated → refresh report page → see "1 Opened".
5. Refresh email tab; /e/o/:token fires again → new EmailEvent row but
   `Send.openCount` stays 1.
6. Click any link → 302 redirect to real URL → `Send.clickCount = 1`,
   `lastClickedAt` populated → see "Clicked" pill on per-recipient row.
7. Click same link again → `Send.clickCount` stays 1.
8. Click a different link → `Send.clickCount = 2`.
9. Refresh report → "Top links" section shows URLs ordered by count.
10. Manually craft a `mailto:` link in a template → confirm it's NOT
    rewritten in the sent email.

### Known V1 limitations (by design)

- **No backfill** — campaigns sent before this PR show 0 opens / 0
  clicks forever. UI handles this gracefully (em-dash instead of 0%).
- **No Apple MPP filtering** — MPP pre-fetches images, inflating open
  counts ~20-30%. Industry-wide problem. V2: UA sniff + "MPP-adjusted"
  badge.
- **No per-campaign tracking opt-out** — tracking always on V1.
  Privacy-conscious users want this; V2 adds a wizard Step 5 toggle.
- **Card surface deferred** — sent campaigns in the list page still
  show only Sent / Recipients / Failed counts. Engagement visible on
  the report page only. V2 adds card-level open rate.
- **No URL category aggregation** — top links section shows raw URLs.
  V2 could group "all unsubscribe links" or "all CTAs" by URL pattern.
- **IP + UA stored but never displayed** — V2 surfaces in per-recipient
  detail for geo / device breakdown.

### Files at a glance

**Backend (4 modified / 4 new / 1 migration)**:
- Modified: `prisma/schema.prisma`, `src/server.ts`, `src/campaigns/send.ts`,
  `src/routes/campaigns.ts`
- New: `src/lib/tracking-token.ts`, `src/campaigns/html-tracking.ts`,
  `src/routes/tracking.ts`
- Migration: `20260607063049_engagement_tracking`

**Frontend (3 modified)**:
- `src/lib/api/campaigns.ts` (+15 lines engagement types)
- `src/pages/campaigns/CampaignReport.tsx` (+50 lines for hero stats,
  top links, per-recipient pills)
- `src/styles/components/campaigns/CampaignReport.module.scss`
  (+85 lines for engaged tone, topLinks section, log pills)

---

## Original planning sections below (unchanged):

---

## Why this is next

After send hardening shipped, the product can mail any recipient on a
verified domain. But the report page after a campaign launches stops at:

```
SENT: 1,234   FAILED: 12   TOTAL: 1,246
```

That's "did Resend accept it." Not "did anyone read it?" or "did anyone
care?" Every email tool — Mailchimp, Klaviyo, Brevo, even Substack —
surfaces open rate + click rate as **the** headline metric. Without it,
users finish a campaign with no way to measure anything.

This PR closes the gap and unlocks the V2 agency-wide reporting
dashboard (currently mostly placeholder widgets for `emails_sent`,
`open_rate`, `click_rate` that need this data to be populated).

---

## Scope

### IN V1

- New `EmailEvent` table (one row per open + click event)
- Aggregate counts on Send table (openCount, clickCount, firstOpenedAt,
  lastClickedAt) — fast list/report queries without aggregating events
- HMAC-signed tracking tokens (sign + verify utility, reuses JWT_SECRET)
- HTML rewriter at send time:
  - Wrap every `<a href="X">` → `<a href="https://app/e/c/{token}">` (32 chars)
  - Inject 1×1 transparent tracking pixel before `</body>`
  - Skip mailto:, tel:, hash links (#section), already-rewritten links
- Public tracking endpoints (mounted at root for short URLs):
  - `GET /e/o/:token` — log open, return 1×1 GIF
  - `GET /e/c/:token` — log click, 302 to original URL
- Report page additions:
  - Hero stats row gains "Opened" + "Clicked" big-number cards
  - Open rate (unique opens / sent) prominently displayed
  - Click rate (unique clicks / sent)
  - Top links section (sorted by click count) with click-through count
  - Per-recipient log rows gain "Opened" / "Clicked" badges
- Campaign list card (sent variant) shows open rate inline
- Campaign list rows in dashboard surface basic open-rate

### OUT V1 (deferred follow-ups)

| Item | Why deferred | When |
|---|---|---|
| **Per-campaign tracking opt-out** | Privacy-conscious users want to disable click tracking (rewritten URLs look suspicious on hover) | V2 — settings toggle on Step 5 of wizard |
| **Apple Mail Privacy Protection (MPP) filtering** | MPP pre-fetches images → inflates open counts ~20-30%. UA-sniffing for MPP is industry-standard but adds complexity | V2 — UA filter + honest "MPP-adjusted" badge |
| **Geographic / device breakdown** | "Where are opens coming from?" / "Mobile vs desktop?" | V2 — separate aggregation, needs IP geo lib |
| **Time-series engagement graph** | "Opens over time after send" — sparkline on report | V2 polish |
| **Heatmap of clicks within email** | Per-link position click counts | V3 |
| **A/B test comparison** | Two subject lines, measure which opens more | V3 — needs A/B test infrastructure first |
| **Real-time live engagement feed** | WebSocket stream of opens as they happen | Premature |
| **Email validation against opens** | "These addresses never opened anything — clean list?" | V2 — list hygiene tools |

### Phasing options

If 1-2 days feels too big for one PR:

**Phase 1 (~6h)**: Open tracking only — pixel + endpoint + report stats
**Phase 2 (~6h)**: Click tracking — rewriter + redirect endpoint + top links UI

**Default recommendation: ship as ONE PR.** The pieces share so much
infrastructure (token util, HTML rewriter, report page updates) that
splitting costs more in coordination than it saves.

---

## Data model

### Backend addition to `prisma/schema.prisma`

```prisma
enum EmailEventType {
  open
  click
}

/* Engagement event — one row per open or click recorded on a sent email.
   See feature-engagement-tracking V1.

   Multiple events per Send are expected:
     - Recipient opens email at 9am, again at 3pm → 2 'open' rows
     - Recipient clicks link, clicks again on same link → 2 'click' rows
     - Recipient clicks 3 different links → 3 'click' rows

   "Unique" counts (the ones surfaced in reports as the standard metric)
   are derived from the Send aggregate columns (openCount, clickCount)
   which are incremented ONLY on the first event of each type per Send.
   See src/campaigns/tracking.ts for the dedup logic. */
model EmailEvent {
  id          String         @id @default(cuid())
  sendId      String         @map("send_id")
  type        EmailEventType
  /// For 'click' events: the original URL the recipient clicked.
  /// For 'open' events: null.
  url         String?
  /// Best-effort recipient IP (X-Forwarded-For preferred over remoteAddr).
  /// Used only for the per-recipient log; never displayed publicly.
  recipientIp String?        @map("recipient_ip")
  /// User-Agent string. V2 will sniff this to filter MPP / bot prefetch.
  userAgent   String?        @map("user_agent") @db.VarChar(500)
  occurredAt  DateTime       @default(now()) @map("occurred_at")

  send Send @relation(fields: [sendId], references: [id], onDelete: Cascade)

  @@map("email_events")
  @@index([sendId, type])                       // report aggregation
  @@index([sendId, occurredAt(sort: Desc)])     // event log ordering
}
```

### Modifications to `Send` model

Add 4 aggregate columns + reverse relation:

```prisma
model Send {
  // ... existing fields ...

  // New aggregate columns (incremented at event time)
  openCount       Int       @default(0) @map("open_count")
  clickCount      Int       @default(0) @map("click_count")
  firstOpenedAt   DateTime? @map("first_opened_at")
  lastClickedAt   DateTime? @map("last_clicked_at")

  events EmailEvent[]
}
```

### Why both aggregate columns AND detailed event rows

- **Aggregate counts** on Send (`openCount`, `clickCount`) → instant
  read for the campaign list page + dashboard widgets. No GROUP BY,
  no aggregation, just `SELECT openCount FROM sends`.
- **Detailed event rows** in EmailEvent → the per-recipient timeline,
  top-links sorting, future geographic breakdown. Worth the cost
  of N extra rows per recipient.
- The two are kept in sync transactionally at event time (UPSERT
  event + UPDATE Send aggregate in same tx).

### Why dedupe "unique opens" via `firstOpenedAt`

Industry standard formula for open rate is `unique opens ÷ sent`
(Mailchimp). Without dedup, refreshing a Gmail tab N times would
report N opens for one recipient. So:

- `openCount`: increment ONLY when `firstOpenedAt` is null
- `clickCount`: increment per unique URL (not per click event) — we
  check whether ANY prior `click` event on this Send has this URL

Both checks happen in the tracking endpoint's transaction.

---

## Backend

### New / modified files

```
src/lib/tracking-token.ts             (new — HMAC sign/verify for open + click tokens)
src/campaigns/html-tracking.ts        (new — HTML rewriter: pixel injection + link wrapping)
src/routes/tracking.ts                (new — public /e/o/:token + /e/c/:token endpoints)
src/campaigns/send.ts                 (modify — restructure to create Send row BEFORE Resend call,
                                       use sendId for tracking tokens, plug in html-tracking)
src/server.ts                         (modify — mount tracking router at /e)
prisma/schema.prisma                  (+EmailEvent + 4 cols on Send + reverse relation)
prisma/migrations/<ts>_engagement_tracking/migration.sql
```

### Tracking token util

```typescript
// src/lib/tracking-token.ts

interface OpenTokenPayload {
  sendId: string;
}

interface ClickTokenPayload {
  sendId: string;
  url:    string;
}

// Format: same as unsubscribe-token (base64url JSON + "." + base64url HMAC),
// reuses JWT_SECRET, no expiry (recipients open emails years later).
// Constant-time comparison via crypto.timingSafeEqual.

export function signOpenToken(payload: OpenTokenPayload): string { ... }
export function signClickToken(payload: ClickTokenPayload): string { ... }
export function verifyOpenToken(token: string): OpenTokenPayload | null { ... }
export function verifyClickToken(token: string): ClickTokenPayload | null { ... }
```

**Two distinct token formats** (open vs click) because:
- Open tokens don't need a URL — payload is just `sendId`
- Click tokens carry the destination URL in-payload so we don't need
  a DB lookup of "what URL is this link supposed to go to?"
- Different signature domains prevent cross-use (can't reuse a click
  token to log an open)

Click tokens contain the URL in plaintext (signed but not encrypted).
Acceptable — the URL is already in the email body, so the recipient
already knows it. We're proving the URL hasn't been tampered with,
not hiding it.

### HTML rewriter

```typescript
// src/campaigns/html-tracking.ts

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const SKIP_HREF = /^(mailto:|tel:|#|javascript:|data:)/i;

/**
 * Rewrite all <a href> in email HTML to route through /e/c/:token,
 * and inject a tracking pixel before </body>.
 *
 * Idempotency: if html already contains /e/c/ or /e/o/, skip — we don't
 * want to double-wrap if the template happens to already use our domain.
 *
 * URL preservation: query strings, fragments, and unicode in original
 * URLs survive round-trip via the token (we sign the verbatim URL).
 */
export function injectTracking(html: string, sendId: string): string {
  // Rewrite hrefs
  const rewritten = html.replace(
    /href="([^"]+)"/gi,
    (match, originalUrl) => {
      if (SKIP_HREF.test(originalUrl)) return match;
      if (originalUrl.includes('/e/c/') || originalUrl.includes('/e/o/')) return match;
      const token = signClickToken({ sendId, url: originalUrl });
      return `href="${APP_URL}/e/c/${token}"`;
    },
  );

  // Inject pixel before </body>, or at end if no body tag
  const openToken = signOpenToken({ sendId });
  const pixel = `<img src="${APP_URL}/e/o/${openToken}" width="1" height="1" alt="" style="display:none;border:0;outline:0;" />`;

  if (/<\/body>/i.test(rewritten)) {
    return rewritten.replace(/<\/body>/i, `${pixel}\n</body>`);
  }
  return rewritten + '\n' + pixel;
}
```

### Tracking endpoints

```typescript
// src/routes/tracking.ts

export const trackingRouter = Router();

// 1×1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

trackingRouter.get('/o/:token', async (req, res) => {
  try {
    const payload = verifyOpenToken(String(req.params.token ?? ''));
    if (!payload) {
      // Still return pixel — don't expose token validity to email scanners
      return sendPixel(res);
    }

    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? null;
    const ua = String(req.headers['user-agent'] ?? '').slice(0, 500);

    await prisma.$transaction([
      prisma.emailEvent.create({
        data: {
          sendId:      payload.sendId,
          type:        'open',
          recipientIp: typeof ip === 'string' ? ip : null,
          userAgent:   ua || null,
        },
      }),
      // Only increment Send.openCount if this is the FIRST open ever
      prisma.send.updateMany({
        where: { id: payload.sendId, firstOpenedAt: null },
        data: {
          openCount:      { increment: 1 },
          firstOpenedAt:  new Date(),
        },
      }),
    ]);
  } catch (err) {
    console.error('[tracking] open log failed:', err);
    // Still return pixel — never break the email render
  }
  sendPixel(res);
});

trackingRouter.get('/c/:token', async (req, res) => {
  try {
    const payload = verifyClickToken(String(req.params.token ?? ''));
    if (!payload) {
      return res.status(404).send('Link not found.');
    }

    const ip = req.ip ?? null;
    const ua = String(req.headers['user-agent'] ?? '').slice(0, 500);

    // Check if this URL has been clicked before on this Send
    const prior = await prisma.emailEvent.findFirst({
      where: { sendId: payload.sendId, type: 'click', url: payload.url },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.emailEvent.create({
        data: {
          sendId:      payload.sendId,
          type:        'click',
          url:         payload.url,
          recipientIp: typeof ip === 'string' ? ip : null,
          userAgent:   ua || null,
        },
      }),
      prisma.send.update({
        where: { id: payload.sendId },
        data: {
          clickCount:      prior ? undefined : { increment: 1 },
          lastClickedAt:   new Date(),
          // First click also counts as open (recipient saw email)
          openCount:       { increment: 0 },  // updated separately if needed
        },
      }),
    ]);

    res.redirect(302, payload.url);
  } catch (err) {
    console.error('[tracking] click log failed:', err);
    // Still redirect — never break the user's flow
    const payload = verifyClickToken(String(req.params.token ?? ''));
    if (payload) return res.redirect(302, payload.url);
    return res.status(404).send('Link not found.');
  }
});

function sendPixel(res: Response) {
  res.set({
    'Content-Type':    'image/gif',
    'Content-Length':  String(TRANSPARENT_GIF.length),
    'Cache-Control':   'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma':          'no-cache',
    'Expires':         '0',
  });
  res.send(TRANSPARENT_GIF);
}
```

**Important:** `no-store` cache headers on the pixel ensure each open
triggers a fresh request rather than the browser caching the response.
Without this, an opener who comes back to the email in 5 minutes
wouldn't fire a second hit (which would still get caught by our
`firstOpenedAt` dedupe, but would skew the per-event timeline).

### Send pipeline restructure — `src/campaigns/send.ts`

**Current flow:**
```
for each recipient:
  apply merge tags → sendRawHtml → write Send row with messageId
```

**New flow:**
```
for each recipient:
  apply merge tags
  create Send row (status: queued)             ← NEW: insert FIRST
  inject tracking into HTML using Send.id      ← NEW: use real sendId
  sendRawHtml
  UPDATE Send row with status + messageId       ← was INSERT, now UPDATE
```

Why restructure: the tracking pixel needs `Send.id`, which we don't
have until the row exists. Pre-this-PR we created the Send row after
the Resend call (so we'd know the `messageId`). Now we flip the order:
INSERT first → tracking → SEND → UPDATE.

The `SendStatus.queued` enum value (already in schema from
feature-campaigns) was always intended for exactly this case but
unused V1. Now it's the legitimate intermediate state.

### Mount

```typescript
// src/server.ts
import { trackingRouter } from './routes/tracking';

app.use('/e', trackingRouter);   // public, root-mounted for short URLs
```

URLs in emails become:
- `https://app.sendmymail.io/e/o/{open-token}` (open pixel)
- `https://app.sendmymail.io/e/c/{click-token}` (click redirect)

Each token is ~130 chars → ~165 char total URL. Adds ~150 bytes per
link to the email body. For a typical 5-link campaign with the pixel:
~900 bytes overhead. Acceptable.

---

## Frontend

### Modified files

```
src/pages/campaigns/CampaignReport.tsx        (add open/click stats + top links)
src/components/campaigns/CampaignCard.tsx     (sent variant shows open rate)
src/lib/api/campaigns.ts                      (add EmailEvent + new fields on Send)
```

### Report page additions

Current hero of `/clients/:cid/campaigns/:id`:

```
SENT: 1234   FAILED: 12   TOTAL: 1246
```

After:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  1,234      │  847        │  342        │  12         │
│  Sent       │  Opened     │  Clicked    │  Failed     │
│             │  68.6%      │  27.7%      │             │
└─────────────┴─────────────┴─────────────┴─────────────┘

Top links
┌───────────────────────────────────────────────────┬──────┐
│ https://khukrispices.com/spring                    │ 187  │
│ https://khukrispices.com/recipes                   │  89  │
│ https://khukrispices.com/unsubscribe (footer)      │  12  │
└───────────────────────────────────────────────────┴──────┘
```

New API response shape:

```typescript
interface CampaignReportData {
  // ... existing fields ...

  // NEW
  uniqueOpens:    number;                   // count of Sends where firstOpenedAt is not null
  uniqueClicks:   number;                   // count of Sends where clickCount > 0
  openRate:       number;                   // uniqueOpens / sentCount
  clickRate:      number;                   // uniqueClicks / sentCount

  topLinks: Array<{
    url:   string;
    count: number;        // total click events to this URL across all Sends
  }>;
}
```

Backend query: `GROUP BY url FROM email_events WHERE sendId IN (...) AND type = 'click' ORDER BY COUNT(*) DESC LIMIT 10`.

### Per-recipient log row badges

Current row:
```
sabitra@khukrispices.com  · Sent · 2 days ago
```

After:
```
sabitra@khukrispices.com  · Sent · Opened · Clicked  · 2 days ago
```

Add "Opened" pill if `firstOpenedAt != null`. Add "Clicked" pill if
`clickCount > 0`.

### Campaign card (sent variant)

Currently shows the tabular `Sent / Recipients / Failed` stats. Add a
4th column or replace the layout with engagement-prominent:

```
┌─────────────────────────┐
│ ✓ SENT     2 days ago   │
│ Spring offer            │
│                         │
│  1,234     68.6%   12   │
│   sent     opened  fail │
└─────────────────────────┘
```

Conditional: only show the rate if `openCount > 0`. Avoids "0.0%"
displayed within seconds of launch.

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Token scheme** | Two distinct token types (open vs click), separate sign domains | Prevents cross-use. Click tokens carry URL in-payload (saves DB lookup). Both reuse JWT_SECRET. |
| **Token expiry** | None | Recipients click 2-year-old emails. Same convention as unsubscribe tokens. |
| **Open dedup** | Unique opens = sends with `firstOpenedAt` set. Detailed events still logged per-fetch | Industry standard formula. Matches Mailchimp. |
| **Click dedup** | Unique clicks per (Send, URL). All click events still logged | Standard. Lets us show "this user clicked the pricing link AND the unsubscribe link" |
| **Open rate formula** | `unique opens / sent count` | Mailchimp standard. Not `unique opens / delivered` because we don't track delivery V1. |
| **Click rate formula** | `unique clicks / sent count` | Same logic. CTOR (clicks/opens) is V2. |
| **Tracking ON by default** | Yes, no per-campaign toggle V1 | Simpler. V2 adds a wizard toggle for privacy-conscious users. |
| **Cache headers** | `no-store` on pixel response | Ensures repeat opens fire new requests. Matters less because of `firstOpenedAt` dedupe, but right thing. |
| **IP + UA logging** | Yes, stored on EmailEvent. NEVER displayed publicly | Lets V2 add geographic + device + MPP filtering without re-architecting. |
| **MPP filtering** | Out V1 | Industry-wide problem; everyone overcounts opens by 20-30%. We accept this V1 honestly. V2 adds UA-sniffing. |
| **Failed redirects** | If click token invalid, return 404 (NOT redirect somewhere) | Don't want phishers using us as an open redirect. |
| **Failed pixel** | Still return the pixel even on invalid token | Email scanners check pixel URLs — returning 404 breaks the email render. |
| **Tracking router URL** | `/e/o/:token`, `/e/c/:token` mounted at root | Short, brandable. `/e/` = engagement. ~150 bytes per link in email body. |
| **Aggregate columns on Send** | Yes — duplicated state for fast reads | EmailEvent table will get large (5 events per campaign × thousands of campaigns). Aggregating live for the campaign list page would be slow. |
| **Existing campaigns** | Untracked. No backfill | Tracking exists going forward only. Old campaigns show 0 opens / 0 clicks. Honest. |
| **SendStatus.queued usage** | Now the legitimate intermediate state after INSERT but before sendRawHtml returns | Was unused V1. Always intended for this case. |

---

## Edge cases

| Case | Behavior |
|---|---|
| Recipient opens email 5 times | 5 `open` rows in EmailEvent. Send.openCount = 1 (firstOpenedAt dedup). |
| Recipient clicks same link 3 times | 3 `click` rows. Send.clickCount counts unique URLs only. |
| Recipient clicks 3 different links | 3 `click` rows. Send.clickCount = 3. |
| Apple Mail Privacy Protection pre-fetches pixel | Counted as open V1. Overcounts ~20-30%. Industry norm; we accept honestly. |
| Bot scanner fetches every link | We log clicks; some are bots. V2: UA filter. V1: accept noise. |
| Click token tampered | Returns 404. No redirect. Prevents open-redirect abuse. |
| Open token tampered | Still returns pixel (don't reveal validity). No event logged. |
| Template uses our domain in a custom link (e.g. `https://sendmymail.io/blog`) | Skipped — we only rewrite hrefs that don't already contain `/e/c/` or `/e/o/`. |
| Template has mailto:, tel:, #section, javascript: links | Skipped via SKIP_HREF regex. Safer + meaningless to track. |
| Email body has `<a href>` with templated URL like `{{merge_field}}` | Merge happens BEFORE rewriter; rewriter sees the resolved URL. Works fine. |
| Send was deleted (campaign archived) before recipient opened email | Token still valid signature-wise. UPDATE matches 0 rows. INSERT into EmailEvent FK-constraint-errors. Catch and swallow — don't break pixel response. |
| URL longer than database column limit | EmailEvent.url has no length limit (TEXT). Safe up to ~1 GB per row in Postgres. |
| Recipient on old email client that doesn't load images | No open recorded. No data. That's email tracking. |
| Recipient forwards email; forward recipient opens | We count the original Send as opened. (One pixel per email; tracks the original recipient address.) Acceptable; matches industry. |
| Click rate > 100% somehow | Won't happen with current dedup (unique clicks ≤ unique recipients ≤ sent). Safety: clamp displayed rate to 100%. |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Launch campaign with verified domain to 10 recipients | All 10 emails contain `/e/c/{token}` links + tracking pixel before `</body>` |
| Open email in Gmail with images on | Pixel fires → Send.openCount becomes 1, firstOpenedAt populated |
| Refresh same email tab | Pixel fires again → new EmailEvent row, Send.openCount STAYS 1 |
| Click pricing link in email | Browser redirected to original URL, Send.clickCount becomes 1, lastClickedAt populated |
| Click same link again | New EmailEvent row, Send.clickCount stays 1 |
| Click a different link | Send.clickCount becomes 2 |
| Refresh campaign report page 30s after first open | Hero shows "1 opened · 0 clicked", open rate calculated |
| Top links section after 50 clicks across 3 URLs | Top 3 URLs ranked by click count |
| Per-recipient log shows opens/clicks pills | Yes — pill renders if firstOpenedAt or clickCount > 0 |
| Sent campaign card surfaces open rate | Yes — sent variant shows "68.6% opened" when openCount > 0 |
| Old (pre-this-PR) campaigns | Open / click counts stay 0. UI shows "—" instead of "0%" |
| Click a `mailto:` link in email | Not rewritten. Mailto opens recipient's mail client. |
| Click rewritten link that resolves to a 404 | Redirect happens (we don't validate URL liveness). User sees their browser's 404. |
| Token from another campaign | Same signing scheme so signature passes. Look-up of sendId may not exist in current Send table (different campaign). UPDATE matches 0 rows; pixel still returns. |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Backend `tsc --noEmit` | clean |
| Backend Prisma migration | applies cleanly |
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Main chunk +~1 KB gzipped. |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual E2E #1 | Open campaign in Gmail; see Send.openCount = 1 |
| Manual E2E #2 | Click link in campaign; redirected to real URL; Send.clickCount = 1 |
| Manual E2E #3 | Top links section shows URLs sorted by count |

---

## Implementation order (when authorized)

**Step 1 — Backend foundation (~4h)**
1. Schema: EmailEvent model + 4 cols on Send + reverse relation
2. Migration generate + apply
3. `src/lib/tracking-token.ts` — HMAC sign/verify for both token types
4. `src/campaigns/html-tracking.ts` — `injectTracking(html, sendId)`
5. `src/routes/tracking.ts` — 2 public endpoints + 1×1 GIF buffer
6. Mount in `src/server.ts` at `/e`
7. tsc clean check

**Step 2 — Send pipeline restructure (~2h)**
8. Restructure `src/campaigns/send.ts`: create Send row BEFORE Resend
   call (status: 'queued'), inject tracking with sendId, sendRawHtml,
   then UPDATE row with messageId + status
9. Test that send still works end-to-end (no recipient lost)

**Step 3 — Report page additions (~3h)**
10. Backend: extend `GET /campaigns/:id` to return openCount,
    clickCount, openRate, clickRate, topLinks
11. Frontend: update `CampaignReport.tsx` hero with 4-column stat row
12. Frontend: add "Top links" section
13. Frontend: per-recipient log row gains opens/clicks pills

**Step 4 — Card surface (~1h)**
14. Frontend: campaign card sent variant shows open rate
15. Frontend: handle "no opens yet" gracefully (em-dash, not 0%)

**Step 5 — Verification (~1h)**
16. Build + lint
17. Manual E2E: real campaign, real Gmail open + click
18. Update change_log with Done entry

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| V2-a | **Apple MPP filtering** — UA sniff + "MPP-adjusted" badge | 4h |
| V2-b | **Per-campaign tracking toggle** (Step 5 wizard) | 3h |
| V2-c | **Time-series engagement graph** — sparkline of opens after send | 6h |
| V2-d | **Click heatmap** — visualize which links got attention | 1 day |
| V2-e | **Geographic / device breakdown** — IP geo lookup + UA parsing | 1 day |
| V2-f | **Agency-wide engagement dashboard** — aggregate across campaigns | 1-2 days (this PR unblocks it) |
| V2-g | **Engagement-based segmentation** — "Email anyone who clicked X" | 1 day |
| V2-h | **Subject line A/B test** — needs engagement data to score | 2 days (depends on this) |

---

*Plan locked. Ready to implement when authorized.*
