import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Heading } from '../ui';
import { IconX } from '@tabler/icons-react';
import { ClientForm, type ClientFormValues } from './ClientForm';
import type { Client } from '../../lib/api/clients';
import styles from '@styles/components/clients/ClientFormDialog.module.scss';

interface Props {
  /** When `initial` is set we're in edit mode — title + submit label adapt. */
  initial?: Client;
  submitting: boolean;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: ClientFormValues) => void;
  onClose: () => void;
}

/* Modal wrapper around ClientForm — used by the "Add client" buttons across
   the app so creating a client is a snappy popup instead of a page nav.
   Edit mode is also available here, but the dedicated /clients/:id/edit
   page is the primary edit entry point. */
export function ClientFormDialog({ initial, submitting, fieldErrors, onSubmit, onClose }: Props) {
  const isEdit = !!initial;

  // ESC to close (only when not submitting)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [submitting, onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-labelledby="client-form-title">
        <div className={styles.header}>
          <Heading id="client-form-title" size="lg">
            {isEdit ? `Edit ${initial?.name ?? 'client'}` : 'Add a new client'}
          </Heading>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close" disabled={submitting}>
            <IconX size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <ClientForm
            initial={initial}
            submitLabel={isEdit ? 'Save changes' : 'Create client'}
            submitting={submitting}
            fieldErrors={fieldErrors}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
