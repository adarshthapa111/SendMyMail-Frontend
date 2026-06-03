import { Button, Heading, Text } from '../ui';
import { IconUsers, IconPlus, IconUpload } from '@tabler/icons-react';
import styles from '@styles/components/contacts/ContactsEmptyState.module.scss';

interface Props {
  onAdd: () => void;
}

/* FTUX hero card for /clients/:id/contacts when the client has 0 contacts.
   Two action paths — manual add (works today) + CSV import (disabled with
   "Coming in PR 2" tooltip). */
export function ContactsEmptyState({ onAdd }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <IconUsers size={28} />
      </div>
      <Heading size="lg" className={styles.headline}>Your first contact</Heading>
      <Text tone="muted" className={styles.lede}>
        Add someone manually now — or wait for the CSV import flow (ships next) to bring
        in your whole list at once.
      </Text>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" leading={<IconPlus size={16} />} onClick={onAdd}>
          Add a contact
        </Button>
        <Button
          variant="ghost"
          size="lg"
          leading={<IconUpload size={16} />}
          disabled
          title="CSV import ships in feature-contacts-lists PR 2"
        >
          Import from CSV
        </Button>
      </div>
    </div>
  );
}
