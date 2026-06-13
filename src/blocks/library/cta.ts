import type { IMjmlNode } from '../../tree/types';
import { section, column, text, button, MUTED } from './shared';
import { activeBrandKit } from './brandKit';

/* feature-section-library V1 — call-to-action composites.
   feature-client-brand-kit V1 — the banner CTA's background uses the
   active client's primary color (its highest-impact brand surface). */

/** Centered CTA: headline + button on white. */
export const createCtaCentered = (): IMjmlNode =>
  section(
    [
      column([
        text('Ready when you are', {
          'font-size': '22px',
          'font-weight': '700',
          align: 'center',
          padding: '0 0 8px',
        }),
        text('One line that removes the last doubt.', {
          color: MUTED,
          align: 'center',
          'font-size': '14px',
          padding: '0 0 14px',
        }),
        button('Start free', { align: 'center' }),
      ]),
    ],
    { padding: '36px 24px' }
  );

/** Promo code CTA: headline + dashed code box + button. */
export const createCtaPromo = (): IMjmlNode =>
  section(
    [
      column([
        text('Here’s 20% off your next order', {
          'font-size': '20px',
          'font-weight': '700',
          align: 'center',
          padding: '0 0 10px',
        }),
        text(
          '<span style="display:inline-block;border:2px dashed #9CA3AF;border-radius:8px;' +
          'padding:10px 26px;font-size:18px;font-weight:700;letter-spacing:0.14em;">SAVE20</span>',
          { align: 'center', padding: '0 0 14px' }
        ),
        button('Redeem now', { align: 'center' }),
      ]),
    ],
    { 'background-color': '#F6F7F9', padding: '32px 24px' }
  );

/** Banner CTA: brand-color band, white text + inverted button. */
export const createCtaBanner = (): IMjmlNode => {
  const primary = activeBrandKit().primaryColor;
  return section(
    [
      column([
        text('Last 24 hours — 20% off ends tonight', {
          color: '#ffffff',
          'font-size': '18px',
          'font-weight': '700',
          align: 'center',
          padding: '0 0 12px',
        }),
        button('Claim the offer', {
          'background-color': '#ffffff',
          color: primary,
          align: 'center',
        }),
      ]),
    ],
    { 'background-color': primary, padding: '32px 24px' }
  );
};
