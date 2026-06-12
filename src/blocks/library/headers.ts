import type { IMjmlNode } from '../../tree/types';
import { section, column, text, button, social, FONT, MUTED } from './shared';

/* feature-section-library V1 — header section composites.
   The email's masthead: brand name (swap for a logo image), optional
   nav links, optional CTA. */

const brand = (align = 'center') =>
  text('<strong>✦ Your Brand</strong>', {
    'font-size': '18px',
    'letter-spacing': '0.02em',
    align,
    padding: '0',
  });

const navLinks = (align = 'center') =>
  text(
    '<a href="#" style="color:#6B7280;text-decoration:none;margin:0 10px;">About</a>' +
    '<a href="#" style="color:#6B7280;text-decoration:none;margin:0 10px;">New</a>' +
    '<a href="#" style="color:#6B7280;text-decoration:none;margin:0 10px;">Shop</a>',
    { 'font-size': '13px', color: MUTED, align, padding: '0' }
  );

/** Centered brand name only. */
export const createHeaderLogo = (): IMjmlNode =>
  section([column([brand()])], { padding: '20px 24px' });

/** Brand left, nav links right. */
export const createHeaderLogoNav = (): IMjmlNode =>
  section(
    [
      column([brand('left')], { width: '40%', 'vertical-align': 'middle' }),
      column([navLinks('right')], { width: '60%', 'vertical-align': 'middle' }),
    ],
    { padding: '20px 24px' }
  );

/** Brand centered with nav links underneath. */
export const createHeaderCenteredNav = (): IMjmlNode =>
  section(
    [column([brand(), navLinks()])],
    { padding: '20px 24px' }
  );

/** Nav links only — minimal top bar. */
export const createHeaderNavOnly = (): IMjmlNode =>
  section([column([navLinks()])], { padding: '14px 24px' });

/** Brand left, social icons right. */
export const createHeaderLogoSocial = (): IMjmlNode =>
  section(
    [
      column([brand('left')], { width: '55%', 'vertical-align': 'middle' }),
      column([social({ align: 'right', 'icon-size': '18px', padding: '0' })], {
        width: '45%',
        'vertical-align': 'middle',
      }),
    ],
    { padding: '18px 24px' }
  );

/** Brand left, CTA button right. */
export const createHeaderLogoButton = (): IMjmlNode =>
  section(
    [
      column([brand('left')], { width: '60%', 'vertical-align': 'middle' }),
      column(
        [button('Shop now', {
          'font-size': '13px',
          'inner-padding': '9px 20px',
          padding: '0',
          align: 'right',
          'font-family': FONT,
        })],
        { width: '40%', 'vertical-align': 'middle' }
      ),
    ],
    { padding: '20px 24px' }
  );
