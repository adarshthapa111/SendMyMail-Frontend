import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { current, type WritableDraft } from 'immer';
import { v4 as uuid } from 'uuid';
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
   * Email-level metadata used at send time. Not part of the MJML tree because
   * MJML has no `subject` element — it's an ESP concern. Preheader lives inside
   * the tree as mj-preview (so it compiles into the HTML head naturally).
   */
  subject: string;
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
  subject: '',
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
    },

    deleteBlock(state, action: PayloadAction<{ path: NodePath }>) {
      const prev = snapshot(state);
      state.tree = deleteNode(state.tree, action.payload.path);
      state.idPathCache = buildIdPathCache(state.tree);
      state.selectedId = null;
      pushHistory(state, prev);
    },

    duplicateBlock(state, action: PayloadAction<{ path: NodePath }>) {
      const prev = snapshot(state);
      state.tree = duplicateNode(state.tree, action.payload.path);
      state.idPathCache = buildIdPathCache(state.tree);
      pushHistory(state, prev);
    },

    setAttr(
      state,
      action: PayloadAction<{ path: NodePath; key: string; value: string | number | undefined }>
    ) {
      const prev = snapshot(state);
      const { path, key, value } = action.payload;
      state.tree = updateAttr(state.tree, path, key, value);
      pushHistory(state, prev);
    },

    setContent(state, action: PayloadAction<{ path: NodePath; content: string }>) {
      const prev = snapshot(state);
      state.tree = updateContent(state.tree, action.payload.path, action.payload.content);
      pushHistory(state, prev);
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

    setSubject(state, action: PayloadAction<string>) {
      state.subject = action.payload;
    },

    /**
     * Update mj-preview content in the tree (the email's preheader text).
     * Creates the node if missing. Snapshots history like any other mutation.
     */
    setPreheader(state, action: PayloadAction<string>) {
      const prev = snapshot(state);
      const head = state.tree.children?.find((c) => c.tagName === 'mj-head');
      if (!head) return;
      head.children ??= [];
      let preview = head.children.find((c) => c.tagName === 'mj-preview');
      if (!preview) {
        preview = { tagName: 'mj-preview', _id: uuid(), content: action.payload };
        head.children.unshift(preview);
      } else {
        preview.content = action.payload;
      }
      state.idPathCache = buildIdPathCache(state.tree);
      pushHistory(state, prev);
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
  setSubject,
  setPreheader,
  undo,
  redo,
} = editorSlice.actions;

export default editorSlice.reducer;
