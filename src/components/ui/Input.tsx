import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from '@styles/components/ui/Input.module.scss';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Show error styling — call sites usually pair this with Field's `error` prop. */
  invalid?: boolean;
  /** Text/element shown inside the left side (e.g. "https://" / "रू"). */
  prefix?: ReactNode;
  /** Text/element shown inside the right side (e.g. "@khukrispices.com" / unit). */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { type = 'text', invalid, prefix, suffix, className = '', ...rest },
  ref,
) {
  if (prefix || suffix) {
    return (
      <div className={`${styles.wrap} ${invalid ? styles.error : ''} ${className}`}>
        {prefix && <span className={`${styles.adornment} ${styles.prefix}`}>{prefix}</span>}
        <input ref={ref} type={type} className={styles.input} {...rest} />
        {suffix && <span className={`${styles.adornment} ${styles.suffix}`}>{suffix}</span>}
      </div>
    );
  }
  return (
    <input
      ref={ref}
      type={type}
      className={`${styles.input} ${invalid ? styles.error : ''} ${className}`}
      {...rest}
    />
  );
});
