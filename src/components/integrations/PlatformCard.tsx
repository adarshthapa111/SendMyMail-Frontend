import { useAppSelector } from '../../store/hooks';
import type { PlatformDef } from '../../integrations/registry';
import PlatformIcon from './PlatformIcon';
import styles from '@styles/components/integrations/IntegrationsScreen.module.css';

interface Props {
  def: PlatformDef;
  onAction: (def: PlatformDef) => void;
}

export default function PlatformCard({ def, onAction }: Props) {
  const connection = useAppSelector((s) => s.integrations.connections[def.id]);
  const isConnected = connection?.status === 'connected';

  const ctaLabel = isConnected
    ? 'Configure'
    : def.tier === 1
    ? 'Connect'
    : def.tier === 4
    ? 'Set URL'
    : 'Set up';

  return (
    <div className={`${styles.card} ${isConnected ? styles.cardConnected : ''}`}>
      <div className={styles.cardHead}>
        <PlatformIcon def={def} />
        <span
          className={`${styles.pip} ${isConnected ? styles.pipOk : ''}`}
          title={isConnected ? 'Connected' : 'Not connected'}
        />
      </div>
      <div className={styles.cardName}>{def.name}</div>
      <div className={styles.cardDesc}>{def.description}</div>
      {connection?.accountLabel && (
        <div className={styles.cardAccount} title={connection.accountLabel}>
          {connection.accountLabel}
        </div>
      )}
      {connection?.url && (
        <div className={styles.cardAccount} title={connection.url}>
          {connection.url.replace(/^https?:\/\//, '').slice(0, 36)}
          {connection.url.replace(/^https?:\/\//, '').length > 36 ? '…' : ''}
        </div>
      )}
      <button type="button" className={styles.cardCta} onClick={() => onAction(def)}>
        {ctaLabel}
      </button>
    </div>
  );
}
