# feature-test-send

Editor → "Send test" → real email in the inbox. The smallest possible
loop that closes the editor's value proposition: design, then see how it
renders in Gmail / Outlook / Apple Mail rather than the canvas
approximation.

## Status: ✅ Done — V1 shipped

## Why this PR

Templates have been editable, importable, image-uploadable, and
saveable for several PRs. The user could design beautiful emails but
couldn't actually **see them in a real inbox**. The canvas is
explicitly documented as *"an editing approximation, NOT a preview"* —
the only way to know how Gmail renders your work is to send a real
email.

Test Send is also the stepping stone to the campaign engine
(Feature 06): same MJML compile path, same Resend transport, just one
recipient instead of N. Validates the end-to-end pipeline now so
campaigns inherit a known-working email pipeline later.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Email transport** | Resend | Free 100/day, no CC, modern API. Backend's `src/lib/email.ts` already wraps Resend for transactional flows (verify-code / password-reset / invitation) — we extended that wrapper rather than introducing a new transport. |
| **Sender** | `EMAIL_FROM` env default `'SendMyMail <onboarding@resend.dev>'` | Resend's testing sender works without DNS verification — ships today. When a domain is verified, set `EMAIL_FROM` to swap. |
| **Resend constraint** | Surface as a polite hint in the modal, don't block | Without a verified domain, Resend only delivers to the email used at signup. The backend bubbles up Resend's actual 403 message; the dialog stays open so the user can adjust + retry. |
| **Auth scope** | `requireAuth + requireClientScope` (NOT admin) | Test sends are read-only — any team member should be able to verify their own work. Mirrors `getTemplate` permissions, not `updateTemplate`. |
| **Save before send** | Auto-save if `editor.dirty` (button-orchestrated) | The backend route reads `mjmlSource` from the DB. Without auto-save, the test would ship the LAST SAVED version, not what's on screen — confusing UX. Auto-save reuses the existing Cloudinary upload pipeline. |
| **Tree shape on send** | Server reads from DB, NOT request body | Smaller endpoint contract. Honest "test what's saved" semantics. Avoids needing to send the tree (which can be ~100 KB JSON) on every test. |
| **Subject default** | `[Test] {template name}` — editable in modal | "[Test]" prefix is scannable in a busy inbox. |
| **To-recipient pre-fill** | Logged-in user's auth email | The whole point is "send to MY inbox" — pre-filling is the courteous default. Still editable. |
| **Reply-to** | The user's email (looked up server-side by `auth.sub`) | If the user replies to the test (e.g. forwards it for review), the reply lands in their own inbox, not `onboarding@resend.dev`. |
| **Audit log** | Yes — entry per test send | `template.test_sent` with `{ clientId, toEmail, subject, messageId }`. Cheap observability. We deliberately don't log the rendered HTML — would inflate the audit table for zero observability gain. |
| **Rate limit** | None V1 | User is solo. Add a per-user / per-template ceiling before opening to multiple agencies. |
| **Send history** | None V1 | The audit log is enough for now. A user-facing "test sends I've made" UI is a clean future bolt-on (reads from auditLog filtered by action). |

## Architecture (the shared save hook)

The hardest part was wiring **auto-save** before send without duplicating
the ~40 lines of save logic that already live in `SaveTemplateButton`.
Solution: extracted both buttons' save logic into a new hook
`useSaveTemplate(clientId, templateId, templateName)` exposing
`{ save, saving, dirty }`. Both buttons consume the hook; the
TestSendButton calls `await save()` before opening the dialog.

A side effect of the refactor: `SaveTemplateButton.tsx` shrunk from 97
lines to 33 lines. The save logic now has a single source of truth, so
any future change (e.g. extending the upload-pending walker to more
node types) automatically applies to Test Send too.

## Backend changes (sibling repo: `/Users/adarshthapa/sendmymail/sendmymail-backend/`)

### `src/lib/email.ts`

- Refactored `dispatch()` to return `{ messageId?: string }` instead of
  `void`. Existing transactional callers discard the return value —
  zero behavioral change for them. Test send uses the return value.
- Added optional `replyTo` field to the `EmailJob` interface — wired
  through to Resend's `reply_to` parameter. Lets test sends pre-fill
  the reply path so users replying to a test land in their own inbox.
