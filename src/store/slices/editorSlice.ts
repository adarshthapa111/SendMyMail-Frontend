import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { current, type WritableDraft } from 'immer';
import type { IMjmlNode, NodePath } from '../../tree/types';
import { buildIdPathCache } from '../../tree/paths';
import { newTemplate } from '../../tree/newTemplate';
import {
  insertNode,
  moveNode,
  deleteNode,
  duplicateNode,
  updateAttr,
  updateContent,
} from '../../tree/operations';

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
     */
    loadTemplate(state, action: PayloadAction<{ tree: IMjmlNode }>) {
      const { tree } = action.payload;
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
     */
    markSaved(state) {
      state.dirty = false;
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
} = editorSlice.actions;

export default editorSlice.reducer;
