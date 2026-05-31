import type { Icon as TablerIcon } from '@tabler/icons-react';

interface Props {
  /** A Tabler icon component, e.g. `IconBell` from `@tabler/icons-react`. */
  as: TablerIcon;
  /** Pixel size — defaults to 18 (matches our UI density). */
  size?: number;
  /** Tailwind color class like `text-muted` / `text-primary`. Defaults to inherit. */
  className?: string;
  /** Accessible label. If omitted, the icon is decorative (aria-hidden). */
  title?: string;
}

/* Thin wrapper around @tabler/icons-react so screens can grab consistent sizes
   without remembering the prop name. Decorative by default; pass `title` to give
   it a name for assistive tech. */
export function Icon({ as: Tag, size = 18, className, title }: Props) {
  return (
    <Tag
      size={size}
      className={className}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    />
  );
}
