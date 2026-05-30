import { useMemo } from 'react';
import styles from '@styles/components/inspector/controls/controls.module.css';

type Unit = 'px' | 'em' | 'rem' | '%' | 'auto' | 'none';

interface Props {
  label?: string;
  value: string | undefined;
  /** Allowed unit suffixes; default ['px']. Include 'none' for unitless. */
  units?: Unit[];
  defaultUnit?: Unit;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (value: string | undefined) => void;
}

interface Parsed {
  num: string;
  unit: Unit;
}

function parseValue(value: string | undefined, units: Unit[], defaultUnit: Unit): Parsed {
  if (value === undefined || value === '') return { num: '', unit: defaultUnit };
  const v = String(value).trim();
  if (v === 'auto' && units.includes('auto')) return { num: '', unit: 'auto' };
  // Match number + optional unit
  const m = v.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/);
  if (!m) return { num: v, unit: defaultUnit };
  const unit = (m[2] as Unit | undefined) ?? defaultUnit;
  return { num: m[1], unit: units.includes(unit) ? unit : defaultUnit };
}

function buildValue(num: string, unit: Unit): string | undefined {
  if (unit === 'auto') return 'auto';
  if (num === '' || num === '-') return undefined;
  if (unit === 'none') return num;
  return `${num}${unit}`;
}

/**
 * Number input with a unit dropdown.
 * Fires onCommit immediately on every change (no debounce) so users see live
 * preview feedback as they tweak. The native stepper makes this acceptable
 * — typing rapidly still produces ~one preview request per second.
 */
export default function NumberInput({
  label,
  value,
  units = ['px'],
  defaultUnit,
  min,
  max,
  step,
  onCommit,
}: Props) {
  const effectiveDefaultUnit = defaultUnit ?? units[0];
  const parsed = useMemo(
    () => parseValue(value, units, effectiveDefaultUnit),
    [value, units, effectiveDefaultUnit]
  );
  const showNumberField = parsed.unit !== 'auto';

  return (
    <label className={styles.field}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <div className={styles.numberWrap}>
        <input
          type="number"
          className={styles.numberValue}
          value={parsed.num}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onCommit(buildValue(e.target.value, parsed.unit))}
          disabled={!showNumberField}
        />
        {units.length > 1 && (
          <select
            className={styles.numberUnit}
            value={parsed.unit}
            onChange={(e) => onCommit(buildValue(parsed.num, e.target.value as Unit))}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u === 'none' ? '–' : u}
              </option>
            ))}
          </select>
        )}
      </div>
    </label>
  );
}
