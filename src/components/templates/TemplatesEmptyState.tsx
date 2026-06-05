import { Heading, Text, Button } from '../ui';
import { IconTemplate, IconPlus, IconCloudUpload } from '@tabler/icons-react';
import styles from '@styles/components/templates/TemplatesEmptyState.module.scss';

interface Props {
  onAdd: () => void;
  onImport?: () => void;
}

/* FTUX card for /clients/:cid/templates when zero templates exist. */
export function TemplatesEmptyState({ onAdd, onImport }: Props) {
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
        <div className={styles.ctas}>
          <Button
            variant="primary"
            leading={<IconPlus size={16} />}
            onClick={onAdd}
            className={styles.cta}
          >
            New template
          </Button>
          {onImport ? (
            <Button
              variant="secondary"
              leading={<IconCloudUpload size={16} />}
              onClick={onImport}
              className={styles.cta}
            >
              Import MJML
            </Button>
          ) : null}
        </div>
        {onImport ? (
          <Text tone="muted" className={styles.subSecondary}>
            Already have MJML from <code>mjml.io</code>, Stripo, or version control?
            Paste or upload it and start editing visually.
          </Text>
        ) : null}
      </div>
    </div>
  );
}