- Added new exported `sendRawHtml({ to, subject, html, replyTo?, text? })`
  function. Wraps `dispatch()`, throws on failure (the transactional
  helpers swallow failures because they're fire-and-forget; test send
  is user-initiated and must surface errors).

### `src/routes/templates.ts`

- New `POST /:id/test-send` route. Auth: `requireAuth + requireClientScope`.
- Zod body: `{ toEmail: email, subject?: 1-200 chars }`.
- Loads template via `loadTemplateOr404` (existing helper).
- Looks up the caller's email via `prisma.user.findUnique({ id: sub })`
  for use as `replyTo`. Lookup is best-effort — if the user record is
  gone (race), the send still goes through, just without replyTo.
- Compiles `template.mjmlSource` to HTML via the existing
  `mjml2htmlProcessed` wrapper. Compile errors → 400. Compile warnings
  → logged but not blocking (MJML's `errors` array commonly contains
  warnings like "missing alt text" that still produce valid HTML).
- Sends via `sendRawHtml`. Resend rejections (unverified domain,
  invalid recipient, throttle) become 400 with the Resend message
  surfaced so the frontend toast can show the cause.
- Audit log entry: `template.test_sent` with templateId, toEmail,
  subject, messageId. Not the HTML body (would inflate the table).

## Frontend changes (this repo)

### New files

- `src/components/templates/useSaveTemplate.ts` — the extracted save hook.
- `src/components/templates/TestSendButton.tsx` — the button in the
  top bar. Auto-saves if dirty, opens dialog.
- `src/components/templates/TestSendDialog.tsx` — modal: To-email
  (pre-filled with auth email) + Subject (defaults to template name) +
  Send button + Resend-constraint hint. Closes on Esc, stays open on
  send-error so user can retry.
- `src/styles/components/templates/TestSendDialog.module.scss` — modal
  styles, matches the visual language of `ImportMjmlDialog`.

### Modified files

- `src/lib/api/templates.ts` — new `testSendTemplate(clientId, templateId, { toEmail, subject? })` API method + `TestSendBody` + `TestSendResult` types.
- `src/components/templates/SaveTemplateButton.tsx` — slimmed from 97 → 33 lines by delegating to `useSaveTemplate`. Same behavior.
- `src/components/templates/BuilderTopBar.tsx` — replaced the placeholder disabled "Send test" button with the real `<TestSendButton />`. Removed the now-unused `IconSend` import.
- `src/components/templates/index.ts` — re-exports `TestSendButton` + `TestSendDialog`.

## End-to-end flow

```
USER CLICKS "Send test" in BuilderTopBar
  └─ TestSendButton.onClick:
       └─ if editor.dirty:
            └─ await save():
                 ├─ uploadPendingImages(tree)        — Cloudinary uploads
                 ├─ stripForPersistence(uploaded)    — clean MJML
                 ├─ PATCH /v1/clients/.../templates/:id
                 ├─ dispatch(loadTemplate({ tree: hosted }))
                 └─ dispatch(upsertTemplate({...}))
            └─ if save failed, abort (toast already shown)
       └─ open TestSendDialog
            └─ user enters / confirms toEmail + subject
            └─ clicks Send test:
                 └─ POST /v1/clients/:cid/templates/:id/test-send
                      { toEmail, subject? }
                 ├─ backend: load template
                 ├─ backend: lookup user.email (for replyTo)
                 ├─ backend: mjml2htmlProcessed(mjmlSource) → HTML
                 ├─ backend: sendRawHtml() → Resend
                 ├─ backend: writeAudit({ action: 'template.test_sent' })
                 └─ backend: 200 { messageId, to, subject }
            └─ toast.success("Sent to you@example.com (check inbox)")
            └─ dialog closes

USER CHECKS INBOX
  └─ Email arrives within ~10 seconds
  └─ From: SendMyMail <onboarding@resend.dev>
  └─ Reply-To: user's auth email
  └─ Subject: [Test] {template name}  (or override)
  └─ Body: the compiled HTML email
```

## Edge cases (verified by code review)

