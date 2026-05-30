import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
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
      <span className={styles.blockIcon}>{def.icon}</span>
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

      <div className={styles.hint}>Drag a block onto the canvas.</div>
    </aside>
  );
}
