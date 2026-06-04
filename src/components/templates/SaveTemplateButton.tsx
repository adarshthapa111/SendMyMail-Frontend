import { useState, useCallback } from 'react';
import { IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { markSaved } from '../../store/slices/editorSlice';
import { upsertTemplate } from '../../store/slices/templatesSlice';
import { updateTemplate } from '../../lib/api/templates';
import { stripForPersistence } from '../../tree/strip';
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
   - Strips editor-only fields + mj-preview from the tree before PATCH.
   - Dispatches markSaved on success → button goes back to disabled.
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
    const id = toast.loading('Saving…');
    try {
      const cleaned = stripForPersistence(tree);
      const res = await updateTemplate(clientId, templateId, { mjmlSource: cleaned });
      dispatch(markSaved());
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
      const msg = err instanceof ApiError ? err.message : 'Save failed. Please try again.';
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
