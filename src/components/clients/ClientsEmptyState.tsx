import { useNavigate } from 'react-router-dom';
import { Button, Heading, Text } from '../ui';
import { IconUsersGroup, IconPlus } from '@tabler/icons-react';
import styles from '@styles/components/clients/ClientsEmptyState.module.scss';

/* FTUX card shown on /clients when the agency has zero clients. */
export function ClientsEmptyState() {
  const navigate = useNavigate();
  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <IconUsersGroup size={28} />
      </div>
      <Heading size="lg" className={styles.headline}>Add your first client</Heading>
      <Text tone="muted" className={styles.lede}>
        Each client gets its own contacts, campaigns, and sending domain — but you run them all from this one workspace.
      </Text>
      <Button variant="primary" size="lg" leading={<IconPlus size={16} />} onClick={() => navigate('/clients/new')}>
        Add a client
      </Button>
    </div>
  );
}
