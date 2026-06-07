# feature-onboarding-wizard

Guided first-run experience that gets a fresh agency from signup to its
first template in ~5 minutes. 3-step flow (client → contacts → template)
plus a persistent dashboard banner reminding users to finish if they
skip. Backend derives progress from existing counts; no new tables.

## Status: ✅ Done — V1 shipped

## Why this PR

After campaigns V1 + the card redesign, the editor + send pipeline are
both working but **new signups land on an empty dashboard with no
guidance**. Templates exist but they don't know what to do first. The
impl doc + mockup for onboarding already shipped (Feature 13), but the
route at `/onboarding` was still a `PublicPlaceholder`.

This PR fills in the real wizard with the minimum viable scope that
ships today, without depending on features that don't exist yet.

## V1 vs impl-doc spec

The impl doc proposes 4 steps (client → **domain verify** → contacts →
**first campaign send**). V1 ships **3 steps** (client → contacts →
template) because:

| Impl-doc step | Status in this PR |
|---|---|
| Create client | ✅ Step 1 (kept) |
| Verify domain | ❌ **Deferred** — domain verification is a separate PR that hasn't been built. Gating onboarding on it would block users. Returns as V2 step 2. |
| Import contacts | ✅ Step 2 (kept) |
| Send first campaign | ❌ **Deferred** — the campaign wizard is itself 6 steps. Asking a brand-new user to do 6-step-wizard inside a single onboarding step is overwhelming. Replaced by **Design first template** — meaningful checkpoint that maps to the existing editor surface and naturally feeds into the eventual "send your first campaign" flow once it's added. |

V2 follow-up: add domain verify as step 2 and first-campaign as step 4
when those flows exist.

## Architecture

```
USER SIGNS UP → workspace-setup → /onboarding
  └─ Page loads
       └─ useOnboarding() → GET /v1/onboarding
            └─ Backend derives progress:
                 client.count   > 0  →  step 1 done
                 contact.count  > 0  →  step 2 done
                 template.count > 0  →  step 3 done
       └─ Left rail shows 3 steps with checkmarks
       └─ Right side shows focused card for first incomplete step
       └─ User clicks CTA → routes to that surface
                            (/clients/new, /clients/:id/contacts/import,
                             or /clients/:id/templates)
            └─ User completes the surface (creates client / imports
              contacts / makes a template)
            └─ Returns to /onboarding (or focuses tab)
                 └─ Window focus refetches GET /v1/onboarding
                      └─ Backend re-derives → step ticks ✓ → rail updates
                      └─ Next incomplete step gets focus card

USER SKIPS (button)
  └─ POST /v1/onboarding/skip → Agency.setupComplete = true
  └─ Redirect to /dashboard
  └─ Dashboard banner hides (reads same setupComplete flag)

USER VISITS DASHBOARD WHILE INCOMPLETE + NOT SKIPPED
  └─ <OnboardingBanner /> renders above Hero
       └─ Shows: "Finish setting up · X of 3 steps complete · next: …"
       └─ Continue button → /onboarding
       └─ X button → POST /skip (soft-dismiss)

USER FINISHES ALL 3 STEPS
  └─ /onboarding renders DoneCard with "You're all set ✨"
  └─ "Go to dashboard" → POST /complete + redirect

audit log:
  onboarding.skipped     (when user dismisses)
  onboarding.completed   (when user explicitly finishes)
```

## Backend (sendmymail-backend)

### New file
- `src/routes/onboarding.ts` (~140 lines) — 3 endpoints:
  - `GET  /v1/onboarding` — derives progress from counts (4 parallel
    Prisma counts, all on indexed agency_id columns).
  - `POST /v1/onboarding/skip` — sets `Agency.setupComplete: true`,
    audit-logs `onboarding.skipped`. Idempotent.
  - `POST /v1/onboarding/complete` — same DB effect as skip but logs
    `onboarding.completed`. Distinct audit action so we can measure
    activation success rate vs abandonment.

