/**
 * Block category — the type of MJML container that can accept the block.
 * Mirrors MJML's structural rules:
 *   • mj-body accepts sections (mj-section, mj-wrapper, mj-hero)
 *   • mj-section accepts columns (mj-column, mj-group)
 *   • mj-column / mj-hero accept content blocks (text, image, button, ...)
 */
export type BlockCategory = 'section' | 'column' | 'content';

/**
 * UI-only grouping for the palette sidebar. Distinct from BlockCategory:
 *   category = where the block can be dropped (drop-target constraint)
 *   group    = where the block appears in the palette (sidebar organization)
 * e.g. an image is category: 'content' but group: 'media'.
 */
export type PaletteGroup = 'layout' | 'content' | 'media' | 'advanced';

export const PALETTE_GROUP_ORDER: PaletteGroup[] = ['layout', 'content', 'media', 'advanced'];

export const PALETTE_GROUP_LABEL: Record<PaletteGroup, string> = {
  layout: 'Layout',
  content: 'Content',
  media: 'Media',
  advanced: 'Advanced',
};

/**
 * For each container tag name, the list of categories whose blocks can be
 * dropped into it. Drop-zone components consume this map to decide whether
 * a given drag is valid.
 */
export const CONTAINER_ACCEPTS: Record<string, BlockCategory[]> = {
  'mj-body': ['section'],
  'mj-wrapper': ['section'],   // wraps multiple sections under shared styles
  'mj-section': ['column'],
  'mj-column': ['content'],
  'mj-hero': ['content'],
};
