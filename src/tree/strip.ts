import type { IMjmlNode } from './types';

/**
 * Remove editor-only fields (_id, _meta) recursively.
 * Call before sending the tree to the backend — the backend's jsonToXML only
 * reads tagName/attributes/content/children, but stripping keeps payloads small.
 */
export function stripEditorFields(node: IMjmlNode): IMjmlNode {
  const { _id, _meta, children, ...rest } = node;
  void _id;
  void _meta;
  const stripped: IMjmlNode = { ...rest };
  if (children) stripped.children = children.map(stripEditorFields);
  return stripped;
}
