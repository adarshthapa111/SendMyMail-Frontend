import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from '@styles/components/ui/Checkbox.module.scss';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** The label text or rich content rendered next to the checkbox. */
  children: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { children, disabled, className = '', ...rest },
  ref,
) {
  return (
    <label className={`${styles.row} ${disabled ? styles.disabled : ''} ${className}`}>
      <input ref={ref} type="checkbox" className={styles.input} disabled={disabled} {...rest} />
      <span className={styles.label}>{children}</span>
    </label>
  );
});
