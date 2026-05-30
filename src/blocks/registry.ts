import type { IMjmlNode } from '../tree/types';
import type { BlockCategory, PaletteGroup } from './categories';

import { createTextNode } from './text';
import { createImageNode } from './image';
import { createButtonNode } from './button';
import { createDividerNode } from './divider';
import { createSpacerNode } from './spacer';
import {
  createOneColumnSection,
  createTwoColumnSection,
  createThreeColumnSection,
} from './sections';
import { createSocialNode } from './social';
import { createHeroNode } from './hero';
import { createNavbarNode } from './navbar';
import { createRawHtmlNode } from './rawHtml';

export interface BlockDef {
  id: string;
  label: string;
  /** Short glyph (1–3 chars) shown in the palette card icon box. */
  icon: string;
  /** Drop-target constraint: which container tags accept this block. */
  category: BlockCategory;
  /** UI grouping for the palette sidebar (Layout / Content / Media / Advanced). */
  group: PaletteGroup;
  factory: () => IMjmlNode;
}

export const blockRegistry: Record<string, BlockDef> = {
  // ── Layout ──────────────────────────────────────────────────────────
  'section-1col': {
    id: 'section-1col',
    label: '1 Column',
    icon: '▭',
    category: 'section',
    group: 'layout',
    factory: createOneColumnSection,
  },
  'section-2col': {
    id: 'section-2col',
    label: '2 Columns',
    icon: '▭▭',
    category: 'section',
    group: 'layout',
    factory: createTwoColumnSection,
  },
  'section-3col': {
    id: 'section-3col',
    label: '3 Columns',
    icon: '▭▭▭',
    category: 'section',
    group: 'layout',
    factory: createThreeColumnSection,
  },

  // ── Content ─────────────────────────────────────────────────────────
  text: {
    id: 'text',
    label: 'Text',
    icon: 'T',
    category: 'content',
    group: 'content',
    factory: createTextNode,
  },
  button: {
    id: 'button',
    label: 'Button',
    icon: '▭',
    category: 'content',
    group: 'content',
    factory: createButtonNode,
  },
  divider: {
    id: 'divider',
    label: 'Divider',
    icon: '—',
    category: 'content',
    group: 'content',
    factory: createDividerNode,
  },
  spacer: {
    id: 'spacer',
    label: 'Spacer',
    icon: '↕',
    category: 'content',
    group: 'content',
    factory: createSpacerNode,
  },

  // ── Media ───────────────────────────────────────────────────────────
  image: {
    id: 'image',
    label: 'Image',
    icon: '▣',
    category: 'content',
    group: 'media',
    factory: createImageNode,
  },
  hero: {
    id: 'hero',
    label: 'Hero',
    icon: '★',
    category: 'section',
    group: 'media',
    factory: createHeroNode,
  },
  social: {
    id: 'social',
    label: 'Social',
    icon: '◯',
    category: 'content',
    group: 'media',
    factory: createSocialNode,
  },

  // ── Advanced ────────────────────────────────────────────────────────
  navbar: {
    id: 'navbar',
    label: 'Navbar',
    icon: '☰',
    category: 'content',
    group: 'advanced',
    factory: createNavbarNode,
  },
  rawHtml: {
    id: 'rawHtml',
    label: 'Raw HTML',
    icon: '</>',
    category: 'content',
    group: 'advanced',
    factory: createRawHtmlNode,
  },
};
