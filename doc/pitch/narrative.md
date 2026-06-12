# Pitch narrative — "A day at Nirvana Agency"

> The 5-minute story we tell every beta agency prospect.
> Pairs with the demo recording (`doc/pitch/loom-script.md`) and the
> leave-behind landing page (`doc/pitch/index.html`).
>
> **Audience:** Agency owners managing email for 3-10 client brands —
> currently juggling multiple Mailchimp / Klaviyo accounts, paying
> a stack of subscriptions, doing per-client reports by hand.
>
> **Goal of the pitch:** Get them to say "yes, I want to try this."
> Not to explain every feature. Show ONE coherent workflow that they
> recognize as their actual Tuesday.

---

## Why this story arc

The protagonist is **Sabitra Maharjan**, founder of **Nirvana
Agency** in Kathmandu. She runs email for 3 clients:

- **Khukri Spices** — D2C brand selling Nepali spice blends globally
- **Bose Audio** — local audio equipment retailer
- **Sherpa Tours** — adventure tourism operator

This isn't an enterprise sales story. It's **one agency owner doing
real work**. Every scene shows ONE product surface in CONTEXT — not
a feature list. The viewer recognizes themselves.

The story spans **one day** so it's tight and concrete:
- Morning: dashboard
- Mid-morning: build a campaign
- Lunch: watch it deliver
- Afternoon: check forms
- End of day: send report to client

That's 5 scenes + a cold open + a closer = 7 scenes. Each ~40-60
seconds. Total: ~5 minutes.

---

## The 7 scenes

### Scene 1 — Cold open (0:00 - 0:30)

**Purpose:** Frame the problem. Don't show the product yet.

**On screen:**
- Sendmymail logo + tagline ("Email marketing built for agencies")
- OR: split-screen of 12 Mailchimp browser tabs
- OR: just hold on a black screen with the voiceover

**Voiceover:**
> "If you run an agency managing email for 3 or more clients, you've
> felt this. Mailchimp account per client. Twelve logins. Templates
> duplicated across audiences. A different report format for every
> brand. Two-hundred dollars in subscription fees before you've sent
> a single email.
>
> SendMyMail is one workspace. All your clients. Built for how
> agencies actually work."

**Payoff:** "Yes, that's me." Acknowledgment of pain.

**Length:** 25-30 seconds.

---

### Scene 2 — Morning (0:30 - 1:30): Multi-client dashboard

**Purpose:** Show "bird's-eye view" — agencies need to see ALL
clients at once.

**On screen:**
1. Cold start: `/login` → enter Sabitra's credentials → land on `/dashboard`
2. Camera lingers on the dashboard:
   - "Good morning, Sabitra" greeting
   - KPI row: 1,247 emails sent · 67% open rate · 23% click rate · 47 list growth
   - Sending chart: last 30 days line chart, peak ~120 sends/day
   - Top clients table: Khukri Spices (38 campaigns), Bose Audio (12), Sherpa Tours (8)
3. Hover top-client row → tooltip shows last campaign subject + open rate

**Voiceover:**
> "Sabitra logs in. One workspace, three clients. She sees the
> bird's-eye view — last week Nirvana sent 1,247 emails across
> Khukri, Bose, and Sherpa. 67% average open rate. Khukri's spring
> promo was the top performer at 89%.
>
> She knows where to focus today without opening three different
> tools."

**Payoff:** "One dashboard. Not three tabs."

**Length:** 50-60 seconds.

---

### Scene 3 — Mid-morning (1:30 - 2:30): Building a campaign

**Purpose:** Show the campaign workflow is FAST and PREMIUM.

**On screen:**
1. Click "Khukri Spices" in top-clients table
2. Navigate to `/clients/khukri/campaigns` → "New campaign"
3. Wizard opens, walk through steps:
   - **Step 1** Name: "Spring promo follow-up"
   - **Step 2** Sender: from "Khukri Spices" / sabitra@khukri.com
   - **Step 3** Subject: "Last 24 hours — 20% off ends tonight"
   - **Step 4** Template picker: hover one card, the phone-frame thumbnail tilts in 3D, click "Spring promo"
   - **Step 5** Audience: pick "All subscribers" (1,234 contacts)
   - **Step 6** Review + Launch
