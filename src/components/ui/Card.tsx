import type { HTMLAttributes, ReactNode } from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm:   'p-4',         // 16px
  md:   'p-6',         // 24px (default — matches mockup card padding)
  lg:   'p-8',         // 32px
};

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Padding preset — use `none` if you need a custom inner layout (e.g. tables). */
  padding?: CardPadding;
  /** Use `shadow-md` (default) or `shadow-sm` (subtler — for inline / dense layouts). */
  shadow?: 'sm' | 'md';
  children: ReactNode;
}

/* Base surface. Use this anywhere a panel / floating block is needed.
   For more complex card patterns (Stat cards, Picker cards), compose this with
   inner divs and Tailwind utilities. */
export function Card({ padding = 'md', shadow = 'md', className = '', children, ...rest }: Props) {
  const shadowCls = shadow === 'md' ? 'shadow' : 'shadow-sm';
  return (
    <div
      className={`bg-card border border-line rounded-lg ${shadowCls} ${PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
