import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { current, type WritableDraft } from 'immer';
import type { IMjmlNode, NodePath } from '../../tree/types';
import { buildIdPathCache, assignFreshIds } from '../../tree/paths';
import { newTemplate } from '../../tree/newTemplate';
import {
  insertNode,
  moveNode,
  deleteNode,
  duplicateNode,
  updateAttr,
  updateContent,
} from '../../tree/operations';

export type CanvasViewport = 'desktop' | 'mobile';

export interface EditorState {
  tree: IMjmlNode;
  selectedId: string | null;
  hoveredId: string | null;
  editingTextId: string | null;
  idPathCache: Record<string, NodePath>;
  previewVisible: boolean;
  history: {
    past: IMjmlNode[];
    future: IMjmlNode[];
  };
  /**
   * True iff the user has made tree changes since the last load / save.
   * SaveTemplateButton uses this to enable/disable; the Builder's
   * useBlocker uses it to prompt on navigation away.
   */
  dirty: boolean;

  /**
   * feature-editor-premium-polish V1 — in-canvas Desktop/Mobile toggle.
   * Persisted to localStorage so the user's preference survives reloads.
   */
  canvasViewport: CanvasViewport;

  /**
   * feature-editor-premium-polish V1 — last-saved timestamp for the
   * "Saved 2s ago" indicator in the topbar. Updated when the save flow
   * resolves. null until first save.
   */
  lastSavedAt: number | null;
}

/* localStorage hydration for canvasViewport — runs once at module load
   so the initial state already reflects the user's preference. */
const CANVAS_VIEWPORT_KEY = 'sendmymail-canvas-viewport';
function readStoredViewport(): CanvasViewport {
  try {
    const v = localStorage.getItem(CANVAS_VIEWPORT_KEY);
    if (v === 'desktop' || v === 'mobile') return v;
  } catch { /* private browsing */ }
  return 'desktop';
}

const initialTree = newTemplate();

const initialState: EditorState = {
  tree: initialTree,
  selectedId: null,
  hoveredId: null,
  editingTextId: null,
  idPathCache: buildIdPathCache(initialTree),
  previewVisible: false,
  history: { past: [], future: [] },
  dirty: false,
  canvasViewport: readStoredViewport(),
  lastSavedAt: null,
};

const HISTORY_LIMIT = 50;

/**
 * Push the previous tree onto the undo stack and clear the redo stack.
 * Trees are stored as immutable snapshots — immer's structural sharing means
 * each snapshot only retains references to subtrees that actually changed.
 */
function pushHistory(state: WritableDraft<EditorState>, prevTree: IMjmlNode) {
  state.history.past.push(prevTree);
  if (state.history.past.length > HISTORY_LIMIT) state.history.past.shift();
  state.history.future = [];
}

/**
 * Capture the current tree as an immutable snapshot for history.
 * `current()` freezes the draft proxy into a regular IMjmlNode value.
 */
