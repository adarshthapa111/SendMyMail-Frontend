import { useState, type ReactNode } from 'react';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function FormSection({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className={`${styles.caret} ${open ? styles.caretOpen : ''}`}>▶</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}
