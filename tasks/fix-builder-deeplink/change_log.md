# Fix: deep-link / refresh inside guarded pages bounced to /dashboard

## Status: ✅ Done — 2026-06-12

Found while driving the live builder with headless Chrome during the
editor-chrome visual audit (feature-editor-premium-polish round 3).

---

## Symptom

Refreshing the browser (or pasting a URL) anywhere inside a guarded
page — most painfully the template builder — kicked the user to
`/dashboard` instead of staying where they were.

## Root cause (two stacked bugs)

1. **Auth boot race.** `authSlice` initialState hardcoded
   `status: 'anonymous'`. `useBootstrapAuth` only flips it to
   `'authenticating'` inside a `useEffect` — i.e. *after* the first
   render. So on first paint every guard saw `anonymous` and redirected
   to /login, even when a perfectly valid JWT sat in localStorage.
   Login's `Public` guard then saw the hydrated session and bounced to
   /dashboard. Net effect: refresh = teleport to dashboard.

2. **Dropped `next` param.** `ClientScoped` redirected to bare
   `/login` (unlike `AuthOnly`/`AgencyReady` which preserve
   `?next=<path>`), so even a genuinely logged-out user deep-linking
   into a builder URL wouldn't return there after login.

## Fix

- `src/store/slices/authSlice.ts` — initialState now computes
  `status: decodeJwt() ? 'authenticating' : 'anonymous'`. The decode is
  the same client-side expiry sanity check `useBootstrapAuth` uses;
  `/me` remains the real verification (an invalid token still ends in
  `clearAuth` → login redirect).
- `src/router/guards/index.tsx` — `ClientScoped` now redirects to
  `/login?next=<encoded pathname>` in both anonymous branches, matching
  the other guards. The login page already honors `next`.

## Verify

- Headless-Chrome deep link straight to
  `/clients/:id/templates/:id/edit` with a JWT in localStorage → lands
  in the builder, no dashboard bounce (verified live).
- `tsc` clean, lint at pre-existing baseline.

## Risk notes

- `decodeJwt()` in module scope runs at store-creation time — it's a
  pure localStorage read with try/catch, safe in SSR-less Vite. If we
  ever add SSR, this needs a guard.
- No behavior change for logged-out users beyond the preserved `next`.