function snapshot(state: WritableDraft<EditorState>): IMjmlNode {
  return current(state.tree) as IMjmlNode;
}

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    insertBlock(
      state,
      action: PayloadAction<{ parentPath: NodePath; index: number; node: IMjmlNode }>
    ) {
      const prev = snapshot(state);
      const { parentPath, index, node } = action.payload;
      state.tree = insertNode(state.tree, parentPath, index, node);
      state.idPathCache = buildIdPathCache(state.tree);
      pushHistory(state, prev);
      state.dirty = true;
    },

    moveBlock(
      state,
      action: PayloadAction<{ fromPath: NodePath; toParentPath: NodePath; toIndex: number }>
    ) {
      const prev = snapshot(state);
      const { fromPath, toParentPath, toIndex } = action.payload;
      state.tree = moveNode(state.tree, fromPath, toParentPath, toIndex);
      state.idPathCache = buildIdPathCache(state.tree);
      pushHistory(state, prev);
      state.dirty = true;
    },

    deleteBlock(state, action: PayloadAction<{ path: NodePath }>) {
      const prev = snapshot(state);
      state.tree = deleteNode(state.tree, action.payload.path);
      state.idPathCache = buildIdPathCache(state.tree);
      state.selectedId = null;
      pushHistory(state, prev);
      state.dirty = true;
    },

    duplicateBlock(state, action: PayloadAction<{ path: NodePath }>) {
      const prev = snapshot(state);
      state.tree = duplicateNode(state.tree, action.payload.path);
      state.idPathCache = buildIdPathCache(state.tree);
      pushHistory(state, prev);
      state.dirty = true;
    },

    setAttr(
      state,
      action: PayloadAction<{ path: NodePath; key: string; value: string | number | undefined }>
    ) {
      const prev = snapshot(state);
      const { path, key, value } = action.payload;
      state.tree = updateAttr(state.tree, path, key, value);
      pushHistory(state, prev);
      state.dirty = true;
    },

    setContent(state, action: PayloadAction<{ path: NodePath; content: string }>) {
      const prev = snapshot(state);
      state.tree = updateContent(state.tree, action.payload.path, action.payload.content);
      pushHistory(state, prev);
      state.dirty = true;
    },

    selectNode(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },

    hoverNode(state, action: PayloadAction<string | null>) {
      state.hoveredId = action.payload;
    },

    setEditingTextNode(state, action: PayloadAction<string | null>) {
      state.editingTextId = action.payload;
    },

    /* feature-editor-premium-polish V1 — Desktop/Mobile canvas viewport.
       Persisted to localStorage on every change. */
    setCanvasViewport(state, action: PayloadAction<CanvasViewport>) {
      state.canvasViewport = action.payload;
      try {
        localStorage.setItem(CANVAS_VIEWPORT_KEY, action.payload);
      } catch { /* private browsing — preference lost on reload */ }
    },

    togglePreview(state) {
      state.previewVisible = !state.previewVisible;
    },

    undo(state) {
      if (state.history.past.length === 0) return;
      const prev = state.history.past.pop()!;
      const currentTree = snapshot(state);
      state.history.future.unshift(currentTree);
      state.tree = prev as WritableDraft<IMjmlNode>;
      state.idPathCache = buildIdPathCache(prev);
      // Selected / editing nodes may have been removed by the operation we're
      // undoing — clear to avoid stale references.
      state.selectedId = null;
      state.editingTextId = null;
      state.dirty = true;
    },

    redo(state) {
      if (state.history.future.length === 0) return;
      const next = state.history.future.shift()!;
      const currentTree = snapshot(state);
      state.history.past.push(currentTree);
      state.tree = next as WritableDraft<IMjmlNode>;
      state.idPathCache = buildIdPathCache(next);
      state.selectedId = null;
      state.editingTextId = null;
      state.dirty = true;
    },

    /**
     * Load a template's tree into the editor. Resets history, selection,
     * and dirty flag. Called by Builder.tsx on mount after fetching the
     * template via GET /v1/clients/:cid/templates/:id.
     *
     * `assignFreshIds` runs FIRST and is idempotent: it only assigns a new
     * UUID to nodes that don't already have one. The backend-loaded tree
     * has its `_id`s stripped (see `stripForPersistence`), so without
     * this step the canvas couldn't select / hover / mutate anything
     * because `buildIdPathCache` would produce an empty map. Trees that
     * already have IDs (e.g. the post-upload tree dispatched from
     * SaveTemplateButton) pass through unchanged.
     */
    loadTemplate(state, action: PayloadAction<{ tree: IMjmlNode }>) {
      const tree = assignFreshIds(action.payload.tree);
      state.tree = tree as WritableDraft<IMjmlNode>;
      state.idPathCache = buildIdPathCache(tree);
      state.selectedId = null;
      state.hoveredId = null;
      state.editingTextId = null;
      state.history = { past: [], future: [] };
      state.dirty = false;
    },

    /**
     * Clear the dirty flag after a successful PATCH. Called by
     * SaveTemplateButton when the API roundtrip resolves.
     * Also stamps `lastSavedAt` for the "Saved 2s ago" topbar indicator
     * (feature-editor-premium-polish V1).
     */
    markSaved(state) {
      state.dirty = false;
      state.lastSavedAt = Date.now();
    },
  },
});

export const {
  insertBlock,
  moveBlock,
  deleteBlock,
  duplicateBlock,
  setAttr,
  setContent,
  selectNode,
  hoverNode,
  setEditingTextNode,
  togglePreview,
  undo,
  redo,
  loadTemplate,
  markSaved,
  setCanvasViewport,
} = editorSlice.actions;

export default editorSlice.reducer;
