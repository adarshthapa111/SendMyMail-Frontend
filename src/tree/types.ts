export interface IMjmlNode {
  tagName: string;
  attributes?: Record<string, string | number | undefined>;
  content?: string;
  children?: IMjmlNode[];

  /**
   * Editor-only fields. Never serialized to MJML.
   * Stripped by stripEditorFields() before sending to the backend.
   */
  _id?: string;
  _meta?: {
    blockType?: string;
    locked?: boolean;
    notes?: string;
  };
}

/**
 * A path from the root of the tree to a specific node.
 * Always alternates between 'children' and a numeric index.
 * Example: ['children', 1, 'children', 0, 'children', 2]
 *   reads as: root.children[1].children[0].children[2]
 */
export type NodePath = (string | number)[];
