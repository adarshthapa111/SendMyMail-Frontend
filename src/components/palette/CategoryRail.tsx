import type { ReactNode } from 'react';
import {
  IconLetterT, IconLayoutGrid, IconLayoutNavbar, IconStar,
  IconArticle, IconPhoto, IconHandClick, IconLayoutBottombar,
  IconTable, IconPlayerPlay, IconChevronRight,
} from '@tabler/icons-react';
import {
  PALETTE_GROUP_LABEL,
  type PaletteGroup,
} from '../../blocks/categories';
import styles from '@styles/components/palette/CategoryRail.module.scss';

/* feature-section-library V1 — the category rail.
   Hover an entry to preview its flyout; click to pin it open.

   Entries are grouped into visual clusters (build-blocks / designed
   sections / footer) with hairline dividers, each entry carrying a
   tinted icon chip + label + chevron (the chevron says "opens a
   panel" — clearer than a count badge). */

function railIconFor(group: PaletteGroup): ReactNode {
  switch (group) {
    case 'elements': return <IconLetterT         size={16} stroke={1.7} />;
    case 'layout':   return <IconLayoutGrid      size={16} stroke={1.7} />;
    case 'header':   return <IconLayoutNavbar    size={16} stroke={1.7} />;
    case 'hero':     return <IconStar            size={16} stroke={1.7} />;
    case 'features': return <IconArticle         size={16} stroke={1.7} />;
    case 'gallery':  return <IconPhoto           size={16} stroke={1.7} />;
    case 'table':    return <IconTable           size={16} stroke={1.7} />;
    case 'video':    return <IconPlayerPlay      size={16} stroke={1.7} />;
    case 'cta':      return <IconHandClick       size={16} stroke={1.7} />;
    case 'footer':   return <IconLayoutBottombar size={16} stroke={1.7} />;
  }
}

/* Visual clusters — rendered with a hairline divider between them. */
const CLUSTERS: PaletteGroup[][] = [
  ['elements', 'layout'],
  ['header', 'hero', 'features', 'gallery', 'table', 'video', 'cta'],
  ['footer'],
];

interface Props {
  /** Category whose flyout is currently open (hover preview OR pin). */
  active: PaletteGroup | null;
  /** Category pinned open by click — shown with the strong active style. */
  pinned: PaletteGroup | null;
  /** Click — pin/unpin the category. */
  onSelect: (group: PaletteGroup) => void;
  /** Mouse entered an entry — open its flyout as a hover preview. */
  onHover: (group: PaletteGroup) => void;
}

export default function CategoryRail({ active, pinned, onSelect, onHover }: Props) {
  return (
    <nav className={styles.rail} aria-label="Block categories">
      {CLUSTERS.map((cluster, ci) => (
        <div key={ci} className={styles.cluster}>
          {cluster.map((group) => {
            const isOpen   = group === active;
            const isPinned = group === pinned;
            return (
              <button
                key={group}
                type="button"
                className={`${styles.entry} ${isOpen ? styles.entryOpen : ''} ${isPinned ? styles.entryActive : ''}`}
                onClick={() => onSelect(group)}
                onMouseEnter={() => onHover(group)}
                aria-expanded={isOpen}
              >
                <span className={styles.entryChip} aria-hidden="true">
                  {railIconFor(group)}
                </span>
                <span className={styles.entryLabel}>{PALETTE_GROUP_LABEL[group]}</span>
                <IconChevronRight
                  size={13}
                  stroke={2}
                  className={styles.entryChevron}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
