import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  IconTypography, IconRectangle, IconMinus, IconArrowsVertical,
  IconPhoto, IconStar, IconBrandFacebook,
  IconLayoutNavbar, IconCode, IconSearch, IconChevronRight,
  IconLayoutGrid, IconLetterT, IconPhotoFilled, IconTools,
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

/* feature-editor-premium-polish V1 — category icons for the group
   headers. Visual anchor + matches Beefree / MailerLite pattern. */
function categoryIconFor(group: PaletteGroup): ReactNode {
  switch (group) {
    case 'layout':   return <IconLayoutGrid  size={13} stroke={1.6} />;
    case 'content':  return <IconLetterT     size={13} stroke={1.6} />;
    case 'media':    return <IconPhotoFilled size={13} stroke={1.6} />;
    case 'advanced': return <IconTools       size={13} stroke={1.6} />;
  }
}

/* feature-editor-premium-polish V1 — persisted collapse state per
   group. Default: layout + content expanded, media + advanced
   collapsed (most-used first). */
const COLLAPSE_KEY = 'sendmymail-palette-groups';
const DEFAULT_COLLAPSED: Record<PaletteGroup, boolean> = {
  layout:   false,
  content:  false,
  media:    true,
  advanced: true,
};

function readCollapsedState(): Record<PaletteGroup, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return { ...DEFAULT_COLLAPSED };
    const parsed = JSON.parse(raw);
    return {
      layout:   typeof parsed.layout   === 'boolean' ? parsed.layout   : DEFAULT_COLLAPSED.layout,
      content:  typeof parsed.content  === 'boolean' ? parsed.content  : DEFAULT_COLLAPSED.content,
      media:    typeof parsed.media    === 'boolean' ? parsed.media    : DEFAULT_COLLAPSED.media,
      advanced: typeof parsed.advanced === 'boolean' ? parsed.advanced : DEFAULT_COLLAPSED.advanced,
    };
  } catch {
    return { ...DEFAULT_COLLAPSED };
  }
}

export default function Palette() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<PaletteGroup, boolean>>(readCollapsedState);

  /* Persist collapse state on every change. */
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    } catch { /* private browsing */ }
  }, [collapsed]);

  const toggle = (group: PaletteGroup) =>
    setCollapsed((s) => ({ ...s, [group]: !s[group] }));

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

  /* When search is active, force all groups expanded — surface matches
     regardless of saved collapse preferences. */
  const isSearching  = search.trim().length > 0;
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
          const isCollapsed = !isSearching && collapsed[group];
          return (
            <section key={group} className={styles.group}>
              <button
                type="button"
                className={`${styles.groupHeader} ${isCollapsed ? styles.groupHeaderCollapsed : ''}`}
                onClick={() => !isSearching && toggle(group)}
                aria-expanded={!isCollapsed}
                aria-controls={`palette-group-${group}`}
                disabled={isSearching}
              >
                <IconChevronRight
                  size={11}
                  stroke={2}
                  className={`${styles.groupChevron} ${isCollapsed ? '' : styles.groupChevronOpen}`}
                  aria-hidden="true"
                />
                <span className={styles.groupIcon} aria-hidden="true">
                  {categoryIconFor(group)}
                </span>
                <span>{PALETTE_GROUP_LABEL[group]}</span>
                <span className={styles.groupCount} aria-hidden="true">{items.length}</span>
              </button>
              {!isCollapsed && (
                <div className={styles.grid} id={`palette-group-${group}`}>
                  {items.map((def) => (
                    <PaletteCard key={def.id} def={def} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
