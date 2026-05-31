import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from '@styles/components/ui/Button.module.scss';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon — pass a Tabler icon element, e.g. `<IconPlus size={14} />`. */
  leading?: ReactNode;
  /** Trailing icon. */
  trailing?: ReactNode;
  /** Stretch to fill the parent width. */
  block?: boolean;
  /** Show a spinner instead of the label; disables the button. */
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    leading,
    trailing,
    block,
    loading,
    disabled,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`
        ${styles.btn}
        ${styles[variant]}
        ${styles[size]}
        ${block ? styles.block : ''}
        ${loading ? styles.loading : ''}
        ${className}
      `}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
});
