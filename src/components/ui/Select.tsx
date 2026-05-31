import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import styles from '@styles/components/ui/Select.module.scss';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  children: ReactNode;
}

/* Native <select> with our custom chevron. For complex pickers (search-as-you-type,
   multi-select, async options) the Combobox component lands later. */
export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`${styles.select} ${invalid ? styles.error : ''} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});
