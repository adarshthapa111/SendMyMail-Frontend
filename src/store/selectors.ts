import type { RootState } from './index';
import type { IMjmlNode, NodePath } from '../tree/types';
import { getAtPath, getPreheaderFromTree } from '../tree/paths';

export const selectTree = (state: RootState): IMjmlNode => state.editor.tree;
export const selectSelectedId = (state: RootState): string | null => state.editor.selectedId;
export const selectCanUndo = (state: RootState): boolean => state.editor.history.past.length > 0;
export const selectCanRedo = (state: RootState): boolean => state.editor.history.future.length > 0;

export const selectSubject = (state: RootState): string => state.editor.subject;
export const selectPreheader = (state: RootState): string => getPreheaderFromTree(state.editor.tree);

export const selectSelectedNode = (state: RootState): { node: IMjmlNode; path: NodePath } | null => {
  const id = state.editor.selectedId;
  if (!id) return null;
  const path = state.editor.idPathCache[id];
  if (!path) return null;
  const node = getAtPath(state.editor.tree, path);
  if (!node) return null;
  return { node, path };
};
