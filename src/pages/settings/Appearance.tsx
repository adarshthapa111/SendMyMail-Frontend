import { Heading, Text } from '../../components/ui';
import { useTheme, type Preference } from '../../hooks/useTheme';
import { ThemeSwatchCard } from '../../components/settings/ThemeSwatchCard';
import styles from '@styles/components/settings/Appearance.module.scss';

interface ThemeOption {
  value:       Preference;
  label:       string;
  description: string;
}

const OPTIONS: ThemeOption[] = [
  { value: 'default', label: 'Default', description: 'Warm editorial' },
  { value: 'dark',    label: 'Dark',    description: 'Premium / focus' },
  { value: 'white',   label: 'White',   description: 'Cool minimal' },
  { value: 'system',  label: 'System',  description: 'Auto-follow your OS' },
];

/* /settings/appearance — theme picker.
   ──────────────────────────────────────
   4-option picker: Default + Dark + White + System. The System card is
   special — it auto-follows the user's OS theme via prefers-color-
   scheme. Preference is persisted to localStorage; applied theme is
   derived (System → default/dark based on OS).

   Mounted as the 6th tab in /settings (after Sending). */
export function Appearance() {
  const { preference, systemDark, setPreference } = useTheme();

  return (
    <div className={styles.tabBody}>
      <div className={styles.head}>
        <Heading size="md">Appearance</Heading>
        <Text tone="muted" size="sm" className={styles.intro}>
          Pick how SendMyMail looks for you on this device. Your
          preference is stored locally.
        </Text>
      </div>

      <div className={styles.grid}>
        {OPTIONS.map((opt) => (
          <ThemeSwatchCard
            key={opt.value}
            value={opt.value}
            selected={preference}
            label={opt.label}
            description={opt.description}
            onSelect={setPreference}
          />
        ))}
      </div>

      {preference === 'system' && (
        <div className={styles.systemHint}>
          <Text size="xs" tone="muted">
            <strong>System</strong> follows your OS theme.
            Currently your OS is: <strong>{systemDark ? 'dark mode' : 'light mode'}</strong>.
            When your OS switches, the app will switch automatically.
          </Text>
        </div>
      )}
    </div>
  );
}
