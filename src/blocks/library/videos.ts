import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';
import { section, column, text, MUTED } from './shared';

/* feature-section-library V1 — video composites.

   Email clients can't embed playable video, so the universal pattern
   is a thumbnail with a play button that links out (YouTube/Vimeo/
   landing page). The placeholder thumbnail carries a play glyph baked
   into the SVG; the user swaps `src` for a real thumbnail and sets
   `href` in the inspector. */

function videoThumb(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.14;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='${w}' height='${h}' fill='%232B3040'/>` +
    `<circle cx='${cx}' cy='${cy}' r='${r}' fill='white' fill-opacity='0.92'/>` +
    `<path d='M${cx - r * 0.25} ${cy - r * 0.45} L${cx + r * 0.55} ${cy} L${cx - r * 0.25} ${cy + r * 0.45} Z' fill='%232B3040'/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

/** Video thumbnail + play button, caption below. */
export const createVideoThumb = (): IMjmlNode =>
  section(
    [
      column([
        {
          tagName: 'mj-image',
          _id: uuid(),
          attributes: {
            src: videoThumb(560, 300),
            alt: 'Watch the video',
            href: '#',
            'border-radius': '8px',
            padding: '0 0 10px',
          },
        },
        text('Watch: a 2-minute walkthrough', {
          'font-size': '14px',
          'font-weight': '600',
          align: 'center',
          padding: '0 0 2px',
        }),
        text('Click the thumbnail to play on our site.', {
          color: MUTED,
          'font-size': '12.5px',
          align: 'center',
          padding: '0',
        }),
      ]),
    ],
    { padding: '24px 24px' }
  );
