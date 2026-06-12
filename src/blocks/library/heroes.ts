import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';
import { section, column, text, button, image, MUTED } from './shared';

/* feature-section-library V1 — hero section composites. */

/** Big headline + subcopy + CTA on a soft tinted background. */
export const createHeroHeadline = (): IMjmlNode =>
  section(
    [
      column([
        text('Introduce your big announcement', {
          'font-size': '30px',
          'font-weight': '700',
          'line-height': '1.25',
          align: 'center',
          padding: '0 0 10px',
        }),
        text(
          'One or two sentences that explain the value and make the reader want to keep going.',
          { color: MUTED, align: 'center', 'font-size': '15px', padding: '0 30px 16px' }
        ),
        button('Get started', { align: 'center' }),
      ]),
    ],
    { 'background-color': '#F6F7F9', padding: '48px 24px' }
  );

/** Full-bleed image hero with overlaid headline + CTA (mj-hero). */
export const createHeroImageBg = (): IMjmlNode => ({
  tagName: 'mj-hero',
  _id: uuid(),
  attributes: {
    mode: 'fixed-height',
    height: '320px',
    'background-color': '#3B4252',
    'vertical-align': 'middle',
    padding: '48px 30px',
  },
  children: [
    text('Make it unmissable', {
      color: '#ffffff',
      'font-size': '32px',
      'font-weight': '700',
      align: 'center',
      padding: '0 0 10px',
    }),
    text('Set a background image on this hero from the inspector.', {
      color: 'rgba(255,255,255,0.85)',
      align: 'center',
      'font-size': '15px',
      padding: '0 0 16px',
    }),
    button('Learn more', {
      'background-color': '#ffffff',
      color: '#111827',
      align: 'center',
    }),
  ],
});

/** Split hero: copy left, image right. */
export const createHeroSplit = (): IMjmlNode =>
  section(
    [
      column(
        [
          text('A headline that sells', {
            'font-size': '24px',
            'font-weight': '700',
            'line-height': '1.25',
            padding: '0 0 8px',
          }),
          text('Two short lines of supporting copy that earn the click.', {
            color: MUTED,
            'font-size': '14px',
            padding: '0 0 14px',
          }),
          button('Shop now', { align: 'left' }),
        ],
        { width: '55%', 'vertical-align': 'middle', padding: '0 12px 0 0' }
      ),
      column([image(250, 220)], { width: '45%', 'vertical-align': 'middle' }),
    ],
    { padding: '36px 24px' }
  );

/** Image on top, headline + copy + CTA below. */
export const createHeroImageTop = (): IMjmlNode =>
  section(
    [
      column([
        image(600, 280, { 'border-radius': '8px', padding: '0 0 18px' }),
        text('A picture sets the scene', {
          'font-size': '26px',
          'font-weight': '700',
          align: 'center',
          padding: '0 0 8px',
        }),
        text('Lead with your strongest visual, then land the message.', {
          color: MUTED,
          align: 'center',
          padding: '0 20px 14px',
        }),
        button('See the collection', { align: 'center' }),
      ]),
    ],
    { padding: '32px 24px' }
  );
