import { BRAND_COLORS } from '../../lib/clientColor';
import styles from '@styles/components/clients/BrandColorPicker.module.scss';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

/* The 6-swatch palette from doc/mockups/client_create.html.
   Selected swatch gets a thick ink-colored ring. */
export function BrandColorPicker({ value, onChange }: Props) {
  return (
    <div className={styles.row} role="radiogroup" aria-label="Brand color">
      {BRAND_COLORS.map((hex) => {
        const selected = hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Brand color ${hex}`}
            className={`${styles.swatch} ${selected ? styles.selected : ''}`}
            style={{ background: hex }}
            onClick={() => onChange(hex)}
          />
        );
      })}
    </div>
  );
}