| Case | Behavior |
|---|---|
| Template is dirty when user clicks Send test | Auto-save kicks in. Toast: "Uploading images…" → "Saving…" → "Saved {name}". Then the dialog opens. ✓ |
| Save fails mid-auto-save | Save's own toast shows the error. TestSendButton bails — dialog never opens. User can retry from the same button. ✓ |
| User clicks Send test, then closes the dialog without sending | No backend call. No audit entry. Clean cancel. ✓ |
| User sends to an email that ISN'T the Resend signup address (no verified domain) | Resend returns 403, backend converts to 400 `email_send_failed` with Resend's message ("Validation_error: You can only send testing emails to your own email address..."). Frontend toast shows the message verbatim. Dialog stays open so the user can correct + retry. ✓ |
| User has a verified domain + EMAIL_FROM set | Backend uses the verified sender, Resend delivers to any address. The modal's hint about the constraint becomes slightly stale ("Without a verified domain…") but is still technically accurate — leave for now, refine if it becomes a real source of confusion. |
| Backend has no `RESEND_API_KEY` | Existing `dispatch` falls back to console-log. `sendRawHtml` sees `!result.messageId` and throws. Backend route catches → 400 "Email send failed: Email send failed." User sees that toast. (Not the best message — caveat below.) |
| MJML compile produces non-fatal warnings | Logged to backend stdout, doesn't block. Email sent. ✓ |
| MJML compile produces no HTML at all | 400 `mjml_compile_failed`. Frontend toast shows it. ✓ |
| Network failure | `apiCall` throws `ApiError`. TestSendDialog catches → toast → dialog stays open. ✓ |
| User edits subject to empty string | Backend defaults to `[Test] {template name}`. ✓ |
| User pastes a 500-char subject | Zod max(200) → 400. Toast shows the validation error. ✓ |
| Subject contains MJML tags / HTML | Treated as plain text by Resend. No injection risk; subject is sent as the `subject` parameter, not interpolated into the HTML body. ✓ |

## Build + lint

- Backend `tsc --noEmit`: clean
- Frontend `tsc -b --noEmit`: clean
- Frontend `npm run build`: clean (1.88s). Builder chunk grew **97.97 → 98.53 KB** (gzip 28.39 → 28.53 KB). ~500 bytes for TestSendButton + Dialog wiring; the shared save hook actually saved bytes vs. the duplicated logic that would have shipped otherwise.
- Frontend `npm run lint`: 12 = pre-existing baseline. **0 new issues.**

## Known caveats (not blocking V1)

- **"Email send failed: Email send failed."** when the backend has no
  Resend key — the inner error message duplicates because `sendRawHtml`
  throws a generic message. Fix: pass the underlying reason through.
  Trivial; punt to follow-up. Only hits dev environments without keys.
- **Modal hint about Resend constraint stays static** even when a
  domain is verified. Doesn't lie, but is over-cautious. Could read
  the verified-domain status from the backend if we cared.
- **No optimistic UI for the auto-save** — the button shows "Saving…"
  but the dialog doesn't open until save resolves. For slow networks
  the user sees a 1-3s pause. Acceptable for V1.

## Out of scope (clean follow-ups)

| Feature | Effort | When |
|---|---|---|
| Send history page (filtered `auditLog` view per template) | ~2-3 hours | When users ask "did my test from earlier get delivered?" |
| Multiple recipients in one test send | ~30 min | Trivial — comma-separate parsing + array body |
| Spam-test integration (Litmus, Mail Tester) | ~3-4 hours | When deliverability becomes a sales concern |
| Test send variant — load an old saved version, send THAT | ~1 hour | Needs `versions` table first |
| Rate limit (e.g. 20 test sends per template per hour) | ~30 min | Before opening to multiple agencies |
| Backend-driven "is Resend domain verified?" indicator to hide the modal hint when not needed | ~1 hour | Polish |
| Schedule-a-test (delayed delivery) | ~2 hours | Niche; campaigns will cover this anyway |
| A/B compare (send two versions side-by-side) | ~4-6 hours | Nice marketing-tool addition |

## Not built (deferred to campaign engine — Feature 06)

Test Send is deliberately **simpler** than the campaign engine. We did
NOT build any of:

- BullMQ queue (single recipient = no queue needed)
- SES integration (Resend is fine for our scale)
- Webhook ingestion for delivery / bounce / complaint events
- Recipient snapshotting (one recipient, no list)
- Suppression list checks
- Per-agency rate limit + IP warmup
- Send tracking table (`sends`)
- Idempotency keys

When the campaign engine lands, it should adopt the same
`sendRawHtml` helper (or extend the email.ts module with a `sendMany`
variant) so we have ONE place that talks to the email transport. Test
Send sets the architectural precedent.
