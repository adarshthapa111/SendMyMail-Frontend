import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteBlock, duplicateBlock, moveBlock, selectNode } from '../store/slices/editorSlice';
import { getAtPath, getParentAtPath } from '../tree/paths';
import { getTagCategory, getTagLabel } from '../blocks/labels';
import type { BlockCategory } from '../blocks/categories';
import type { NodePath } from '../tree/types';
import styles from '@styles/canvas/SelectionToolbar.module.css';

interface Props {
  path: NodePath;
  /**
   * feature-editor-premium-polish V1 — visual variant.
   *   'selected' (default): full opacity, persistent — shown when the
   *                          block IS selected.
   *   'hover': subordinate styling, no actions clickable (just preview) —
   *            shown when the block is hovered but NOT selected.
   * Hover variant signals "actions available" without committing the
   * user to a selection. Click the block to commit.
   */
  variant?: 'selected' | 'hover';
}

export interface CanvasDragData {
  source: 'canvas';
  path: NodePath;
  tagName: string;
  category: BlockCategory;
  label: string;
}

/* Resting offset: toolbar floats 38px above the block. The slide effect
   raises it toward the block when the block nears the canvas top. */
const REST_TOP = -38;

/**
 * Floating action row anchored above the currently selected block.
 *
 * The grip (⠿) on the left is the drag handle — only this element initiates
 * a canvas-source drag (Phase 12). Listeners are scoped to the grip so the
 * other buttons (↑↓⎘✕) remain clickable.
 *
 * Move-button semantics: toIndex is the position in the pre-detach array
 * (drop-zone convention). "Move down" = current+2, "move up" = current-1.
 */
export default function SelectionToolbar({ path, variant = 'selected' }: Props) {
  const dispatch = useAppDispatch();
  const tree = useAppSelector((s) => s.editor.tree);

  /* fix-toolbar-clip V1 — the toolbar floats at top: -38px (above the
     block). For a block near the canvas top that overflows the scroll
     edge + sits under the BuilderTopBar → clipped. Instead of a fixed
     offset, the toolbar SLIDES: it stays at -38px when there's room,
     and as the block approaches the top it pins just below the canvas
     top edge (never clipped, only overlaps content at the extreme).
     Hooks declared before the early returns so they run unconditionally;
     re-checks on scroll/resize. */
  const ref = useRef<HTMLDivElement>(null);
  const [topPx, setTopPx] = useState(REST_TOP);
  useLayoutEffect(() => {
    const el = ref.current;
    const block = el?.parentElement;
    const scroller = el?.closest('[class*="canvas"]') as HTMLElement | null;
    if (!el || !block || !scroller) return;
    const check = () => {
      const room = block.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      // Keep the toolbar's top edge >= 4px below the canvas top edge.
      setTopPx(Math.max(REST_TOP, 4 - room));
    };
    check();
    scroller.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      scroller.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [path]);

  if (path.length < 2) return null;
  const lastIndex = path[path.length - 1];
  if (typeof lastIndex !== 'number') return null;

  const node = getAtPath(tree, path);
  const parentInfo = getParentAtPath(tree, path);
  const siblingCount = parentInfo?.parent.children?.length ?? 0;
  const toParentPath = path.slice(0, -2);

  const canMoveUp = lastIndex > 0;
  const canMoveDown = lastIndex < siblingCount - 1;

  // Drag handle — single useDraggable scoped to the grip only.
  const tagName = node?.tagName ?? 'unknown';
  const dragData: CanvasDragData = {
    source: 'canvas',
    path,
    tagName,
    category: getTagCategory(tagName),
    label: getTagLabel(tagName),
  };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `canvas-${node?._id ?? path.join('-')}`,
    data: dragData,
  });

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const onUp = stop(() => {
    if (!canMoveUp) return;
    dispatch(moveBlock({ fromPath: path, toParentPath, toIndex: lastIndex - 1 }));
  });

  const onDown = stop(() => {
    if (!canMoveDown) return;
    dispatch(moveBlock({ fromPath: path, toParentPath, toIndex: lastIndex + 2 }));
  });

  const onDuplicate = stop(() => {
    dispatch(duplicateBlock({ path }));
  });

  const onDelete = stop(() => {
    dispatch(deleteBlock({ path }));
    dispatch(selectNode(null));
  });

  const variantClass = variant === 'hover' ? styles.toolbarHover : '';

  return (
    <div
      ref={ref}
      className={`${styles.toolbar} ${variantClass}`}
      style={{ top: topPx }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* fix-editor-chrome V1 — block name tag. Selection now reads as
          "picked up the Text block", not an anonymous outline. */}
      <span className={styles.tag}>{getTagLabel(tagName)}</span>
      <span
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`${styles.grip} ${isDragging ? styles.gripDragging : ''}`}
        title="Drag to reorder"
        aria-label="Drag handle"
        role="button"
      >
        ⠿
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={onUp}
        disabled={!canMoveUp}
        title="Move up"
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={onDown}
        disabled={!canMoveDown}
        title="Move down"
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={onDuplicate}
        title="Duplicate (⌘D)"
        aria-label="Duplicate"
      >
        ⎘
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.danger}`}
        onClick={onDelete}
        title="Delete (Del)"
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
}
