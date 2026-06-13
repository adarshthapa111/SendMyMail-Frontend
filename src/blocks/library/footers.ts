import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../../tree/types';
import { section, column, text, divider, social, brandMark, INK, MUTED } from './shared';
import { activeBrandKit } from './brandKit';

/* feature-section-library V1 — footer composites.
   The unsubscribe line uses the {{unsubscribe_url}} merge tag the
   backend injects at send time.

   feature-client-brand-kit V1 — brand wordmark + postal address pull
   from the active client's kit. */

const legal = () =>
  text(
    `You are receiving this because you signed up with ${activeBrandKit().brandName}.<br/>` +
    '<a href="{{unsubscribe_url}}" style="color:#9CA3AF;">Unsubscribe</a> · ' +
    '<a href="#" style="color:#9CA3AF;">Preferences</a>',
    { color: '#9CA3AF', 'font-size': '11.5px', align: 'center', 'line-height': '1.7', padding: '0' }
  );

/** Social icons + unsubscribe. */
export const createFooterSimple = (): IMjmlNode =>
  section(
    [column([social(), legal()])],
    { 'background-color': '#F6F7F9', padding: '28px 24px' }
  );

/** Minimal — just the legal/unsubscribe line. */
export const createFooterMinimal = (): IMjmlNode =>
  section([column([legal()])], { padding: '20px 24px' });

/** Brand + postal address + contact line + social + legal (CAN-SPAM friendly). */
export const createFooterContact = (): IMjmlNode =>
  section(
    [
      column([
        brandMark({ 'font-size': '14px', padding: '0 0 6px' }),
        text(activeBrandKit().address ?? '123 Street Name · Kathmandu, Nepal', {
          color: '#9CA3AF',
          'font-size': '12px',
          align: 'center',
          padding: '0 0 2px',
        }),
        text(
          '<a href="mailto:hello@yourbrand.com" style="color:#6B7280;">hello@yourbrand.com</a>' +
          ' · <a href="tel:+9771234567" style="color:#6B7280;">+977 1 234 567</a>',
          { 'font-size': '12px', color: MUTED, align: 'center', padding: '0 0 4px' }
        ),
        social(),
        divider({ 'border-color': '#E5E7EB', padding: '8px 80px' }),
        legal(),
      ]),
    ],
    { 'background-color': '#F6F7F9', padding: '26px 24px' }
  );

/** Brand + nav + social + legal. */
export const createFooterFull = (): IMjmlNode =>
  section(
    [
      column([
        brandMark({ 'font-size': '15px', padding: '0 0 6px' }),
        text(
          '<a href="#" style="color:#6B7280;text-decoration:none;margin:0 8px;">About</a>' +
          '<a href="#" style="color:#6B7280;text-decoration:none;margin:0 8px;">Blog</a>' +
          '<a href="#" style="color:#6B7280;text-decoration:none;margin:0 8px;">Contact</a>',
          { 'font-size': '12.5px', color: MUTED, align: 'center', padding: '0 0 4px' }
        ),
        social(),
        divider({ 'border-color': '#E5E7EB', padding: '10px 60px' }),
        legal(),
      ]),
    ],
    { 'background-color': '#F6F7F9', padding: '28px 24px' }
  );

/* Link-column footer: a heading + stacked links per column. */
const linkColumn = (heading: string, links: string[]): IMjmlNode =>
  column(
    [
      text(`<strong>${heading}</strong>`, {
        'font-size': '12px',
        color: INK,
        align: 'left',
        padding: '0 0 8px',
      }),
      text(
        links
          .map((l) => `<a href="#" style="color:#6B7280;text-decoration:none;">${l}</a>`)
          .join('<br/>'),
        { 'font-size': '12.5px', color: MUTED, align: 'left', 'line-height': '2', padding: '0' }
      ),
    ],
    { width: '33.33%', 'vertical-align': 'top' }
  );

/** Rich footer: 3 link columns, then brand + social + legal. */
export const createFooterLinks = (): IMjmlNode => ({
  tagName: 'mj-wrapper',
  _id: uuid(),
  attributes: { 'background-color': '#F6F7F9', padding: '28px 24px 20px' },
  children: [
    section(
      [
        linkColumn('Shop', ['New arrivals', 'Best sellers', 'Gift cards']),
        linkColumn('Company', ['About us', 'Careers', 'Press']),
        linkColumn('Help', ['Contact', 'Shipping', 'Returns']),
      ],
      { 'background-color': '#F6F7F9', padding: '0 0 8px' }
    ),
    section(
      [
        column([
          divider({ 'border-color': '#E5E7EB', padding: '4px 0 12px' }),
          brandMark({ 'font-size': '14px', padding: '0 0 4px' }),
          social(),
          legal(),
        ]),
      ],
      { 'background-color': '#F6F7F9', padding: '0' }
    ),
  ],
});
