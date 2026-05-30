import { useState } from 'react';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setConnected,
  setConnectionError,
  setDisconnected,
} from '../../store/slices/integrationsSlice';
import {
  clearCredentials,
  loadCredentials,
  saveConnectionMeta,
  saveCredentials,
} from '../../integrations/credentials';
import type { PlatformDef } from '../../integrations/registry';
import ModalShell from './ModalShell';
import styles from '@styles/components/integrations/Modal.module.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

interface Props {
  def: PlatformDef;
  onClose: () => void;
}

export default function ConnectModal({ def, onClose }: Props) {
  const dispatch = useAppDispatch();
  const connection = useAppSelector((s) => s.integrations.connections[def.id]);
  const isConnected = connection?.status === 'connected';

  const [values, setValues] = useState<Record<string, string>>(() => loadCredentials(def.id) ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!def.testEndpoint) {
      setError('No backend endpoint configured for this platform yet.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await axios.post(BACKEND + def.testEndpoint, { credentials: values });
      if (data?.ok) {
        saveCredentials(def.id, values);
        const conn = {
          status: 'connected' as const,
          connectedAt: new Date().toISOString(),
          accountLabel: data.accountLabel,
        };
        saveConnectionMeta(def.id, conn);
        dispatch(setConnected({ id: def.id, accountLabel: data.accountLabel }));
        onClose();
      } else {
        const msg = data?.error ?? 'Connection failed';
        setError(msg);
        dispatch(setConnectionError({ id: def.id, error: msg }));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'Network error';
      setError(msg);
      dispatch(setConnectionError({ id: def.id, error: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  const onDisconnect = () => {
    clearCredentials(def.id);
    dispatch(setDisconnected(def.id));
    onClose();
  };

  const allFilled = def.credentialFields?.every((f) => (values[f.key] ?? '').trim().length > 0) ?? true;

  return (
    <ModalShell
      def={def}
      subtitle={isConnected ? 'Manage connection' : 'Connect to push templates'}
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
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={submit}
            disabled={submitting || !allFilled}
          >
            {submitting ? 'Testing…' : isConnected ? 'Test & Update' : 'Test & Connect'}
          </button>
        </>
      }
    >
      <div className={styles.info}>{def.description}</div>

      {def.credentialFields?.map((f) => (
        <label key={f.key} className={styles.field}>
          <span className={styles.label}>{f.label}</span>
          <input
            type={f.type}
            className={styles.input}
            placeholder={f.placeholder}
            value={values[f.key] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            autoComplete="off"
            spellCheck={false}
          />
          {f.help && <span className={styles.help}>{f.help}</span>}
        </label>
      ))}

      {error && <div className={styles.error}>{error}</div>}
    </ModalShell>
  );
}
