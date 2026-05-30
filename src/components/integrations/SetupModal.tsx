import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setConnected, setDisconnected } from '../../store/slices/integrationsSlice';
import { saveConnectionMeta, clearCredentials } from '../../integrations/credentials';
import type { PlatformDef } from '../../integrations/registry';
import ModalShell from './ModalShell';
import styles from '@styles/components/integrations/Modal.module.css';

interface Props {
  def: PlatformDef;
  onClose: () => void;
}

/**
 * Tier 2 / Tier 3 modal — no credentials, no API connection. Just shows the
 * user how this export works and offers an "Enable" toggle so the platform
 * shows up in the toolbar Export ▾ menu.
 */
export default function SetupModal({ def, onClose }: Props) {
  const dispatch = useAppDispatch();
  const connection = useAppSelector((s) => s.integrations.connections[def.id]);
  const isEnabled = connection?.status === 'connected';

  const enable = () => {
    const conn = {
      status: 'connected' as const,
      connectedAt: new Date().toISOString(),
    };
    saveConnectionMeta(def.id, conn);
    dispatch(setConnected({ id: def.id }));
    onClose();
  };

  const disable = () => {
    clearCredentials(def.id);
    dispatch(setDisconnected(def.id));
    onClose();
  };

  const instructions = def.tier === 2
    ? `${def.name} exports include platform-specific HTML attributes (unsubscribe links, content-block markers, etc.) baked in by the backend. Copy the HTML and paste it into your ${def.name} editor or content-block library.`
    : `${def.name} accepts standard ${def.value === 'Mjml' ? 'MJML' : 'HTML'} pasted into its template editor. The compiled output uses ${def.name}'s correct merge tags for unsubscribe.`;

  return (
    <ModalShell
      def={def}
      subtitle={isEnabled ? 'Enabled — visible in Export ▾' : 'Enable this export destination'}
      onClose={onClose}
      footer={
        <>
          {isEnabled ? (
            <>
              <button type="button" className={styles.btnDanger + ' ' + styles.left} onClick={disable}>
                Disable
              </button>
              <button type="button" className={styles.btn} onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.btn} onClick={onClose}>
                Cancel
              </button>
              <button type="button" className={styles.btnPrimary} onClick={enable}>
                Enable
              </button>
            </>
          )}
        </>
      }
    >
      <div className={styles.info}>{instructions}</div>

      <div className={styles.field}>
        <span className={styles.label}>How to use</span>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#65676b', lineHeight: 1.6 }}>
          <li>Enable {def.name} below.</li>
          <li>From the editor toolbar, click <span className={styles.code}>Export ▾</span>.</li>
          <li>Pick <strong>{def.name}</strong> — the {def.value.startsWith('Mjml') || def.value === 'Mjml' ? 'MJML' : 'HTML'} for this platform is copied to your clipboard.</li>
          <li>Paste into {def.name}.</li>
        </ol>
      </div>
    </ModalShell>
  );
}
