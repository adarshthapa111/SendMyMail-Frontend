import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadTemplate } from '../../store/slices/editorSlice';
import { upsertTemplate } from '../../store/slices/templatesSlice';
import { updateTemplate } from '../../lib/api/templates';
import { stripForPersistence } from '../../tree/strip';
import { uploadPendingImages, countPendingImages } from '../../lib/mjml/uploadPendingImages';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';

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