### Modified
- `src/server.ts` — mounts `onboardingRouter` at `/v1/onboarding`.

### Why no new `onboarding_progress` table

The impl doc proposes a per-agency JSON table tracking step completion
+ PAN status + skip status. V1 derives instead because:

- Each step **already corresponds to a DB count** we can query directly.
- The only persistent state we need is "user skipped" — fits in the
  existing `Agency.setupComplete` boolean.
- Per-step timestamps for activation analytics can come later by
  adding the table when we need them. Premature optimization to
  ship now.

The PAN-number flow from the impl doc is also out of V1 scope — that's
a payment/compliance gate, not an activation gate.

### Auth

All 3 endpoints: `requireAuth()` only — every authenticated user can
read their own agency's onboarding progress and skip/complete it.
No `requireRole` because:
- Members shouldn't be blocked from seeing the banner
- Skipping doesn't damage anyone else's experience
- Activation metrics on a per-user basis would conflate "the owner
  finished" with "a viewer dismissed" anyway (V2 problem)

## Frontend

### New files

**API + data layer** (~140 lines total):
- `src/lib/api/onboarding.ts` — `getOnboarding()`, `skipOnboarding()`,
  `completeOnboarding()` + types.
- `src/hooks/useOnboarding.ts` — fetches on mount + refetches on window
  focus (so a user who completed a step in another tab sees the rail
  tick when they switch back). Exposes `{ data, loading, error,
  refetch, skip, complete }`.

**Page + banner** (~430 lines):
- `src/pages/setup/Onboarding.tsx` — the real wizard (replaces the
  `PublicPlaceholder` that was there). 2-col shell, sticky left rail,
  focused right card. Smart subtitles ("Khukri Spices" once step 1
  done, "You have subscribers" once step 2 done, etc.). Pulls
  `firstClient` from `useClients` for downstream step routing.
- `src/components/onboarding/OnboardingBanner.tsx` — persistent
  reminder on dashboard. Progress bar + "next: {step}" hint + CTA +
  dismiss X.

**Styles** (~370 lines total):
- `src/styles/components/setup/Onboarding.module.scss`
- `src/styles/components/onboarding/OnboardingBanner.module.scss`

### Modified

- `src/pages/setup/index.tsx` — exports `Onboarding` from its own file;
  removes the unused `PublicPlaceholder` import.
- `src/pages/dashboard.tsx` — `<OnboardingBanner />` above the Hero.

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **Scope** | 3 steps (client → contacts → template), NOT the impl-doc 4 | Domain verify + first-campaign don't exist as standalone surfaces yet; gating onboarding on them would block users |
| **State persistence** | Derived from existing counts | No new table. The only persistent state is "user skipped" — fits in `Agency.setupComplete`. Add the proposed `onboarding_progress` table later if we need per-step timestamps for activation analytics. |
| **Skippable** | Yes, with persistent dashboard banner | Per user direction. Skip flips `setupComplete: true`. Soft-dismiss via banner X does the same thing — no separate "soft skipped" state. |
| **Refetch pattern** | On mount + on window focus | Users complete steps in another tab; want the rail to tick when they switch back. Polling is overkill for a one-off setup flow. |
| **Layout** | Full-viewport outside AppShell | Per mockup. Focus experience without sidebar/topbar distractions. AgencyReady gate still applies (need a workspace to onboard). |
| **Right-card content** | Focused on the FIRST incomplete step | One thing at a time. Avoids the "checklist with 3 dim CTAs" antipattern. |
| **Auto-redirect /dashboard → /onboarding for fresh signups** | NOT shipped — banner is sufficient | Forcing redirect feels coercive. Banner is non-blocking + still discoverable. If activation rates lag we can add later. |
| **CTA routing** | Direct to existing surfaces (`/clients/new`, `/clients/:id/contacts/import`, `/clients/:id/templates`) | Onboarding orchestrates, doesn't reimplement (per impl doc principle). User completes in the existing surface and returns. |
| **"All done" state** | Celebration card with "Go to dashboard" CTA | Soft reward moment. Click flips `setupComplete: true` via `/complete` (distinct audit from /skip). |
| **Banner dismiss** | Soft-skip via POST /skip | Single source of truth — `setupComplete` controls visibility. Banner X = "I get it, stop reminding me." |

