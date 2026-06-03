import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button, Field, Input, Textarea, Heading } from '../ui';
import { IconX } from '@tabler/icons-react';
import type { ContactList } from '../../lib/api/lists';
import styles from '@styles/components/contacts/ContactFormDialog.module.scss';

interface Props {
  initial?: ContactList;
  submitting: boolean;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: { name: string; description: string }) => void;
  onClose: () => void;
}

/* Add/edit a static list. Reuses the ContactFormDialog SCSS for consistency. */
export function ListFormDialog({ initial, submitting, fieldErrors, onSubmit, onClose }: Props) {
  const [name, setName]        = useState(initial?.name ?? '');
  const [description, setDesc] = useState(initial?.description ?? '');
  const isEdit = !!initial;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [submitting, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name: name.trim(), description: description.trim() });
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-labelledby="list-form-title">
        <div className={styles.header}>
          <Heading id="list-form-title" size="lg">{isEdit ? `Rename ${initial?.name}` : 'New static list'}</Heading>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close" disabled={submitting}>
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Field label="Name" error={fieldErrors?.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Newsletter"
              maxLength={80}
              required
              invalid={!!fieldErrors?.name}
              autoFocus
            />
          </Field>

          <Field label="Description" helper="Optional — describe how this list is grown / what it's for.">
            <Textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Anyone who's opted in via the website footer"
              maxLength={200}
              rows={2}
            />
          </Field>

          <div className={styles.foot}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save' : 'Create list')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
