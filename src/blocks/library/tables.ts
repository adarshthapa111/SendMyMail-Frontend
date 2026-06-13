import type { IMjmlNode } from '../../tree/types';
import { section, column, text, INK, MUTED, LINE } from './shared';
import { activeBrandKit } from './brandKit';

/* feature-section-library V1 — table composites.

   Built as an HTML <table> INSIDE mj-text (not mj-table) on purpose:
   the canvas renderer + the text inspector already handle mj-text
   content as HTML, and MJML compiles inline tables fine. mj-table has
   no canvas renderer or inspector — it would land as an "unknown"
   block in the editor. */

const cell = (content: string, opts: { head?: boolean; align?: string } = {}) => {
  const weight = opts.head ? 'font-weight:600;' : '';
  const color = opts.head ? `color:${INK};` : `color:${MUTED};`;
  return (
    `<td style="padding:10px 12px;border-bottom:1px solid ${LINE};` +
    `font-family:${activeBrandKit().fontFamily};font-size:13px;${weight}${color}` +
    `text-align:${opts.align ?? 'left'};">${content}</td>`
  );
};

/** Simple 3-row, 2-column data table (item · value). */
export const createTableSimple = (): IMjmlNode =>
  section(
    [
      column([
        text(
          `<table style="width:100%;border-collapse:collapse;">` +
          `<tr>${cell('Item', { head: true })}${cell('Details', { head: true, align: 'right' })}</tr>` +
          `<tr>${cell('First thing')}${cell('Some details', { align: 'right' })}</tr>` +
          `<tr>${cell('Second thing')}${cell('Some details', { align: 'right' })}</tr>` +
          `<tr>${cell('Third thing')}${cell('Some details', { align: 'right' })}</tr>` +
          `</table>`,
          { padding: '0' }
        ),
      ]),
    ],
    { padding: '24px 24px' }
  );

/** Order-summary style table with a total row. */
export const createTableOrder = (): IMjmlNode =>
  section(
    [
      column([
        text('Order summary', {
          'font-size': '16px',
          'font-weight': '700',
          padding: '0 0 10px',
        }),
        text(
          `<table style="width:100%;border-collapse:collapse;">` +
          `<tr>${cell('Product', { head: true })}${cell('Qty', { head: true, align: 'center' })}${cell('Price', { head: true, align: 'right' })}</tr>` +
          `<tr>${cell('Product name')}${cell('1', { align: 'center' })}${cell('$29.00', { align: 'right' })}</tr>` +
          `<tr>${cell('Another product')}${cell('2', { align: 'center' })}${cell('$70.00', { align: 'right' })}</tr>` +
          `<tr><td></td>${cell('<strong>Total</strong>', { align: 'center' })}${cell(`<strong style="color:${INK};">$99.00</strong>`, { align: 'right' })}</tr>` +
          `</table>`,
          { padding: '0' }
        ),
      ]),
    ],
    { padding: '24px 24px' }
  );