4. Click Launch → confetti / progress bar / "Sending…"

**Voiceover:**
> "Mid-morning. Khukri Spices needs a 24-hour follow-up to their
> Spring promo. Sabitra clicks new campaign. She picks the
> Spring template — built once, reused across campaigns. Drag-
> drop blocks, real MJML compile under the hood.
>
> Six clicks. Forty-five seconds. Launched."

**Payoff:** "Fast. Premium. The drag-drop editor and phone-frame
template cards feel like the tools they wish their agency-side
software felt like."

**Length:** 55-60 seconds.

---

### Scene 4 — Lunch (2:30 - 3:30): Live engagement tracking

**Purpose:** Show this isn't a fire-and-forget tool — they see what
WORKS.

**On screen:**
1. Cut back to `/clients/khukri/campaigns/spring-followup` — report page
2. Live progress bar:
   - "Sending 234 of 1,234 recipients…"
   - Counter ticks visibly (the 5-second poll)
3. Status flips to "Sent": 1,234 sent · 18 failed · sending pipeline complete
4. Engagement starts flowing in:
   - 89 opens · 7% open rate (5 minutes after launch)
   - Click the top-links section — pricing page, blog post, unsubscribe footer
5. Scroll to per-recipient log — see "Opened ×3" pills, "Clicked" green pills
6. Refresh page → counters tick up

**Voiceover:**
> "Mid-coffee, she watches it deliver in real-time. Five-second poll,
> watching the counter climb. By the time her coffee's done, 89 opens.
> Top link is the pricing page — Spring sale is converting. The
> recipient log shows who opened, who clicked, who couldn't reach.
>
> Mailchimp tells you eventually. We tell you now."

**Payoff:** "Real engagement data. Live. Not a 24-hour-delayed export."

**Length:** 55-60 seconds.

---

### Scene 5 — Afternoon (3:30 - 4:15): Forms growing the list

**Purpose:** Lists grow without manual import. The product CAPTURES
new subscribers automatically.

**On screen:**
1. Navigate to `/clients/khukri/forms`
2. List shows 3 forms — "Newsletter signup", "QR code subscribers",
   "Recipe-of-the-week"
3. Click "QR code subscribers" → form detail page
4. Stats: 247 submissions this month, 198 new contacts (rest are dupes)
5. Recent submissions list: last 5 names with ✨ "new" badges, timestamps
6. Click public URL → opens `/f/khukri-qr-subscribers` in new tab
7. Show the actual form (the public hosted page)

**Voiceover:**
> "Afternoon check. Khukri's QR code on their packaging is driving
> 40-plus new subscribers a day. They scan, fill out the form on
> their phone, and they're auto-added to the Newsletter list.
> Next campaign automatically reaches them.
>
> No manual CSV import. Lists grow themselves."

**Payoff:** "Organic growth built in. Not a separate Zapier dance."

**Length:** 40-45 seconds.

---

### Scene 6 — End of day (4:15 - 4:45): Showing client value

**Purpose:** Justify the retainer. Why Khukri keeps paying Nirvana.

**On screen:**
1. Navigate to `/clients/khukri/reports`
2. Range picker on "Last 30 days"
3. Hero KPIs: Sent 12,847 · 67% open · 23% click · +247 list growth
4. Sending chart: bar/line over the month
5. Top campaigns: 5 best by open rate, Spring promo at top
6. List health: 4,892 subscribed · 12 unsubscribed · 3 suppressed
7. Range switch to "Last 90 days" → numbers update

**Voiceover:**
> "End of day. Time to show Khukri what they got for their retainer.
> One click — last 30 days, every campaign, list growth, top
> performers. Sabitra can export this as PDF and send to her client
> on Monday morning.
>
> The conversation isn't 'did you send the emails.' It's 'this is
> what we drove.' Retainer justified."

