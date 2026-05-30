import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

/**
 * mj-social is rewritten to mj-raw HTML table by the backend's
 * transformSocialToRaw step. The editor authors against the standard MJML schema.
 */
export const createSocialNode = (): IMjmlNode => ({
  tagName: 'mj-social',
  _id: uuid(),
  attributes: {
    'icon-size': '24px',
    mode: 'horizontal',
    padding: '10px 25px',
    align: 'center',
  },
  children: [
    {
      tagName: 'mj-social-element',
      _id: uuid(),
      attributes: { name: 'facebook', href: 'https://facebook.com/' },
    },
    {
      tagName: 'mj-social-element',
      _id: uuid(),
      attributes: { name: 'twitter', href: 'https://twitter.com/' },
    },
    {
      tagName: 'mj-social-element',
      _id: uuid(),
      attributes: { name: 'instagram', href: 'https://instagram.com/' },
    },
  ],
});