## Edge cases

| Case | Behavior |
|---|---|
| User skips onboarding, then visits `/onboarding` directly | Page still renders normally — they can resume at any time. No "you skipped" warning. |
| User completes all 3 steps but never clicks "Go to dashboard" | `allDone: true` shows the celebration card; if they leave, the banner doesn't show on dashboard (allDone hides it). They can revisit `/onboarding` and click finish; or just keep using the product. |
| Fresh signup with NO clients | Step 2 + step 3's CTA cards explain "create a client first" with disabled buttons. User clicks step 1, makes a client, returns, steps 2/3 unlock. |
| User creates client in another tab while looking at /onboarding | Window focus refetches → step 1 ticks → step 2 becomes focused. No manual reload needed. |
| User has multiple clients (from prior usage) | We use the most recently-created one for step 2/3 routing. They can navigate elsewhere from inside those surfaces if they want a different target. |
| User imports contacts but only into an archived client | The backend count uses `deletedAt: null` (no archived filter on contacts), so step 2 ticks if ANY contact exists for the agency. Acceptable approximation V1. |
| User creates an archived template | Backend count uses `archived: false`. Won't tick if only archived templates exist. Correct. |
| User signs in mid-onboarding from a fresh browser | `useOnboarding` fetches on mount. State is server-derived so picks up where they left off. |
| User explicitly clicks "Go to dashboard" on done card → revisits /onboarding | Banner is hidden (setupComplete: true), and /onboarding still renders the done card. They can navigate away again normally. |

## Build + lint

- Backend `tsc --noEmit`: clean
- Frontend `tsc -b --noEmit`: clean
- Frontend `npm run build`: clean (2.02s). Main chunk +0.07 KB gzipped.
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Files (4 modified / 7 new)

### Backend
**New:**
- `sendmymail-backend/src/routes/onboarding.ts`

**Modified:**
- `sendmymail-backend/src/server.ts` (mount)

### Frontend
**New:**
- `src/lib/api/onboarding.ts`
- `src/hooks/useOnboarding.ts`
- `src/pages/setup/Onboarding.tsx`
- `src/components/onboarding/OnboardingBanner.tsx`
- `src/styles/components/setup/Onboarding.module.scss`
- `src/styles/components/onboarding/OnboardingBanner.module.scss`
- `tasks/feature-onboarding-wizard/change_log.md`

**Modified:**
- `src/pages/setup/index.tsx` (re-export real Onboarding, drop unused import)
- `src/pages/dashboard.tsx` (mount banner above Hero)

## Out of scope (clean follow-ups)

| Item | Effort | When |
|---|---|---|
| **Auto-redirect /dashboard → /onboarding for first-time signups** | ~20 min | If activation rate is too low after measuring with audit logs |
| **Step 2 = verify sending domain** (impl-doc step 2) | After domain verify PR ships | Slot it between client + contacts |
| **Step 4 = send first campaign** (impl-doc step 4) | After this PR + domain verify | Routes to /campaigns/new; "completes" when first campaign goes to `status: 'sent'` |
| **PAN number collection** | ~1 day | Nepal tax compliance per impl doc; gates "real send" not onboarding |
| **`onboarding_progress` table** with per-step timestamps | ~30 min | When we need activation analytics ("median time to step 3") |
| **Skip survey** (1-tap "why are you skipping?") | ~2h | After we have enough skip rate data to want to fix it |
| **Concierge mode** (Calendly link in rail) | ~30 min | For high-value early customers |
| **Animated step completion** (rail tick celebration) | ~1h | Polish |
| **Mobile-only "swipe to next step"** | ~3h | If onboarding-on-mobile traffic matters |
