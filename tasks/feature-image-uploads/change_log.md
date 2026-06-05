# feature-image-uploads

Image hosting + replace flow for `<mj-image>` blocks. Browser uploads
directly to Cloudinary at template-save time — no backend involvement,
no database changes.

## Status: ✅ Done — V1 shipped (pending Cloudinary preset confirmation)

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Storage backend** | Cloudinary (browser-direct, unsigned upload) | Free 25 GB, no CC required, no backend needed, returns CDN URLs (fast for email recipients globally). |
| **Upload timing** | **Defer to save**, not on file pick | Discarded edits never consume quota. User picks → data URL in tree → save = upload + swap + persist. |
| **In-tree representation while pending** | Data URL (`data:image/jpeg;base64,...`) in `mj-image.attributes.src` | Always a valid image URL (renders in canvas + server preview), no `_meta` flag needed — the `data:` prefix is itself the "upload me" marker. |
| **Save flow** | Upload all → swap all → strip → PATCH → `loadTemplate(uploaded)` | After save, Redux tree has Cloudinary URLs so re-saves don't re-upload. History clears (save = checkpoint). |
| **Failure semantics** | All-or-nothing: any upload fails → whole save fails, tree unchanged, user retries | Avoids mixed-state trees (some hosted, some pending). Data URLs stay in tree → retry just re-runs. |
| **File constraints** | JPG, PNG, GIF, WebP, SVG; 5 MB max | Email-safe formats, sane size cap (matches Cloudinary preset config). Client-side check before encoding so we don't read a 50 MB file just to reject it. |
| **External URLs** | Pass through untouched (https://, http://) | Imported MJML with `<img src="https://anysite.com/...">` keeps original URLs. We only host what the user uploads. |
| **Asset library V1** | None — upload + use only | "Browse past uploads" is a clean future addition (add Asset rows server-side, render a modal). Not needed for core "replace this image" flow. |
| **Signing mode** | Unsigned upload preset | Required for browser-direct. The preset config (allowed types / size / folder) enforces the rules; secrecy of preset name is not the security model. |

## Files

### New
- **`src/lib/cloudinary/upload.ts`** (~90 lines): `uploadToCloudinary(file)` + `uploadDataUrl(dataUrl)`. POSTs `multipart/form-data` to `https://api.cloudinary.com/v1_1/<cloud>/image/upload` with `upload_preset` from env. Returns the `secure_url`. Throws with `{ cause }` chain on network / parse / Cloudinary errors.
- **`src/lib/mjml/uploadPendingImages.ts`** (~70 lines): Walks the tree, collects every `mj-image` with `data:` src, uploads all in parallel via `Promise.all`, returns a new immer-produced tree with cloud URLs. Fast-paths return-same-ref if zero pending. Bonus: `countPendingImages(tree)` for UI feedback.
- **`src/components/inspector/controls/ImageReplaceControl.tsx`** (~135 lines): Dashed-border drop zone with thumbnail preview, "Choose file" / "Replace" button, file picker via hidden `<input type="file">`, drag-and-drop, client-side type + size validation, "Local file — will upload on Save" hint when src is `data:`.

### Modified
- **`src/components/inspector/ImageInspector.tsx`** (+5 lines): Renders `ImageReplaceControl` above the existing `UrlInput` in the "Image" section. Both write to the same `src` attribute via `useAttrSetter` — fully composable, user can pick either path.
- **`src/components/templates/SaveTemplateButton.tsx`** (~25 line diff): Save flow now does `uploadPendingImages(tree)` → strip → PATCH → `loadTemplate(uploaded)`. Toast progresses through "Uploading N images…" → "Saving…" → "Saved {name}". Switched from `markSaved()` to `loadTemplate({ tree: uploaded })` so the Redux tree contains Cloudinary URLs after save (otherwise re-saves would re-upload the same data URLs).
- **`src/styles/components/inspector/controls/controls.module.css`** (+60 lines): `.imageDrop`, `.imageDropOver`, `.imageDropPreview`, `.imageDropPlaceholder`, `.imageDropButton`. All reference design tokens (`var(--color-...)`).
- **`.env.example`** + **`.env.local`**: Added `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET`. Cloud name `dyr0mkqlx` is set; preset name `sendmymail_unsigned` is a **placeholder pending user confirmation**.

### Not touched
- No backend changes
- No database changes
- No new dependencies (browser-native `fetch`, `FileReader`, `FormData`)
- No tree walker utility — single-use inline traversal in `uploadPendingImages` is simpler than a generic util

## How it works (end-to-end)

```
USER PICKS FILE
  └─ ImageReplaceControl validates (type / size / 5 MB)
  └─ FileReader → data URL (base64)
  └─ onPicked(dataUrl) → useAttrSetter → dispatch(setAttr({ src: dataUrl }))
  └─ Tree now has mj-image.src = "data:image/jpeg;base64,..."
  └─ Canvas renders the data URL (img src accepts data URLs)
  └─ Server preview compilation embeds the data URL in HTML (works)
  └─ editor.dirty = true → Save button enabled

USER CLICKS SAVE
  └─ countPendingImages(tree) → 3
  └─ toast.loading("Uploading 3 images…")
  └─ uploadPendingImages(tree):
       ├─ collectDataUrls(tree) → [d1, d2, d3]
       ├─ Promise.all([uploadDataUrl(d1), uploadDataUrl(d2), uploadDataUrl(d3)])
       │     └─ each: dataUrl → fetch().blob() → POST to Cloudinary → secure_url
       └─ produce(tree, draft => { walk + assign cloud URLs in same depth-first order })
  └─ toast.loading("Saving…")
  └─ stripForPersistence(uploaded) → strip _id, _meta, mj-preview (existing)
  └─ updateTemplate(clientId, templateId, { mjmlSource: cleaned })
  └─ dispatch(loadTemplate({ tree: uploaded }))   // tree now has Cloudinary URLs
  └─ dispatch(upsertTemplate(...))                // refresh card on list page
  └─ toast.success("Saved {name}")

USER REOPENS LATER OR PREVIEWS
  └─ All mj-image src are HTTPS Cloudinary URLs
  └─ Recipient inboxes load from res.cloudinary.com (global CDN)
  └─ Discarded edits during the session: never uploaded ✓
```

## Edge cases (verified by code review)

| Case | Behavior |
|---|---|
| User uploads, undoes, saves | Data URL not in tree → not uploaded ✓ |
| User uploads same image twice | Both upload as separate Cloudinary assets (different public_ids via "unique filename" preset setting). Minor waste, acceptable for V1. Dedup = future. |
| User replaces image, then replaces again before save | Only the second one is uploaded — first data URL was overwritten in the tree by the second `setAttr` ✓ |
| Upload fails mid-save (network, Cloudinary quota, etc.) | `Promise.all` rejects → caught → toast error with reason → tree unchanged → retry works ✓ |
| Imported MJML with `https://imgur.com/foo.jpg` | External URL untouched, only `data:` URLs are uploaded ✓ |
| User has unsaved data URLs + closes browser tab | Browser memory cleared → nothing uploaded → next session opens the previously-saved template (with whatever was saved last) ✓ — no orphans |
| Saved template re-opened, image replaced, saved | Old Cloudinary URL stays as-is in the tree (no upload). New image = data URL → uploads on save. Old Cloudinary asset remains in storage (no auto-cleanup V1). |
| `.env.local` missing Cloudinary keys | Upload throws "Cloudinary not configured. Set VITE_..." → toast.error → save fails cleanly. |
| Save tree contains no pending data URLs (just edited text) | `uploadPendingImages` returns same tree ref instantly (fast path), zero Cloudinary calls ✓ |

## Cloudinary setup checklist (one-time, user action)

1. ✅ Sign up at cloudinary.com (no CC required)
2. ✅ Cloud name: `dyr0mkqlx`
3. ⚠️ **Confirm the upload preset**:
   - Name in `.env.local` is **placeholder** `sendmymail_unsigned` — update to your actual preset name
   - **Signing Mode** must be `Unsigned` (Settings → Upload → Edit your preset)
   - Other settings already configured: Format whitelist `jpg,png,gif,webp,svg`, Folder `sendmymail/`, Overwrite `false`, Unique filename `true`
   - Recommended addition: Max file size `5000000` (5 MB)

## Build + lint

- `tsc -b --noEmit`: clean
- `npm run build`: clean (1.83s). Builder chunk grew **94.95 → 95.75 KB** (gzip +0.8 KB) for the new control + upload utilities. Negligible.
- `npm run lint`: 12 problems = pre-existing baseline. **0 new issues from this PR.**

## Out of scope (cleanly composable future PRs)

| Feature | Effort | When to add |
|---|---|---|
| Asset library ("browse past uploads for this client") | ~4h: backend Asset model + endpoint + frontend modal | When users start having brand asset re-use needs |
| Per-client folder isolation in Cloudinary | ~30 min: pass `folder: sendmymail/${clientId}/` at upload time | When >1 paying customer or you want tidy Cloudinary dashboard |
| Auto-cleanup of orphaned Cloudinary assets | ~3h: background job that diffs Cloudinary contents vs. URLs in saved templates | When storage approaches limits (>20 GB) |
| Drag-and-drop directly onto the canvas image | ~2h: extend canvas's `ImageLeaf` with drop handlers | After core flow is validated |
| Image transformation (resize / crop / format auto) | ~2h: append Cloudinary transformation params to URL when emitting MJML | When users want auto-optimization |
| Progress bars per image during upload | ~2h: switch from `fetch` to `XMLHttpRequest` for upload progress events | When users complain about "Saving…" silence on big uploads |
| Migrate from unsigned to signed presets | ~3h: backend signature endpoint + frontend signed-mode upload | When abuse is observed or auth becomes mandatory |

## Why not the backend?

Briefly considered + rejected:

- **Backend `/v1/assets/upload` endpoint** — adds infra (storage abstraction, disk/S3 wiring, env config, multipart middleware) for zero user-visible benefit. Cloudinary's unsigned upload is the same security model (anything client-visible can be abused) without our origin in the path. Re-adopt if we ever need server-side validation / virus scanning / DRM watermarking — orthogonal to the upload mechanism.
- **Asset model in Postgres** — without a library UI, the row would only exist to track "we own this Cloudinary URL," which Cloudinary's own dashboard already tells us. Add when we add the library.
- **Dual-mode disk/cloud storage abstraction** — was the original plan when we thought backend would handle uploads. With browser-direct upload to Cloudinary, the abstraction has nowhere to live.
