import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

const PLACEHOLDER_BG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%231a73e8'/><stop offset='1' stop-color='%23174ea6'/></linearGradient></defs><rect width='600' height='300' fill='url(%23g)'/></svg>";

export const createHeroNode = (): IMjmlNode => ({
  tagName: 'mj-hero',
  _id: uuid(),
  attributes: {
    mode: 'fixed-height',
    height: '300px',
    'background-url': PLACEHOLDER_BG,
    'background-width': '600px',
    'background-height': '300px',
    'background-color': '#1a73e8',
    'vertical-align': 'middle',
    padding: '40px 30px',
  },
  children: [
    {
      tagName: 'mj-text',
      _id: uuid(),
      attributes: {
        align: 'center',
        color: '#ffffff',
        'font-size': '32px',
        'font-weight': '700',
        padding: '0',
      },
      content: 'Hero Headline',
    },
  ],
});
