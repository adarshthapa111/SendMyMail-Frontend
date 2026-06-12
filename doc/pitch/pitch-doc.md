# SendMyMail — built for agencies, not solos

> A pitch doc for agency owners considering email marketing tools.
> Read time: 8-10 minutes. Decide in 2.

---

## The 30-second version

If you run an agency that manages email for 3 or more clients,
you're probably:

- Juggling a Mailchimp / Klaviyo account per client (and paying for each)
- Re-creating templates per audience because they don't share
- Doing per-client reports by hand at month-end
- Using a different login for each client just to check yesterday's open rate

**SendMyMail** is one workspace for all your clients. One login,
multi-client dashboard, shared templates, per-client reports, full
engagement tracking. Built for how agencies actually work — not for
solo founders managing one list.

If that sounds like what you'd build if Mailchimp gave you an agency
mode, keep reading.

---

## Part 1 — The problem we kept hearing

We talked to agency owners running email for clients. The pain is
specific and repetitive. The same five things came up in nine of
ten conversations:

### Pain 1: The login graveyard

> "I have 11 client Mailchimp accounts. I keep their logins in a
> spreadsheet. To check yesterday's open rate for the Khukri promo
> I have to: open spreadsheet, find Khukri row, copy login, paste
> into Mailchimp, click through to reports. Five clicks before I see
> anything. For one client. Out of eleven."
>
> — agency owner, Kathmandu

The math: 11 clients × switching ≈ 30 minutes a day, **just to look
at metrics**. Half an hour, every day. Multiply by your hourly rate.

### Pain 2: Templates are siloed

Designed a beautiful welcome template for Client A? It lives in
Client A's audience. Client B needs the same structure — you
re-create it. Or you export the HTML, but then the merge tags and
unsubscribe URLs don't line up.

Result: **agencies rebuild the same 6 templates per client**. That's
~20 hours of re-work the first month they onboard a client.

### Pain 3: Per-client reporting is a PowerPoint slog

End of month, each client wants a report. The shape of that report is
roughly the same — sends, open rate, click rate, list growth, top
campaigns. But Mailchimp's exports look like Mailchimp's exports, not
like your agency's brand.

Result: **agencies hand-craft a PDF per client per month**. 30-60
minutes per client. For an agency with 10 clients, that's a full
working day burned on report formatting.

### Pain 4: Costs stack up

Mailchimp Standard is ~$20/mo per audience. Klaviyo charges by
contact count. With 10 clients, you're paying $200-$500/mo before
you've sent a single email. None of that money is going to YOUR
margin — it's going to a tool that wasn't built for you.

### Pain 5: The "show your value" problem

When a client asks "what are we paying you for?", what's the answer?
"I designed your emails" doesn't justify a $2,000/mo retainer.

What justifies it is **showing them the engagement curve, the list
growth, the conversion from open to click**. But Mailchimp's UI was
built for the client to look at — not for the agency to PRESENT TO
the client. There's no "client-facing report mode," no
white-labelable view, no "send this report PDF to your client
every Monday."

Result: agencies look like execution shops, not strategy partners.
Retention is harder than it should be.

---

## Part 2 — Why this hasn't been solved

Mailchimp, Klaviyo, ConvertKit, ActiveCampaign — they're all built
**SMB-first**. The mental model is: one business → one email tool
→ one audience.

Agencies break that model. **One agency → ten businesses → ten
audiences**. The tools sort-of work if you cobble them together,
but every workflow has friction:

| Workflow | SMB tools | Agency reality |
|---|---|---|
| Switch contexts | Logout/login | Should be a dropdown |
| Reuse a template | Copy/paste HTML | Should be one-click duplicate |
| Per-client report | Manual export → format → email | Should be one URL to share |
| Pricing | Per-audience subscription | Should be flat-rate or per-send |
| Branding | "Powered by Mailchimp" footer | Should be agency-branded |

Some agencies hack around this with Mailchimp's "Manage Multiple
Accounts" feature — but it's still SMB-shaped under the hood. You
can switch accounts faster, but everything else (templates, reports,
data) stays siloed.

The agency-first email tool just... doesn't exist. Until now.

---

## Part 3 — What we built

SendMyMail is the email platform we'd want if we ran your agency.
Specifically:

### One workspace, all clients

A single login. A multi-client dashboard. Switch between Khukri,
Bose, Sherpa with a dropdown — no logging out, no copy-paste from
a spreadsheet.

### Shared templates

Build a template once. Apply it to any client. The unsubscribe URL
and merge tags resolve per-campaign — you never have to hand-edit
them per audience.

### Per-client reports built in

