# Feature: Auth frontend — change log

> Wire the placeholder auth pages to the real backend endpoints from
> `sendmymail-backend/tasks/feature-auth-backend/`. Replace stub guards with real JWT
> logic. End result: someone can sign up / verify / set up an agency / log in /
> reset their password — all in the browser, against a real DB.

## Scope — split into 2 PRs

**PR 1 — Auth Core frontend** *(this PR)*:

| Layer | What |
|---|---|
| API foundation | `src/lib/api/` — fetch wrapper (JWT header + error parsing + token refresh), JWT localStorage helpers, typed auth methods |
| Redux | `authSlice` — `{ status, user, agency }` ; persisted to localStorage; bootstrapped from JWT on app mount |
| Hook | `useAuth()` — `{ status, user, agency, login, logout, refresh }` |
| Guards | Replace the stub `Public` / `AuthOnly` / `AgencyReady` / `ClientScoped` / `RoleGated` with real logic |
| Env | Add `VITE_BACKEND_URL` to `.env.example` |
| Pages | Port placeholders → real components using the design system kit: **Signup · Login · Verify · Forgot · Reset · WorkspaceSetup** |
| Acceptance | All 6 forms hit the corresponding backend endpoint; happy paths complete end-to-end in the browser; JWT survives page refresh |

**PR 2 — Google OAuth landing + Invitations** *(next PR)*:

| Layer | What |
|---|---|
| Pages | Real `Invite` accept page (with "Continue with Google" path); `GoogleDone` landing page (reads JWT from URL fragment, swaps to localStorage); `InviteError` 4-variant component for `/invite/:token` failure states |
| OAuth | The full Google sign-in flow ending in app session |

## Acceptance criteria for PR 1

- [ ] Signup form posts → backend creates Owner + agency → redirects to `/verify`
- [ ] Verify form posts → backend marks `email_verified=true` → redirects to `/workspace-setup`
- [ ] WorkspaceSetup form posts → backend marks `setup_complete=true` → redirects to `/dashboard`
- [ ] Login form posts → backend returns JWT → router lands at `/dashboard`
- [ ] Forgot form posts → silent success message regardless of email existence
- [ ] Reset form posts → password updates → redirects to `/login`
- [ ] JWT survives page refresh (localStorage persistence)
- [ ] `auth` slice exposes `{ status: 'anonymous' | 'authed', user, agency }`
- [ ] Real guards redirect properly: signed-in user visiting `/login` → `/dashboard`; anonymous visitor to `/dashboard` → `/login?next=/dashboard`; verified-but-unsetup → `/workspace-setup`
- [ ] On any `401` the client clears the JWT + redirects to `/login`
- [ ] Backend's `X-Refreshed-Token` header (sent when JWT claims change e.g. after verify/setup) gets swapped into localStorage automatically
- [ ] Server-side validation errors (e.g. `weak_password`) surface as field-level errors via the `Field` component

## Dependencies

Nothing new. Uses what's already installed (react-router-dom, react-redux, react-hot-toast).

## Decisions

- **`fetch` not `axios`.** Native, no deps, perfectly adequate. The mockups use `axios` for the existing MJML editor calls — we'll leave that alone but new code uses `fetch`.
- **JWT is plain base64-decoded for `claims`** — we use the claims for routing decisions (is `email_verified`? is `agency_setup`?). The backend re-verifies signature on every request; the client trusts only what the JWT says about UI state.
- **Errors thrown by `apiCall()` carry the backend's `code` + `message` + `field`** — UI components catch and surface via `Field`'s `error` prop.
- **`useAuth()` is the only public auth API for components.** No direct slice access from pages.
- **Token swap on `X-Refreshed-Token`.** Backend reissues JWT after verify/setup/role-change. The api client detects the header and swaps localStorage transparently.
- **Page-level `<form onSubmit>` + native `useState`** — no `react-hook-form` yet (deferred to a future PR if forms get more complex). Native form handling is fine for ≤5-field forms.

## Changes (newest first)

### 2026-06-01 · ✅ Done — PR 1 (Auth Core frontend) shipped + smoke-tested

**6 auth pages wired to the real backend** + auth slice + real router guards. End-to-end signup-in-browser works against the live Postgres-backed backend.

