import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

/**
 * Inline SVG placeholder so a fresh image block renders something visible
 * without external dependencies. Users replace via the image inspector (Phase 8).
 */
const PLACEHOLDER_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 300'><rect width='600' height='300' fill='%23e4e6eb'/><text x='300' y='160' font-family='Arial,sans-serif' font-size='20' text-anchor='middle' fill='%238a8d91'>Image placeholder</text></svg>";

export const createImageNode = (): IMjmlNode => ({
  tagName: 'mj-image',
  _id: uuid(),
  attributes: {
    src: PLACEHOLDER_SRC,
    alt: '',
    width: '600px',
    padding: '0',
    'fluid-on-mobile': 'true',
  },
});