Every client has a `/clients/:cid/reports` page that summarizes the
last 30/90 days / all-time. Sends, open rate, click rate, top
campaigns, list health. Click to switch ranges. (V2: export to PDF +
auto-email weekly.)

### Real engagement tracking

Open tracking (pixel) + click tracking (redirect proxy) on every
campaign. Real-time updates while a campaign is sending. Top links
ranked by click count. Per-recipient engagement (who opened, who
clicked, how many times).

### Forms that grow lists automatically

Public hosted forms (`/f/khukri-newsletter`) where you embed in QR
codes, social bios, ad campaigns. Submissions auto-add to the list
you designate. No manual CSV import for organic signups.

### Send hardening that just works

Verify your sending domain with Resend. Auto-suppress unsubscribers
(per CAN-SPAM + GDPR). Per-campaign unsubscribe links with HMAC
tokens that never expire. Gmail bulk-sender headers (List-Unsubscribe)
built in.

### Premium UX

- 3 themes (warm editorial / dark / cool minimal) + system auto-follow
- Skeleton loaders during fetches (not spinners)
- Optimistic UI on every mutation (archive disappears in 0ms)
- Undo on destructive actions
- Inline empty states with helpful CTAs
- Mobile responsive (in progress)

This isn't a Mailchimp clone with cosmetic differences. The mental
model — multi-client first — runs through every page.

---

## Part 4 — How agency life changes

The same workflow, before and after:

### Monday morning: "What needs attention?"

**Before (Mailchimp x N accounts):**
- Open spreadsheet
- Log into account 1, check dashboard, jot notes
- Logout, log into account 2, repeat
- × 11 clients
- ~25 minutes before you've drunk your first coffee

**After (SendMyMail):**
- Login once
- Multi-client dashboard shows aggregate KPIs + per-client open rates
- Click into the one client that needs attention
- ~90 seconds total

### Tuesday afternoon: "Build a campaign for client X"

**Before:**
- Log into client X's account
- Templates → find the one from last month
- "Replicate" → modify
- Set audience → set subject → set sender
- Send test → preview → review → schedule
- ~12 minutes if all goes smoothly

**After:**
- Stay logged in
- Pick "Spring promo" from your shared templates
- 6-step wizard with sane defaults
- Test send to yourself → launch
- ~4 minutes

### End of month: "Reports to all clients"

**Before:**
- For each of 11 clients:
  - Log in
  - Export sends + open/click data
  - Paste into PowerPoint template
  - Add agency branding
  - Email to client
- ~45 minutes per client = ~8 hours total

**After:**
- For each of 11 clients:
  - Open `/clients/:cid/reports`
  - Set range to last 30 days
  - Export PDF (V2) OR share URL directly
  - One Slack message to client
- ~3 minutes per client = ~30 minutes total

**Saved per month: ~7 hours of admin work.** That's a full working
day. Every month. Spend it on strategy or on more clients.

---

## Part 5 — What's different vs Mailchimp / Klaviyo

| Capability | Mailchimp | Klaviyo | SendMyMail |
|---|---|---|---|
| Multi-client UI | Multi-account add-on | One brand per account | **Native multi-client** |
| Shared templates across clients | Copy-paste HTML | No | **Yes, one source of truth** |
| Per-client reports | Manual export | Manual export | **Built-in, shareable URL** |
| Engagement tracking | Yes | Yes | **Yes, real-time + per-recipient log** |
| Hosted signup forms | Yes (premium) | Yes (premium) | **Yes, free tier** |
| Domain verification | Manual setup | Manual setup | **Verify in 5 minutes via Resend** |
| Suppression + GDPR | Yes (manual mgmt) | Yes (manual mgmt) | **Auto-suppression on unsubscribe** |
| Theme / dark mode | Light only | Light only | **3 themes + system auto-follow** |
| Optimistic UI | Mailchimp loading…              | "Saving..." spinner | **0ms feedback, undo on errors** |
| Pricing model | Per-audience monthly | Per-contact monthly | **Per-agency flat (TBD)** |

The differentiation isn't "we have one feature they don't." It's
that **every workflow is shaped around agencies**.

---

## Part 6 — What's on the roadmap

Built today (everything described above is real and working):
- ✅ Multi-client workspace
- ✅ Templates + drag-drop editor + MJML import
- ✅ Campaigns (6-step wizard + live progress + report)
- ✅ Engagement tracking (opens + clicks + top links)
- ✅ Forms (hosted + auto-add to list)
- ✅ Reports (per-client, dashboard, 30/90/all-time ranges)
- ✅ Send hardening (verified domains + unsubscribe + suppression)
- ✅ Onboarding wizard
- ✅ Theme system (3 themes + system follow)
- ✅ Profile settings
- ✅ Skeleton loaders + optimistic UI + Undo toasts

