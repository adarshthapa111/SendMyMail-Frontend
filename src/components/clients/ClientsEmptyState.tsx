import { Button, Heading, Text } from '../ui';
import { IconUsersGroup, IconPlus } from '@tabler/icons-react';
import styles from '@styles/components/clients/ClientsEmptyState.module.scss';

interface Props {
  onAdd: () => void;
}

/* FTUX card shown on /clients when the agency has zero clients.
   Caller owns the modal state — we just emit the "user wants to add"
   intent through `onAdd`. */
export function ClientsEmptyState({ onAdd }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <IconUsersGroup size={28} />
      </div>
      <Heading size="lg" className={styles.headline}>Add your first client</Heading>
      <Text tone="muted" className={styles.lede}>
        Each client gets its own contacts, campaigns, and sending domain — but you run them all from this one workspace.
      </Text>
      <Button variant="primary" size="lg" leading={<IconPlus size={16} />} onClick={onAdd}>
        Add a client
      </Button>
    </div>
  );
}
