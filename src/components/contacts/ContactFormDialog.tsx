import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button, Field, Input, Heading, Spinner } from '../ui';
import { IconX } from '@tabler/icons-react';
import { ContactTagInput } from './ContactTagInput';
import type { Contact } from '../../lib/api/contacts';
import type { Tag } from '../../lib/api/tags';
import type { ContactList } from '../../lib/api/lists';
import styles from '@styles/components/contacts/ContactFormDialog.module.scss';

export interface ContactFormValues {
  email:     string;
  firstName: string;
  lastName:  string;
  phone:     string;
  city:      string;
  birthday:  string;       // YYYY-MM-DD or ''
  tags:      string[];
  listIds:   string[];
}

interface Props {
  /** When `initial` is set we're in edit mode (email is readonly). */
  initial?: Contact;
  /** Existing tags for autocomplete. */
  tags: Tag[];
  /** Lists the user can choose from. */
  lists: ContactList[];
  submitting: boolean;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: ContactFormValues) => void;
  onClose: () => void;
}

function toFormValues(c?: Contact): ContactFormValues {
  return {
    email:     c?.email     ?? '',
    firstName: c?.firstName ?? '',
    lastName:  c?.lastName  ?? '',
    phone:     c?.phone     ?? '',
    city:      c?.city      ?? '',
    birthday:  c?.birthday  ?? '',
    tags:      c?.tags      ?? [],
    listIds:   c?.lists.filter((l) => l.status === 'subscribed').map((l) => l.listId) ?? [],
  };
}

export function ContactFormDialog({
  initial, tags, lists, submitting, fieldErrors, onSubmit, onClose,
}: Props) {
  const [v, setV] = useState<ContactFormValues>(() => toFormValues(initial));
  const isEdit = !!initial;

  // ESC closes
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

  function set<K extends keyof ContactFormValues>(key: K, val: ContactFormValues[K]) {
    setV((p) => ({ ...p, [key]: val }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      ...v,
      email:     v.email.trim(),
      firstName: v.firstName.trim(),
      lastName:  v.lastName.trim(),
      phone:     v.phone.trim(),
      city:      v.city.trim(),
      birthday:  v.birthday.trim(),
    });
  }

  function toggleList(id: string) {
    set('listIds', v.listIds.includes(id) ? v.listIds.filter((x) => x !== id) : [...v.listIds, id]);
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-labelledby="contact-form-title">
        <div className={styles.header}>
          <Heading id="contact-form-title" size="lg">
            {isEdit ? `Edit ${initial?.email ?? 'contact'}` : 'Add a contact'}
          </Heading>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close" disabled={submitting}>
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Field label="Email" error={fieldErrors?.email} helper={isEdit ? "Email can't be changed once a contact is created." : undefined}>
            <Input
              type="email"
              value={v.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="someone@example.com"
              required
              invalid={!!fieldErrors?.email}
              readOnly={isEdit}
              autoFocus={!isEdit}
            />
          </Field>

          <div className={styles.row2}>
            <Field label="First name">
              <Input value={v.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Aastha" maxLength={80} />
            </Field>
            <Field label="Last name">
              <Input value={v.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Shrestha" maxLength={80} />
            </Field>
          </div>

          <div className={styles.row2}>
            <Field label="Phone">
              <Input value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+977-9841234567" maxLength={40} />
            </Field>
            <Field label="City">
              <Input value={v.city} onChange={(e) => set('city', e.target.value)} placeholder="Kathmandu" maxLength={80} />
            </Field>
          </div>

          <Field label="Birthday">
            <Input type="date" value={v.birthday} onChange={(e) => set('birthday', e.target.value)} />
          </Field>

          <Field label="Tags" helper="Type and press enter to add. Existing tags will autocomplete.">
            <ContactTagInput value={v.tags} onChange={(t) => set('tags', t)} suggestions={tags} />
          </Field>

          {lists.length > 0 && !isEdit ? (
            <Field label="Add to lists" helper="The contact will be marked as subscribed in each picked list.">
              <div className={styles.listPicker}>
                {lists.map((l) => {
                  const on = v.listIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`${styles.listChip} ${on ? styles.listChipOn : ''}`}
                      onClick={() => toggleList(l.id)}
                      aria-pressed={on}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : null}

          <div className={styles.foot}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {submitting ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add contact')}
            </Button>
          </div>

          {submitting ? <div className={styles.overlay}><Spinner /></div> : null}
        </form>
      </div>
    </div>,
    document.body,
  );
}