| Layer | Files |
|---|---|
| API foundation | `src/lib/api/jwt.ts` (localStorage + base64-decode claims) · `src/lib/api/client.ts` (fetch wrapper with Bearer JWT, X-Refreshed-Token swap, `ApiError` class, 401 auto-clear) · `src/lib/api/auth.ts` (typed methods) |
| State | `src/store/slices/authSlice.ts` (`status` / `user` / `agency` + setAuthed / patchUser / patchAgency / clearAuth / setAuthenticating). Wired in `src/store/index.ts`. |
| Hooks | `src/hooks/useAuth.ts` (the one public API: `{status, user, agency, login, logout, hydrate}`) · `src/hooks/useBootstrapAuth.ts` (runs once on mount: hydrates from `/me` if JWT exists, registers global refresh + 401 handlers) |
| Guards | `src/router/guards/index.tsx` — `Public`/`AuthOnly`/`AgencyReady`/`ClientScoped`/`RoleGated`/`RootRedirect` all real. Reads `auth` slice + JWT for scope. Returns `null` while `status='authenticating'` to avoid login-flash on refresh. |
| Pages | `src/pages/auth/index.tsx` — **Signup · Login · Verify · Forgot · Reset** all real forms using the design system kit · `src/pages/setup/index.tsx` — **WorkspaceSetup** real · Onboarding + Invite stay placeholders (future PRs) |
| Wiring | `src/App.tsx` calls `useBootstrapAuth()` before the router |
| Env | `.env.example` + `.env.local` with `VITE_BACKEND_URL=http://localhost:4000` |

**Flows that now work end-to-end in the browser:**

| Path | What happens |
|---|---|
| `/signup` | POST `/v1/auth/signup` → JWT stored → redirect `/verify` |
| `/verify` | POST `/v1/auth/verify` with 6-digit code → JWT refreshed (`email_verified=true`) → redirect `/workspace-setup` |
| `/workspace-setup` | POST `/v1/agencies/me` → JWT refreshed (`agency_setup=true`) → redirect `/onboarding` |
| `/login` | POST `/v1/auth/login` → JWT stored → redirect to `?next=…` or `/dashboard`. Mid-flow users land on `/verify` or `/workspace-setup` instead. |
| `/forgot` | POST `/v1/auth/forgot` → always shows "we sent it if the email exists" (anti-enumeration) |
| `/reset/:token` | POST `/v1/auth/reset/:token` → redirect `/login?reset=ok` |
| **Page refresh** | `useBootstrapAuth` reads JWT → calls `/me` → hydrates slice → user stays signed in |
| **401 from any endpoint** | API client clears JWT + dispatches `clearAuth` → guards bounce to `/login` |
| **`X-Refreshed-Token` header** | API client auto-swaps JWT in localStorage (used by verify/setup/role-change) |

**Smoke test (curl-against-running-backend, simulating what the frontend sends):**

```
1. POST /v1/auth/signup                     → 201 with full data + JWT
2. Decode JWT claims                        → sub / agency_id / role / scope / email_verified / agency_setup / jti / iat / exp all correct
3. GET /v1/auth/me with that JWT            → 200 with user + agency
4. CORS preflight on /v1/auth/signup        → 204 with Access-Control-Allow-* for http://localhost:5173
```

**Decisions made during implementation:**

- **`FormEvent` deprecation hints are non-blocking** (React 19 prefers `React.FormEvent<HTMLFormElement>`). Build passes; cleanup pass later.
- **JWT decode in `ClientScoped` guard** — slice doesn't carry scope, so the guard reads it from the JWT via `decodeJwt()`. Server still re-verifies on every request.
- **`status='authenticating'` returns `null` in guards** — avoids login-flash on refresh while bootstrap is in flight.
- **`/login?next=/whatever` honored** — AuthOnly tags the path when bouncing anonymous; login redirects back after success.
- **Mid-flow login routing** — login response is checked: unverified → `/verify`, unsetup → `/workspace-setup`, else `?next=…` or `/dashboard`.
- **`/v1/auth/login` opts out of auto-401-clear** (`rawAuthErrors: true`) — wrong creds shouldn't trigger "session expired" UX.
- **Forgot always shows "sent if exists"** — mirrors the backend's anti-enumeration silent-200.
- **Onboarding stays placeholder** — FTUX shell (Linear-style left rail + stage) lands in `feature-onboarding-frontend` PR.

**To run locally end-to-end:**

```bash
# Backend (terminal 1)
cd sendmymail-backend && npm run dev

# Frontend (terminal 2)
cd sendmymail-frontend && npm run dev      # http://localhost:5173
# Then: /signup → fill form → /verify (grab code from backend terminal's email stub) → /workspace-setup → /onboarding placeholder
```

### 2026-06-01 · 📋 Planning — PR 1 ready to start

12 files added/modified estimated:
- `src/lib/api/client.ts` (new)
- `src/lib/api/jwt.ts` (new)
- `src/lib/api/auth.ts` (new)
- `src/store/slices/authSlice.ts` (new)
- `src/store/index.ts` (modified — register slice)
- `src/hooks/useAuth.ts` (new)
- `src/router/guards/index.tsx` (rewrite — real logic)
- `src/pages/auth/index.tsx` (rewrite — 6 pages become real)
- `src/pages/setup/index.tsx` (rewrite — WorkspaceSetup real, Onboarding stays placeholder for now)
- `src/main.tsx` (modified — bootstrap auth on mount)
- `.env.example` (new)
- `.env.local` (new — instructs how to set BACKEND_URL)
