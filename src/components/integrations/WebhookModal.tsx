import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setConnected, setDisconnected } from '../../store/slices/integrationsSlice';
import {
  clearCredentials,
  loadCredentials,
  saveConnectionMeta,
  saveCredentials,
} from '../../integrations/credentials';
import type { PlatformDef } from '../../integrations/registry';
import ModalShell from './ModalShell';
import styles from '@styles/components/integrations/Modal.module.css';

interface Props {
  def: PlatformDef;
  onClose: () => void;
}

export default function WebhookModal({ def, onClose }: Props) {
  const dispatch = useAppDispatch();
  const connection = useAppSelector((s) => s.integrations.connections[def.id]);
  const isConnected = connection?.status === 'connected';

  const existing = loadCredentials(def.id);
  const [url, setUrl] = useState(existing?.url ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setError('Enter a full URL starting with http:// or https://');
      return;
    }
    saveCredentials(def.id, { url: trimmed });
    const conn = {
      status: 'connected' as const,
      connectedAt: new Date().toISOString(),
      url: trimmed,
    };
    saveConnectionMeta(def.id, conn);
    dispatch(setConnected({ id: def.id, url: trimmed }));
    onClose();
  };

  const onDisconnect = () => {
    clearCredentials(def.id);
    dispatch(setDisconnected(def.id));
    onClose();
  };

  return (
    <ModalShell
      def={def}
      subtitle={isConnected ? 'Manage webhook URL' : 'Set the URL to POST to'}
      onClose={onClose}
      footer={
        <>
          {isConnected && (
            <button type="button" className={styles.btnDanger + ' ' + styles.left} onClick={onDisconnect}>
              Disconnect
            </button>
          )}
          <button type="button" className={styles.btn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.btnPrimary} onClick={save} disabled={url.trim().length === 0}>
            Save
          </button>
        </>
      }
    >
      <div className={styles.info}>
        When you export to {def.name}, the editor POSTs the compiled HTML to your URL as JSON:
        <br />
        <span className={styles.code}>{`{ html, source }`}</span>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Webhook URL</span>
        <input
          type="url"
          className={styles.input}
          placeholder="https://hooks.example.com/abc123"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <span className={styles.help}>
          {def.id === 'zapier' && 'Create a Zap → trigger "Webhooks by Zapier" → "Catch Hook" → copy the URL.'}
          {def.id === 'make' && 'In Make, add a Webhooks → Custom webhook trigger and copy the URL.'}
          {def.id === 'webhook' && 'Any URL that accepts POST application/json.'}
        </span>
      </label>

      {error && <div className={styles.error}>{error}</div>}
    </ModalShell>
  );
}
