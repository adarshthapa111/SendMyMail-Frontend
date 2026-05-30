import type { BlockCategory } from './categories';

/** Friendly label per MJML tag — used by Inspector header + drag chip. */
export const TAG_LABELS: Record<string, string> = {
  'mj-text': 'Text',
  'mj-button': 'Button',
  'mj-image': 'Image',
  'mj-divider': 'Divider',
  'mj-spacer': 'Spacer',
  'mj-section': 'Section',
  'mj-column': 'Column',
  'mj-hero': 'Hero',
  'mj-social': 'Social',
  'mj-navbar': 'Navbar',
  'mj-raw': 'Raw HTML',
};

/**
 * Drop-target category per MJML tag — drives drop-zone validation when
 * reordering existing canvas blocks (Phase 12). Palette blocks supply this
 * from blockRegistry; canvas blocks compute it from their tagName.
 */
export const TAG_CATEGORIES: Record<string, BlockCategory> = {
  'mj-section': 'section',
  'mj-hero': 'section',
  'mj-column': 'column',
  'mj-text': 'content',
  'mj-button': 'content',
  'mj-image': 'content',
  'mj-divider': 'content',
  'mj-spacer': 'content',
  'mj-social': 'content',
  'mj-navbar': 'content',
  'mj-raw': 'content',
};

export function getTagLabel(tagName: string): string {
  return TAG_LABELS[tagName] ?? tagName.replace(/^mj-/, '');
}

export function getTagCategory(tagName: string): BlockCategory {
  return TAG_CATEGORIES[tagName] ?? 'content';
}
