import { useEffect, useRef, useState } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { type PaletteGroup } from '../blocks/categories';
import CategoryRail from './palette/CategoryRail';
import Flyout from './palette/Flyout';
import styles from '@styles/components/Palette.module.css';

/* feature-section-library V1 — the palette is two-level
   (MailerLite pattern):

     [CategoryRail]  [Flyout ▸ overlays the canvas edge, full height]

   HOVERING a rail entry opens its flyout (with a short grace delay on
   leave so the diagonal mouse path into the flyout doesn't close it).
   CLICKING pins the category open — a pinned flyout survives the mouse
   leaving; Esc / ✕ / re-click unpins.

   Drag data shape is unchanged from the old single-panel palette, so
   DropZone + EditorBody.onDragEnd work as-is. */

export type { PaletteDragData } from './palette/Flyout';

const PIN_KEY = 'sendmymail-palette-category';
const LEAVE_GRACE_MS = 260;

function readPinned(): PaletteGroup | null {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (raw === null || raw === '') return 'elements';
    if (raw === 'closed') return null;
    return raw as PaletteGroup;
  } catch {
    return 'elements';
  }
}

export default function Palette() {
  const [pinned, setPinned] = useState<PaletteGroup | null>(readPinned);
  const [hovered, setHovered] = useState<PaletteGroup | null>(null);
  const leaveTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, pinned ?? 'closed');
    } catch { /* private browsing */ }
  }, [pinned]);

  useEffect(() => () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
  }, []);

  const open = hovered ?? pinned;

  /* While a palette card is being dragged, the flyout must stay MOUNTED
     (dnd-kit cancels the drag if the active draggable unmounts) but
     visually hidden so the canvas is clear. dragGroup freezes whichever
     group was open at drag start — hover-grace timeouts firing mid-drag
     can no longer unmount it. */
  const [dragGroup, setDragGroup] = useState<PaletteGroup | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useDndMonitor({
    onDragStart(event) {
      const data = event.active.data.current as { source?: string } | undefined;
      if (data?.source === 'palette') setDragGroup(openRef.current);
    },
    onDragEnd() {
      setDragGroup(null);
      setHovered(null);   // mouse is over the canvas now — drop the hover preview
    },
    onDragCancel() {
      setDragGroup(null);
      setHovered(null);
    },
  });

  const cancelLeave = () => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const onHover = (group: PaletteGroup) => {
    cancelLeave();
    setHovered(group);
  };

  /* Mouse left the rail+flyout region — drop the hover preview after a
     grace period. A pinned category stays open. */
  const onRegionLeave = () => {
    cancelLeave();
    leaveTimer.current = window.setTimeout(() => setHovered(null), LEAVE_GRACE_MS);
  };

  const onPin = (group: PaletteGroup) => {
    setPinned((cur) => (cur === group ? null : group));
    setHovered(null);
  };

  const onClose = () => {
    setPinned(null);
    setHovered(null);
  };

  return (
    /* Hover handlers live on the WHOLE sidebar (not just the rail) so the
       flyout — anchored to the aside, full height beside it — counts as
       part of the hover region. Leaving both closes the hover preview. */
    <aside
      className={styles.palette}
      onMouseLeave={onRegionLeave}
      onMouseEnter={cancelLeave}
    >
      <div className={styles.railWrap}>
        <CategoryRail
          active={open}
          pinned={pinned}
          onSelect={onPin}
          onHover={onHover}
        />
      </div>

      {/* Anchored to the aside → spans the FULL sidebar height. */}
      <Flyout
        group={dragGroup ?? open}
        search=""
        hidden={dragGroup !== null}
        onClose={onClose}
      />
    </aside>
  );
}
