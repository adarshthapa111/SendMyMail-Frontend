import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppSelector } from '../../store/hooks';
import { renderTemplate } from '../../api/renderTemplate';
import { platformRegistry, type PlatformDef } from '../../integrations/registry';
import { loadCredentials } from '../../integrations/credentials';
import PlatformIcon from './PlatformIcon';
import styles from '@styles/components/integrations/ExportDropdown.module.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

export default function ExportDropdown() {
  const tree = useAppSelector((s) => s.editor.tree);
  const subject = useAppSelector((s) => s.editor.subject);
  const connections = useAppSelector((s) => s.integrations.connections);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click outside / Esc closes
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Split connected platforms by what action they perform on export
  const { apiSend, copyExport, webhookSend } = useMemo(() => {
    const apiSend: PlatformDef[] = [];
    const copyExport: PlatformDef[] = [];
    const webhookSend: PlatformDef[] = [];
    for (const def of Object.values(platformRegistry)) {
      if (connections[def.id]?.status !== 'connected') continue;
      if (def.tier === 1) apiSend.push(def);
      else if (def.tier === 4) webhookSend.push(def);
      else copyExport.push(def);
    }
    apiSend.sort((a, b) => a.name.localeCompare(b.name));
    copyExport.sort((a, b) => a.name.localeCompare(b.name));
    webhookSend.sort((a, b) => a.name.localeCompare(b.name));
    return { apiSend, copyExport, webhookSend };
  }, [connections]);

  const totalConnected = apiSend.length + copyExport.length + webhookSend.length;

  const onCopy = async (def: PlatformDef) => {
    setBusy(true);
    try {
      const format = def.value === 'Mjml' || def.value.endsWith('::Mjml') ? 'mjml' : 'html';
      const out = await renderTemplate({
        tree,
        format: format as 'html' | 'mjml',
        operationType: 'copy',
        thirdPartyClientName: def.value,
      });
      await navigator.clipboard.writeText(out as string);
      toast.success(`${def.name} ${format.toUpperCase()} copied`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Copy failed');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onApiSend = async (def: PlatformDef) => {
    if (!def.sendEndpoint) {
      toast.error(`Send endpoint not configured for ${def.name}`);
      return;
    }
    setBusy(true);
    try {
      const creds = loadCredentials(def.id);
      const { data } = await axios.post(BACKEND + def.sendEndpoint, {
        credentials: creds,
        tree,
        subject,
        thirdPartyClientName: def.value,
      });
      if (data?.ok) {
        toast.success(`Sent to ${def.name}${data.url ? ' — opening' : ''}`);
        if (data.url) window.open(data.url, '_blank');
      } else {
        toast.error(data?.error ?? `Send to ${def.name} failed`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'Send failed');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onWebhookSend = async (def: PlatformDef) => {
    setBusy(true);
    try {
      const creds = loadCredentials(def.id);
      const { data } = await axios.post(BACKEND + (def.sendEndpoint ?? '/integrations/webhook/send'), {
        credentials: creds,
        tree,
        subject,
        thirdPartyClientName: def.value,
      });
      if (data?.ok) toast.success(`POSTed to ${def.name}`);
      else toast.error(data?.error ?? 'Webhook send failed');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'Webhook send failed');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const copyRaw = async (format: 'html' | 'mjml') => {
    setBusy(true);
    try {
      const out = await renderTemplate({ tree, format, operationType: 'copy' });
      await navigator.clipboard.writeText(out as string);
      toast.success(`${format.toUpperCase()} copied`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Copy failed');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
      >
        Export ▾
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {apiSend.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Send to</div>
              {apiSend.map((def) => (
                <button key={def.id} className={styles.item} onClick={() => onApiSend(def)} disabled={busy}>
                  <PlatformIcon def={def} />
                  <span>{def.name}</span>
                </button>
              ))}
              <div className={styles.divider} />
            </>
          )}

          {webhookSend.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Webhooks</div>
              {webhookSend.map((def) => (
                <button key={def.id} className={styles.item} onClick={() => onWebhookSend(def)} disabled={busy}>
                  <PlatformIcon def={def} />
                  <span>{def.name}</span>
                </button>
              ))}
              <div className={styles.divider} />
            </>
          )}

          {copyExport.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Copy for</div>
              {copyExport.map((def) => (
                <button key={def.id} className={styles.item} onClick={() => onCopy(def)} disabled={busy}>
                  <PlatformIcon def={def} />
                  <span>{def.name}</span>
                </button>
              ))}
              <div className={styles.divider} />
            </>
          )}

          <div className={styles.sectionLabel}>Quick copy</div>
          <button className={styles.item} onClick={() => copyRaw('html')} disabled={busy}>
            <span className={styles.glyph}>{'<>'}</span>
            <span>Copy HTML</span>
          </button>
          <button className={styles.item} onClick={() => copyRaw('mjml')} disabled={busy}>
            <span className={styles.glyph}>M</span>
            <span>Copy MJML</span>
          </button>

          {totalConnected === 0 && (
            <div className={styles.hint}>
              Connect platforms in Integrations to send templates directly.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
