import { produce } from 'immer';
import type { IMjmlNode, NodePath } from './types';
import { getAtPath, deepCloneWithFreshIds } from './paths';

/**
 * Insert a node as a child of the container at `parentPath`, at position `index`.
 * `parentPath` should point to the container itself (e.g., the mj-column),
 * not to its children array.
 */
export const insertNode = (root: IMjmlNode, parentPath: NodePath, index: number, node: IMjmlNode): IMjmlNode =>
  produce(root, (draft) => {
    const parent = getAtPath(draft, parentPath);
    if (!parent) return;
    parent.children ??= [];
    parent.children.splice(index, 0, node);
  });

/**
 * Move a node from `fromPath` to `toParentPath` at `toIndex`.
 * Handles same-parent reordering correctly: when moving down within the same
 * parent, we adjust the destination index for the gap the detached node leaves.
 */
export const moveNode = (
  root: IMjmlNode,
  fromPath: NodePath,
  toParentPath: NodePath,
  toIndex: number
): IMjmlNode =>
  produce(root, (draft) => {
    if (fromPath.length < 2) return;
    const fromParentPath = fromPath.slice(0, -2);
    const fromIndex = fromPath[fromPath.length - 1];
    if (typeof fromIndex !== 'number') return;

    const fromParent = getAtPath(draft, fromParentPath);
    if (!fromParent?.children) return;

    const [node] = fromParent.children.splice(fromIndex, 1);
    if (!node) return;

    const toParent = getAtPath(draft, toParentPath);
    if (!toParent) {
      // Roll back the detach
      fromParent.children.splice(fromIndex, 0, node);
      return;
    }
    toParent.children ??= [];

    // If moving down within the same parent, the detach shifted everything left by 1
    const samParent = fromParent === toParent;
    const adjusted = samParent && fromIndex < toIndex ? toIndex - 1 : toIndex;
    toParent.children.splice(adjusted, 0, node);
  });

/**
 * Delete the node at `path`.
 */
export const deleteNode = (root: IMjmlNode, path: NodePath): IMjmlNode =>
  produce(root, (draft) => {
    if (path.length < 2) return;
    const parentPath = path.slice(0, -2);
    const idx = path[path.length - 1];
    if (typeof idx !== 'number') return;
    const parent = getAtPath(draft, parentPath);
    parent?.children?.splice(idx, 1);
  });

/**
 * Duplicate the node at `path`, inserting the clone immediately after the original.
 * Clone gets fresh _id values throughout its subtree.
 */
export const duplicateNode = (root: IMjmlNode, path: NodePath): IMjmlNode =>
  produce(root, (draft) => {
    if (path.length < 2) return;
    const parentPath = path.slice(0, -2);
    const idx = path[path.length - 1];
    if (typeof idx !== 'number') return;
    const parent = getAtPath(draft, parentPath);
    if (!parent?.children) return;
    const original = parent.children[idx];
    if (!original) return;
    const clone = deepCloneWithFreshIds(original);
    parent.children.splice(idx + 1, 0, clone);
  });

/**
 * Set or remove an attribute on the node at `path`.
 * Passing `undefined` as `value` deletes the key.
 */
export const updateAttr = (
  root: IMjmlNode,
  path: NodePath,
  key: string,
  value: string | number | undefined
): IMjmlNode =>
  produce(root, (draft) => {
    const node = getAtPath(draft, path);
    if (!node) return;
    node.attributes ??= {};
    if (value === undefined) delete node.attributes[key];
    else node.attributes[key] = value;
  });

/**
 * Replace the inner content string on a leaf node (mj-text, mj-button).
 */
export const updateContent = (root: IMjmlNode, path: NodePath, content: string): IMjmlNode =>
  produce(root, (draft) => {
    const node = getAtPath(draft, path);
    if (!node) return;
    node.content = content;
  });
