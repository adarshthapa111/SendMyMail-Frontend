import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  IconX, IconTypography, IconRectangle, IconMinus, IconArrowsVertical,
  IconPhoto, IconStar, IconBrandFacebook, IconLayoutNavbar, IconCode,
} from '@tabler/icons-react';
import { blockRegistry, type BlockDef } from '../../blocks/registry';
import { PALETTE_GROUP_LABEL, type BlockCategory, type PaletteGroup } from '../../blocks/categories';
import { subscribeBrandKit, brandKitVersion } from '../../blocks/library/brandKit';
import SectionPreview from './SectionPreview';
import styles from '@styles/components/palette/Flyout.module.scss';

/* feature-section-library V1 — the flyout panel that opens beside the
   category rail. Elements render as the classic icon-tile grid;
   section composites render as live mini-preview cards (MailerLite
   pattern: you see WHAT you'll get, not an abstract glyph).

   Drag data shape is identical to the old palette cards, so DropZone /
   EditorBody.onDragEnd work unchanged. */

export interface PaletteDragData {
  source: 'palette';
  blockId: string;
  category: BlockCategory;
  label: string;
}

/* Full-bleed inside the card: flyout 300 − scroll padding 24 − card borders 2. */
const PREVIEW_W = 274;

/* Stable factory output per block id — composites carry _ids from
   uuid(), so calling factory() during render would re-render previews
   with new ids each time. Cache one preview node per block. The
   factory is called AGAIN at drop time (in EditorBody), so dropped
   blocks always get fresh ids.

   feature-client-brand-kit V1 — the cache is keyed by brand-kit version
   too: factories read the active kit at call time, so a node cached
   under client A is stale after switching to client B. The whole cache
   is dropped when the version changes (the Flyout re-renders via
   useSyncExternalStore), so previews rebuild on-brand. */
const previewCache = new Map<string, ReturnType<BlockDef['factory']>>();
let cacheVersion = -1;
function previewNodeFor(def: BlockDef, version: number) {
  if (version !== cacheVersion) {
    previewCache.clear();
    cacheVersion = version;
  }
  let node = previewCache.get(def.id);
  if (!node) {
    node = def.factory();
    previewCache.set(def.id, node);
  }
  return node;
}

function elementIconFor(blockId: string): ReactNode {
  switch (blockId) {
    case 'text':    return <IconTypography size={18} stroke={1.6} />;
    case 'button':  return <IconRectangle size={18} stroke={1.6} />;
    case 'divider': return <IconMinus size={18} stroke={2} />;
    case 'spacer':  return <IconArrowsVertical size={18} stroke={1.6} />;
    case 'image':   return <IconPhoto size={18} stroke={1.6} />;
    case 'hero':    return <IconStar size={18} stroke={1.6} />;
    case 'social':  return <IconBrandFacebook size={18} stroke={1.6} />;
    case 'navbar':  return <IconLayoutNavbar size={18} stroke={1.6} />;
    case 'rawHtml': return <IconCode size={18} stroke={1.6} />;
    default:        return null;
  }
}

/* Visual for the three layout scaffolds — N rectangles side-by-side. */
function ColumnVisual({ cols }: { cols: 1 | 2 | 3 }) {
  return (
    <span className={styles.layoutVisual} aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => <i key={i} />)}
    </span>
  );
}

function tileIconFor(def: BlockDef): ReactNode {
  if (def.id === 'section-1col') return <ColumnVisual cols={1} />;
  if (def.id === 'section-2col') return <ColumnVisual cols={2} />;
  if (def.id === 'section-3col') return <ColumnVisual cols={3} />;
  return elementIconFor(def.id);
}

/* NOTE: the flyout must STAY MOUNTED while one of its cards is being
   dragged — dnd-kit cancels the drag if the active draggable unmounts.
   Palette keeps us rendered (visually hidden via the `hidden` prop)
   for the duration of the drag. */
function useDragHandle(def: BlockDef) {
  const data: PaletteDragData = {
    source: 'palette',
    blockId: def.id,
    category: def.category,
    label: def.label,
  };
  return useDraggable({ id: `palette-${def.id}`, data });
}

function ElementTile({ def }: { def: BlockDef }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDragHandle(def);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Drag to add ${def.label} block`}
      title={def.label}
      className={`${styles.tile} ${isDragging ? styles.dragging : ''}`}
    >
      <span className={styles.tileIcon}>{tileIconFor(def)}</span>
      <span className={styles.tileLabel}>{def.label}</span>
    </div>
  );
}

function CompositeCard({ def, kitVersion }: { def: BlockDef; kitVersion: number }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDragHandle(def);
  const node = previewNodeFor(def, kitVersion);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Drag to add ${def.label} section`}
      title={def.label}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
    >
      <span className={styles.cardLabel}>{def.label}</span>
      <div className={styles.cardPreview}>
        <SectionPreview node={node} width={PREVIEW_W} />
      </div>
    </div>
  );
}

interface Props {
  group: PaletteGroup | null;
  /** Search query — when non-empty, the flyout shows matches across ALL groups. */
  search: string;
  /** True while one of our cards is being dragged — stay mounted, render invisible. */
  hidden?: boolean;
  onClose: () => void;
}

export default function Flyout({ group, search, hidden = false, onClose }: Props) {
  const isSearching = search.trim().length > 0;

  /* Re-render (and rebuild preview cards) whenever the active brand kit
     changes — e.g. switching clients or the kit finishing its async
     load — so the sidebar previews reflect the client's colors/font. */
  const kitVersion = useSyncExternalStore(subscribeBrandKit, brandKitVersion);

  const defs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = Object.values(blockRegistry);
    if (isSearching) return all.filter((d) => d.label.toLowerCase().includes(q));
    if (!group) return [];
    return all.filter((d) => d.group === group);
  }, [group, search, isSearching]);

  // Esc closes
  useEffect(() => {
    if (!group && !isSearching) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [group, isSearching, onClose]);

  if (!group && !isSearching) return null;

  const elements   = defs.filter((d) => d.kind === 'element');
  const composites = defs.filter((d) => d.kind === 'section-composite');
  const title = isSearching
    ? `Results for “${search.trim()}”`
    : PALETTE_GROUP_LABEL[group!];

  return (
    <div
      className={`${styles.flyout} ${hidden ? styles.flyoutHidden : ''}`}
      role="dialog"
      aria-label={`${title} blocks`}
      aria-hidden={hidden}
    >
      <div className={styles.head}>
        <span className={styles.headTitle}>{title}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close panel">
          <IconX size={15} stroke={1.8} />
        </button>
      </div>

      <div className={styles.scroll}>
        {defs.length === 0 && (
          <div className={styles.empty}>No blocks match “{search}”.</div>
        )}

        {elements.length > 0 && (
          <div className={styles.tileGrid}>
            {elements.map((def) => (
              <ElementTile key={def.id} def={def} />
            ))}
          </div>
        )}

        {composites.map((def) => (
          <CompositeCard key={`${def.id}:${kitVersion}`} def={def} kitVersion={kitVersion} />
        ))}
      </div>
    </div>
  );
}
