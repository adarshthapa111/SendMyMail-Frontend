import type { ElementType, HTMLAttributes, ReactNode } from 'react';

/* ─── Heading ─────────────────────────────────────────────────────────────────
   Display-typography component using Bricolage Grotesque (via `.display`).
   Renders <h1>/<h2>/<h3> based on `level`; size controlled separately so
   semantics and visuals can vary independently.
*/

type HeadingLevel = 1 | 2 | 3;
type HeadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const HEADING_SIZE: Record<HeadingSize, string> = {
  xs:  'text-base',     // 16px
  sm:  'text-lg',       // 18px
  md:  'text-xl',       // 20px
  lg:  'text-2xl',      // 24px
  xl:  'text-3xl',      // 30px — page greetings
  '2xl': 'text-4xl',    // 36px — auth pitch headlines
};

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  size?: HeadingSize;
  children: ReactNode;
}

export function Heading({ level = 1, size = 'lg', className = '', children, ...rest }: HeadingProps) {
  const Tag = `h${level}` as ElementType;
  return (
    <Tag
      className={`display font-semibold text-ink ${HEADING_SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ─── Text ────────────────────────────────────────────────────────────────────
   Body copy. Uses General Sans (inherited). Variants for tone.
*/

type TextSize = 'xs' | 'sm' | 'md' | 'lg';
type TextTone = 'ink' | 'muted' | 'soft' | 'primary' | 'green' | 'amber' | 'red';

const TEXT_SIZE: Record<TextSize, string> = {
  xs: 'text-xs',     // 12px
  sm: 'text-sm',     // 14px (default body)
  md: 'text-base',   // 16px
  lg: 'text-lg',     // 18px
};
const TEXT_TONE: Record<TextTone, string> = {
  ink:     'text-ink',
  muted:   'text-muted',
  soft:    'text-soft',
  primary: 'text-primary-ink',
  green:   'text-green-tx',
  amber:   'text-amber-tx',
  red:     'text-red',
};

interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Render as <p> (default), <span>, or <div>. */
  as?: 'p' | 'span' | 'div';
  size?: TextSize;
  tone?: TextTone;
  /** Tabular numerals (good for figures that change). */
  tabular?: boolean;
  children: ReactNode;
}

export function Text({ as = 'p', size = 'sm', tone = 'ink', tabular, className = '', children, ...rest }: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={`${TEXT_SIZE[size]} ${TEXT_TONE[tone]} ${tabular ? 'tnum' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ─── Eyebrow ─────────────────────────────────────────────────────────────────
   Small-caps section labels — uppercase, tracked-out, soft tone.
*/

interface EyebrowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Eyebrow({ className = '', children, ...rest }: EyebrowProps) {
  return (
    <div
      className={`text-xs font-bold uppercase text-soft ${className}`}
      style={{ letterSpacing: '0.12em' }}
      {...rest}
    >
      {children}
    </div>
  );
}
