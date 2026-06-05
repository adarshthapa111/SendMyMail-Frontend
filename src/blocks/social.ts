import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

/**
 * Default social-icon URLs.
 *
 * Source: simpleicons.org's public CDN — returns the network's official
 * monochrome SVG logo with a brand-color fill applied via the URL path.
 * Reliable (since 2014), no auth, no CORS issues, no quota. The SVGs
 * are small (~1 KB each) and render cleanly in all major email clients.
 *
 * If a user prefers custom-branded icons, they can swap any of these via
 * the SocialElementInspector — `ImageReplaceControl` uploads to Cloudinary
 * at save time exactly like mj-image.
 */
const DEFAULT_ICON = {
  facebook:  'https://cdn.simpleicons.org/facebook/1877F2',
  instagram: 'https://cdn.simpleicons.org/instagram/E4405F',
  tiktok:    'https://cdn.simpleicons.org/tiktok/000000',
};

/**
 * mj-social is rewritten to mj-raw HTML table by the backend's
 * transformSocialToRaw step. The editor authors against the standard MJML schema.
 *
 * `src` is set on each element so the canvas + final email show real brand
 * icons. The `name` attribute is preserved for backwards compatibility with
 * MJML's built-in network defaults; if `src` is removed, MJML falls back to
 * its own bundled icon (only for the networks it knows).
 */
export const createSocialNode = (): IMjmlNode => ({
  tagName: 'mj-social',
  _id: uuid(),
  attributes: {
    'icon-size': '32px',
    mode: 'horizontal',
    padding: '10px 25px',
    align: 'center',
  },
  children: [
    {
      tagName: 'mj-social-element',
      _id: uuid(),
      attributes: { name: 'facebook',  href: 'https://facebook.com/',  src: DEFAULT_ICON.facebook },
    },
    {
      tagName: 'mj-social-element',
      _id: uuid(),
      attributes: { name: 'instagram', href: 'https://instagram.com/', src: DEFAULT_ICON.instagram },
    },
    {
      tagName: 'mj-social-element',
      _id: uuid(),
      attributes: { name: 'tiktok',    href: 'https://tiktok.com/',    src: DEFAULT_ICON.tiktok },
    },
  ],
});
