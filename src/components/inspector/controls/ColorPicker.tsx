import { useEffect, useState } from 'react';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  label?: string;
  value: string | undefined;
  /** Fired on every change (swatch click commits immediately, hex typing on blur). */
  onCommit: (value: string) => void;
}

/**
 * Color picker: native browser color swatch + hex text input.
 * The swatch fires onCommit immediately so users see live preview as they
 * scrub through hues. The hex input commits on blur / Enter so typing
 * "#ff" doesn't ship a half-baked value.
 */
export default function ColorPicker({ label, value, onCommit }: Props) {
  const current = value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value))
    ? String(value)
    : '#000000';

  const [hex, setHex] = useState(current);

  // Sync external changes (undo, programmatic) back into the text input
  useEffect(() => {
    setHex(current);
  }, [current]);

  const commitIfValid = (next: string) => {
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(next)) {
      onCommit(next.toLowerCase());
    } else {
      // Invalid — revert local to current external value
      setHex(current);
    }
  };

  return (
    <label className={styles.field}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <div className={styles.colorWrap}>
        <input
          type="color"
          className={styles.colorSwatch}
          value={current}
          onChange={(e) => onCommit(e.target.value)}
          aria-label={label ? `${label} color picker` : 'Color picker'}
        />
        <input
          type="text"
          className={styles.colorHex}
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={() => commitIfValid(hex)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitIfValid(hex);
            }
          }}
          spellCheck={false}
        />
      </div>
    </label>
  );
}