**Payoff:** "Client retention. The unique problem agencies have that
SMB email tools don't solve."

**Length:** 30-35 seconds.

---

### Scene 7 — Closer (4:45 - 5:00): The premium-feel CTA

**Purpose:** Final visual gut-punch. Then ask.

**On screen:**
1. Navigate to `/settings/appearance`
2. Click "Dark" → entire app re-renders smoothly
3. Click "White" → re-renders, slate undertones visible
4. Click "Default" → back to warm editorial
5. Smooth body transition; nothing flickers
6. Cut to a hold-screen with the CTA:
   - "Try SendMyMail free for 30 days"
   - "Migrate from Mailchimp in one afternoon — we'll help"
   - Email signup or "Book a 15-min call" button

**Voiceover:**
> "Built premium. Three themes. Instant interactions. Skeleton
> loaders, optimistic UI, the kind of polish that makes you proud
> to show your clients.
>
> If you're managing email for three or more clients, you'll love
> what this saves you.
>
> Thirty days free. We'll help you migrate from Mailchimp in an
> afternoon. Click below or reply to the email this came in."

**Payoff:** "I want to try this."

**Length:** 15-20 seconds.

---

## Timing math

| Scene | Length | Cumulative |
|---|---|---|
| 1. Cold open | 25-30 s | 0:30 |
| 2. Morning / dashboard | 50-60 s | 1:30 |
| 3. Mid-morning / build campaign | 55-60 s | 2:30 |
| 4. Lunch / live engagement | 55-60 s | 3:30 |
| 5. Afternoon / forms | 40-45 s | 4:15 |
| 6. End of day / reports | 30-35 s | 4:45 |
| 7. Closer / theme + CTA | 15-20 s | 5:00 |

Total: **~5 minutes**. Don't overshoot. Loom drop-off is brutal after
5 min.

---

## Recording principles

1. **Don't read the script verbatim** — bullet-point it on a sticky
   next to your screen. Sound conversational, not announcer-y.
2. **Record one take per scene, edit between** — easier than one
   continuous 5-minute take.
3. **Slow down at the payoff lines** — the lines that make them
   nod ("Mailchimp tells you eventually. We tell you now.") need
   air to land.
4. **Don't apologize for what's missing** — never say "we're
   working on X" or "this is a beta." Show what works.
5. **End with the explicit ask** — "click below" or "reply to this."
   Don't make them guess what comes next.

---

## What we need before recording

1. **Demo data** — Nirvana Agency + 3 clients + realistic campaigns
   with engagement (see seed script next)
2. **Theme set to Default** before recording (so the first impression
   is the warm editorial vibe; we'll do the theme-switch reveal at the end)
3. **Clear browser tabs + clear notifications** (nothing in screenshots
   that distracts)
4. **Quiet room + decent mic** (your built-in laptop mic is fine; just
   record in a quiet room)
5. **Loom Pro or Free tier** — Free works for 5-min videos. Pro lets
   you trim more aggressively.

---

## Things we WON'T show in this 5-min cut

These are deliberate omissions to keep the pitch tight:

- Onboarding wizard (good but tangential to the daily workflow story)
- Test send (covered by "Launch" in Scene 3)
- Integrations page (V2 content; the agency probably has Mailchimp not Klaviyo)
- Suppression list (compliance — boring for sales)
- Settings tabs other than Appearance (no value for prospect)
- Sending domain verification (technical detail)
- Sub-features inside templates (drag-drop nuances, etc.)

These can ALL be in the leave-behind landing page or a separate
"deeper-dive" Loom. The 5-min main pitch stays focused.

---

## Next deliverables (after narrative is locked)

1. **Demo seed script** — make Nirvana Agency + 3 clients + campaigns
   + engagement happen in one command
2. **Loom recording script** — line-by-line voiceover with timing cues
3. **Leave-behind landing page** — `doc/pitch/index.html` with the 7
   scene screens + CTA

---

*Locked when Sabitra's a believable agency owner and the 7 scenes
flow without confusion. Ready for review.*
