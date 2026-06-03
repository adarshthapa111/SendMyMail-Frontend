import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Heading, Text } from '../ui';
import { IconX, IconList } from '@tabler/icons-react';
import type { ContactList } from '../../lib/api/lists';
import styles from '@styles/components/contacts/ContactFormDialog.module.scss';
import pickerStyles from '@styles/components/contacts/AddToListDialog.module.scss';

interface Props {
  contactIds: string[];      // the contacts being added (one or many)
  lists: ContactList[];      // the available lists to pick from
  excludeListIds?: string[]; // hide these lists (already in them)
  submitting: boolean;
  onConfirm: (listIds: string[]) => void;
  onClose: () => void;
}

export function AddToListDialog({ contactIds, lists, excludeListIds = [], submitting, onConfirm, onClose }: Props) {
  const [picked, setPicked] = useState<string[]>([]);

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

  function toggle(id: string) {
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  const available = lists.filter((l) => !excludeListIds.includes(l.id) && !l.archived);
  const n = contactIds.length;
  const subject = n === 1 ? 'this contact' : `${n} contacts`;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-labelledby="add-to-list-title">
        <div className={styles.header}>
          <Heading id="add-to-list-title" size="lg">Add to lists</Heading>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close" disabled={submitting}>
            <IconX size={16} />
          </button>
        </div>

        <div className={styles.form}>
          <Text tone="muted" className={pickerStyles.lede}>
            Pick the lists to add {subject} to.
          </Text>

          {available.length === 0 ? (
            <div className={pickerStyles.empty}>
              <IconList size={22} />
              <Text tone="muted">No more lists available.</Text>
            </div>
          ) : (
            <div className={pickerStyles.options}>
              {available.map((l) => {
                const on = picked.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`${pickerStyles.option} ${on ? pickerStyles.optionOn : ''}`}
                    onClick={() => toggle(l.id)}
                    aria-pressed={on}
                  >
                    <span className={pickerStyles.optName}>{l.name}</span>
                    <span className={pickerStyles.optMeta}>{l.memberCount.toLocaleString()} contacts</span>
                    <span className={pickerStyles.check} aria-hidden="true">{on ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.foot}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              disabled={picked.length === 0}
              onClick={() => onConfirm(picked)}
            >
              {submitting ? 'Adding…' : `Add to ${picked.length} ${picked.length === 1 ? 'list' : 'lists'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
