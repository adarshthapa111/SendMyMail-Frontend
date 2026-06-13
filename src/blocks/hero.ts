import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';
import { activeBrandKit } from './library/brandKit';

/* feature-client-brand-kit V1 — the bare Hero primitive uses the active
   client's primary color as a solid background (default near-black
   #111827). The old blue gradient placeholder (#1a73e8) was the same
   Google-blue that collided with the editor-chrome selection blue.
   Users set their own background image from the inspector. */
export const createHeroNode = (): IMjmlNode => ({
  tagName: 'mj-hero',
  _id: uuid(),
  attributes: {
    mode: 'fixed-height',
    height: '300px',
    'background-color': activeBrandKit().primaryColor,
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