Next 90 days:
- 🔜 **Resend webhook ingestion** — real delivery + bounce events,
     auto-suppress hard bounces, deliverability gauge
- 🔜 **Mobile responsive sweep** — phone-first audit + fix
- 🔜 **Activity feeds** — per-client timeline of "what we did"
- 🔜 **Inline editing** — click to rename in place

Next 6 months:
- 🔜 **Flows (marketing automation)** — visual canvas + event
     triggers + scheduled sends. The "killer feature" vs broadcast
     tools. Welcome series, abandoned-cart, birthday emails.
- 🔜 **Webhooks on form submission** — POST to your CRM
- 🔜 **Forms V2 embed script** — `<script src=...>` for customer
     websites
- 🔜 **Resend domain + tracking domain split** — better deliverability
- 🔜 **Bulk operations** — multi-select archive / duplicate / move

Within 12 months:
- 🔜 **White-label** — agency-branded portal for clients to view
     their own reports
- 🔜 **Open + click via redirected URL** + sparkline charts
- 🔜 **Integrations** — Shopify, HubSpot, Webflow (V1 we have 40+
     ESP exports already)
- 🔜 **Compliance pack** — bulk DSR exports, retention policies
- 🔜 **Audit log UI** — surface the audit logs we already write

This is a 12-month roadmap built around **what agencies actually need**.
Not "what could be a feature." Each item is in response to feedback
from agency owners we've talked to.

---

## Part 7 — Why now

Three forces converging:

1. **Agency-managed marketing is growing**. As D2C brands proliferate,
   most can't afford in-house marketing. They hire agencies. The
   agency software market is real and underserved.

2. **Email is having a renaissance**. After Apple Mail Privacy
   Protection and Facebook ad fatigue, email is the most ROI-positive
   channel. Klaviyo's IPO ($9B) is the proof.

3. **The tooling gap is widening**. Mailchimp keeps adding features
   for SMBs (e-commerce, surveys). Klaviyo keeps going up-market
   (enterprise). Nobody's building for the agency in the middle.

We're not betting on AI. We're not betting on a new channel. We're
betting that **agencies want a tool shaped like their workflow**,
and that tool doesn't exist yet.

---

## Part 8 — Beta program (the ask)

We're inviting 25 agency partners to use SendMyMail free for the
first 6 months in exchange for:

- Real usage (3+ clients, send ≥10 campaigns / month)
- 1 monthly 30-minute call so we can hear what's broken
- Permission to feature your agency in our case studies (you get
  veto + edit)

