import { useMemo, useState } from 'react';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  label?: string;
  value: string | undefined;
  onCommit: (value: string | undefined) => void;
}

interface Parsed {
  top: number;
  right: number;
  bottom: number;
  left: number;
  /** When true, all four sides were derivable from a single value/two/three. */
  unified: boolean;
}

/**
 * Parses CSS shorthand padding string into 4 sides.
 *   "10px"            → 10/10/10/10
 *   "10px 25px"       → 10/25/10/25
 *   "10px 25px 5px"   → 10/25/5/25
 *   "10px 5px 0 25px" → 10/5/0/25
 */
function parsePadding(value: string | undefined): Parsed {
  if (!value) return { top: 0, right: 0, bottom: 0, left: 0, unified: true };
  const parts = String(value).trim().split(/\s+/).map((p) => parseInt(p, 10) || 0);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0], unified: true };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1], unified: false };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1], unified: false };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3], unified: false };
}

type Sides = Pick<Parsed, 'top' | 'right' | 'bottom' | 'left'>;

function buildPadding(p: Sides): string {
  if (p.top === p.right && p.top === p.bottom && p.top === p.left) return `${p.top}px`;
  if (p.top === p.bottom && p.left === p.right) return `${p.top}px ${p.right}px`;
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

export default function PaddingControl({ label = 'Padding', value, onCommit }: Props) {
  const parsed = useMemo(() => parsePadding(value), [value]);
  const [linked, setLinked] = useState(parsed.unified);

  const commit = (next: Sides) => onCommit(buildPadding(next));

  return (
    <div className={styles.field}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={styles.fieldLabel}>{label}</span>
        <div className={styles.paddingMode}>
          <button
            type="button"
            className={`${styles.paddingModeBtn} ${linked ? styles.paddingModeBtnActive : ''}`}
            onClick={() => setLinked(true)}
            title="Link all sides"
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.paddingModeBtn} ${!linked ? styles.paddingModeBtnActive : ''}`}
            onClick={() => setLinked(false)}
            title="Independent sides"
          >
            Sides
          </button>
        </div>
      </div>

      {linked ? (
        <div className={styles.numberWrap}>
          <input
            type="number"
            className={styles.numberValue}
            value={parsed.top}
            min={0}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10) || 0;
              commit({ top: n, right: n, bottom: n, left: n });
            }}
          />
          <span className={styles.numberUnit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            px
          </span>
        </div>
      ) : (
        <div className={styles.paddingGrid}>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <label key={side} className={styles.field}>
              <span className={styles.fieldLabel} style={{ textTransform: 'capitalize', fontSize: '10px' }}>
                {side}
              </span>
              <input
                type="number"
                className={styles.input}
                value={parsed[side]}
                min={0}
                onChange={(e) => commit({ ...parsed, [side]: parseInt(e.target.value, 10) || 0 })}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
