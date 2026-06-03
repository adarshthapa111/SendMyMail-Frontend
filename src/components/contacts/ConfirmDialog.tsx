import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Heading, Text } from '../ui';
import { IconAlertTriangle } from '@tabler/icons-react';
import styles from '@styles/components/contacts/ConfirmDialog.module.scss';

interface Props {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  /** Variant of the confirm button. Defaults to 'danger'. */
  confirmVariant?: 'danger' | 'primary';
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/* Generic confirmation modal — used for bulk-delete (and reusable for other
   destructive-action surfaces later: delete tag, archive list, etc.). */
export function ConfirmDialog({
  title, body, confirmLabel, confirmVariant = 'danger', submitting, onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onCancel(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [submitting, onCancel]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <div className={styles.dialog} role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-body">
        <div className={styles.icon}><IconAlertTriangle size={22} /></div>
        <Heading id="confirm-title" size="lg" className={styles.title}>{title}</Heading>
        <Text id="confirm-body" tone="muted" className={styles.body}>{body}</Text>
        <div className={styles.foot}>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} loading={submitting}>
            {submitting ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
