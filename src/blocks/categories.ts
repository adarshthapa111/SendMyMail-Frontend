/**
 * Block category — the type of MJML container that can accept the block.
 * Mirrors MJML's structural rules:
 *   • mj-body accepts sections (mj-section, mj-wrapper, mj-hero)
 *   • mj-section accepts columns (mj-column, mj-group)
 *   • mj-column / mj-hero accept content blocks (text, image, button, ...)
 */
export type BlockCategory = 'section' | 'column' | 'content';

/**
 * UI-only grouping for the palette rail. Distinct from BlockCategory:
 *   category = where the block can be dropped (drop-target constraint)
 *   group    = which rail entry the block appears under
 *
 * feature-section-library V1 — widened from {layout, content, media,
 * advanced} to the MailerLite-style rail categories. The old content/
 * media/advanced primitives all live under 'elements' now; everything
 * else is a pre-designed section composite group.
 */
export type PaletteGroup =
  | 'elements'
  | 'layout'
  | 'header'
  | 'hero'
  | 'features'
  | 'gallery'
  | 'table'
  | 'video'
  | 'cta'
  | 'footer';

export const PALETTE_GROUP_ORDER: PaletteGroup[] = [
  'elements',
  'layout',
  'header',
  'hero',
  'features',
  'gallery',
  'table',
  'video',
  'cta',
  'footer',
];

export const PALETTE_GROUP_LABEL: Record<PaletteGroup, string> = {
  elements: 'Elements',
  layout:   'Layout',
  header:   'Header',
  hero:     'Hero',
  features: 'Features',
  gallery:  'Gallery',
  table:    'Table',
  video:    'Video',
  cta:      'Call to action',
  footer:   'Footer',
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
