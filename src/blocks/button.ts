import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

export const createButtonNode = (): IMjmlNode => ({
  tagName: 'mj-button',
  _id: uuid(),
  attributes: {
    'background-color': '#1a73e8',
    color: '#ffffff',
    'font-size': '16px',
    'font-weight': '600',
    'border-radius': '4px',
    padding: '20px 25px',
    'inner-padding': '12px 32px',
    href: 'https://',
  },
  content: 'Click me',
});
