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

import Toolbar from './Toolbar';
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

import styles from '@styles/components/EditorShell.module.css';

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

export default function EditorShell() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.editor.selectedId);
  const idPathCache = useAppSelector((s) => s.editor.idPathCache);

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
      if (node._id) dispatch(selectNode(node._id));
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
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={styles.shell}>
        <Toolbar />
        <div className={styles.body}>
          <Palette />
          <Canvas />
          <Inspector />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLabel ? <DragChip label={activeLabel} /> : null}
      </DragOverlay>

      <FloatingTextToolbar />
      <PreviewModal />
    </DndContext>
  );
}
