import { Heading, Text, Button } from '../ui';
import { IconTemplate, IconPlus } from '@tabler/icons-react';
import styles from '@styles/components/templates/TemplatesEmptyState.module.scss';

interface Props {
  onAdd: () => void;
}

/* FTUX card for /clients/:cid/templates when zero templates exist. */
export function TemplatesEmptyState({ onAdd }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <IconTemplate size={28} />
        </div>
        <Heading size="lg" className={styles.title}>
          Design your first template
        </Heading>
        <Text tone="muted" className={styles.sub}>
          Templates are the reusable bones of every email you send. Build a
          design once, send it to many — pick a fresh subject each time at
          campaign time.
        </Text>
        <Button
          variant="primary"
          leading={<IconPlus size={16} />}
          onClick={onAdd}
          className={styles.cta}
        >
          New template
        </Button>
      </div>
    </div>
  );
}
