import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';
import { activeBrandKit } from './library/brandKit';

/* feature-client-brand-kit V1 — the bare Button primitive uses the
   active client's primary color + font (defaults: near-black #111827 +
   Helvetica). The old hardcoded #1a73e8 was bright Google-blue, which
   collided with the editor-chrome selection blue (#2E77F0) — a dropped
   button looked like editor UI, not content. */
export const createButtonNode = (): IMjmlNode => {
  const kit = activeBrandKit();
  return {
    tagName: 'mj-button',
    _id: uuid(),
    attributes: {
      'background-color': kit.primaryColor,
      color: '#ffffff',
      'font-family': kit.fontFamily,
      'font-size': '16px',
      'font-weight': '600',
      'border-radius': '6px',
      padding: '20px 25px',
      'inner-padding': '12px 32px',
      href: 'https://',
    },
    content: 'Click me',
  };
};
