import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadTemplate } from '../../store/slices/editorSlice';
import { upsertTemplate } from '../../store/slices/templatesSlice';
import { updateTemplate } from '../../lib/api/templates';
import { stripForPersistence } from '../../tree/strip';
import { uploadPendingImages, countPendingImages } from '../../lib/mjml/uploadPendingImages';
import { generateThumbnailUrl } from '../../lib/thumbnails/generateThumbnail';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import type { IMjmlNode } from '../../tree/types';

interface Options {
  /** Skip the success toast — caller will surface its own. */
  silent?: boolean;
}

/**
 * Save the current template tree end-to-end. Returns true on success,
 * false on failure (the failure toast is shown either way).
 *
 * Pipeline:
 *   1. Upload any pending Cloudinary images (mj-image / mj-social-element
 *      with `data:` srcs)
 *   2. Strip editor-only fields + mj-preview nodes
 *   3. PATCH the template
 *   4. Dispatch loadTemplate with the uploaded tree so the Redux tree
 *      contains cloud URLs (next save doesn't re-upload the same data URLs)
 *   5. Upsert the template in the cards-list slice so the list page
 *      reflects the new updatedAt next time the user navigates back
 *
 * Used by SaveTemplateButton (the Save button itself) and TestSendButton
 * (auto-saves before opening the test-send dialog so the test reflects
 * the current edits).
 */
export function useSaveTemplate(clientId: string, templateId: string, templateName: string) {
  const dispatch = useAppDispatch();
  const dirty    = useAppSelector((s) => s.editor.dirty);
  const tree     = useAppSelector((s) => s.editor.tree);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (opts: Options = {}): Promise<boolean> => {
    setSaving(true);

    const pendingCount = countPendingImages(tree);
    const id = toast.loading(
      pendingCount > 0
        ? `Uploading ${pendingCount} image${pendingCount === 1 ? '' : 's'}…`
        : 'Saving…',
    );

    try {
      const hosted  = await uploadPendingImages(tree);
      if (pendingCount > 0) toast.loading('Saving…', { id });

      const cleaned = stripForPersistence(hosted);
      const res     = await updateTemplate(clientId, templateId, { mjmlSource: cleaned });

      dispatch(loadTemplate({ tree: hosted }));
      dispatch(upsertTemplate({
        id:           res.data.template.id,
        agencyId:     res.data.template.agencyId,
        clientId:     res.data.template.clientId,
        name:         res.data.template.name,
        thumbnailUrl: res.data.template.thumbnailUrl,
        category:     res.data.template.category,
        isStarter:    res.data.template.isStarter,
        archived:     res.data.template.archived,
        createdBy:    res.data.template.createdBy,
        createdAt:    res.data.template.createdAt,
        updatedAt:    res.data.template.updatedAt,
      }));

      if (opts.silent) {
        toast.dismiss(id);          // caller will own the next toast
      } else {
        toast.success(`Saved ${templateName}`, { id });
      }

      /* Fire-and-forget thumbnail regeneration. Runs in the background
         after the toast clears — never blocks the user, never surfaces
         errors. Updates the cards-list cache when it completes so the
         /templates grid shows the fresh preview next time the user
         lands there. */
      void regenerateThumbnail(hosted, clientId, templateId, res.data.template, dispatch);

      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Save failed. Please try again.';
      toast.error(msg, { id });
      return false;
    } finally {
      setSaving(false);
    }
  }, [tree, clientId, templateId, templateName, dispatch]);

  return { save, saving, dirty };
}

/**
 * Background thumbnail pipeline. Renders the tree to HTML, screenshots,
 * uploads to Cloudinary, then silently PATCHes the template with the URL.
 *
 * All failures are swallowed — thumbnails are non-critical. The user
 * still has a working faux-preview card if this fails.
 *
 * Dispatched separately from the save flow's return value so the user's
 * Save success toast appears immediately without waiting on the 1-3s
 * thumbnail render.
 */
async function regenerateThumbnail(
  hostedTree: IMjmlNode,
  clientId: string,
  templateId: string,
  serverTemplate: {
    id: string;
    agencyId: string;
    clientId: string | null;
    name: string;
    category: string | null;
    isStarter: boolean;
    archived: boolean;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
  },
  dispatch: ReturnType<typeof useAppDispatch>,
): Promise<void> {
  try {
    const url = await generateThumbnailUrl(hostedTree);
    if (!url) return;

    /* Silent PATCH — no toast, no save-flow side effects. The thumbnail
       endpoint is just storing the URL on the template row. */
    const res = await updateTemplate(clientId, templateId, { thumbnailUrl: url });

    dispatch(upsertTemplate({
      id:           res.data.template.id,
      agencyId:     res.data.template.agencyId,
      clientId:     res.data.template.clientId,
      name:         res.data.template.name,
      thumbnailUrl: res.data.template.thumbnailUrl,
      category:     res.data.template.category,
      isStarter:    res.data.template.isStarter,
      archived:     res.data.template.archived,
      createdBy:    res.data.template.createdBy,
      createdAt:    res.data.template.createdAt,
      updatedAt:    res.data.template.updatedAt,
    }));

    /* Suppress "unused" warnings for the unused server template arg —
       it's kept in the signature for future use (audit context, fallback
       on thumbnail failure, etc.). */
    void serverTemplate;
  } catch {
    // Swallow — thumbnails are best-effort.
  }
}
