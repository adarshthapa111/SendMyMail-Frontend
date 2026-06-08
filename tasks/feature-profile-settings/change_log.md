# Feature: Profile settings — change log

> Real implementation for the `/settings/profile` tab that currently
> shows a placeholder. Per-user identity + contact + read-only account
> metadata. Avatar upload via existing Cloudinary infrastructure.
>
> References:
> - User model — [sendmymail-backend/prisma/schema.prisma](../../sendmymail-backend/prisma/schema.prisma)
> - Existing GET `/v1/auth/me` — returns user + agency
> - Cloudinary uploader — [src/lib/cloudinary/upload.ts](../../src/lib/cloudinary/upload.ts)
> - Theme/Appearance tab as pattern reference for tabbed-settings layout

---

## Status: ✅ Done — V1 shipped

Plan estimated 1 day; implemented in one focused pass.

### What landed (file-by-file)

**Backend (sendmymail-backend)**:

- `prisma/schema.prisma` — 3 new nullable columns on `User`:
  `jobTitle`, `bio`, `phone`. Unbounded at the column level; zod
  enforces 80 / 280 / 30 char limits respectively.
- `prisma/migrations/20260608155253_add_user_profile_fields/` — 3
  ALTER TABLE statements. No data backfill needed (all default null).
- `src/routes/auth.ts`:
  - GET `/v1/auth/me` extended to return the 3 new fields plus
    `createdAt` and `lastLoginAt` (for the Account info card).
  - PATCH `/v1/auth/me` (NEW, ~60 lines) — zod-validated body,
    Prisma partial update (only sends present fields), empty-string
    coerces to null for nullable optionals, audit log with field
    names (not values).
  - Shared `serializeUser()` helper used by both endpoints.

**Frontend (this repo)**:

- `src/lib/api/auth.ts` — `AuthUser` interface gained 5 optional
  fields (`jobTitle`, `bio`, `phone`, `createdAt`, `lastLoginAt`).
  Added `UpdateMeBody` type + `updateMe(body)` wrapper.

- `src/hooks/useAuth.ts` — added `refetchMe()` method. Fires GET /me,
  re-dispatches `setAuthed` so the topbar avatar + name re-render
  app-wide after a profile save.

- `src/components/settings/AvatarUploader.tsx` (new, ~115 lines) —
  84px circle showing either uploaded image or initials in
  primary-tinted bg. Hover/click triggers hidden file input.
  Validates MIME (png/jpeg/webp/gif) + size (5MB max) frontend-side
  before calling `uploadToCloudinary`. Spinner overlay during upload.
  Replace + Remove buttons in vertical action column.

- `src/components/settings/AvatarUploader.module.scss` (~115 lines).

