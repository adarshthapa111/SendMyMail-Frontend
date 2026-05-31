import type { HTMLAttributes } from 'react';

type DividerWeight = 'soft' | 'normal' | 'strong';

const WEIGHT: Record<DividerWeight, string> = {
  soft:   'border-line-soft',
  normal: 'border-line',
  strong: 'border-line-strong',
};

interface Props extends HTMLAttributes<HTMLHRElement> {
  /** Hairline weight — defaults to `normal`. Use `soft` for inner dividers, `strong` for emphasis. */
  weight?: DividerWeight;
  /** Vertical margin in Tailwind spacing units (default `my-4`). Pass `null` for none. */
  spacing?: string | null;
}

/* Horizontal rule with our warm tokens. Plays well between sections of a Card
   or between rows in an editorial list. */
export function Divider({ weight = 'normal', spacing = 'my-4', className = '', ...rest }: Props) {
  return (
    <hr
      className={`border-0 border-t ${WEIGHT[weight]} ${spacing ?? ''} ${className}`}
      {...rest}
    />
  );
}
