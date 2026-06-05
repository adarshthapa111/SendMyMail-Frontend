import { useState, useCallback } from 'react';
import { IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadTemplate } from '../../store/slices/editorSlice';
import { upsertTemplate } from '../../store/slices/templatesSlice';
import { updateTemplate } from '../../lib/api/templates';
import { stripForPersistence } from '../../tree/strip';
import { uploadPendingImages, countPendingImages } from '../../lib/mjml/uploadPendingImages';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/templates/SaveTemplateButton.module.scss';

interface Props {
  clientId: string;
  templateId: string;
  /** Display name for toast feedback. */
  templateName: string;
}

/* The Save button that lives in the editor Toolbar's `extras` slot.
   - Reads `editor.dirty` to enable/disable.
   - Before PATCH: uploads any locally-picked images (data: URLs) to
     Cloudinary, swaps them for hosted HTTPS URLs in a new tree. Discarded
     edits never trigger Cloudinary uploads — defer-to-save by design.
   - Strips editor-only fields + mj-preview from the *uploaded* tree before
     PATCH so the backend persists clean MJML.
   - Dispatches loadTemplate(uploadedTree) on success → editor state now
     reflects the Cloudinary URLs (so the next save doesn't re-upload the
     same images) + history clears (save = checkpoint).
   - Dispatches upsertTemplate so the cards-list reflects the new updatedAt
     when the user navigates back. */
export function SaveTemplateButton({ clientId, templateId, templateName }: Props) {
  const dispatch = useAppDispatch();
  const dirty = useAppSelector((s) => s.editor.dirty);
  const tree  = useAppSelector((s) => s.editor.tree);
  const [saving, setSaving] = useState(false);

  const onSave = useCallback(async () => {
    if (!dirty || saving) return;
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
      toast.success(`Saved ${templateName}`, { id });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Save failed. Please try again.';
      toast.error(msg, { id });
    } finally {
      setSaving(false);
    }
  }, [dirty, saving, tree, clientId, templateId, templateName, dispatch]);

  const disabled = !dirty || saving;
  const label = saving ? 'Saving…' : dirty ? 'Save' : 'Saved';

  return (
    <button
      type="button"
      className={`${styles.btn} ${dirty ? styles.dirty : styles.clean}`}
      onClick={onSave}
      disabled={disabled}
      title={dirty ? 'Save changes to this template' : 'No unsaved changes'}
    >
      {dirty ? <IconDeviceFloppy size={15} /> : <IconCheck size={15} />}
      <span>{label}</span>
      {dirty && !saving ? <span className={styles.dot} aria-hidden="true" /> : null}
    </button>
  );
}
