import { useState, useCallback } from 'react';
import { IconSend } from '@tabler/icons-react';
import { useSaveTemplate } from './useSaveTemplate';
import { TestSendDialog } from './TestSendDialog';
import topBarStyles from '@styles/components/templates/BuilderTopBar.module.scss';

interface Props {
  clientId:     string;
  templateId:   string;
  templateName: string;
}

/**
 * "Send test" button in the editor top bar. Sits between the device toggle
 * and the Preview button.
 *
 * Click flow:
 *   1. If the editor is dirty: auto-save first (uploads pending Cloudinary
 *      images, persists the latest tree). Save handles its own toast.
 *   2. Open TestSendDialog so the user can confirm / change the recipient.
 *
 * Save-first is required because the backend's test-send route reads
 * `mjmlSource` from the database. Without auto-save, a test would ship the
 * LAST SAVED version, not what's on screen — confusing for users actively
 * iterating. We do this in the button, not the dialog, so the dialog stays
 * focused on collecting recipient + subject.
 */
export function TestSendButton({ clientId, templateId, templateName }: Props) {
  const { save, saving, dirty } = useSaveTemplate(clientId, templateId, templateName);
  const [open, setOpen] = useState(false);

  const onClick = useCallback(async () => {
    if (dirty) {
      const ok = await save();
      if (!ok) return;          // toast already shown by save()
    }
    setOpen(true);
  }, [dirty, save]);

  const disabled = saving;

  return (
    <>
      <button
        type="button"
        className={topBarStyles.actionBtn}
        onClick={onClick}
        disabled={disabled}
        title={dirty ? 'Save first, then send a test email' : 'Send a test email to preview this template'}
      >
        <IconSend size={15} /> {saving ? 'Saving…' : 'Send test'}
      </button>
      {open && (
        <TestSendDialog
          clientId={clientId}
          templateId={templateId}
          templateName={templateName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
