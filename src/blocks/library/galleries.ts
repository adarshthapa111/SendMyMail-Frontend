import type { IMjmlNode } from '../../tree/types';
import { section, column, image, text, MUTED } from './shared';

/* feature-section-library V1 — image gallery composites. */

/** Three images across. */
export const createGalleryRow = (): IMjmlNode =>
  section(
    [
      column([image(180, 150)], { width: '33.33%', padding: '0 4px' }),
      column([image(180, 150)], { width: '33.33%', padding: '0 4px' }),
      column([image(180, 150)], { width: '33.34%', padding: '0 4px' }),
    ],
    { padding: '20px 20px' }
  );

/** Two images with captions. */
export const createGalleryCaptioned = (): IMjmlNode => {
  const captioned = () =>
    column(
      [
        image(270, 180, { padding: '0 0 8px' }),
        text('A short caption for this image.', {
          color: MUTED,
          'font-size': '12.5px',
          align: 'center',
          padding: '0',
        }),
      ],
      { width: '50%', padding: '0 6px' }
    );
  return section([captioned(), captioned()], { padding: '20px 18px' });
};

/** 2×2 grid (two stacked 2-up rows in one section via column stacking). */
export const createGalleryGrid = (): IMjmlNode =>
  section(
    [
      column(
        [image(270, 190, { padding: '0 0 8px' }), image(270, 190)],
        { width: '50%', padding: '0 4px' }
      ),
      column(
        [image(270, 190, { padding: '0 0 8px' }), image(270, 190)],
        { width: '50%', padding: '0 4px' }
      ),
    ],
    { padding: '20px 20px' }
  );
