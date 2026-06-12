import { useEffect } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
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
   `useSaveTemplate` so TestSendButton can reuse the same pipeline.

   fix-editor-chrome V1 — two changes:
   - When clean, render NOTHING. The topbar status ("Saved · 2s ago")
     already says it; a second grayed "Saved" button was duplicate
     noise. Save-when-dirty is now the only filled button in the bar.
   - ⌘S / Ctrl+S actually bound here (the old tooltip promised it but
     no handler existed). Listener lives in this component so it works
     regardless of the button's visibility. */
export function SaveTemplateButton({ clientId, templateId, templateName }: Props) {
  const { save, saving, dirty } = useSaveTemplate(clientId, templateId, templateName);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); // always swallow — browser save-page dialog is never wanted here
        if (dirty && !saving) void save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirty, saving, save]);

  if (!dirty && !saving) return null;

  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.dirty}`}
      onClick={() => { if (!saving) void save(); }}
      disabled={saving}
      title={`Save changes to this template  (${navigator.platform.toLowerCase().includes('mac') ? '⌘S' : 'Ctrl+S'})`}
    >
      <IconDeviceFloppy size={15} />
      <span>{saving ? 'Saving…' : 'Save'}</span>
      {!saving ? <span className={styles.dot} aria-hidden="true" /> : null}
    </button>
  );
}
