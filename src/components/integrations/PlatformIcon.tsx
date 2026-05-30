import type { PlatformDef } from '../../integrations/registry';
import styles from '@styles/components/integrations/IntegrationsScreen.module.css';

/**
 * Renders the platform's brand icon when react-icons has one;
 * otherwise renders a square letter-badge using the platform's brand color.
 */
export default function PlatformIcon({ def }: { def: PlatformDef }) {
  if (def.icon) {
    const Icon = def.icon;
    return (
      <div className={styles.icon} style={{ background: '#ffffff', color: def.brandColor, borderColor: '#e4e6eb' }}>
        <Icon size={22} />
      </div>
    );
  }
  return (
    <div className={styles.icon} style={{ background: def.brandColor, color: '#ffffff', borderColor: 'transparent' }}>
      {def.name.charAt(0)}
    </div>
  );
}
