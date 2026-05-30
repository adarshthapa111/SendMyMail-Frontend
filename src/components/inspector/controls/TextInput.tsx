import { useDebouncedCommit } from './useDebouncedCommit';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  label?: string;
  value: string | undefined;
  placeholder?: string;
  onCommit: (value: string) => void;
}

export default function TextInput({ label, value, placeholder, onCommit }: Props) {
  const [local, onChange] = useDebouncedCommit(value ?? '', onCommit);
  return (
    <label className={styles.field}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <input
        type="text"
        className={styles.input}
        value={local}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
