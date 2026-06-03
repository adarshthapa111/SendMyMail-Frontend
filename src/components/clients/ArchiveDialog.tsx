import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Heading, Text } from '../ui';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { Client } from '../../lib/api/clients';
import styles from '@styles/components/clients/ArchiveDialog.module.scss';

interface Props {
  client: Client;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/* Confirmation modal for archiving a client.
   Caller decides when to mount/unmount; we don't gate visibility ourselves. */
export function ArchiveDialog({ client, submitting, onConfirm, onCancel }: Props) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [submitting, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onCancel(); }}>
      <div className={styles.dialog} role="alertdialog" aria-labelledby="archive-title" aria-describedby="archive-body">
        <div className={styles.icon}><IconAlertTriangle size={22} /></div>
        <Heading id="archive-title" size="lg" className={styles.title}>
          Archive {client.name}?
        </Heading>
        <Text id="archive-body" tone="muted" className={styles.body}>
          This hides <b>{client.name}</b> from your switcher and dashboard.
          All data — campaigns, contacts, sends — is preserved. You can ask
          support to restore the client later.
        </Text>
        <div className={styles.foot}>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} loading={submitting}>
            {submitting ? 'Archiving…' : 'Yes, archive client'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
