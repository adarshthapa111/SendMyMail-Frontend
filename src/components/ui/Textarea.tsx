import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styles from '@styles/components/ui/Textarea.module.scss';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`${styles.textarea} ${invalid ? styles.error : ''} ${className}`}
      {...rest}
    />
  );
});
