import { Button } from '../ui';
import { IconList, IconTrash, IconX } from '@tabler/icons-react';
import styles from '@styles/components/contacts/BulkActionBar.module.scss';

interface Props {
  count: number;
  onAddToList: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/* Sticky bar that appears at the bottom of the viewport when ≥1 contacts
   are selected on the ContactsList page. */
export function BulkActionBar({ count, onAddToList, onDelete, onClear }: Props) {
  return (
    <div className={styles.bar} role="region" aria-label={`${count} contacts selected`}>
      <div className={styles.label}>
        <b>{count.toLocaleString()}</b> {count === 1 ? 'contact' : 'contacts'} selected
      </div>
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" leading={<IconList size={14} />} onClick={onAddToList}>
          Add to list
        </Button>
        <Button size="sm" variant="danger" leading={<IconTrash size={14} />} onClick={onDelete}>
          Delete {count}
        </Button>
        <button type="button" className={styles.close} onClick={onClear} aria-label="Clear selection">
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}
