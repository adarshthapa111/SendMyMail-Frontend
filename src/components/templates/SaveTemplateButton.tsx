import { IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { useSaveTemplate } from './useSaveTemplate';
import styles from '@styles/components/templates/SaveTemplateButton.module.scss';

interface Props {
  clientId: string;
  templateId: string;
  /** Display name for toast feedback. */
  templateName: string;
}

/* The Save button that lives in the editor Toolbar's `extras` slot.
   Reads `editor.dirty` to enable/disable. All save logic (Cloudinary
   uploads → strip → PATCH → reload tree → upsert cards-list) lives in
   `useSaveTemplate` so TestSendButton can reuse the same pipeline. */
export function SaveTemplateButton({ clientId, templateId, templateName }: Props) {
  const { save, saving, dirty } = useSaveTemplate(clientId, templateId, templateName);

  const disabled = !dirty || saving;
  const label    = saving ? 'Saving…' : dirty ? 'Save' : 'Saved';

  return (
    <button
      type="button"
      className={`${styles.btn} ${dirty ? styles.dirty : styles.clean}`}
      onClick={() => { if (!disabled) void save(); }}
      disabled={disabled}
      title={dirty ? 'Save changes to this template' : 'No unsaved changes'}
    >
      {dirty ? <IconDeviceFloppy size={15} /> : <IconCheck size={15} />}
      <span>{label}</span>
      {dirty && !saving ? <span className={styles.dot} aria-hidden="true" /> : null}
    </button>
  );
}
