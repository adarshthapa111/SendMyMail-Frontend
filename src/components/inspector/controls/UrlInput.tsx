import { useDebouncedCommit } from './useDebouncedCommit';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  label?: string;
  value: string | undefined;
  placeholder?: string;
  onCommit: (value: string) => void;
}

export default function UrlInput({ label, value, placeholder = 'https://...', onCommit }: Props) {
  const [local, onChange] = useDebouncedCommit(value ?? '', onCommit);
  return (
    <label className={styles.field}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <input
        type="url"
        className={styles.input}
        value={local}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </label>
  );
}