In return you get:
- Free Pro tier for 6 months (worth ~$300)
- Direct line to the founders for any issue
- Migration help (1 afternoon, we'll move your Mailchimp data over)
- First 25 beta partners get **lifetime 30% off** when we launch
  paid plans

**Apply for beta**: [link to be added — Calendly or Tally form]

**See the product**: schedule a 15-minute live demo
[link to be added]

---

## Part 9 — Visualize the product

Below are the 9 surfaces that tell the whole story. Each links to
the actual page in our app (when you book a demo) or a mockup
preview in our internal mockups library.

### 🌅 1. Multi-client dashboard

```
[ Screenshot: src/pages/dashboard.tsx, multi-client view
  showing 3 clients, sent metric, open rate, sending chart, top clients table ]
```

**What it solves:** The "login graveyard." Bird's-eye view of all
clients at once.

**Demo route:** `/dashboard`
**Mockup file:** [doc/mockups/agency_dashboard.html](../mockups/agency_dashboard.html)

---

### 🎨 2. Templates list (phone-frame product cards)

```
[ Screenshot: src/pages/templates/TemplatesList.tsx
  showing 8 template cards in a grid, each with a phone-frame thumbnail ]
```

**What it solves:** Premium product feel + shared template visibility.

**Demo route:** `/clients/:cid/templates`
**Mockup file:** [doc/mockups/templates.html](../mockups/templates.html)

---

### 📤 3. Campaign wizard (Step 4 — template picker)

```
[ Screenshot: src/pages/campaigns/CampaignWizard.tsx step 4
  showing template selection grid + Khukri Spices in topbar ]
```

**What it solves:** Fast multi-step launch with shared templates.

**Demo route:** `/clients/:cid/campaigns/new`
**Mockup file:** [doc/mockups/campaign_wizard.html](../mockups/campaign_wizard.html)

---

### 📈 4. Campaign report (live engagement)

```
[ Screenshot: src/pages/campaigns/CampaignReport.tsx mid-send
  showing live progress bar, 4 KPI cards, top links ]
```

**What it solves:** Real-time engagement = the "wow" moment.

**Demo route:** `/clients/:cid/campaigns/:id`
**Mockup file:** [doc/mockups/campaign_report.html](../mockups/campaign_report.html)

---

### 📋 5. Forms (hosted signup)

```
[ Screenshot: src/pages/forms/FormsList.tsx
  showing form cards with submission counts + public URLs ]
```

**What it solves:** Lists grow without manual import.

**Demo route:** `/clients/:cid/forms`
**Mockup file:** [doc/mockups/forms.html](../mockups/forms.html)

---

### 📊 6. Per-client report (the retention story)

```
[ Screenshot: src/pages/clients/ClientReport.tsx
  showing 4 KPIs, sending chart, top campaigns, list health ]
```

**What it solves:** End-of-month client report in 3 clicks.

**Demo route:** `/clients/:cid/reports`
**Mockup file:** [doc/mockups/reports.html](../mockups/reports.html)

---

### 🎨 7. Theme system (premium UX)

```
[ Screenshot: src/pages/settings/Appearance.tsx
  showing 4 theme swatches (Default, Dark, White, System) ]
```

**What it solves:** Premium product feel. Builds trust.

**Demo route:** `/settings/appearance`
**Mockup file:** *(N/A — see live app)*

---

### 👤 8. Profile settings

```
[ Screenshot: src/pages/settings/Profile.tsx
  showing 3 cards: Identity, Contact, Account ]
```

**What it solves:** Personal identity inside the agency workspace.

**Demo route:** `/settings/profile`
**Mockup file:** [doc/mockups/settings.html](../mockups/settings.html)

---

### 🛡️ 9. Sending domain verification

```
[ Screenshot: src/pages/settings.tsx sending tab
  showing verified domain status + DNS records ]
```

**What it solves:** Send from your client's domain, not from a
shared subdomain. Deliverability win.

**Demo route:** `/settings/sending`
**Mockup file:** *(N/A — see live app)*

---

## Part 10 — Capture the screenshots

This pitch doc has 9 screenshot placeholders. To turn this into a
shareable artifact:

### Option A: Manual capture (~30 min)

1. Boot the app + dev server: `npm run dev`
2. Use **demo data** (from `scripts/seed-demo-agency.ts` once it
   exists) so screenshots show realistic content
3. Open each of the 9 routes in turn
4. Cmd-Shift-4 (macOS) or Win-Shift-S (Windows) → capture each page
5. Save as `doc/pitch/screens/01-dashboard.png`,
   `02-templates.png`, etc.
6. Update this doc's image placeholders with `![alt](screens/01-dashboard.png)`

### Option B: Loom recording (~10 min)

Record a 5-minute Loom (per `narrative.md`) where each scene IS
one of these 9 surfaces. Embed the Loom at the top of this doc
instead of static screenshots:

```markdown
[![Watch the 5-min demo](screens/loom-cover.png)](https://www.loom.com/share/...)
```

### Option C: Interactive HTML gallery (~3 hours)

Build `doc/pitch/index.html` using the existing mockup CSS in
`doc/mockups/_shared.css`. A single page that:
- Pulls in real screenshots OR uses CSS-only mocks
- Renders the pitch sections (the 10 sections above)
- Embeds the Loom near the top
- Has a CTA at the bottom

This gets hosted as a static URL (Vercel / Netlify deploy) you can
share without sending a PDF.

### Recommended order

1. **Now**: Take 9 screenshots (~30 min). Update placeholders.
2. **Then**: Record the 5-min Loom (~30 min).
3. **Then**: Build `doc/pitch/index.html` (~3 hours).
4. **Then**: Deploy as a static URL and send to your first 5 beta prospects.

---

## Appendix — One-page summary (for the time-strapped reader)

**The pitch in 10 lines:**

1. Agencies juggle Mailchimp accounts per client. It's slow + expensive.
2. Mailchimp wasn't built for agencies. Klaviyo isn't either.
3. SendMyMail is the agency-first alternative.
4. One workspace. Multi-client dashboard. Shared templates.
5. Real engagement tracking + per-client reports.
6. Forms grow lists automatically.
7. Premium UX (3 themes, optimistic UI, polished empty states).
8. 25 beta partners get 6 months free + lifetime 30% off.
9. Flows + white-label coming in 6 months.
10. Built by an agency-adjacent team that's lived this pain.

**Next step:** Book a 15-minute demo or apply for beta.

---

*Last updated: 2026-06-08*
*Doc maintainer: Adarsh Thapa / SendMyMail team*
*For: agency owners considering email marketing tools*
*Sister docs: [narrative.md](./narrative.md) (5-min demo script),
[loom-script.md](./loom-script.md) (line-by-line recording script, TBD),
[index.html](./index.html) (hosted leave-behind, TBD)*
