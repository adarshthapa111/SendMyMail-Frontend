import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import Palette, { type PaletteDragData } from './Palette';
import Canvas from './Canvas';
import Inspector from './Inspector';
import PreviewModal from './PreviewModal';
import DragChip from '../canvas/DragChip';
import FloatingTextToolbar from '../canvas/FloatingTextToolbar';
import type { DropZoneData } from '../canvas/DropZone';
import type { CanvasDragData } from '../canvas/SelectionToolbar';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  deleteBlock,
  duplicateBlock,
  insertBlock,
  moveBlock,
  redo,
  selectNode,
  undo,
} from '../store/slices/editorSlice';
import { blockRegistry } from '../blocks/registry';
import { createSectionWithColumn } from '../blocks/sections';
import { getAtPath } from '../tree/paths';

import styles from '@styles/components/EditorBody.module.css';

/**
 * Returns true when the keydown event came from a typing surface and we
 * should not hijack it for editor shortcuts (Delete in a textarea must
 * delete a character, not a block).
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/* The editor body — the layout that contains Palette + Canvas + Inspector,
   plus all the cross-cutting editor wiring (DnD context, keyboard shortcuts,
   drag overlay, floating text toolbar, preview modal).

   Extracted from EditorShell so pages with their own chrome (the template
   builder's BuilderTopBar) can render JUST the body without dragging
   along the legacy Toolbar. EditorShell keeps using this internally too. */
export default function EditorBody() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.editor.selectedId);
  const idPathCache = useAppSelector((s) => s.editor.idPathCache);
  const tree = useAppSelector((s) => s.editor.tree);

  // Label shown in the <DragOverlay> chip. Set on drag-start from either
  // palette or canvas data; cleared on drag-end / drag-cancel.
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Global keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(selectNode(null));
        return;
      }
      if (isEditableTarget(e.target)) return;

      const selectedPath = selectedId ? idPathCache[selectedId] : undefined;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPath) {
        e.preventDefault();
        dispatch(deleteBlock({ path: selectedPath }));
        return;
      }

      // ⌘D / Ctrl-D → duplicate. Override the browser's "bookmark" default.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D') && selectedPath) {
        e.preventDefault();
        dispatch(duplicateBlock({ path: selectedPath }));
        return;
      }

      // Undo: ⌘Z / Ctrl-Z   |   Redo: ⌘⇧Z / Ctrl-⇧Z   |   Redo: ⌘Y / Ctrl-Y
      // Browser owns Cmd-Z inside inputs/textareas — guarded above via isEditableTarget.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) dispatch(redo());
        else dispatch(undo());
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        dispatch(redo());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch, selectedId, idPathCache]);

  // ── Drag-and-drop handlers ─────────────────────────────────────────
  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as PaletteDragData | CanvasDragData | undefined;
    if (data?.label) setActiveLabel(data.label);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveLabel(null);

    const sourceData = event.active.data.current as PaletteDragData | CanvasDragData | undefined;
    const targetData = event.over?.data.current as DropZoneData | undefined;
    if (!sourceData || !targetData || targetData.target !== 'dropZone') return;

    // ── Canvas-source drag → reorder existing block ──────────────────
    if (sourceData.source === 'canvas') {
      const directlyAccepts = targetData.accepts.includes(sourceData.category);
      if (!directlyAccepts) return; // no auto-wrap when reordering — reject silently
      dispatch(
        moveBlock({
          fromPath: sourceData.path,
          toParentPath: targetData.parentPath,
          toIndex: targetData.index,
        })
      );
      return;
    }

    // ── Palette-source drag → insert new block ───────────────────────
    if (sourceData.source !== 'palette') return;
    const blockDef = blockRegistry[sourceData.blockId];
    if (!blockDef) return;

    const directlyAccepts = targetData.accepts.includes(blockDef.category);
    const autoWrappable = targetData.parentTag === 'mj-body' && blockDef.category === 'content';

    if (directlyAccepts) {
      const node = blockDef.factory();
      dispatch(insertBlock({ parentPath: targetData.parentPath, index: targetData.index, node }));
      /* Sections land WITHOUT auto-select — the selection ring on a
         fresh full-width drop reads as an uninvited border. Click to
         select. Leaf elements keep auto-select (opens their inspector
         for immediate editing). */
      if (node._id && blockDef.category !== 'section') dispatch(selectNode(node._id));
      return;
    }

    if (autoWrappable) {
      const inner = blockDef.factory();
      const section = createSectionWithColumn(inner);
      dispatch(
        insertBlock({ parentPath: targetData.parentPath, index: targetData.index, node: section })
      );
      if (inner._id) dispatch(selectNode(inner._id));
      return;
    }

    /* feature-section-library V1 — section bubble-up (the MailerLite
       behavior). A 'section' block dropped INSIDE an existing section
       (onto a column/hero content zone, or a section's column gap)
       inserts at the BODY level, right after the enclosing section.
       Without this, section composites are only droppable in the thin
       body-level gaps — nearly impossible to hit on a dense email.

       Zone parentPath shape: ['children', bodyIdx, 'children',
       sectionIdx, ...deeper]; slice(0,2) is the body, [3] is the index
       of the enclosing section in it. */
    if (blockDef.category === 'section' && targetData.parentPath.length >= 4) {
      const bodyPath = targetData.parentPath.slice(0, 2);
      const sectionIdx = targetData.parentPath[3];
      const body = getAtPath(tree, bodyPath);
      if (body?.tagName === 'mj-body' && typeof sectionIdx === 'number') {
        const node = blockDef.factory();
        dispatch(insertBlock({ parentPath: bodyPath, index: sectionIdx + 1, node }));
        // No auto-select — see the section note in the directlyAccepts branch.
        return;
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={styles.body}>
        <Palette />
        {/* The MJML canvas always renders in default theme — emails are
            white in real inboxes regardless of the user's app theme.
            See tasks/feature-theme-system/change_log.md §Theme-INDEPENDENT
            scoping. The Palette + Inspector adapt to the user's theme
            (they're app chrome). */}
        <div data-theme="default" style={{ display: 'contents' }}>
          <Canvas />
        </div>
        <Inspector />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLabel ? <DragChip label={activeLabel} /> : null}
      </DragOverlay>

      <FloatingTextToolbar />
      <PreviewModal />
    </DndContext>
  );
}
