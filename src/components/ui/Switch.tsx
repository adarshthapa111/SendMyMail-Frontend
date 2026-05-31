import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from '@styles/components/ui/Switch.module.scss';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Optional inline label rendered to the right of the toggle. */
  label?: string;
}

/* Animated on/off switch — visually identical to the toggles in settings.html
   notification preferences. Wraps a native checkbox for full keyboard +
   screen-reader support. */
export const Switch = forwardRef<HTMLInputElement, Props>(function Switch(
  { label, disabled, className = '', ...rest },
  ref,
) {
  return (
    <label className={`${styles.wrap} ${disabled ? styles.disabled : ''} ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.input}
        disabled={disabled}
        role="switch"
        {...rest}
      />
      <span className={styles.track} aria-hidden />
      {label && <span className="ml-2.5 text-sm text-ink">{label}</span>}
    </label>
  );
});
