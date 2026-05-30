import styles from '@styles/components/inspector/controls/controls.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  value: string | undefined;
  options: Array<SelectOption | string>;
  /** Text shown when value is empty/undefined. */
  placeholder?: string;
  onCommit: (value: string) => void;
}

export default function SelectInput({ label, value, options, placeholder, onCommit }: Props) {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <label className={styles.field}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <select
        className={styles.select}
        value={value ?? ''}
        onChange={(e) => onCommit(e.target.value)}
      >
        {placeholder && value === undefined && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
