import type { IMjmlNode } from '../../tree/types';
import { section, column, text, divider, social, MUTED } from './shared';

/* feature-section-library V1 — footer composites.
   The unsubscribe line uses the {{unsubscribe_url}} merge tag the
   backend injects at send time. */

const legal = () =>
  text(
    'You are receiving this because you signed up at yourbrand.com.<br/>' +
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

/** Brand + postal address + contact line + legal (CAN-SPAM friendly). */
export const createFooterContact = (): IMjmlNode =>
  section(
    [
      column([
        text('<strong>✦ Your Brand</strong>', {
          'font-size': '14px',
          align: 'center',
          padding: '0 0 6px',
        }),
        text('123 Street Name · Kathmandu, Nepal', {
          color: '#9CA3AF',
          'font-size': '12px',
          align: 'center',
          padding: '0 0 2px',
        }),
        text(
          '<a href="mailto:hello@yourbrand.com" style="color:#6B7280;">hello@yourbrand.com</a>' +
          ' · <a href="tel:+9771234567" style="color:#6B7280;">+977 1 234 567</a>',
          { 'font-size': '12px', color: MUTED, align: 'center', padding: '0 0 8px' }
        ),
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
        text('<strong>✦ Your Brand</strong>', {
          'font-size': '15px',
          align: 'center',
          padding: '0 0 6px',
        }),
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
