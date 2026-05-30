import { v4 as uuid } from 'uuid';
import type { IMjmlNode, NodePath } from './types';

/**
 * Navigate to a node at the given path. Returns undefined if the path is invalid.
 * Caller is responsible for type-narrowing when path leads through .children[i].
 */
export function getAtPath(root: IMjmlNode, path: NodePath): IMjmlNode | undefined {
  let cursor: any = root;
  for (const key of path) {
    if (cursor == null) return undefined;
    cursor = cursor[key];
  }
  return cursor as IMjmlNode | undefined;
}

/**
 * Get the parent node of the path. For path ['children', 1, 'children', 0],
 * the parent is root.children[1] (the container that holds the targeted node).
 */
export function getParentAtPath(root: IMjmlNode, path: NodePath): { parent: IMjmlNode; index: number } | undefined {
  if (path.length < 2) return undefined;
  const parentPath = path.slice(0, -2);
  const parent = getAtPath(root, parentPath);
  if (!parent) return undefined;
  const lastSegment = path[path.length - 1];
  if (typeof lastSegment !== 'number') return undefined;
  return { parent, index: lastSegment };
}

export function pathEquals(a: NodePath, b: NodePath): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Deep clone a node, assigning fresh _id values throughout.
 * Required when duplicating a node — two instances must not share _id.
 */
export function deepCloneWithFreshIds(node: IMjmlNode): IMjmlNode {
  return {
    ...node,
    _id: uuid(),
    attributes: node.attributes ? { ...node.attributes } : undefined,
    children: node.children?.map(deepCloneWithFreshIds),
  };
}

/**
 * Walk the tree and build a lookup of _id → path.
 * Run after every tree mutation so selection lookups stay O(1).
 */
export function buildIdPathCache(
  node: IMjmlNode,
  path: NodePath = [],
  cache: Record<string, NodePath> = {}
): Record<string, NodePath> {
  if (node._id) cache[node._id] = path;
  node.children?.forEach((child, i) => {
    buildIdPathCache(child, [...path, 'children', i], cache);
  });
  return cache;
}

/**
 * Assign fresh _id values to every node in the tree.
 * Used on load: persisted JSON has no _id (stripped on save), so we hydrate them.
 */
export function assignFreshIds(node: IMjmlNode): IMjmlNode {
  return {
    ...node,
    _id: uuid(),
    children: node.children?.map(assignFreshIds),
  };
}

/**
 * Read the preheader text (mj-preview content) from the tree.
 * mj-preview lives inside mj-head; returns '' if missing.
 */
export function getPreheaderFromTree(root: IMjmlNode): string {
  const head = root.children?.find((c) => c.tagName === 'mj-head');
  const preview = head?.children?.find((c) => c.tagName === 'mj-preview');
  return preview?.content ?? '';
}
