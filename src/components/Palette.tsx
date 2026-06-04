import { useMemo, useState, type ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  IconTypography, IconRectangle, IconMinus, IconArrowsVertical,
  IconPhoto, IconStar, IconBrandFacebook,
  IconLayoutNavbar, IconCode, IconSearch,
} from '@tabler/icons-react';
import { blockRegistry, type BlockDef } from '../blocks/registry';
import {
  PALETTE_GROUP_ORDER,
  PALETTE_GROUP_LABEL,
  type BlockCategory,
  type PaletteGroup,
} from '../blocks/categories';
import styles from '@styles/components/Palette.module.css';

export interface PaletteDragData {
  source: 'palette';
  blockId: string;
  category: BlockCategory;
  label: string;
}

/* Visual for the three layout blocks — N rectangles side-by-side instead
   of a generic icon. Matches doc/mockups/builder.html — Beefree / Stripo
   style. The rectangle count signals exactly what dragging in produces. */
function ColumnVisual({ cols }: { cols: 1 | 2 | 3 }) {
  return (
    <span className={styles.layoutVisual} aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => <i key={i} />)}
    </span>
  );
}

/* Map block id → React icon. Layout blocks use ColumnVisual; everything
   else uses a Tabler icon. */
function iconFor(blockId: string): ReactNode {
  switch (blockId) {
    case 'section-1col': return <ColumnVisual cols={1} />;
    case 'section-2col': return <ColumnVisual cols={2} />;
    case 'section-3col': return <ColumnVisual cols={3} />;
    case 'text':         return <IconTypography size={18} stroke={1.6} />;
    case 'button':       return <IconRectangle size={18} stroke={1.6} />;
    case 'divider':      return <IconMinus size={18} stroke={2} />;
    case 'spacer':       return <IconArrowsVertical size={18} stroke={1.6} />;
    case 'image':        return <IconPhoto size={18} stroke={1.6} />;
    case 'hero':         return <IconStar size={18} stroke={1.6} />;
    case 'social':       return <IconBrandFacebook size={18} stroke={1.6} />;
    case 'navbar':       return <IconLayoutNavbar size={18} stroke={1.6} />;
    case 'rawHtml':      return <IconCode size={18} stroke={1.6} />;
    default:             return null;
  }
}

function PaletteCard({ def }: { def: BlockDef }) {
  const data: PaletteDragData = {
    source: 'palette',
    blockId: def.id,
    category: def.category,
    label: def.label,
  };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette-${def.id}`,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Drag to add ${def.label} block`}
      title={def.label}
      className={`${styles.blockCard} ${isDragging ? styles.dragging : ''}`}
    >
      <span className={styles.blockIcon}>{iconFor(def.id)}</span>
      <span className={styles.blockLabel}>{def.label}</span>
    </div>
  );
}

export default function Palette() {
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const grouped: Record<PaletteGroup, BlockDef[]> = {
      layout: [],
      content: [],
      media: [],
      advanced: [],
    };
    for (const def of Object.values(blockRegistry)) {
      if (q && !def.label.toLowerCase().includes(q)) continue;
      grouped[def.group].push(def);
    }
    return grouped;
  }, [search]);

  const totalMatches = PALETTE_GROUP_ORDER.reduce((sum, g) => sum + groups[g].length, 0);

  return (
    <aside className={styles.palette}>
      <div className={styles.searchWrap}>
        <IconSearch size={14} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.search}
          placeholder="Search blocks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search blocks"
        />
      </div>

      <div className={styles.scroller}>
        {totalMatches === 0 && (
          <div className={styles.empty}>No blocks match “{search}”.</div>
        )}

        {PALETTE_GROUP_ORDER.map((group) => {
          const items = groups[group];
          if (items.length === 0) return null;
          return (
            <section key={group} className={styles.group}>
              <div className={styles.groupHeader}>{PALETTE_GROUP_LABEL[group]}</div>
              <div className={styles.grid}>
                {items.map((def) => (
                  <PaletteCard key={def.id} def={def} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
