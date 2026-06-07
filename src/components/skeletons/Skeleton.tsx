import type { CSSProperties, ReactNode } from 'react';
import styles from '@styles/components/skeletons/Skeleton.module.scss';

/* Skeleton primitives — feature-perceived-performance V1.
   ─────────────────────────────────────────────────────────
   Content-shape placeholders that match the final layout's grid +
   spacing so the transition from skeleton → real content is zero-shift
   (no layout jank). Subtle left-to-right shimmer animation (~1.5s
   cycle) signals "loading."

   Theme-aware via CSS tokens (var(--color-line) base, blend toward
   var(--color-line-soft) peak). Works across Default / Dark / White.

   Reduced-motion respected — `@media (prefers-reduced-motion: reduce)`
   disables the shimmer keyframe, leaving a static placeholder.

   USAGE:
     <Skeleton h={20} w={120} />                  ← box with explicit size
     <Skeleton w="60%" h={14} radius="full" />    ← responsive width
     <SkeletonText lines={3} />                    ← stack of text rows
     <SkeletonCircle size={32} />                  ← avatar-shape
     <SkeletonBlock h={200} />                     ← chart-shape area */

interface SkeletonProps {
  /** Width in px or any CSS length. Defaults to '100%'. */
  w?:       number | string;
  /** Height in px or any CSS length. Defaults to 14px. */
  h?:       number | string;
  /** Border radius preset OR explicit value. */
  radius?:  'sm' | 'md' | 'lg' | 'full' | number | string;
  /** Optional extra className for layout overrides. */
  className?: string;
  /** Inline style override (e.g. margin). */
  style?:   CSSProperties;
}

function resolveRadius(r: SkeletonProps['radius']): string | undefined {
  if (r === undefined) return undefined;
  if (r === 'sm')   return '4px';
  if (r === 'md')   return '8px';
  if (r === 'lg')   return '14px';
  if (r === 'full') return '999px';
  return typeof r === 'number' ? `${r}px` : r;
}

export function Skeleton({ w = '100%', h = 14, radius = 'sm', className, style }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{
        width:        typeof w === 'number' ? `${w}px` : w,
        height:       typeof h === 'number' ? `${h}px` : h,
        borderRadius: resolveRadius(radius),
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/* ── SkeletonText — stacked variable-width text rows ─────────────── */

interface SkeletonTextProps {
  /** Number of lines. */
  lines?:   number;
  /** Text line height. Defaults to 13px (matches body text). */
  h?:       number;
  /** Gap between lines. */
  gap?:     number;
  /** Width of the LAST line (typically shorter, like a paragraph end). */
  lastWidth?: string;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  h = 13,
  gap = 6,
  lastWidth = '70%',
  className,
}: SkeletonTextProps) {
  return (
    <span
      className={`${styles.textStack} ${className ?? ''}`}
      style={{ gap: `${gap}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          h={h}
          w={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </span>
  );
}

/* ── SkeletonCircle — avatar / icon placeholders ─────────────────── */

interface SkeletonCircleProps {
  size:      number;
  className?: string;
}

export function SkeletonCircle({ size, className }: SkeletonCircleProps) {
  return (
    <Skeleton
      w={size}
      h={size}
      radius="full"
      className={className}
    />
  );
}

/* ── SkeletonBlock — large rectangular area (chart, image, etc.) ─ */

interface SkeletonBlockProps {
  h:         number | string;
  w?:        number | string;
  radius?:   SkeletonProps['radius'];
  className?: string;
  children?:  ReactNode;       // optional content overlay (e.g. centered icon)
}

export function SkeletonBlock({ h, w = '100%', radius = 'md', className, children }: SkeletonBlockProps) {
  return (
    <div className={`${styles.block} ${className ?? ''}`}>
      <Skeleton h={h} w={w} radius={radius} />
      {children}
    </div>
  );
}
