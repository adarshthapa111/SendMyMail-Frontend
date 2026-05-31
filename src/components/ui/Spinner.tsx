import type { HTMLAttributes } from 'react';
import styles from '@styles/components/ui/Spinner.module.scss';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
}

/* Loading indicator. Color inherits from parent (e.g. wrap in `text-primary`
   for a terracotta spinner). For button-internal loading, the Button component
   has its own built-in spinner via the `loading` prop. */
export function Spinner({ size = 'md', className = '', ...rest }: Props) {
  return (
    <span
      className={`${styles.spinner} ${styles[size]} ${className}`}
      role="status"
      aria-label="Loading"
      {...rest}
    />
  );
}
