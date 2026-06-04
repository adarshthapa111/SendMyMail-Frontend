import type { IMjmlNode } from './types';

/**
 * Remove editor-only fields (_id, _meta) recursively.
 * Call before sending the tree to the backend — the backend's jsonToXML only
 * reads tagName/attributes/content/children, but stripping keeps payloads small.
 *
 * KEEPS `mj-preview` nodes — used by the preview/HTML render path which
 * SHOULD include the preheader so the design-time preview matches reality.
 * Use `stripForPersistence` instead when SAVING a template (campaign owns
 * preheader).
 */
export function stripEditorFields(node: IMjmlNode): IMjmlNode {
  const { _id, _meta, children, ...rest } = node;
  void _id;
  void _meta;
  const stripped: IMjmlNode = { ...rest };
  if (children) stripped.children = children.map(stripEditorFields);
  return stripped;
}

/**
 * Strip editor-only fields AND any `mj-preview` nodes.
 *
 * Templates persist pure design only — preheader is envelope metadata owned
 * by the Campaign (Feature 06), not the template. The campaign engine
 * injects its own `mj-preview` node before compiling at send time.
 *
 * The backend `templates` router applies the same strip server-side as a
 * safety net (callers may forget); this function exists so the frontend
 * sends a clean payload from the start.
 */
export function stripForPersistence(node: IMjmlNode): IMjmlNode {
  const { _id, _meta, children, ...rest } = node;
  void _id;
  void _meta;
  const stripped: IMjmlNode = { ...rest };
  if (children) {
    stripped.children = children
      .filter((c) => c.tagName !== 'mj-preview')
      .map(stripForPersistence);
  }
  return stripped;
}
