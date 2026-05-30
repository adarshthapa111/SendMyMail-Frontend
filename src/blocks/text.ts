import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

/**
 * Factory: a fresh mj-text node with sensible defaults.
 * Every call produces a new _id so multiple instances don't collide.
 */
export const createTextNode = (): IMjmlNode => ({
  tagName: 'mj-text',
  _id: uuid(),
  attributes: {
    'font-size': '14px',
    'line-height': '1.6',
    color: '#333333',
    padding: '10px 25px',
    'font-family': 'Arial, sans-serif',
  },
  content: 'Click to edit this text.',
});