- `src/pages/settings/Profile.tsx` (new, ~250 lines) — 3-card layout:
  - **Identity card**: AvatarUploader + Display name + Job title +
    Bio (with live `128 / 280` counter)
  - **Contact card**: Email (read-only with verified pill + "contact
    support to change" helper) + Phone
  - **Account card**: Role pill + role hint + Member since +
    Last login (read-only metadata grid)
  - Save bar with dirty-field count: `Save changes (3)`
  - Cancel button resets to last-saved state
  - `refetchMe()` after save → topbar + global state update

- `src/styles/components/settings/Profile.module.scss` (~165 lines)
  — 3-card layout, identity row (avatar + fields), bio char counter
  positioned absolute over textarea, account grid with label/value
  columns, sticky save bar with gradient fade-in.

- `src/pages/settings.tsx` — added `Profile` import + render branch
  for `activeTab === 'profile'`. Drops the placeholder for Profile.

### Decisions that came up during implementation (vs plan)

| Decision | What | Why |
|---|---|---|
| **Dependency array on form-sync useEffect** | Per-field (`user.id, user.avatarUrl, user.name`, etc.) NOT just `user.id` | A refetchMe() returns a new object but same id; field-level deps catch the field changes and resync the form. |
| **`react-hooks/set-state-in-effect` disable** | Kept as explicit `eslint-disable react-hooks/set-state-in-effect` block | The setState IS intentional: syncing server state → local form. The disable documents that intent. |
| **`updatedAt` reference removed** | AuthUser doesn't have it; used per-field deps instead | Caught at tsc-clean check. |
| **Save bar made sticky** | `position: sticky; bottom: 0` with gradient fade-in | If the form is tall (e.g. long bio), the Save button stays visible without scrolling. |
| **Empty-string to null coercion** | Backend converts `''` → null for nullable optionals | Frontend always sends the string value; backend normalizes. Cleaner contract. |
| **Audit logs field names only** | `metadata: { fields: ['name', 'bio'] }` | Don't bloat audit table with bio text. Names enough for "who changed what" forensics. |
| **AvatarUploader doesn't crop V1** | Whatever is uploaded gets clipped to circle via `object-fit: cover` | Cropping needs a separate UX dance (crop modal). Cloudinary upload is browser-direct so the unmodified file goes in. |
| **Account card has no "accessible clients" row** | Scope info isn't in the user response; would need a separate API call | V2 — when we surface scope details elsewhere. |
| **Email change deferred** | Read-only with "contact support" copy | Needs verify-new-email flow. V2 with Security tab. |
| **No "unsaved changes" navigation warning** | Out V1 | Adds router beforeunload complexity. V2 polish. |

### Build + lint gates

- Backend `tsc --noEmit`: **clean**
- Backend Prisma migration applies cleanly
- Frontend `tsc -b --noEmit`: **clean**
- Frontend `npm run build`: clean (2.17s). Main chunk +~0.5 KB
  gzipped (Profile + AvatarUploader components are tiny).
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new
  issues.**

### What's NOT verified yet

**Manual E2E pending** — easy this time:

1. Visit `/settings/profile` — 3 cards render with current user data
2. Change display name → topbar name updates after save
3. Upload avatar → topbar avatar updates after save
4. Remove avatar → falls back to initials in both places
5. Type long bio → counter shows "275 / 280" → input clipped at 280
6. Click Cancel after editing → form resets
7. Save with empty name → inline error shown, PATCH not fired
8. Save with no changes → button disabled
9. Refresh — saved values persist (loaded from server)

### Known V1 limitations (by design)

- **Email read-only** — change flow needs verification (V2)
- **No avatar cropper** — whatever the user uploads gets circle-clipped (V2 polish)
- **No timezone field** — no feature consumes it yet (V2 with scheduled sends)
- **No unsaved-changes navigation warning** (V2 polish)
- **No inline-edit per field** — single Save button at bottom (V2 polish)
- **Account info has no scope detail** — "accessible clients" count not shown V1
- **Audit log doesn't preserve historical values** — only field names

### Files at a glance

**Backend (2 modified / 1 migration)**:
- `prisma/schema.prisma` (+3 columns)
- `prisma/migrations/20260608155253_add_user_profile_fields/`
- `src/routes/auth.ts` (+~80 lines for PATCH /me + serializeUser)

**Frontend (3 modified / 4 new)**:
- Modified: `src/lib/api/auth.ts`, `src/hooks/useAuth.ts`,
  `src/pages/settings.tsx`
- New: `src/components/settings/AvatarUploader.tsx`,
  `src/pages/settings/Profile.tsx`, + 2 SCSS modules

---

## Original planning sections below (unchanged):

---

## Why this is next

After Empty States + Undo, the polish streak hits a natural pivot
point. The Settings page has 6 tabs but only 2 are real (Sending +
Appearance). The 4 placeholders (Profile / Notifications / Security /
Agency) are the next obvious surfaces to fill in.

Profile is the cleanest of those to ship first:
- All data is per-user (no agency-wide complexity)
- Field changes are low-risk (renaming yourself doesn't break others)
- Avatar upload reuses Cloudinary infra we already have
- Doesn't depend on features we haven't built

Notifications + Security + Agency each have V2 considerations that
push them out of "ship in 1 day" range.

---

## Scope

### IN V1

**Three cards, top to bottom:**

#### Card 1: Identity
- **Avatar** — upload via Cloudinary (existing `uploadToCloudinary`)
  - Empty state: initials in a primary-tinted circle
  - Uploaded state: image + Remove button + Replace button
  - Constraints: 5MB max, square crop preview, image/* MIME only
- **Display name** — text input, 1-100 chars, required
- **Job title** — optional text input, ≤80 chars (e.g. "Founder",
  "Marketing Lead")
- **Bio** — optional textarea, ≤280 chars with live counter
  ("128 / 280")

#### Card 2: Contact
- **Email** — read-only display with `email_verified` pill
  + helper text: "To change your email, contact support."
  (Email change requires verification flow → V2)
- **Phone** — optional text input, ≤30 chars
  (no format validation V1 — international users format differently)

#### Card 3: Account info (read-only)
- **Role** — pill (Owner / Admin / Member / Viewer) + explanation
- **Member since** — formatted date (Mar 2026)
- **Last login** — relative time ("2 hours ago")
- **Accessible clients** — count for member-scoped users

### Save behavior

- **"Save changes" button at the bottom**, NOT inline-per-field save
- Only enabled when fields are dirty (different from server state)
- Optimistic UI: PATCH fires + page state updates immediately
- Auth state (`useAuth.user`) refetches after save so topbar avatar
  + name reflect new values across the app

### OUT V1 (deferred follow-ups)

| Item | Why deferred | When |
|---|---|---|
| **Email change** | Needs new-email verification flow + re-send token + handling unverified state | V2 — pairs with Security tab work |
| **Password change** | Belongs in Security tab, not Profile | V2 — Security tab PR |
| **Two-factor auth** | Big feature, separate scope | V3 |
| **Connected accounts** (OAuth) | OAuthIdentity model exists but no OAuth flow yet | V2 with OAuth login PR |
| **Active sessions** | No session tracking V1 (JWT is stateless) | V2 — needs DB-backed sessions |
| **Account deletion** | Destructive flow needs confirm + data preservation policy | V3 |
| **Notification preferences** | Notifications tab is its own surface | V2 — Notifications PR |
| **Time zone preference** | No feature uses it yet (campaigns send immediately V1) | V2 with scheduled-sends |
| **Locale / language** | English-only V1 | V3 — i18n |
| **Avatar cropper** | V1 takes whatever the user uploads; rendered as circle | V2 polish |
| **Profile public visibility** | Per-team only V1; public profile pages later | Future |

---

## Data model

### Backend changes — add 3 optional User columns

```prisma
model User {
  // ... existing fields ...
  jobTitle  String?  @map("job_title")            // max 80 chars (API enforces)
  bio       String?                                // max 280 chars (API enforces)
  phone     String?                                // max 30 chars (API enforces)
  // ...
}
```

**Migration:** `add_user_profile_fields` — 3 new nullable columns. No
data backfill needed (all default null). No index changes.

### Why these 3 specifically

- `jobTitle` — small but high-value UX win on team member lists,
  invitations, audit logs ("Sabitra Maharjan, Marketing Lead")
- `bio` — used on hover/tooltip in team views; matches "show me who
  this person is" intent
- `phone` — agencies often need to reach team members urgently;
  storing here keeps it out of contacts/lists (which are FOR clients)

### Why NOT timezone V1

No feature consumes timezone right now. Campaigns send immediately;
the "scheduled sends" V2 PR will add timezone alongside it. Storing
it now would be premature — schema columns we don't read are dead
weight.

---

## Backend

### New endpoint — `PATCH /v1/auth/me`

```typescript
PATCH /v1/auth/me
Body: {
  name?:      string;    // 1-100 chars
  avatarUrl?: string | null;  // Cloudinary URL or null to remove
  jobTitle?:  string | null;
  bio?:       string | null;
  phone?:     string | null;
}
Returns: { data: { user: User } }   // same shape as GET /me
```

**Validation (zod):**
- `name` — trim, 1-100 chars
- `avatarUrl` — `z.url()` OR null, max 2000 chars
- `jobTitle` — trim, max 80, nullable
- `bio` — trim, max 280, nullable
- `phone` — trim, max 30, nullable (no format validation V1)

Strict zod (`.strict()`) so typos in body keys return 400 immediately.

**Auth:** `requireAuth()` — any signed-in user can edit their own
profile.

**Audit:** Write a single audit log entry per PATCH summarizing which
fields changed: `{ action: 'user.profile_updated', metadata: { fields:
['name', 'bio'] } }`.

Doesn't log the VALUES because audit trail bloats. The audit table
already preserves user-name history via `actorUserId` joins on the
historical user record — kind of (audit logs are append-only so
historical name doesn't change there).

### Files

```
sendmymail-backend/
  prisma/schema.prisma                                    (+3 columns)
  prisma/migrations/<ts>_add_user_profile_fields/migration.sql
  src/routes/auth.ts                                       (+ PATCH /me)
```

GET /me already returns the user; just needs to also include the 3 new
fields. PATCH is new (~40 lines).

---

## Frontend

### Files

```
src/pages/settings/Profile.tsx                            (new — main page)
src/components/settings/AvatarUploader.tsx                (new — upload + remove)
src/styles/components/settings/Profile.module.scss        (new)
src/styles/components/settings/AvatarUploader.module.scss (new)

src/lib/api/auth.ts                                        (+ updateMe API call)
src/hooks/useAuth.ts                                       (+ refresh after PATCH)

src/pages/settings.tsx                                     (modify — wire Profile tab)
```

### Page layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Settings                                                         │
│  ── Profile · Notifications · Security · Agency · Sending · Appearance
│                                                                   │
│  Profile                                                          │
│  Your identity across SendMyMail.                                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Identity                                                    │  │
│  │                                                             │  │
│  │  ┌──┐                                                       │  │
│  │  │SM│   Display name:  [Sabitra Maharjan_______]            │  │
│  │  └──┘   [Upload]  [Remove]                                  │  │
│  │                                                             │  │
│  │  Job title: [Marketing Lead________________]                │  │
│  │                                                             │  │
│  │  Bio:                                                       │  │
│  │  [Coffee + cooking + ideas. We help small Khukri Spices_]   │  │
│  │  [_______________________________________________]          │  │
│  │                                              128 / 280       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Contact                                                     │  │
│  │                                                             │  │
│  │  Email:  sabitra@khukri.com  [✓ Verified]                  │  │
│  │  To change your email, contact support.                    │  │
│  │                                                             │  │
│  │  Phone (optional): [+977 9800 000 000_____________]         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Account                                                     │  │
│  │                                                             │  │
│  │  Role:           [● Admin]  Full access to clients         │  │
│  │  Member since:   March 2026                                 │  │
│  │  Last login:     2 hours ago                                │  │
│  │  Clients access: All clients                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│                              [Cancel]  [Save changes (3)]         │
└──────────────────────────────────────────────────────────────────┘
```

Save button shows dirty-field count: "Save changes (3)" when 3 fields
changed. Disabled when no fields are dirty.

### AvatarUploader component

```typescript
interface Props {
  currentUrl: string | null;
  fallbackInitials: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}
```

States:
- **Empty** — circle with initials (e.g. "SM" in primary-tinted bg)
- **Uploading** — spinner overlay
- **Has avatar** — image + hover overlay with "Upload new" + "Remove"
- **Error** — error toast, return to previous state

Constraints:
- 5MB max
- image/png, image/jpeg, image/webp, image/gif accepted
- 256×256 minimum recommended (rendered at 80px in page)

Reuses `uploadToCloudinary(file)` from `src/lib/cloudinary/upload.ts`.

### useAuth integration

After PATCH succeeds, refresh `useAuth.user` so the topbar (which
shows avatar + name) reflects new values across the app:

```typescript
const onSave = async () => {
  await updateMe({ name, jobTitle, bio, phone, avatarUrl });
  await refetchMe();   // pulls fresh user, updates context, topbar re-renders
};
```

---

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| **3 new optional User columns** (jobTitle, bio, phone) | Yes | Small but high-value UX. No timezone V1 (no consumer feature). |
| **Save button, not inline-per-field** | Save button at bottom | Cleaner for first version. Inline-edit per field can be V2 polish. |
| **Save shows dirty-field count** | "Save changes (3)" | Subtle indicator of pending work. |
| **Avatar via existing Cloudinary** | Reuse `uploadToCloudinary` | Already in use for template images. Free tier carries scale. |
| **Avatar empty state** | Initials in primary-tinted circle | Consistent with hover/list contexts (Avatar component already does this) |
| **Email read-only V1** | Display + verified pill + "contact support to change" | Email change needs verification flow → V2 with Security tab. |
| **Phone validation** | None (max 30 chars only) | International formats vary widely; users format their own way. |
| **Bio max length** | 280 chars (Twitter-classic) | Forces brevity. Counter shown. |
| **Job title max length** | 80 chars | "Senior Marketing Strategist & Content Lead" fits. |
| **Audit log per save** | Single entry summarizing fields changed | Avoid bloating audit table per-field. |
| **Refresh useAuth after save** | Yes, refetch /me | Topbar avatar + name need to update everywhere |
| **Cancel button** | Resets form to last saved state | Standard pattern. |
| **Avatar removal** | Sends `avatarUrl: null` in PATCH | Clean semantics; Cloudinary asset itself isn't deleted (cheap; orphaned but harmless) |

---

## Edge cases

| Case | Behavior |
|---|---|
| User uploads 6MB image | Frontend rejects with toast "Max 5MB"; never sent to Cloudinary |
| User uploads non-image | Frontend rejects with toast "Image files only" |
| Cloudinary upload fails | Toast error; avatar stays at previous value |
| User saves with all fields empty | Validation rejects (name required); other empty values become null |
| User saves name as whitespace only | Server zod trim → empty string → 400 |
| User on member-scoped role | Same UI; role pill shows "Member" + accessible-client count |
| Two browser tabs open simultaneously editing | Last save wins (no optimistic locking V1). Acceptable. |
| User refreshes mid-edit | Form resets to server state. Unsaved changes lost. No "unsaved changes" warning V1. |
| Avatar URL becomes 404 (Cloudinary deletes) | `<img onError>` falls back to initials circle |
| Bio contains line breaks | Stored verbatim; rendered as multi-line in any future display surface |
| Phone with `+` prefix and spaces | Stored verbatim; not normalized |
| User removes avatar | PATCH `avatarUrl: null` → topbar falls back to initials |
| User saves identical values (no real changes) | `dirty` is false → Save button disabled; if force-saved, PATCH still fires + returns same data |
| Name contains emoji / unicode | Stored verbatim; rendered correctly in topbar / list contexts |

---

## Acceptance criteria

| Scenario | Expected |
|---|---|
| Visit `/settings/profile` | Three cards render with current user data |
| Change display name + click Save | Topbar name updates everywhere; toast confirms |
| Upload avatar | Avatar appears immediately + topbar avatar updates |
| Remove avatar | Falls back to initials circle in both places |
| Type 285-character bio | Counter shows "280 / 280" + input visually clipped at 280 |
| Click Cancel after editing | All fields reset to last-saved state |
| Save with name field empty | Inline error shown; PATCH not fired |
| Save with no changes | Button disabled |
| Member-scoped user views page | Role pill says "Member"; client-access count visible |
| Email change attempt | No input — read-only with helper text |
| Refresh page after save | Changes persist (loaded from server) |
| Reload mid-edit | Form resets to server values (no warning) |
| Cloudinary quota hit during upload | Toast error; previous avatar stays |
| Backend PATCH returns 500 | Toast error; form keeps user's edits so they don't lose data |

---

## Build, test, lint targets

| Gate | Expected |
|---|---|
| Backend `tsc --noEmit` | clean |
| Backend Prisma migration `add_user_profile_fields` | applies cleanly |
| Frontend `tsc -b --noEmit` | clean |
| Frontend `npm run build` | clean. Main chunk +~1 KB gzipped |
| Frontend `npm run lint` | 12 = pre-existing baseline. 0 new issues. |
| Manual: visit `/settings/profile` → see real data | not placeholder |
| Manual: change name + save → topbar updates | yes |
| Manual: upload avatar → renders | yes |

---

## Implementation order (when authorized)

**Step 1 — Backend (~2h)**
1. Schema: 3 new columns on User (`jobTitle`, `bio`, `phone`)
2. Migration `add_user_profile_fields` (generate + apply)
3. GET `/v1/auth/me` extended to return the 3 new fields
4. PATCH `/v1/auth/me` endpoint with zod validation + audit log
5. tsc clean

**Step 2 — Frontend API + hook (~30min)**
6. `src/lib/api/auth.ts` — `updateMe(body)` typed wrapper
7. `useAuth.ts` — `refetchMe()` helper (if not already)

**Step 3 — AvatarUploader component (~2h)**
8. `src/components/settings/AvatarUploader.tsx` — empty state + uploaded state + hover overlay
9. `src/styles/.../AvatarUploader.module.scss`
10. Wire `uploadToCloudinary` + file validation + error handling

**Step 4 — Profile page (~2h)**
11. `src/pages/settings/Profile.tsx` — 3 cards layout, dirty tracking, save handler
12. `src/styles/.../Profile.module.scss`
13. Inline error display, char counter, Cancel reset
14. Wire `refetchMe` after save

**Step 5 — Settings tab integration (~30min)**
15. `src/pages/settings.tsx` — replace Profile placeholder with `<Profile />`
16. Import + conditional render in TABS section

**Step 6 — Verify (~1h)**
17. Build + lint
18. Manual E2E: save name, upload avatar, remove avatar, edit bio
19. Update change_log Done entry

---

## V2 / future PRs

| PR | Title | Effort |
|---|---|---|
| V2-a | **Email change with verification flow** | 6-8h |
| V2-b | **Notifications preferences tab** | 1 day |
| V2-c | **Security tab** (password change, 2FA, active sessions) | 2-3 days |
| V2-d | **Agency settings tab** (name, country, billing email, danger zone) | 1 day |
| V2-e | **Avatar cropper** before upload | 4h |
| V2-f | **Time zone preference** when scheduled-sends ship | bundled |
| V2-g | **Inline-edit per field** instead of Save-all button | 4h |
| V2-h | **Unsaved changes warning** on navigation | 2h |
| V2-i | **Locale / language preference** when i18n ships | bundled |

---

*Plan locked. Ready to implement when authorized.*
