import type { HTMLAttributes, ReactNode } from 'react';
import styles from '@styles/components/ui/Pill.module.scss';

type PillVariant = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'indigo';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
  /** Add a leading dot in the pill's color (good for status). */
  dot?: boolean;
  children: ReactNode;
}

export function Pill({ variant = 'gray', dot, className = '', children, ...rest }: Props) {
  return (
    <span
      className={`${styles.pill} ${styles[variant]} ${dot ? styles.dot : ''} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
