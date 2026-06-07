import { IconCheck, IconMail } from '@tabler/icons-react';
import type { Preference } from '../../hooks/useTheme';
import styles from '@styles/components/settings/ThemeSwatchCard.module.scss';

interface Props {
  /** Value for this card — the preference it represents. */
  value:       Preference;
  /** Currently-selected preference. */
  selected:    Preference;
  /** Human label. */
  label:       string;
  /** Short blurb below the label. */
  description: string;
  /** Click handler. */
  onSelect:    (value: Preference) => void;
}

/* ThemeSwatchCard — interactive preview card for the Appearance picker.
   The card itself renders in the theme it represents via a nested
   `data-theme="..."` attribute, so the inner mini-card preview shows
   the actual color palette.

   The System card is special: split layout — left half rendered in
   default theme, right half in dark — visually conveying "auto-follows
   OS". Handled in CSS via the `data-system` class. */
export function ThemeSwatchCard({ value, selected, label, description, onSelect }: Props) {
  const isSelected = selected === value;
  const isSystem   = value === 'system';

  return (
    <button
      type="button"
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={() => onSelect(value)}
      aria-pressed={isSelected}
    >
      {/* Preview area. For non-system: single theme rendering. For system:
          split into two halves with data-theme on each. */}
      {isSystem ? (
        <div className={styles.previewSplit}>
          <div data-theme="default" className={styles.previewHalfLeft}>
            <Preview compact />
          </div>
          <div data-theme="dark" className={styles.previewHalfRight}>
            <Preview compact />
          </div>
          <span className={styles.splitDivider} aria-hidden="true" />
        </div>
      ) : (
        <div data-theme={value} className={styles.previewSingle}>
          <Preview />
        </div>
      )}

      <div className={styles.meta}>
        <div className={styles.label}>
          {label}
          {isSelected && (
            <span className={styles.checkBadge} aria-hidden="true">
              <IconCheck size={11} />
            </span>
          )}
        </div>
        <div className={styles.description}>{description}</div>
      </div>
    </button>
  );
}

/* Mini preview rendered inside each swatch. Uses theme tokens, so it
   automatically adapts based on the nearest data-theme ancestor. */
function Preview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.preview} ${compact ? styles.previewCompact : ''}`}>
      <div className={styles.miniHeader}>
        <span className={styles.miniIcon}><IconMail size={9} /></span>
        <span className={styles.miniTitle}>Welcome</span>
      </div>
      <div className={styles.miniBars}>
        <span className={styles.miniBar} />
        <span className={`${styles.miniBar} ${styles.miniBarShort}`} />
      </div>
      <div className={styles.miniButton}>Open</div>
    </div>
  );
}
