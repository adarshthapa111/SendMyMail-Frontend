import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

export const createDividerNode = (): IMjmlNode => ({
  tagName: 'mj-divider',
  _id: uuid(),
  attributes: {
    'border-color': '#dddddd',
    'border-width': '1px',
    'border-style': 'solid',
    padding: '10px 25px',
  },
});
